import { Injectable, signal, computed, inject, Injector, OnDestroy, effect, untracked } from '@angular/core';
import { StaffNotification, StaffNotificationType, StaffNotificationSeverity } from '../models/notification.model';
import { StaffNotificationApiService } from './api/staff-notification-api.service';
import { SettingsApiService } from './api/settings-api.service';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import { WorkspaceService, parseSessionTimeToDate } from './workspace.service';
import { ClassroomService } from './classroom.service';
import { CateringService } from './catering.service';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
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
  private toastShownKeys = new Set<string>();

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
      error: () => {}
    });

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
      error: () => {}
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
        catering.getProducts().subscribe({ error: () => {} });
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
            title: isAr ? 'نفاد المخزون بالكامل!' : 'Out of Stock Alert!',
            message: isAr
              ? `منتج "${name}" نفد بالكامل من الكاترينج (الرصيد: 0)!`
              : `Product "${name}" is completely out of stock (0 items left)!`,
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
            title: isAr ? 'تنبيه انخفاض المخزون' : 'Low Stock Warning',
            message: isAr
              ? `منتج "${name}" وصل للحد الأدنى (الرصيد الحالي: ${stock} قطع).`
              : `Product "${name}" reached low stock threshold (${stock} items left).`,
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
        const roomName = card.name || (isAr ? 'القاعة' : 'Room');
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
            title: isAr ? 'اقتراب انتهاء حجز القاعة' : 'Classroom Ending Soon',
            message: isAr
              ? `قاعة "${roomName}"${instructor} متبقي لها ${remMins} دقيقة على انتهاء موعد الحجز.`
              : `Room "${roomName}"${instructor} has ${remMins} minutes remaining.`,
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
            title: isAr ? 'انتهاء وقت القاعة (فترة سماح)' : 'Classroom Ended (Grace Period)',
            message: isAr
              ? `انتهى وقت حجز قاعة "${roomName}"${instructor}، فترة السماح: متبقي ${graceLeft} دقيقة قبل احتساب وقت إضافي.`
              : `Scheduled time ended for "${roomName}"${instructor}. Grace period: ${graceLeft}m left.`,
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
            title: isAr ? 'تجاوز وقت القاعة (Overtime)' : 'Classroom Overtime Alert',
            message: isAr
              ? `قاعة "${roomName}"${instructor} متأخرة بمقدار ${durationStr} عن موعد الانتهاء (+${extraHours} س إضافية)!`
              : `Room "${roomName}"${instructor} is overdue by ${durationStr} (+${extraHours}h charged)!`,
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
        const roomName = res.classroom || (isAr ? 'القاعة' : 'Room');
        const who = res.instructor && res.instructor !== '-' ? res.instructor : (res.activity || 'حجز');
        const noteHint = res.notes ? (isAr ? ` [ملاحظة: ${res.notes}]` : ` [Note: ${res.notes}]`) : '';

        // 24 Hours Reminder (between 20 and 24.5 hours ahead)
        if (diffHours > 20 && diffHours <= 24.5) {
          const alertId = `op_res_24h_${res.id || res.reservationId}`;
          newOpAlertsMap.set(alertId, {
            id: alertId,
            type: 'Classroom',
            title: isAr ? `تذكير بموعد حجز غداً: ${roomName}` : `Tomorrow's Booking: ${roomName}`,
            message: isAr
              ? `حجز لـ "${who}" غداً في الساعة ${res.startTime}.${noteHint}`
              : `Reservation for "${who}" tomorrow at ${res.startTime}.${noteHint}`,
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
            title: isAr ? `تذكير بموعد حجز قريباً: ${roomName}` : `Upcoming Booking: ${roomName}`,
            message: isAr
              ? `حجز لـ "${who}" يبدأ بعد ${remMins} دقيقة (الساعة ${res.startTime}).${noteHint}`
              : `Booking for "${who}" starts in ${remMins} minutes (${res.startTime}).${noteHint}`,
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
        const studentName = st.name || (isAr ? 'الطالب' : 'Student');

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
                title: isAr ? 'اقتراب انتهاء وقت الطالب (عاجل)' : 'Student Session Ending Very Soon',
                message: isAr
                  ? `الطالب "${studentName}" متبقي له ${remMins} دقيقة فقط على انتهاء جلسته في مساحة العمل.`
                  : `Student "${studentName}" has only ${remMins}m left in workspace session.`,
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
                title: isAr ? 'اقتراب انتهاء وقت الطالب' : 'Student Session Ending Soon',
                message: isAr
                  ? `الطالب "${studentName}" متبقي له ${remMins} دقيقة على انتهاء وقته المحدد.`
                  : `Student "${studentName}" has ${remMins}m remaining in session.`,
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
                title: isAr ? 'انتهاء وقت الطالب (فترة سماح)' : 'Student Session Ended (Grace Period)',
                message: isAr
                  ? `انتهى الوقت المحدد للطالب "${studentName}"، فترة السماح: متبقي ${graceLeft} دقيقة قبل احتساب وقت إضافي.`
                  : `Scheduled time ended for "${studentName}". Grace period: ${graceLeft}m remaining.`,
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
                title: isAr ? 'تجاوز وقت الطالب (Overtime)' : 'Student Session Overtime Alert',
                message: isAr
                  ? `الطالب "${studentName}" متأخر بمقدار ${durationStr} عن موعد الخروج المحدد دون إنهاء الجلسة!`
                  : `Student "${studentName}" is overdue by ${durationStr} without checking out!`,
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
              title: isAr ? 'تنبيه إقامة طويلة للطالب' : 'Long Stay Alert',
              message: isAr
                ? `الطالب "${studentName}" متواجد في مساحة العمل منذ أكثر من ${h} ساعات متواصلة.`
                : `Student "${studentName}" has been in workspace for over ${h} hours.`,
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
            this.toastShownKeys.add(`${id}_crit`);
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
            this.toastShownKeys.add(id);
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
      return isAr ? `${minutes} دقيقة` : `${minutes}m`;
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
      return isAr ? `${h} ساعة` : `${h}h`;
    }
    return isAr ? `${h} ساعة و ${m} دقيقة` : `${h}h ${m}m`;
  }

  // --- Operational Notification Management Methods ---

  /** Requirement 5: Persistent Note Notifications (1 day & 1 hour before scheduled time) */
  scheduleNoteReminder(noteInfo: { entityName: string; entityType: 'Student' | 'Classroom' | 'Reservation'; noteText: string; scheduledDateTime: string; sessionId?: string }): void {
    if (!noteInfo.scheduledDateTime || !noteInfo.noteText) return;

    const targetDate = new Date(noteInfo.scheduledDateTime);
    if (isNaN(targetDate.getTime())) return;

    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 3600);

    // 1 Day Reminder (between 23h and 25h away)
    if (diffHours >= 23 && diffHours <= 25) {
      const title = `تذكير ملاحظة (قبل يوم واحد) - ${noteInfo.entityName}`;
      const msg = `ملاحظة مجدولة لـ ${noteInfo.entityName} بتاريخ ${targetDate.toLocaleDateString()} ${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: "${noteInfo.noteText}"`;
      this.addStaffNotification({
        type: 'Classroom',
        title,
        message: msg,
        severity: 'info',
        relatedEntityId: noteInfo.sessionId,
        relatedEntityType: noteInfo.entityType
      });
    }

    // 1 Hour Reminder (between 0.5h and 1.5h away)
    if (diffHours >= 0.5 && diffHours <= 1.5) {
      const title = `تذكير ملاحظة عاجل (قبل ساعة واحدة) - ${noteInfo.entityName}`;
      const msg = `ملاحظة عاجلة لـ ${noteInfo.entityName} تبدأ خلال ساعة (${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}): "${noteInfo.noteText}"`;
      this.addStaffNotification({
        type: 'Classroom',
        title,
        message: msg,
        severity: 'warning',
        relatedEntityId: noteInfo.sessionId,
        relatedEntityType: noteInfo.entityType
      });
    }
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
      this.staffNotificationApi.markAsRead(id).subscribe({ error: () => {} });
    }
  }

  markAllAsRead(): void {
    this._staffNotifications.update(list =>
      list.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );

    // Sync with backend API
    this.staffNotificationApi.markAllAsRead().subscribe({ error: () => {} });
  }

  dismissStaffNotification(id: string): void {
    if (id.startsWith('op_')) {
      this.dismissedKeys.add(id);
    }
    this._staffNotifications.update(list => list.filter(n => n.id !== id));

    // Sync with backend API if valid GUID
    if (/^[0-9a-fA-F-]{36}$/.test(id)) {
      this.staffNotificationApi.deleteNotification(id).subscribe({ error: () => {} });
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
        this.staffNotificationApi.deleteNotification(n.id).subscribe({ error: () => {} });
      }
    });
  }

  // --- Ephemeral Toast Methods ---

  show(message: string, type: NotificationType = 'info', duration: number = 4000): void {
    if (!message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const notification: AppNotification = { id, message, type, duration };

    this.notifications.update(list => [...list, notification]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(message: string, duration: number = 4000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 5000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration: number = 4500): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration: number = 4000): void {
    this.show(message, 'info', duration);
  }

  dismiss(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }
}
