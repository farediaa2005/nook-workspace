import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { catchError, of, finalize, Observable, map } from 'rxjs';
import { ShiftRecord, ShiftTransaction, ShiftHistoryItem, ShiftPaymentMethod } from '../models/shift.model';
import { AuthService } from './auth.service';
import { ShiftApiService } from './api/shift-api.service';
import { LanguageService } from './language.service';
import { NotificationService } from './notification.service';
import { ShiftDto, CreateShiftItemDto } from '../models/shift-api.model';
import { getSafeAvatar } from '../utils/avatar.util';
import { parseIsoToLocal12h, parseIsoToLocalDate, getTodayDateISO } from '../utils/date-time.util';

@Injectable({
  providedIn: 'root'
})
export class ShiftService implements OnDestroy {
  private authService = inject(AuthService);
  private shiftApi = inject(ShiftApiService);
  private langService = inject(LanguageService);
  private notification = inject(NotificationService);

  private timerIntervalId: any = null;

  // Pure in-memory reactive state (Clean Architecture - NO localStorage database)
  readonly currentShift = signal<ShiftRecord | null>(null);
  readonly shiftHistory = signal<ShiftRecord[]>([]);
  readonly historyItems = signal<ShiftHistoryItem[]>([]);

  // Reactive loading and error indicators
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingHistory = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly hasActiveShift = computed(() => {
    const shift = this.currentShift();
    return !!shift && shift.status === 'active';
  });

  readonly activeStaffName = computed(() => {
    const shift = this.currentShift();
    if (shift && shift.staffName) return shift.staffName;
    const user = this.authService.getUser();
    if (user && user.name) return user.name;
    return this.langService.isArabic() ? 'موظف الاستقبال' : 'Receptionist';
  });

  readonly activeStaffAvatar = computed(() => {
    const user = this.authService.getUser();
    return getSafeAvatar(user?.avatar, this.activeStaffName());
  });

  readonly shiftStartTime = computed(() => {
    return this.currentShift()?.startTime || '09:00 AM';
  });

  readonly currentLiveTime = signal<Date>(new Date());

  readonly shiftDuration = computed(() => {
    const shift = this.currentShift();
    if (!shift || !shift.startTime) return '0h 0m';

    const now = this.currentLiveTime();
    let startDate: Date;

    if (shift.startTime.includes('T') || shift.startTime.includes('-')) {
      const parsed = new Date(shift.startTime);
      startDate = !isNaN(parsed.getTime()) ? parsed : this.parseShiftTimeString(shift.startTime);
    } else {
      startDate = this.parseShiftTimeString(shift.startTime);
    }

    const diffMs = Math.max(0, now.getTime() - startDate.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  });

  private parseShiftTimeString(timeStr: string, dateStr?: string): Date {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) {
      const now = new Date();
      d.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const isPM = /pm|م/i.test(timeStr);
    const isAM = /am|ص/i.test(timeStr);
    const clean = timeStr.replace(/[^0-9:]/g, '').trim();
    const parts = clean.split(':');
    let h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;

    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;

    d.setHours(h, m, 0, 0);
    return d;
  }

  // 1. The 4 Payment Channels (قنوات الدفع والعهد النقدية)
  readonly openingCash = computed(() => this.currentShift()?.initialCashDrawer ?? 0);
  readonly startVodafone = computed(() => this.currentShift()?.startVodafoneCash ?? 0);
  readonly startInstaPay = computed(() => this.currentShift()?.startInstapay ?? 0);
  readonly startFawry = computed(() => this.currentShift()?.startFawry ?? 0);

  // Digital Wallet Flows (وارد وصادر المحافظ)
  readonly vodafoneInside = computed(() => this.currentShift()?.vodafoneCashInside ?? 0);
  readonly vodafoneOutside = computed(() => this.currentShift()?.vodafoneCashOutside ?? 0);
  readonly vodafoneTotal = computed(() => this.startVodafone() + this.vodafoneInside() - this.vodafoneOutside());

  readonly instapayInside = computed(() => this.currentShift()?.instapayCashInside ?? 0);
  readonly instapayOutside = computed(() => this.currentShift()?.instapayCashOutside ?? 0);
  readonly instapayTotal = computed(() => this.startInstaPay() + this.instapayInside() - this.instapayOutside());

  readonly fawryInside = computed(() => this.currentShift()?.fawryCashInside ?? 0);
  readonly fawryOutside = computed(() => this.currentShift()?.fawryCashOutside ?? 0);
  readonly fawryTotal = computed(() => this.startFawry() + this.fawryInside() - this.fawryOutside());

  // 2. Operational Revenue Categories (إيرادات الأنشطة التشغيلية)
  readonly workspaceCash = computed(() => this.currentShift()?.workspaceRevenue ?? 0);
  readonly classroomCash = computed(() => this.currentShift()?.classroomRevenue ?? 0);
  readonly packageCash = computed(() => this.currentShift()?.packageRevenue ?? 0);
  readonly cateringCash = computed(() => this.currentShift()?.canteenRevenue ?? 0);
  readonly otherIncome = computed(() => this.currentShift()?.otherIncome ?? 0);
  readonly adminExpenses = computed(() => this.currentShift()?.adminExpenses ?? 0);

  readonly posReceipts = computed(() =>
    this.workspaceCash() + this.classroomCash() + this.packageCash() + this.cateringCash() + this.otherIncome()
  );

  // Physical Expected Drawer Cash
  readonly expectedCash = computed(() =>
    this.openingCash() + this.posReceipts() - this.adminExpenses()
  );

  // Total Combined Business Balance across all 4 channels
  readonly totalFinancialBalance = computed(() =>
    this.expectedCash() + this.vodafoneTotal() + this.instapayTotal() + this.fawryTotal()
  );

  // Live Transaction Ledger
  readonly transactions = computed<ShiftTransaction[]>(() => {
    const current = this.currentShift();
    return current?.transactions || [];
  });

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.fetchCurrentShiftFromApi();
      this.fetchShiftHistoryFromApi();
    }

    // Auto-update duration timer every second (BUG-022, BUG-024)
    if (typeof window !== 'undefined') {
      this.timerIntervalId = setInterval(() => {
        this.currentLiveTime.set(new Date());
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  /**
   * Fetch current active shift from backend API
   */
  fetchCurrentShiftFromApi(): void {
    if (!this.authService.isAuthenticated()) return;
    this.isLoading.set(true);
    this.error.set(null);

    const user = this.authService.getUser();
    const params: any = user?.id && user.id.length > 10 ? { userId: user.id } : undefined;

    this.shiftApi.getShifts(params).pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[ShiftService] Shift API requires elevated role (403 Forbidden).');
        } else {
          console.warn('[ShiftService] Failed to fetch shifts from API:', err?.message || err);
        }
        return of([] as ShiftDto[]);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (apiShifts) => {
        if (Array.isArray(apiShifts) && apiShifts.length > 0) {
          // Look for an active shift (status === 1 or timeTo is null/empty)
          const activeDto = apiShifts.find((s: any) => s.status === 1 || !s.timeTo);
          if (activeDto) {
            const record = this.mapDtoToShiftRecord(activeDto);
            this.currentShift.set(record);
          } else {
            this.currentShift.set(null);
          }
        } else {
          this.currentShift.set(null);
        }
      }
    });
  }

  /**
   * Sync shifts from backend API and update signals
   */
  public syncShiftsFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.isLoadingHistory.set(true);

    this.shiftApi.getShifts().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[ShiftService] Shift history API requires elevated role (403 Forbidden).');
        } else {
          console.warn('[ShiftService] Error syncing shifts from backend:', err?.message || err);
        }
        return of([] as ShiftDto[]);
      }),
      finalize(() => this.isLoadingHistory.set(false))
    ).subscribe({
      next: (apiShifts) => {
        if (Array.isArray(apiShifts)) {
          // Active shift
          const activeDto = apiShifts.find((s: any) => s.status === 1 || !s.timeTo);
          if (activeDto) {
            const mappedActive = this.mapDtoToShiftRecord(activeDto);
            this.currentShift.set(mappedActive);
          }

          // Closed shifts
          const closedDtos = apiShifts.filter((s: any) => s.status === 2 || !!s.timeTo);
          const records = closedDtos.map(s => this.mapDtoToShiftRecord(s));
          const items = closedDtos.map(s => this.mapDtoToHistoryItem(s));

          this.shiftHistory.set(records);
          this.historyItems.set(items);
        }
      }
    });
  }

  fetchShiftHistoryFromApi(): void {
    this.syncShiftsFromBackend();
  }

  /**
   * Start a new shift with the 4 starting payment channels & floats
   * POST /api/Shifts
   */
  startShift(
    initialCash: number,
    startVodafone: number = 0,
    startInstaPay: number = 0,
    startFawry: number = 0,
    notes?: string,
    onComplete?: (success: boolean, error?: string) => void,
    chosenStaffName?: string,
    chosenUserId?: string
  ): void {
    const user = this.authService.getUser();
    const nowIso = new Date().toISOString();
    const formattedStart = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetUserId = chosenUserId || user?.id || (user as any)?.userId || (user as any)?.sub || undefined;
    const targetStaffName = chosenStaffName || user?.name || (this.langService.isArabic() ? 'موظف الاستقبال' : 'Receptionist');

    this.isLoading.set(true);

    this.shiftApi.startShift({
      date: nowIso,
      timeFrom: nowIso,
      previousTotal: initialCash,
      userId: targetUserId
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (apiShift) => {
        const id = apiShift?.id || `SHIFT-${Date.now().toString().slice(-4)}`;
        const newShift: ShiftRecord = {
          id: id,
          staffName: targetStaffName,
          staffEmail: user?.email || '',
          role: user?.role || 'Staff',
          startTime: formattedStart,
          status: 'active',
          initialCashDrawer: initialCash,
          startVodafoneCash: startVodafone,
          startInstapay: startInstaPay,
          startFawry: startFawry,
          canteenRevenue: 0,
          classroomRevenue: 0,
          workspaceRevenue: 0,
          packageRevenue: 0,
          otherIncome: 0,
          adminExpenses: 0,
          vodafoneCashInside: 0,
          vodafoneCashOutside: 0,
          instapayCashInside: 0,
          instapayCashOutside: 0,
          fawryCashInside: 0,
          fawryCashOutside: 0,
          totalRevenue: 0,
          transactionsCount: 1,
          transactions: [
            {
              id: `TX-${Date.now().toString().slice(-4)}`,
              timestamp: formattedStart,
              details: this.langService.isArabic()
                ? 'رصيد افتتاح الوردية (الخزينة النقدية)'
                : 'Shift Opening Balance (Cash Drawer)',
              type: 'system',
              paymentMethod: '-',
              amount: initialCash,
              staffName: targetStaffName
            }
          ]
        };

        this.currentShift.set(newShift);
        if (onComplete) onComplete(true);
      },
      error: (err) => {
        console.error('[ShiftService] Failed to start shift on API:', err);
        const errorMsg = err?.error?.message || err?.message || 'Failed to start shift';
        if (onComplete) onComplete(false, errorMsg);
      }
    });
  }

  /**
   * Record a transaction under the currently active shift
   * POST /api/Shifts/{id}/items
   */
  recordTransaction(tx: Omit<ShiftTransaction, 'id' | 'timestamp' | 'staffName'> & { staffName?: string; timestamp?: string }): void {
    const staff = tx.staffName || this.activeStaffName();
    const formattedTime = tx.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newTx: ShiftTransaction = {
      ...tx,
      id: `TX-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
      staffName: staff,
      timestamp: formattedTime
    };

    const current = this.currentShift();
    if (!current) return;

    const amount = tx.amount || 0;
    let canteenRev = current.canteenRevenue || 0;
    let classroomRev = current.classroomRevenue || 0;
    let workspaceRev = current.workspaceRevenue || 0;
    let packageRev = current.packageRevenue || 0;
    let otherRev = current.otherIncome || 0;
    let expenses = current.adminExpenses || 0;
    let vfIn = current.vodafoneCashInside || 0;
    let vfOut = current.vodafoneCashOutside || 0;
    let ipIn = current.instapayCashInside || 0;
    let ipOut = current.instapayCashOutside || 0;
    let fwIn = current.fawryCashInside || 0;
    let fwOut = current.fawryCashOutside || 0;

    if (tx.type === 'canteen') canteenRev += amount;
    else if (tx.type === 'classroom') classroomRev += amount;
    else if (tx.type === 'workspace') workspaceRev += amount;
    else if (tx.type === 'package') packageRev += amount;
    else if (tx.type === 'expense') expenses += Math.abs(amount);
    else if (tx.type === 'vodafone_in') vfIn += amount;
    else if (tx.type === 'vodafone_out') vfOut += Math.abs(amount);
    else if (tx.type === 'instapay_in') ipIn += amount;
    else if (tx.type === 'instapay_out') ipOut += Math.abs(amount);
    else if (tx.type === 'fawry_in') fwIn += amount;
    else if (tx.type === 'fawry_out') fwOut += Math.abs(amount);

    const total = canteenRev + classroomRev + workspaceRev + packageRev + otherRev;

    const updated: ShiftRecord = {
      ...current,
      canteenRevenue: canteenRev,
      classroomRevenue: classroomRev,
      workspaceRevenue: workspaceRev,
      packageRevenue: packageRev,
      otherIncome: otherRev,
      adminExpenses: expenses,
      vodafoneCashInside: vfIn,
      vodafoneCashOutside: vfOut,
      instapayCashInside: ipIn,
      instapayCashOutside: ipOut,
      fawryCashInside: fwIn,
      fawryCashOutside: fwOut,
      totalRevenue: total,
      transactionsCount: (current.transactionsCount || 0) + 1,
      transactions: [newTx, ...(current.transactions || [])]
    };

    this.currentShift.set(updated);

    // Call Backend API to register item if shift has a valid ID
    if (current.id && !current.id.startsWith('SHIFT-')) {
      const payWayCode = tx.paymentMethod === 'vodafone' ? 2 : (tx.paymentMethod === 'instapay' ? 3 : (tx.paymentMethod === 'fawry' ? 4 : 1));
      const itemDto: CreateShiftItemDto = {
        cost: amount,
        type: tx.type === 'expense' ? 'Expense' : 'Revenue',
        payWay: payWayCode,
        item: tx.details || 'Transaction'
      };

      this.shiftApi.addShiftItem(current.id, itemDto).subscribe({
        error: (err) => console.warn('[ShiftService] Could not persist shift item to API:', err)
      });
    }
  }

  /**
   * Close shift with complete multi-channel reconciliation
   * PUT /api/Shifts/{id}/close
   */
  closeShiftWithReconciliation(
    actualCash: number,
    actualVodafone: number = 0,
    actualInstaPay: number = 0,
    actualFawry: number = 0,
    notes?: string,
    onComplete?: (success: boolean, error?: string) => void
  ): void {
    const active = this.currentShift();
    if (!active) {
      if (onComplete) onComplete(false);
      return;
    }

    const expCash = this.expectedCash();
    const variance = actualCash - expCash;
    const isBalanced = Math.abs(variance) < 0.01;
    const endTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const locale = this.langService.isArabic() ? 'ar-EG' : 'en-US';

    const historyItem: ShiftHistoryItem = {
      id: active.id,
      staffName: this.activeStaffName(),
      staffAvatar: this.activeStaffAvatar(),
      date: new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
      startTime: this.shiftStartTime(),
      endTime: endTimeStr,
      cashIn: this.posReceipts(),
      cashOut: this.adminExpenses(),
      finalTotal: actualCash,
      variance: variance,
      status: isBalanced ? 'balanced' : 'disputed',
      notes: notes
    };

    const closedRecord: ShiftRecord = {
      ...active,
      endTime: endTimeStr,
      status: 'closed'
    };

    this.isLoading.set(true);

    if (active.id && !active.id.startsWith('SHIFT-')) {
      this.shiftApi.closeShift(active.id, {
        timeTo: new Date().toISOString(),
        administrative: active.adminExpenses || 0,
        vfCashInside: actualVodafone || active.vodafoneCashInside || 0,
        vfCashOutside: active.vodafoneCashOutside || 0,
        increase: variance > 0 ? variance : 0,
        loss: variance < 0 ? Math.abs(variance) : 0,
        totalCost: actualCash,
        note: notes || '',
        status: 2
      }).pipe(
        finalize(() => this.isLoading.set(false))
      ).subscribe({
        next: () => {
          this.currentShift.set(null);
          this.historyItems.update(list => [historyItem, ...list]);
          this.shiftHistory.update(list => [closedRecord, ...list]);
          this.syncShiftsFromBackend();
          this.notification.success(
            this.langService.isArabic() ? 'تم إغلاق الوردية بنجاح!' : 'Shift closed successfully!'
          );
          if (onComplete) onComplete(true);
        },
        error: (err) => {
          console.error('[ShiftService] Failed to close shift on API:', err);
          const errorMsg = err?.error?.message || err?.message || (
            this.langService.isArabic()
              ? 'تعذر إغلاق الوردية على الخادم. يرجى إعادة المحاولة.'
              : 'Failed to close shift on server. Please try again.'
          );
          this.notification.error(errorMsg);
          // BUG-014 fix: do NOT clear active shift locally on backend failure!
          if (onComplete) onComplete(false, errorMsg);
        }
      });
    } else {
      this.isLoading.set(false);
      this.currentShift.set(null);
      this.historyItems.update(list => [historyItem, ...list]);
      this.shiftHistory.update(list => [closedRecord, ...list]);
      if (onComplete) onComplete(true);
    }
  }

  clearActiveShift(): void {
    this.currentShift.set(null);
  }

  /**
   * Fetch single shift details by ID
   * GET /api/Shifts/{id}
   */
  getShiftById(id: string): Observable<ShiftRecord | null> {
    const active = this.currentShift();
    if (active && (active.id === id || id === 'active')) {
      return of(active);
    }

    const cached = this.shiftHistory().find(s => s.id === id);
    if (cached) {
      return of(cached);
    }

    return this.shiftApi.getShiftById(id).pipe(
      map(dto => dto ? this.mapDtoToShiftRecord(dto) : null),
      catchError(() => of(null))
    );
  }

  /**
   * Helper to map ShiftDto to ShiftRecord
   */
  private mapDtoToShiftRecord(dto: ShiftDto | any): ShiftRecord {
    const rawTime = dto.timeFrom || dto.startTime || dto.date;
    const rawEndTime = dto.timeTo || dto.endTime;
    const isClosed = dto.status === 2 || !!rawEndTime;
    const opening = dto.previousTotal ?? dto.startCash ?? 0;

    const formattedStart = rawTime ? parseIsoToLocal12h(rawTime) : '09:00 AM';
    const formattedEnd: string | undefined = rawEndTime ? parseIsoToLocal12h(rawEndTime) : undefined;

    const mappedTransactions: ShiftTransaction[] = Array.isArray(dto.items) && dto.items.length > 0
      ? dto.items.map((it: any, idx: number) => ({
          id: it.id || `TX-${idx + 1}`,
          timestamp: it.createdAt ? parseIsoToLocal12h(it.createdAt) : formattedStart,
          details: it.item || it.description || 'معاملة',
          type: (it.type || 'system') as any,
          paymentMethod: it.payWay === 2 ? 'vodafone' : (it.payWay === 3 ? 'instapay' : (it.payWay === 4 ? 'fawry' : 'cash')),
          amount: it.cost ?? it.amount ?? 0,
          staffName: dto.userName || 'موظف الاستقبال'
        }))
      : [
          {
            id: `TX-${(dto.id || '').slice(-4)}`,
            timestamp: formattedStart,
            details: 'رصيد افتتاح الوردية',
            type: 'system',
            paymentMethod: '-',
            amount: opening,
            staffName: dto.userName || 'موظف الاستقبال'
          }
        ];

    return {
      id: dto.id,
      staffName: dto.userName || 'موظف الاستقبال',
      staffEmail: '',
      role: 'Staff',
      startTime: formattedStart,
      endTime: formattedEnd,
      status: isClosed ? 'closed' : 'active',
      initialCashDrawer: opening,
      startVodafoneCash: 0,
      startInstapay: 0,
      startFawry: 0,
      canteenRevenue: 0,
      classroomRevenue: 0,
      workspaceRevenue: 0,
      packageRevenue: 0,
      otherIncome: 0,
      adminExpenses: dto.administrative ?? 0,
      vodafoneCashInside: dto.vfCashInside ?? 0,
      vodafoneCashOutside: dto.vfCashOutside ?? 0,
      instapayCashInside: 0,
      instapayCashOutside: 0,
      fawryCashInside: 0,
      fawryCashOutside: 0,
      totalRevenue: dto.totalCost ?? dto.systemCash ?? 0,
      transactionsCount: mappedTransactions.length,
      transactions: mappedTransactions
    };
  }

  /**
   * Helper to map ShiftDto to ShiftHistoryItem
   */
  private mapDtoToHistoryItem(dto: ShiftDto | any): ShiftHistoryItem {
    const rawTime = dto.timeFrom || dto.startTime || dto.date;
    const rawEndTime = dto.timeTo || dto.endTime;
    const finalTotal = dto.totalCost ?? dto.endCash ?? 0;
    const variance = (dto.increase || 0) - (dto.loss || 0) || (dto.difference ?? 0);

    const fallbackStaff = this.langService.isArabic() ? 'موظف الاستقبال' : 'Receptionist';
    const staffName = dto.userName || fallbackStaff;
    const locale = this.langService.isArabic() ? 'ar-EG' : 'en-US';

    return {
      id: dto.id,
      staffName,
      staffAvatar: getSafeAvatar(dto.userAvatar || dto.avatar, staffName),
      date: rawTime ? parseIsoToLocalDate(rawTime) : getTodayDateISO(),
      startTime: rawTime ? parseIsoToLocal12h(rawTime) : '09:00 AM',
      endTime: rawEndTime ? parseIsoToLocal12h(rawEndTime) : '05:00 PM',
      cashIn: dto.totalCost ?? dto.systemCash ?? 0,
      cashOut: dto.administrative ?? 0,
      finalTotal: finalTotal,
      variance: variance,
      status: Math.abs(variance) < 0.01 ? 'balanced' : 'disputed',
      notes: dto.note || dto.notes || undefined
    };
  }

  /**
   * Verify the shift opener's password before performing critical actions (e.g. deleting student sessions)
   * Calls POST /api/Shifts/{shiftId}/verify-password or POST /api/Shifts/verify-password
   */
  verifyShiftOpenerPassword(password: string, shiftId?: string, staffIdentifier?: string): Observable<boolean> {
    const shift = this.currentShift();
    const effectiveShiftId = shiftId || (shift?.id && /^[0-9a-fA-F-]{36}$/.test(shift.id) ? shift.id : undefined);
    const effectiveStaff = staffIdentifier || shift?.staffName || this.authService.getUser()?.name || this.authService.getUser()?.email;

    return this.shiftApi.verifyShiftPassword({
      password,
      shiftId: effectiveShiftId,
      staffIdentifier: effectiveStaff
    }).pipe(
      map(res => !!(res && (res.verified || res.success))),
      catchError(() => of(false))
    );
  }
}
