import { Injectable, signal, computed, inject, Injector, OnDestroy, effect, untracked } from '@angular/core';
import { StaffNotification } from '../models/notification.model';
import { StaffNotificationApiService } from './api/staff-notification-api.service';
import { SettingsApiService } from './api/settings-api.service';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import { WorkspaceService, parseSessionTimeToDate } from './workspace.service';
import { ClassroomService } from './classroom.service';
import { CateringService } from './catering.service';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  /** Maximum number of floating toasts displayed at the same time */
  private static readonly MAX_VISIBLE_TOASTS = 3;

  private staffNotificationApi = inject(StaffNotificationApiService);
  private settingsApi = inject(SettingsApiService);
  private authService = inject(AuthService);
  private langService = inject(LanguageService);
  private injector = inject(Injector);

  // Lazy service getters using Injector to prevent circular dependencies
  private get workspaceService(): WorkspaceService | null {
    try { return this.injector.get(WorkspaceService, null); } catch { return null; }
  }
  private get classroomService(): ClassroomService | null {
    try { return this.injector.get(ClassroomService, null); } catch { return null; }
  }
  private get cateringService(): CateringService | null {
    try { return this.injector.get(CateringService, null); } catch { return null; }
  }

  // Toast notifications (ephemeral floating alerts)
  readonly notifications = signal<AppNotification[]>([]);

  // Persistent operational notifications
  private _staffNotifications = signal<StaffNotification[]>([]);
  readonly staffNotifications = this._staffNotifications.asReadonly();

  readonly unreadCount = computed(() => {
    return this._staffNotifications().filter(n => !n.isRead && !n.dismissed).length;
  });

  // Operational thresholds configurable via /api/Settings/operational-alerts
  private thresholds = {
    cateringWarning: 5,
    cateringCritical: 0,
    sessionWarningLeadMinutes: 15,
    sessionUrgentLeadMinutes: 5,
    longStayHours: 4,
    gracePeriodMinutes: 10
  };

  private heartbeatTimer: any = null;
  private backendSyncTimer: any = null;
  private dismissedKeys = new Set<string>();
  /**
   * Operational alerts already shown as a floating toast in this browser session.
   * Persisted in sessionStorage so a page reload does not pop the same alerts again;
   * they stay available in the notification center.
   */
  private toastShownKeys = NotificationService.loadToastKeys();

  private static readonly TOAST_KEYS_STORAGE = 'nook_op_toasts_shown';

  private static loadToastKeys(): Set<string> {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(NotificationService.TOAST_KEYS_STORAGE) : null;
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set<string>();
    }
  }

  private markToastShown(key: string): void {
    this.toastShownKeys.add(key);
    try {
      sessionStorage.setItem(NotificationService.TOAST_KEYS_STORAGE, JSON.stringify([...this.toastShownKeys]));
    } catch {}
  }

  constructor() {
    // Purge any legacy mock database notifications from localStorage
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('nook_staff_notifications'); } catch {}
    }
    this.startHeartbeat();
    if (this.authService.isAuthenticated()) {
      this.syncWithBackend();
    }

    // Reactively refresh alerts whenever the user toggles language without creating a tracking loop
    effect(() => {
      this.langService.isArabic();
      untracked(() => {
        this.evaluateLiveAlerts();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.backendSyncTimer) clearInterval(this.backendSyncTimer);
  }

  /** Starts the periodic real-time evaluation loop */
  private startHeartbeat(): void {
    if (typeof window === 'undefined') return;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.backendSyncTimer) clearInterval(this.backendSyncTimer);

    // Initial evaluation after 1.2s to let services hydrate
    setTimeout(() => {
      this.evaluateLiveAlerts();
    }, 1200);

    // Real-time evaluation loop every 15 seconds
    this.heartbeatTimer = setInterval(() => {
      this.evaluateLiveAlerts();
    }, 15000);

    // Periodic remote sync every 60 seconds
    this.backendSyncTimer = setInterval(() => {
      if (this.authService.isAuthenticated()) {
        this.syncWithBackend();
      }
    }, 60000);
  }

  /** Synchronize notifications and alert settings with live backend API */
  public syncWithBackend(): void {
    if (!this.authService.isAuthenticated()) return;

    this.staffNotificationApi.getNotifications({ pageSize: 50 }).subscribe({
      next: (res) => {
        if (res.items && res.items.length > 0) {
          const remoteItems = res.items;
          this._staffNotifications.update(current => {
            const localOpAlerts = current.filter(n => n.id.startsWith('op_'));
            const merged = [...localOpAlerts];
            for (const r of remoteItems) {
              if (!merged.some(m => m.id === r.id)) {
                merged.push(r);
              }
            }
            return merged;
          });
        }
      },
      error: () => { /* best effort: a failure here is ignored on purpose */ }
    });

    this.reloadAlertSettings();
  }

  /** Loads the operational alert thresholds (also called after they are edited in Settings). */
  reloadAlertSettings(): void {
    // Admin-only endpoint (403 for staff): staff keep the default thresholds
    if (!this.authService.isAdmin()) return;
    this.settingsApi.getOperationalAlertSettings().subscribe({
      next: (s) => {
        if (s) {
          this.thresholds.cateringWarning = s.cateringWarningThreshold || 5;
          this.thresholds.cateringCritical = s.cateringCriticalThreshold || 0;
          this.thresholds.sessionWarningLeadMinutes = s.sessionWarningLeadMinutes || 15;
          this.thresholds.sessionUrgentLeadMinutes = s.sessionUrgentLeadMinutes || 5;
          this.thresholds.longStayHours = s.longStayThresholdHours || 4;
        }
      },
      error: () => { /* best effort: a failure here is ignored on purpose */ }
    });
  }

  /**
   * Real-time evaluator that scans live operational state:
   * 1. Catering: Products low-stock / out-of-stock
   * 2. Workspace: Active students nearing end, ended (grace period), and overtime (exact duration)
   * 3. Classroom: Active sessions nearing end, ended (grace period), and overtime (exact duration)
   */
  public evaluateLiveAlerts(): void {
    if (typeof window === 'undefined') return;
    // No operational alerts on the login screen / before sign-in.
    if (!this.authService.isAuthenticated()) return;

    const isAr = this.langService.isArabic();
    const now = new Date();
    const newOpAlertsMap = new Map<string, StaffNotification>();

    // ============================================================
    // 1. CATERING INVENTORY ALERTS
    // ============================================================
    const catering = this.cateringService;
    if (catering) {
      const products = catering.products() || [];
      if (products.length === 0 && !catering.isLoading()) {
        catering.getProducts().subscribe({ error: () => { /* best effort: a failure here is ignored on purpose */ } });
      }
      for (const prod of products) {
        if (!prod || !prod.id) continue;
        const alertId = `op_cat_${prod.id}`;
        const stock = Number(prod.stock ?? 0);
        const reorder = Number(prod.reorderLevel ?? this.thresholds.cateringWarning);
        const name = isAr ? (prod.nameAr || prod.name) : prod.name;

        if (stock <= this.thresholds.cateringCritical) {
          newOpAlertsMap.set(alertId, {
            id: alertId,
            type: 'Catering',
            // At or below the critical threshold: "out of stock" only when nothing is left.
            title: stock <= 0
              ? (this.langService.t().locOutOfStockAlert)
              : (this.langService.t().locCriticalStock),
            message: stock <= 0
              ? (this.langService.tf('loctProductIsCompletelyOutOf', { name }))
              : (this.langService.tf('loctProductIsAlmostOutItems', { name, stock })),
            severity: 'critical',
            createdAt: new Date().toISOString(),
            relatedEntityType: 'Product',
            relatedEntityId: prod.id,
            actionUrl: '/catering/show-products',
            isRead: false
          });
        } else if (stock <= reorder) {
          newOpAlertsMap.set(alertId, {
            id: alertId,
            type: 'Catering',
            title: this.langService.t().locLowStockWarning,
            message: this.langService.tf('loctProductReachedLowStockThreshold', { name, stock }),
            severity: 'warning',
            createdAt: new Date().toISOString(),
            relatedEntityType: 'Product',
            relatedEntityId: prod.id,
            actionUrl: '/catering/show-products',
            isRead: false
          });
        }
      }
    }

    // ============================================================
    // 2. CLASSROOM TIMERS ALERTS
    // ============================================================
    const classroom = this.classroomService;
    if (classroom) {
      classroom.tickSessionTimers(isAr);
      const cards = classroom.cards() || [];
      for (const card of cards) {
        if (!card || !card.id || card.status !== 'active') continue;
        const alertId = `op_cls_${card.id}`;
        const overtimeInfo = classroom.calculateOvertimeAndAlerts(card, isAr);
        const roomName = card.name || (this.langService.t().clsRoom);
        const instructor = card.instructor && card.instructor !== '-' ? ` (${card.instructor})` : '';

        if (overtimeInfo.alertStatus === 'ending_soon') {
          let remMins = 15;
          if (card.endTime) {
            const endObj = parseSessionTimeToDate(card.endTime, card.bookingDate);
            remMins = Math.max(1, Math.floor((endObj.getTime() - now.getTime()) / 60000));
          }
          newOpAlertsMap.set(alertId, {
            id: alertId,
            type: 'Classroom',
            title: this.langService.t().locClassroomEndingSoon,
            message: this.langService.tf('loctRoomHasMinutesRemaining', { roomName, instructor, remMins }),
            severity: 'warning',
            createdAt: new Date().toISOString(),
            relatedEntityType: 'Classroom',
            relatedEntityId: card.id,
            actionUrl: '/classroom/show-classroom',
            isRead: false
          });
        } else if (overtimeInfo.alertStatus === 'ended_grace') {
          const overdueMins = overtimeInfo.overdueMinutes || 0;
          const graceLeft = Math.max(0, this.thresholds.gracePeriodMinutes - overdueMins);
          newOpAlertsMap.set(alertId, {
            id: alertId,
            type: 'Classroom',
            title: this.langService.t().locClassroomEndedGracePeriod,
            message: this.langService.tf('loctScheduledTimeEndedForGrace', { roomName, instructor, graceLeft }),
            severity: 'warning',
            createdAt: new Date().toISOString(),
            relatedEntityType: 'Classroom',
            relatedEntityId: card.id,
            actionUrl: '/classroom/show-classroom',
            isRead: false
          });
        } else if (overtimeInfo.alertStatus === 'overtime_charged') {
          const overdueMins = overtimeInfo.overdueMinutes || 0;
          const durationStr = this.formatDurationHuman(overdueMins, isAr);
          const extraHours = Math.ceil((overdueMins - this.thresholds.gracePeriodMinutes) / 60);
          newOpAlertsMap.set(alertId, {
            id: alertId,
            type: 'Classroom',
            title: this.langService.t().locClassroomOvertimeAlert,
            message: this.langService.tf('loctRoomIsOverdueByH', { roomName, instructor, durationStr, extraHours }),
            severity: 'critical',
            createdAt: new Date().toISOString(),
            relatedEntityType: 'Classroom',
            relatedEntityId: card.id,
            actionUrl: '/classroom/show-classroom',
            isRead: false
          });
        }
      }

      // 2b. UPCOMING RESERVATIONS REMINDERS (Req 5: 24h & 1h Before)
      const reservations = classroom.reservations() || [];
      for (const res of reservations) {
        if (!res || res.status === 'cancelled' || res.status === 'completed') continue;
        const resDateStr = res.occurrenceDate || res.fullDate || res.date;
        if (!resDateStr || !res.startTime) continue;
        const startObj = parseSessionTimeToDate(res.startTime, resDateStr);
        const diffHours = (startObj.getTime() - now.getTime()) / (1000 * 60 * 60);
        const roomName = res.classroom || (this.langService.t().clsRoom);
        const who = res.instructor && res.instructor !== '-' ? res.instructor : (res.activity || 'حجز');
        const noteHint = res.notes ? (this.langService.tf('loctNote', { notes: res.notes })) : '';

        // 24 Hours Reminder (between 20 and 24.5 hours ahead)
        if (diffHours > 20 && diffHours <= 24.5) {
          const alertId = `op_res_24h_${res.id || res.reservationId}`;
          newOpAlertsMap.set(alertId, {
            id: alertId,
            type: 'Classroom',
            title: isAr ? `تذكير بموعد حجز غداً: ${roomName}` : `Tomorrow's Booking: ${roomName}`,
            message: this.langService.tf('loctReservationForTomorrowAt', { who, startTime: res.startTime, noteHint }),
            severity: 'info',
            createdAt: new Date().toISOString(),
            relatedEntityType: 'Reservation',
            relatedEntityId: res.id,
            actionUrl: '/classroom/reservation',
            isRead: false
          });
        }

        // 1 Hour Reminder (between 0 and 1.1 hours ahead)
        if (diffHours > 0 && diffHours <= 1.1) {
          const remMins = Math.max(1, Math.round(diffHours * 60));
          const alertId = `op_res_1h_${res.id || res.reservationId}`;
          newOpAlertsMap.set(alertId, {
            id: alertId,
            type: 'Classroom',
            title: this.langService.tf('loctUpcomingBooking', { roomName }),
            message: this.langService.tf('loctBookingForStartsInMinutes', { who, remMins, startTime: res.startTime, noteHint }),
            severity: 'warning',
            createdAt: new Date().toISOString(),
            relatedEntityType: 'Reservation',
            relatedEntityId: res.id,
            actionUrl: '/classroom/reservation',
            isRead: false
          });
        }
      }
    }

    // ============================================================
    // 3. WORKSPACE ACTIVE STUDENTS ALERTS
    // ============================================================
    const workspace = this.workspaceService;
    if (workspace) {
      const activeStudents = workspace.activeStudents() || [];
      for (const st of activeStudents) {
        if (!st || !st.id || st.status !== 'active') continue;
        const alertId = `op_ws_${st.id}`;
        const studentName = st.name || (this.langService.t().locStudent);

        if (st.expectedCheckout) {
          const endObj = parseSessionTimeToDate(st.expectedCheckout, st.date);
          const diffMs = endObj.getTime() - now.getTime();

          if (diffMs > 0) {
            // Nearing end
            const remMins = Math.max(1, Math.floor(diffMs / 60000));
            if (remMins <= this.thresholds.sessionUrgentLeadMinutes) {
              newOpAlertsMap.set(alertId, {
                id: alertId,
                type: 'Workspace',
                title: this.langService.t().locStudentSessionEndingVerySoon,
                message: this.langService.tf('loctStudentHasOnlyMLeft', { studentName, remMins }),
                severity: 'warning',
                createdAt: new Date().toISOString(),
                relatedEntityType: 'WorkspaceSession',
                relatedEntityId: st.id,
                actionUrl: '/workspace/show-student',
                isRead: false
              });
            } else if (remMins <= this.thresholds.sessionWarningLeadMinutes) {
              newOpAlertsMap.set(alertId, {
                id: alertId,
                type: 'Workspace',
                title: this.langService.t().locStudentSessionEndingSoon,
                message: this.langService.tf('loctStudentHasMRemainingIn', { studentName, remMins }),
                severity: 'info',
                createdAt: new Date().toISOString(),
                relatedEntityType: 'WorkspaceSession',
                relatedEntityId: st.id,
                actionUrl: '/workspace/show-student',
                isRead: false
              });
            }
          } else {
            // Time ended / Overdue
            const overdueMins = Math.max(1, Math.floor((now.getTime() - endObj.getTime()) / 60000));
            if (overdueMins <= this.thresholds.gracePeriodMinutes) {
              const graceLeft = Math.max(0, this.thresholds.gracePeriodMinutes - overdueMins);
              newOpAlertsMap.set(alertId, {
                id: alertId,
                type: 'Workspace',
                title: this.langService.t().locStudentSessionEndedGracePeriod,
                message: this.langService.tf('loctScheduledTimeEndedForGrace2', { studentName, graceLeft }),
                severity: 'warning',
                createdAt: new Date().toISOString(),
                relatedEntityType: 'WorkspaceSession',
                relatedEntityId: st.id,
                actionUrl: '/workspace/show-student',
                isRead: false
              });
            } else {
              const durationStr = this.formatDurationHuman(overdueMins, isAr);
              newOpAlertsMap.set(alertId, {
                id: alertId,
                type: 'Workspace',
                title: this.langService.t().locStudentSessionOvertimeAlert,
                message: this.langService.tf('loctStudentIsOverdueByWithout', { studentName, durationStr }),
                severity: 'critical',
                createdAt: new Date().toISOString(),
                relatedEntityType: 'WorkspaceSession',
                relatedEntityId: st.id,
                actionUrl: '/workspace/show-student',
                isRead: false
              });
            }
          }
        } else if (st.checkInTime) {
          // Open session without expected checkout: check for long stay
          const startObj = parseSessionTimeToDate(st.checkInTime, st.date);
          const elapsedHours = (now.getTime() - startObj.getTime()) / (1000 * 60 * 60);
          if (elapsedHours >= this.thresholds.longStayHours) {
            const h = Math.floor(elapsedHours);
            newOpAlertsMap.set(alertId, {
              id: alertId,
              type: 'LongStay',
              title: this.langService.t().locLongStayAlert,
              message: this.langService.tf('loctStudentHasBeenInWorkspace', { studentName, h }),
              severity: 'info',
              createdAt: new Date().toISOString(),
              relatedEntityType: 'WorkspaceSession',
              relatedEntityId: st.id,
              actionUrl: '/workspace/show-student',
              isRead: false
            });
          }
        }
      }
    }

    // ============================================================
    // 4. ATOMIC MERGE & REACTIVE UPDATE
    // ============================================================
    this.mergeOperationalAlerts(newOpAlertsMap);
  }

  /** Merges evaluated alerts into staffNotifications state cleanly and safely */
  private mergeOperationalAlerts(newAlertsMap: Map<string, StaffNotification>): void {
    const currentList = this._staffNotifications();
    let hasChanges = false;

    // 1. Keep non-operational (e.g. backend / system) notifications as-is
    const nonOp = currentList.filter(n => !n.id.startsWith('op_'));

    // 2. Identify active operational alerts from previous state
    const existingOpMap = new Map<string, StaffNotification>();
    for (const n of currentList) {
      if (n.id.startsWith('op_')) {
        existingOpMap.set(n.id, n);
      }
    }

    // Check if any old operational alert cleared (e.g. student checked out, product restocked)
    for (const [id] of existingOpMap.entries()) {
      if (!newAlertsMap.has(id)) {
        hasChanges = true;
        this.dismissedKeys.delete(id);
        this.toastShownKeys.delete(id);
        this.toastShownKeys.delete(`${id}_crit`);
        try { sessionStorage.setItem(NotificationService.TOAST_KEYS_STORAGE, JSON.stringify([...this.toastShownKeys])); } catch {}
      }
    }

    // 3. Merge new operational alerts
    const mergedOp: StaffNotification[] = [];
    for (const [id, newAlert] of newAlertsMap.entries()) {
      const existing = existingOpMap.get(id);

      if (existing) {
        const contentChanged = existing.message !== newAlert.message || existing.severity !== newAlert.severity || existing.title !== newAlert.title;
        const escalated = existing.severity !== 'critical' && newAlert.severity === 'critical';

        if (escalated) {
          // If escalated to critical, un-dismiss so user is alerted
          this.dismissedKeys.delete(id);
        }

        if (this.dismissedKeys.has(id)) {
          continue;
        }

        if (contentChanged) {
          hasChanges = true;
          mergedOp.push({
            ...existing,
            title: newAlert.title,
            message: newAlert.message,
            severity: newAlert.severity,
            // Re-mark as unread if escalated to critical
            isRead: escalated ? false : existing.isRead
          });

          // Show floating toast on escalation if not shown yet
          if (escalated && !this.toastShownKeys.has(`${id}_crit`)) {
            this.show(newAlert.message, 'error', 6000);
            this.markToastShown(`${id}_crit`);
          }
        } else {
          mergedOp.push(existing);
        }
      } else {
        // Brand new alert!
        hasChanges = true;
        if (!this.dismissedKeys.has(id)) {
          mergedOp.push(newAlert);

          // Trigger toast for new high-severity alerts
          if ((newAlert.severity === 'critical' || newAlert.severity === 'warning') && !this.toastShownKeys.has(id)) {
            this.show(newAlert.message, newAlert.severity === 'critical' ? 'error' : 'warning', 5000);
            this.markToastShown(id);
          }
        }
      }
    }

    if (hasChanges) {
      const seen = new Set<string>();
      const updatedList: StaffNotification[] = [];
      for (const item of [...mergedOp, ...nonOp]) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          updatedList.push(item);
        }
      }
      this._staffNotifications.set(updatedList);
    }
  }

  private formatDurationHuman(minutes: number, isAr: boolean): string {
    if (minutes < 60) {
      return this.langService.tf('loctM', { minutes });
    }
    const d = Math.floor(minutes / 1440);
    const remMins = minutes % 1440;
    const h = Math.floor(remMins / 60);
    const m = remMins % 60;
    if (d > 0) {
      if (isAr) {
        let res = `${d} يوم`;
        if (h > 0) res += ` و ${h} س`;
        if (m > 0) res += ` و ${m} د`;
        return res;
      } else {
        return `${d}d ${h}h ${m}m`;
      }
    }
    if (m === 0) {
      return this.langService.tf('loctH', { h });
    }
    return this.langService.tf('loctHM', { h, m });
  }

  addStaffNotification(notif: Omit<StaffNotification, 'id' | 'createdAt' | 'isRead'>): StaffNotification {
    const newNotif: StaffNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    this._staffNotifications.update(list => [newNotif, ...list]);
    return newNotif;
  }

  markAsRead(id: string): void {
    this._staffNotifications.update(list =>
      list.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );

    // Sync with backend API if valid GUID
    if (/^[0-9a-fA-F-]{36}$/.test(id)) {
      this.staffNotificationApi.markAsRead(id).subscribe({ error: () => { /* best effort: a failure here is ignored on purpose */ } });
    }
  }

  markAllAsRead(): void {
    this._staffNotifications.update(list =>
      list.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );

    // Sync with backend API
    this.staffNotificationApi.markAllAsRead().subscribe({ error: () => { /* best effort: a failure here is ignored on purpose */ } });
  }

  dismissStaffNotification(id: string): void {
    if (id.startsWith('op_')) {
      this.dismissedKeys.add(id);
    }
    this._staffNotifications.update(list => list.filter(n => n.id !== id));

    // Sync with backend API if valid GUID
    if (/^[0-9a-fA-F-]{36}$/.test(id)) {
      this.staffNotificationApi.deleteNotification(id).subscribe({ error: () => { /* best effort: a failure here is ignored on purpose */ } });
    }
  }

  clearAllNotifications(): void {
    const current = this._staffNotifications();
    for (const n of current) {
      if (n.id.startsWith('op_')) {
        this.dismissedKeys.add(n.id);
      }
    }
    this._staffNotifications.set([]);

    // Delete remotely on backend
    current.forEach(n => {
      if (/^[0-9a-fA-F-]{36}$/.test(n.id)) {
        this.staffNotificationApi.deleteNotification(n.id).subscribe({ error: () => { /* best effort: a failure here is ignored on purpose */ } });
      }
    });
  }

  // --- Ephemeral Toast Methods ---

  show(message: string, type: NotificationType = 'info', duration = 4000): void {
    if (!message) return;

    // Skip an identical toast that is already on screen (e.g. repeated alerts / double clicks)
    if (this.notifications().some(n => n.message === message && n.type === type)) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const notification: AppNotification = { id, message, type, duration };

    // Cap visible toasts so a burst of alerts never covers the whole screen (oldest dropped first)
    this.notifications.update(list => [...list, notification].slice(-NotificationService.MAX_VISIBLE_TOASTS));

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(message: string, duration = 4000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration = 4500): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration = 4000): void {
    this.show(message, 'info', duration);
  }

  dismiss(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }
}
