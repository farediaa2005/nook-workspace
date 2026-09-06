import { Injectable, signal, computed, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ShiftRecord, ShiftTransaction, ShiftHistoryItem, ShiftPaymentMethod } from '../models/shift.model';
import { AuthService } from './auth.service';
import { ShiftApiService } from './api/shift-api.service';
import { ShiftDto } from '../models/shift-api.model';
import { getSafeAvatar } from '../utils/avatar.util';
// [MOCK DATA DISABLED FOR LIVE API - Uncomment below for offline presentation/testing]
// import { 
//   USE_SHIFT_MOCK_DATA, 
//   MOCK_ACTIVE_SHIFT, 
//   MOCK_SHIFT_HISTORY_ITEMS 
// } from '../testing/shift.mock';

const SHIFT_STORAGE_KEYS = {
  ACTIVE: 'nook_active_shift_cache',
  HISTORY: 'nook_shift_history_cache',
  HISTORY_ITEMS: 'nook_shift_history_items_cache'
};

@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  private authService = inject(AuthService);
  private shiftApi = inject(ShiftApiService);

  readonly currentShift = signal<ShiftRecord | null>(this.loadActiveShift());
  readonly shiftHistory = signal<ShiftRecord[]>(this.loadShiftHistory());
  readonly historyItems = signal<ShiftHistoryItem[]>(this.loadHistoryItems());

  readonly hasActiveShift = computed(() => {
    const shift = this.currentShift();
    return !!shift && shift.status === 'active';
  });

  readonly activeStaffName = computed(() => {
    const shift = this.currentShift();
    if (shift && shift.staffName) return shift.staffName;
    const user = this.authService.getUser();
    return user ? user.name : 'موظف الاستقبال';
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
    if (current && current.transactions && current.transactions.length > 0) {
      return current.transactions;
    }
    // [MOCK DATA DISABLED FOR LIVE API - Uncomment for offline presentation/testing]
    // return USE_SHIFT_MOCK_DATA ? MOCK_ACTIVE_SHIFT.transactions || [] : [];
    return [];
  });

  constructor() {
    // Only auto-fetch active shift and shift history if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.fetchCurrentShiftFromApi();
      this.fetchShiftHistoryFromApi();
    }

    // Auto-update duration timer
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.currentLiveTime.set(new Date());
      }, 30000);
    }
  }

  /**
   * Fetch current active shift from backend API
   */
  fetchCurrentShiftFromApi(): void {
    if (!this.authService.isAuthenticated()) return;
    const user = this.authService.getUser();
    this.checkActiveShiftFromList(user);
  }

  private checkActiveShiftFromList(user: any): void {
    const params: any = user?.id && user.id.length > 10 ? { userId: user.id } : undefined;
    this.shiftApi.getShifts(params).pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[ShiftService] Shift API requires elevated role (403 Forbidden). Keeping local active shift.');
        }
        return of(null);
      })
    ).subscribe({
      next: (apiShifts) => {
        if (apiShifts === null) {
          // Error occurred — preserve local active shift!
          return;
        }
        if (Array.isArray(apiShifts)) {
          // Look for an active shift (status === 1 or timeTo is null)
          const activeDto = (user?.id ? apiShifts.find((s: any) => (s.userId === user.id || !s.userId) && (s.status === 1 || !s.timeTo)) : null)
            || apiShifts.find((s: any) => s.status === 1 || !s.timeTo);

          if (activeDto) {
            const record = this.mapDtoToShiftRecord(activeDto);
            this.currentShift.set(record);
            this.saveActiveShift(record);
          } else {
            // Only clear if server explicitly returned a list and confirms there are NO open shifts
            const current = this.currentShift();
            if (current && current.id && !current.id.startsWith('SHIFT-')) {
              this.currentShift.set(null);
              this.saveActiveShift(null);
            }
          }
        }
      }
    });
  }

  /**
   * Sync shifts from backend API and update signals & localStorage
   */
  public syncShiftsFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.shiftApi.getShifts().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[ShiftService] Shift history API requires elevated role (403 Forbidden). Keeping local history.');
        }
        return of(null);
      })
    ).subscribe({
      next: (apiShifts) => {
        if (apiShifts && Array.isArray(apiShifts) && apiShifts.length > 0) {
          // Check for active shift (status 1 or timeTo is null)
          const activeDto = apiShifts.find((s: any) => s.status === 1 || !s.timeTo);
          if (activeDto) {
            const mappedActive = this.mapDtoToShiftRecord(activeDto);
            const current = this.currentShift();
            if (!current || current.id === mappedActive.id || (current.transactionsCount || 0) <= 1) {
              this.currentShift.set(mappedActive);
              this.saveActiveShift(mappedActive);
            }
          }

          // Closed shifts
          const closedDtos = apiShifts.filter((s: any) => s.status === 2 || !!s.timeTo);
          if (closedDtos.length > 0) {
            const records = closedDtos.map(s => this.mapDtoToShiftRecord(s));
            const items = closedDtos.map(s => this.mapDtoToHistoryItem(s));
            this.shiftHistory.set(records);
            this.historyItems.set(items);
            this.saveHistory(records);
            this.saveHistoryItems(items);
          }
        }
      }
    });
  }

  fetchShiftHistoryFromApi(): void {
    this.syncShiftsFromBackend();
  }

  /**
   * Load active shift from localStorage
   */
  private loadActiveShift(): ShiftRecord | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(SHIFT_STORAGE_KEYS.ACTIVE);
        if (item) return JSON.parse(item);
      }
    } catch {}
    return null;
  }

  /**
   * Load shift history from localStorage
   */
  private loadShiftHistory(): ShiftRecord[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(SHIFT_STORAGE_KEYS.HISTORY);
        if (item) return JSON.parse(item);
      }
    } catch {}
    return [];
  }

  /**
   * Load shift history items from localStorage
   */
  private loadHistoryItems(): ShiftHistoryItem[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(SHIFT_STORAGE_KEYS.HISTORY_ITEMS);
        if (item) return JSON.parse(item);
      }
    } catch {}
    return [];
  }

  private saveActiveShift(shift: ShiftRecord | null): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (shift) {
          localStorage.setItem(SHIFT_STORAGE_KEYS.ACTIVE, JSON.stringify(shift));
        } else {
          localStorage.removeItem(SHIFT_STORAGE_KEYS.ACTIVE);
        }
      }
    } catch {}
  }

  private saveHistory(records: ShiftRecord[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SHIFT_STORAGE_KEYS.HISTORY, JSON.stringify(records));
      }
    } catch {}
  }

  private saveHistoryItems(items: ShiftHistoryItem[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SHIFT_STORAGE_KEYS.HISTORY_ITEMS, JSON.stringify(items));
      }
    } catch {}
  }

  /**
   * Start a new shift with the 4 starting payment channels & floats
   */
  startShift(
    initialCash: number,
    startVodafone: number = 0,
    startInstaPay: number = 0,
    startFawry: number = 0,
    notes?: string
  ): void {
    const user = this.authService.getUser();
    const newShift: ShiftRecord = {
      id: `SHIFT-${Date.now().toString().slice(-4)}`,
      staffName: user?.name || 'موظف الاستقبال',
      staffEmail: user?.email || 'admin@nook.io',
      role: user?.role || 'Admin',
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          details: 'رصيد افتتاح الوردية (الخزينة النقدية)',
          type: 'system',
          paymentMethod: '-',
          amount: initialCash,
          staffName: user?.name || 'موظف الاستقبال'
        }
      ]
    };

    this.currentShift.set(newShift);
    this.saveActiveShift(newShift);

    // Call Backend API — API expects { date, timeFrom, previousTotal, userId }
    const nowIso = new Date().toISOString();
    this.shiftApi.startShift({
      date: nowIso,
      timeFrom: nowIso,
      previousTotal: initialCash,
      userId: user?.id && user.id.length > 10 ? user.id : undefined
    }).subscribe({
      next: (apiShift) => {
        if (apiShift) {
          const mapped = this.mapDtoToShiftRecord(apiShift);
          this.currentShift.update(s => {
            const res = s ? { ...s, id: mapped.id } : mapped;
            this.saveActiveShift(res);
            return res;
          });
        }
      },
      error: (err) => {
        console.warn('[ShiftService] startShift API error:', err);
      }
    });
  }

  /**
   * Record a transaction under the currently active shift
   */
  recordTransaction(tx: Omit<ShiftTransaction, 'id' | 'timestamp' | 'staffName'> & { staffName?: string; timestamp?: string }): void {
    const staff = tx.staffName || this.activeStaffName();
    const newTx: ShiftTransaction = {
      ...tx,
      id: `TX-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
      staffName: staff,
      timestamp: tx.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.currentShift.update(shift => {
      if (!shift) return null;
      const amount = tx.amount || 0;
      let canteenRev = shift.canteenRevenue || 0;
      let classroomRev = shift.classroomRevenue || 0;
      let workspaceRev = shift.workspaceRevenue || 0;
      let packageRev = shift.packageRevenue || 0;
      let otherRev = shift.otherIncome || 0;
      let expenses = shift.adminExpenses || 0;
      let vfIn = shift.vodafoneCashInside || 0;
      let vfOut = shift.vodafoneCashOutside || 0;
      let ipIn = shift.instapayCashInside || 0;
      let ipOut = shift.instapayCashOutside || 0;
      let fwIn = shift.fawryCashInside || 0;
      let fwOut = shift.fawryCashOutside || 0;

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
        ...shift,
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
        transactionsCount: (shift.transactionsCount || 0) + 1,
        transactions: [newTx, ...(shift.transactions || [])]
      };

      this.saveActiveShift(updated);
      return updated;
    });
  }

  /**
   * Close shift with complete multi-channel reconciliation
   */
  closeShiftWithReconciliation(
    actualCash: number,
    actualVodafone: number = 0,
    actualInstaPay: number = 0,
    actualFawry: number = 0,
    notes?: string
  ): void {
    const active = this.currentShift();
    const expCash = this.expectedCash();
    const variance = actualCash - expCash;
    const isBalanced = Math.abs(variance) < 0.01;

    const historyItem: ShiftHistoryItem = {
      id: `SH-${Date.now().toString().slice(-4)}`,
      staffName: this.activeStaffName(),
      staffAvatar: this.activeStaffAvatar(),
      date: new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }),
      startTime: this.shiftStartTime(),
      endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cashIn: this.posReceipts(),
      cashOut: this.adminExpenses(),
      finalTotal: actualCash,
      variance: variance,
      status: isBalanced ? 'balanced' : 'disputed'
    };

    this.historyItems.update(list => {
      const updated = [historyItem, ...list];
      this.saveHistoryItems(updated);
      return updated;
    });

    if (active) {
      const closed: ShiftRecord = {
        ...active,
        endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'closed'
      };
      this.shiftHistory.update(list => {
        const updated = [closed, ...list];
        this.saveHistory(updated);
        return updated;
      });

      // Call Backend API — API expects UpdateShiftDto
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
        }).subscribe({
          next: () => {},
          error: () => {}
        });
      }
    }

    this.currentShift.set(null);
    this.saveActiveShift(null);
  }

  clearActiveShift(): void {
    this.currentShift.set(null);
    this.saveActiveShift(null);
  }

  /**
   * Helper to map ShiftDto to ShiftRecord
   */
  private mapDtoToShiftRecord(dto: ShiftDto | any): ShiftRecord {
    const rawTime = dto.timeFrom || dto.startTime || dto.date;
    const rawEndTime = dto.timeTo || dto.endTime;
    const isClosed = dto.status === 2 || !!rawEndTime;
    const opening = dto.previousTotal ?? dto.startCash ?? 0;

    let formattedStart = '09:00 AM';
    if (rawTime) {
      if (rawTime.includes('T')) {
        formattedStart = rawTime.split('T')[1].substring(0, 5);
      } else {
        formattedStart = rawTime;
      }
    }

    let formattedEnd: string | undefined = undefined;
    if (rawEndTime) {
      if (rawEndTime.includes('T')) {
        formattedEnd = rawEndTime.split('T')[1].substring(0, 5);
      } else {
        formattedEnd = rawEndTime;
      }
    }

    const mappedTransactions: ShiftTransaction[] = Array.isArray(dto.items) && dto.items.length > 0
      ? dto.items.map((it: any, idx: number) => ({
          id: it.id || `TX-${idx + 1}`,
          timestamp: it.createdAt ? (it.createdAt.includes('T') ? it.createdAt.split('T')[1].substring(0, 5) : it.createdAt) : formattedStart,
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

  private mapPaymentMethod(method?: string): ShiftPaymentMethod {
    if (!method) return 'cash';
    const m = method.toLowerCase();
    if (m.includes('vodafone')) return 'vodafone';
    if (m.includes('fawry')) return 'fawry';
    if (m.includes('insta')) return 'instapay';
    if (m.includes('petty')) return 'petty_cash';
    return 'cash';
  }

  /**
   * Helper to map ShiftDto to ShiftHistoryItem
   */
  private mapDtoToHistoryItem(dto: ShiftDto | any): ShiftHistoryItem {
    const rawTime = dto.timeFrom || dto.startTime || dto.date;
    const rawEndTime = dto.timeTo || dto.endTime;
    const finalTotal = dto.totalCost ?? dto.endCash ?? 0;
    const variance = (dto.increase || 0) - (dto.loss || 0) || (dto.difference ?? 0);
    
    const staffName = dto.userName || 'موظف الاستقبال';
    return {
      id: dto.id,
      staffName,
      staffAvatar: getSafeAvatar(dto.userAvatar || dto.avatar, staffName),
      date: rawTime ? String(rawTime).split('T')[0] : new Date().toLocaleDateString('ar-EG'),
      startTime: rawTime ? (rawTime.includes('T') ? rawTime.split('T')[1].substring(0, 5) : rawTime) : '09:00 AM',
      endTime: rawEndTime ? (rawEndTime.includes('T') ? rawEndTime.split('T')[1].substring(0, 5) : rawEndTime) : '05:00 PM',
      cashIn: dto.totalCost ?? dto.systemCash ?? 0,
      cashOut: dto.administrative ?? 0,
      finalTotal: finalTotal,
      variance: variance,
      status: Math.abs(variance) < 0.01 ? 'balanced' : 'disputed'
    };
  }
}
