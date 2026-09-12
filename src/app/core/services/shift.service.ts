import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { catchError, of, finalize, Observable, map, tap, throwError, switchMap, forkJoin } from 'rxjs';
import { ShiftRecord, ShiftTransaction, ShiftHistoryItem, ShiftPaymentMethod, ShiftTransactionType } from '../models/shift.model';
import { AuthService } from './auth.service';
import { ShiftApiService } from './api/shift-api.service';
import { AccountApiService } from './api/account-api.service';
import { WorkspaceApiService } from './api/workspace-api.service';
import { ClassroomApiService } from './api/classroom-api.service';
import { WorkspacePackageApiService } from './api/workspace-package-api.service';
import { ClassroomPackageApiService } from './api/classroom-package-api.service';
import { LanguageService } from './language.service';
import { NotificationService } from './notification.service';
import { ShiftDto, CreateShiftItemDto, ShiftItemCategory } from '../models/shift-api.model';
import { getSafeAvatar } from '../utils/avatar.util';
import { parseIsoToLocal12h, parseIsoToLocalDate, getTodayDateISO } from '../utils/date-time.util';

@Injectable({
  providedIn: 'root'
})
export class ShiftService implements OnDestroy {
  private authService = inject(AuthService);
  private shiftApi = inject(ShiftApiService);
  private accountApi = inject(AccountApiService);
  private workspaceApi = inject(WorkspaceApiService);
  private classroomApi = inject(ClassroomApiService);
  private wpApi = inject(WorkspacePackageApiService);
  private cpApi = inject(ClassroomPackageApiService);
  private langService = inject(LanguageService);
  private notification = inject(NotificationService);

  private timerIntervalId: any = null;
  private autoSyncIntervalId: any = null;

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

  readonly isViewOnly = computed(() => !this.hasActiveShift());

  /** Guard check to prevent modifications/transactions when in View-Only mode (no active shift) */
  public guardActiveShift(actionName?: string): boolean {
    if (this.hasActiveShift()) {
      return true;
    }
    const msg = this.langService.isArabic()
      ? `لا يمكن تنفيذ ${actionName ? '"' + actionName + '"' : 'هذه العملية'}: يجب فتح شيفت أولاً! النظام حالياً في وضع المشاهدة فقط (View-Only).`
      : `Cannot perform ${actionName ? '"' + actionName + '"' : 'action'}: An active shift is required! You are in View-Only mode.`;
    this.notification.show(msg, 'error');
    return false;
  }

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

  // Digital Receipts Total (فودافون كاش + إنستاباي + فوري)
  readonly digitalReceipts = computed(() =>
    this.vodafoneInside() + this.instapayInside() + this.fawryInside()
  );

  // Physical Expected Drawer Cash (الخزينة النقدية الفعلية - يستبعد المحافظ الرقمية وإيرادات الباقات)
  readonly expectedCash = computed(() => {
    const shift = this.currentShift();
    if (!shift) return 0;

    const opening = this.openingCash();
    const receipts = this.posReceipts();
    const digitalIn = this.digitalReceipts();

    const txs = shift.transactions || [];
    let cashOut = 0;
    if (txs.length > 0) {
      cashOut = txs
        .filter(t => (t.paymentMethod === 'cash' || t.paymentMethod === 'petty_cash' || !t.paymentMethod || t.paymentMethod === '-') && (t.type === 'expense' || t.amount < 0))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    } else {
      cashOut = this.adminExpenses();
    }

    const netCashIn = Math.max(0, +(receipts - digitalIn).toFixed(2));
    return +(opening + netCashIn - cashOut).toFixed(2);
  });

  // Total Combined Business Balance across all 4 channels
  readonly totalFinancialBalance = computed(() =>
    +(this.expectedCash() + this.vodafoneTotal() + this.instapayTotal() + this.fawryTotal()).toFixed(2)
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
   * Robust helper to accurately detect if a ShiftDto represents an active open shift.
   * Handles numeric SessionStatus enum (1=Active, 2=Completed, 3=Scheduled, 4=Cancelled),
   * string enums ('active', 'completed'), null/undefined end timestamps, and default C# DateTime ('0001-01-01T00:00:00').
   */
  public isShiftActiveDto(dto: any): boolean {
    if (!dto || typeof dto !== 'object') return false;

    // 1. Explicit status field check
    const rawStatus = dto.status !== undefined && dto.status !== null ? String(dto.status).toLowerCase().trim() : '';
    if (rawStatus === '1' || rawStatus === 'active') {
      return true;
    }
    if (rawStatus === '2' || rawStatus === 'completed' || rawStatus === 'closed' || rawStatus === 'cancelled' || rawStatus === '4') {
      return false;
    }

    // 2. End time check (timeTo / endTime)
    const rawEndTime = dto.timeTo || dto.endTime;
    if (!rawEndTime || rawEndTime === 'null' || rawEndTime === 'undefined') {
      return true;
    }
    const strEndTime = String(rawEndTime).trim();
    if (strEndTime === '' || strEndTime.startsWith('0001') || strEndTime.startsWith('1970')) {
      return true;
    }

    try {
      const endDate = new Date(strEndTime);
      if (isNaN(endDate.getTime()) || endDate.getFullYear() < 2000) {
        return true;
      }
    } catch {}

    return false;
  }

  /**
   * Helper to load full shift details and live domain financial aggregation across all department APIs
   */
  private loadAndSetActiveShift(activeDto: ShiftDto): void {
    this.syncLiveDomainFinancials(activeDto).subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.currentShift.set(this.mapDtoToShiftRecord(activeDto));
      }
    });
  }

  /**
   * Live Domain Financial Aggregator:
   * Issues parallel GET requests to all domain REST APIs (Workspaces, Classrooms, Packages, Shifts),
   * filtered strictly by the timeframe of the active shift (timeFrom to timeTo / now).
   * Dynamically sums revenue categories and payment channel flows without local storage.
   */
  public syncLiveDomainFinancials(activeDto: ShiftDto): Observable<ShiftRecord> {
    const rawStart = activeDto.timeFrom || activeDto.date || activeDto.startTime || new Date().toISOString();
    const startDate = new Date(rawStart);
    const startIso = !isNaN(startDate.getTime()) ? startDate.toISOString() : new Date().toISOString();

    return forkJoin({
      sessions: this.workspaceApi.getSessions({ DateFrom: startIso }).pipe(catchError(() => of([]))),
      classrooms: this.classroomApi.getClassrooms({ DateFrom: startIso }).pipe(catchError(() => of([]))),
      wPackages: this.wpApi.getPackages().pipe(catchError(() => of([]))),
      cPackages: this.cpApi.getPackages().pipe(catchError(() => of([]))),
      detailDto: activeDto.id && !activeDto.id.startsWith('SHIFT-') ? this.shiftApi.getShiftById(activeDto.id).pipe(catchError(() => of(null))) : of(null)
    }).pipe(
      map(({ sessions, classrooms, wPackages, cPackages, detailDto }) => {
        const mergedDto: ShiftDto = {
          ...activeDto,
          ...(detailDto || {}),
          items: detailDto?.items || activeDto.items || []
        };

        const record = this.mapDtoToShiftRecord(mergedDto);
        const shiftStartMs = !isNaN(startDate.getTime()) ? startDate.getTime() : 0;

        let liveWorkspaceRev = 0;
        let liveClassroomRev = 0;
        let livePackageRev = 0;
        let liveCanteenRev = 0;
        let liveOtherRev = 0;

        let vfIn = record.startVodafoneCash || 0;
        let vfOut = 0;
        let ipIn = record.startInstapay || 0;
        let ipOut = 0;
        let fwIn = record.startFawry || 0;
        let fwOut = 0;

        const liveLedger: ShiftTransaction[] = [];

        // First pass: Calculate catering and printing items total and check for explicit category tags
        let shiftCateringItemsSum = 0;
        let shiftPrintingItemsSum = 0;
        let hasExplicitTaggedItems = false;
        (mergedDto.items || []).forEach((it: any) => {
          const desc = String(it.item || it.description || '').toLowerCase();
          const amt = Math.abs(Number(it.cost ?? it.amount ?? 0));
          if (desc.includes('[كافيه]')) {
            shiftCateringItemsSum += amt;
            hasExplicitTaggedItems = true;
          } else if (desc.includes('[طباعة]')) {
            shiftPrintingItemsSum += amt;
            hasExplicitTaggedItems = true;
          } else if (desc.includes('[جلسة]') || desc.includes('[مصروف]') || desc.includes('[قاعة]') || desc.includes('[باقة]') || desc.includes('[إيراد]')) {
            hasExplicitTaggedItems = true;
          } else if (desc.includes('مشروب') || desc.includes('كافيه') || desc.includes('سناكس') || desc.includes('canteen') || desc.includes('catering')) {
            shiftCateringItemsSum += amt;
          } else if (desc.includes('طباعة') || desc.includes('تصوير') || desc.includes('ورق') || desc.includes('printing') || desc.includes('paper')) {
            shiftPrintingItemsSum += amt;
          }
        });

        // 1. Process Workspace Sessions (Workspaces API)
        (sessions || []).forEach((sess: any) => {
          const sessDateStr = sess.timeTo || sess.date || sess.timeFrom;
          const sessMs = sessDateStr ? new Date(sessDateStr).getTime() : 0;
          const isCompleted = sess.status === 2 || String(sess.status).toLowerCase() === 'completed' || !!sess.timeTo;

          if (isCompleted && sessMs >= shiftStartMs) {
            const payWay = Number(sess.payWay ?? (sess.paymentMethod === 'Visa' || sess.paymentMethod === 'Vodafone' ? 2 : (sess.paymentMethod === 'Instapay' ? 3 : (sess.paymentMethod === 'Fawry' ? 4 : 1))));
            const payMethodStr: ShiftPaymentMethod = payWay === 2 ? 'vodafone' : (payWay === 3 ? 'instapay' : (payWay === 4 ? 'fawry' : (sess.paymentMethod === 'Package' ? 'package' : 'cash')));

            const totalPaid = Number(sess.paidAmount ?? sess.cost ?? sess.totalCost ?? 0);
            const canteenAmt = Number(sess.catering ?? sess.cateringTotal ?? sess.canteenTotal ?? 0);
            const printingAmt = Number(sess.printing ?? sess.printingCharges ?? 0);
            const baseWsAmt = Math.max(0, +(totalPaid - canteenAmt - printingAmt).toFixed(2));

            if (payMethodStr !== 'package' && !hasExplicitTaggedItems) {
              liveWorkspaceRev += baseWsAmt > 0 ? baseWsAmt : totalPaid;
              liveCanteenRev += canteenAmt;
              liveOtherRev += printingAmt;

              if (payWay === 2) vfIn += totalPaid;
              else if (payWay === 3) ipIn += totalPaid;
              else if (payWay === 4) fwIn += totalPaid;
            }

            if ((!mergedDto.items || mergedDto.items.length === 0) && totalPaid > 0) {
              liveLedger.push({
                id: sess.id || `WS-${Date.now().toString().slice(-4)}`,
                timestamp: parseIsoToLocal12h(sessDateStr),
                details: `محاسبة جلسة طالب (ساعات وقعدة) - ${sess.studentName || 'طالب'}`,
                type: 'workspace',
                paymentMethod: payMethodStr,
                amount: totalPaid,
                flowDirection: 'inside',
                staffName: record.staffName
              });
            }
          }
        });

        // 2. Process Classroom Sessions (Classrooms API)
        (classrooms || []).forEach((cls: any) => {
          const clsDateStr = cls.timeTo || cls.date || cls.timeFrom;
          const clsMs = clsDateStr ? new Date(clsDateStr).getTime() : 0;
          const isCompleted = cls.status === 2 || String(cls.status).toLowerCase() === 'completed' || !!cls.timeTo;

          if (isCompleted && clsMs >= shiftStartMs) {
            const payWay = Number(cls.payWay ?? (cls.paymentMethod === 'Vodafone' || cls.paymentMethod === 'vodafone' ? 2 : (cls.paymentMethod === 'Instapay' || cls.paymentMethod === 'instapay' ? 3 : (cls.paymentMethod === 'Fawry' || cls.paymentMethod === 'fawry' ? 4 : 1))));
            const payMethodStr: ShiftPaymentMethod = payWay === 2 ? 'vodafone' : (payWay === 3 ? 'instapay' : (payWay === 4 ? 'fawry' : (cls.paymentMethod === 'Package' ? 'package' : 'cash')));

            const totalPaid = Number(cls.paidAmount ?? cls.reservationCost ?? cls.hourlyRate ?? 0);
            const canteenAmt = Number(cls.catering ?? 0);
            const printingAmt = Number(cls.printing ?? 0);
            const roomOnlyAmt = Math.max(0, +(totalPaid - canteenAmt - printingAmt).toFixed(2));

            if (payMethodStr !== 'package' && !hasExplicitTaggedItems) {
              liveClassroomRev += roomOnlyAmt > 0 ? roomOnlyAmt : totalPaid;
              liveCanteenRev += canteenAmt;
              liveOtherRev += printingAmt;

              if (payWay === 2) vfIn += totalPaid;
              else if (payWay === 3) ipIn += totalPaid;
              else if (payWay === 4) fwIn += totalPaid;
            }

            if ((!mergedDto.items || mergedDto.items.length === 0) && totalPaid > 0) {
              liveLedger.push({
                id: cls.id || `CLS-${Date.now().toString().slice(-4)}`,
                timestamp: parseIsoToLocal12h(clsDateStr),
                details: `إنهاء حجز قاعة - ${cls.activity || cls.title || 'قاعة'} (${cls.instructorName || 'حجز'})`,
                type: 'classroom',
                paymentMethod: payMethodStr,
                amount: totalPaid,
                flowDirection: 'inside',
                staffName: record.staffName
              });
            }
          }
        });

        // 3. Process Workspace Packages (WorkspacePackages API)
        (wPackages || []).forEach((pkg: any) => {
          const pkgDateStr = pkg.purchasedAt || pkg.dateFrom || pkg.createdAt;
          const pkgMs = pkgDateStr ? new Date(pkgDateStr).getTime() : 0;

          if (pkgMs >= shiftStartMs) {
            const payWay = Number(pkg.payWay ?? 1);
            const payMethodStr: ShiftPaymentMethod = payWay === 2 ? 'vodafone' : (payWay === 3 ? 'instapay' : (payWay === 4 ? 'fawry' : 'cash'));
            const cost = Number(pkg.cost ?? pkg.price ?? pkg.paidAmount ?? 0);

            livePackageRev += cost;
            if (payWay === 2) vfIn += cost;
            else if (payWay === 3) ipIn += cost;
            else if (payWay === 4) fwIn += cost;

            if (cost > 0) {
              liveLedger.push({
                id: pkg.id || `PKG-${Date.now().toString().slice(-4)}`,
                timestamp: parseIsoToLocal12h(pkgDateStr),
                details: `شراء باقة طلاب - ${pkg.packageName || 'باقة ساعات'}`,
                type: 'package',
                paymentMethod: payMethodStr,
                amount: cost,
                flowDirection: 'inside',
                staffName: record.staffName
              });
            }
          }
        });

        // 4. Process Classroom Packages (ClassroomPackages API)
        (cPackages || []).forEach((pkg: any) => {
          const pkgDateStr = pkg.purchasedAt || pkg.dateFrom || pkg.createdAt;
          const pkgMs = pkgDateStr ? new Date(pkgDateStr).getTime() : 0;

          if (pkgMs >= shiftStartMs) {
            const payWay = Number(pkg.payWay ?? 1);
            const payMethodStr: ShiftPaymentMethod = payWay === 2 ? 'vodafone' : (payWay === 3 ? 'instapay' : (payWay === 4 ? 'fawry' : 'cash'));
            const cost = Number(pkg.cost ?? pkg.price ?? pkg.paidAmount ?? 0);

            livePackageRev += cost;
            if (payWay === 2) vfIn += cost;
            else if (payWay === 3) ipIn += cost;
            else if (payWay === 4) fwIn += cost;

            if (cost > 0) {
              liveLedger.push({
                id: pkg.id || `CPKG-${Date.now().toString().slice(-4)}`,
                timestamp: parseIsoToLocal12h(pkgDateStr),
                details: `شراء باقة محاضرين - ${pkg.packageName || 'باقة قاعات'}`,
                type: 'package',
                paymentMethod: payMethodStr,
                amount: cost,
                flowDirection: 'inside',
                staffName: record.staffName
              });
            }
          }
        });

        // 5. Merge Manual Shift Items (Expenses and Revenue items from mergedDto.items)
        let adminExpenses = 0;

        (mergedDto.items || []).forEach((it: any) => {
          const cat = Number(it.category);
          const t = String(it.type || '').toLowerCase();
          const rawDesc = String(it.item || it.description || '').trim();
          const desc = rawDesc.toLowerCase();
          const cleanDesc = rawDesc.replace(/^\[[^\]]+\]\s*/, '');
          const rawAmt = Number(it.cost ?? it.amount ?? 0);
          const amt = Math.abs(rawAmt);
          const payWay = Number(it.payWay ?? 1);
          const payMethodStr: ShiftPaymentMethod = payWay === 2 ? 'vodafone' : (payWay === 3 ? 'instapay' : (payWay === 4 ? 'fawry' : 'cash'));

          if (amt <= 0) return;

          // Skip generic untagged backend checkout items (e.g. "Student checkout", "تشيك أوت قاعة") when explicit tagged items exist to prevent double counting
          const isGenericCheckout = !rawDesc.startsWith('[') && (
            desc.includes('student checkout') ||
            desc.includes('checkout student') ||
            desc.includes('classroom checkout') ||
            desc.includes('checkout classroom') ||
            desc.includes('تشيك أوت قاعة') ||
            (desc.includes('تشيك أوت') && (desc.includes('طالب') || desc.includes('قاعة') || desc.includes('روم')))
          );
          if (isGenericCheckout && hasExplicitTaggedItems) {
            return;
          }

          const isExplicitRevenue = t === 'revenue' || t === 'income' || desc.includes('[كافيه]') || desc.includes('[طباعة]') || desc.includes('[إيراد]') || desc.includes('[جلسة]') || desc.includes('[قاعة]') || desc.includes('[باقة]');
          const isExpense = !isExplicitRevenue && (
            t === 'expense' ||
            desc.includes('[مصروف]') ||
            desc.includes('مصروف') ||
            desc.includes('نثريات') ||
            desc.includes('فاتورة') ||
            desc.includes('صيانة') ||
            desc.includes('نظافة') ||
            desc.includes('ضيافة') ||
            desc.includes('غاز') ||
            (desc.includes('مياه') && !desc.includes('معدنية')) ||
            desc.includes('كهرباء') ||
            desc.includes('نت')
          );

          if (isExpense && amt > 0) {
            adminExpenses += amt;
            if (payWay === 2) vfOut += amt;
            else if (payWay === 3) ipOut += amt;
            else if (payWay === 4) fwOut += amt;

            liveLedger.push({
              id: it.id || `EXP-${Date.now().toString().slice(-4)}`,
              timestamp: parseIsoToLocal12h(it.createdAt),
              details: cleanDesc || 'مصروفات ونثريات',
              type: 'expense',
              paymentMethod: payMethodStr,
              amount: -amt,
              flowDirection: 'outside',
              staffName: record.staffName
            });
          } else if (!isExpense && amt > 0) {
            // Manual Revenue Item / Shift Item classification
            let itemType: ShiftTransactionType = 'other';
            let itemCategoryAmt = amt;

            if (desc.includes('[كافيه]') || t === 'canteen' || desc.includes('كافيه') || desc.includes('مشروب') || desc.includes('بوفيه') || desc.includes('سناكس') || desc.includes('canteen') || desc.includes('catering') || desc.includes('coffee') || desc.includes('tea')) {
              itemType = 'canteen';
              liveCanteenRev += amt;
            } else if (desc.includes('[طباعة]') || desc.includes('طباعة') || desc.includes('تصوير') || desc.includes('ورق') || desc.includes('مطبوعات') || desc.includes('printing') || desc.includes('paper') || desc.includes('print') || desc.includes('copy')) {
              itemType = 'other';
              liveOtherRev += amt;
            } else if (desc.includes('[جلسة]') || t === 'workspace' || desc.includes('جلسة') || desc.includes('طالب') || desc.includes('ساعات') || desc.includes('سبيس') || desc.includes('student') || desc.includes('checkout') || desc.includes('workspace') || desc.includes('session')) {
              itemType = 'workspace';
              if (rawDesc.startsWith('[')) {
                itemCategoryAmt = amt;
              } else {
                const wsOnlyCost = Math.max(0, +(amt - shiftCateringItemsSum - shiftPrintingItemsSum).toFixed(2));
                itemCategoryAmt = wsOnlyCost > 0 ? wsOnlyCost : amt;
              }
              liveWorkspaceRev += itemCategoryAmt;
            } else if (desc.includes('[قاعة]') || t === 'classroom' || desc.includes('قاعة') || desc.includes('روم') || desc.includes('كلاس') || desc.includes('classroom') || desc.includes('room') || desc.includes('instructor')) {
              itemType = 'classroom';
              liveClassroomRev += amt;
            } else if (desc.includes('[باقة]') || t === 'package' || desc.includes('باقة') || desc.includes('package') || desc.includes('subscription')) {
              itemType = 'package';
              livePackageRev += amt;
            } else {
              itemType = 'other';
              liveOtherRev += amt;
            }

            if (payWay === 2) vfIn += amt;
            else if (payWay === 3) ipIn += amt;
            else if (payWay === 4) fwIn += amt;

            liveLedger.push({
              id: it.id || `REV-${Date.now().toString().slice(-4)}`,
              timestamp: parseIsoToLocal12h(it.createdAt),
              details: cleanDesc || 'إيراد إضافي',
              type: itemType,
              paymentMethod: payMethodStr,
              amount: amt,
              flowDirection: 'inside',
              staffName: record.staffName
            });
          }
        });

        // Merge local in-memory transactions if present
        const combinedLedger = [...liveLedger];
        (record.transactions || []).forEach(tx => {
          if (Math.abs(tx.amount || 0) <= 0) return;
          const isGenericCheckout = (tx.details || '').toLowerCase().includes('student checkout') && !tx.details?.startsWith('[');
          if (isGenericCheckout && hasExplicitTaggedItems) return;

          if (!combinedLedger.some(l => l.id === tx.id || (l.details === tx.details && l.amount === tx.amount))) {
            combinedLedger.push(tx);
          }
        });

        const totalRev = +(liveWorkspaceRev + liveClassroomRev + livePackageRev + liveCanteenRev + liveOtherRev).toFixed(2);

        const updatedRecord: ShiftRecord = {
          ...record,
          workspaceRevenue: liveWorkspaceRev,
          classroomRevenue: liveClassroomRev,
          packageRevenue: livePackageRev,
          canteenRevenue: liveCanteenRev,
          otherIncome: liveOtherRev,
          adminExpenses: adminExpenses,
          vodafoneCashInside: vfIn,
          vodafoneCashOutside: vfOut,
          instapayCashInside: ipIn,
          instapayCashOutside: ipOut,
          fawryCashInside: fwIn,
          fawryCashOutside: fwOut,
          totalRevenue: totalRev,
          transactionsCount: combinedLedger.length,
          transactions: combinedLedger
        };

        this.currentShift.set(updatedRecord);
        return updatedRecord;
      })
    );
  }

  /**
   * Fetch current active shift from backend API across all fallback endpoints:
   * 1. GET /api/Shifts/current
   * 2. GET /api/Shifts/open/{userId}
   * 3. GET /api/Shifts (find any active shift in system)
   */
  fetchCurrentShiftFromApi(): void {
    if (!this.authService.isAuthenticated()) return;
    this.isLoading.set(true);
    this.error.set(null);

    // Call dedicated GET /api/Shifts/current
    this.shiftApi.getCurrentShift().subscribe({
      next: (currentDto) => {
        if (currentDto && this.isShiftActiveDto(currentDto)) {
          this.loadAndSetActiveShift(currentDto);
        } else {
          // Fallback 1: check getOpenShift(userId)
          const user = this.authService.getUser();
          const userId = user?.id || (user as any)?.userId || (user as any)?.sub;
          const checkOpenShift$ = userId ? this.shiftApi.getOpenShift(userId) : of(null);

          checkOpenShift$.subscribe({
            next: (openDto) => {
              if (openDto && this.isShiftActiveDto(openDto)) {
                this.loadAndSetActiveShift(openDto);
              } else {
                // Fallback 2: check full getShifts() list to find any active shift opened by any device/staff
                this.shiftApi.getShifts().subscribe({
                  next: (apiShifts) => {
                    if (Array.isArray(apiShifts) && apiShifts.length > 0) {
                      const activeDto = apiShifts.find((s: any) => this.isShiftActiveDto(s));
                      if (activeDto) {
                        this.loadAndSetActiveShift(activeDto);
                      } else {
                        this.isLoading.set(false);
                        this.currentShift.set(null);
                      }
                    } else {
                      this.isLoading.set(false);
                      this.currentShift.set(null);
                    }
                  },
                  error: () => {
                    this.isLoading.set(false);
                  }
                });
              }
            },
            error: () => {
              this.isLoading.set(false);
            }
          });
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Sync shifts from backend API and update signals
   */
  public syncShiftsFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.isLoadingHistory.set(true);

    this.shiftApi.getShifts().subscribe({
      next: (apiShifts) => {
        this.isLoadingHistory.set(false);
        if (Array.isArray(apiShifts)) {
          // Active shift
          const activeDto = apiShifts.find((s: any) => this.isShiftActiveDto(s));
          if (activeDto) {
            const mappedActive = this.mapDtoToShiftRecord(activeDto);
            this.currentShift.set(mappedActive);
          } else if (!this.hasActiveShift()) {
            this.currentShift.set(null);
          }

          // Closed shifts
          const closedDtos = apiShifts.filter((s: any) => !this.isShiftActiveDto(s));
          const records = closedDtos.map(s => this.mapDtoToShiftRecord(s));
          const items = closedDtos.map(s => this.mapDtoToHistoryItem(s));

          this.shiftHistory.set(records);
          this.historyItems.set(items);
        }
      },
      error: (err) => {
        this.isLoadingHistory.set(false);
        if (err?.status === 403) {
          console.info('[ShiftService] Shift history API requires elevated role (403 Forbidden).');
        } else {
          console.warn('[ShiftService] Error syncing shifts from backend:', err?.message || err);
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

    const createSuccessShift = (apiShift?: any) => {
      if (apiShift) {
        const record = this.mapDtoToShiftRecord(apiShift);
        record.startVodafoneCash = startVodafone;
        record.startInstapay = startInstaPay;
        record.startFawry = startFawry;
        if (!record.staffName || record.staffName === 'موظف الاستقبال') {
          record.staffName = targetStaffName;
        }
        this.currentShift.set(record);
      } else {
        const id = `SHIFT-${Date.now().toString().slice(-4)}`;
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
      }

      this.isLoading.set(false);
      this.syncShiftsFromBackend();
      if (onComplete) onComplete(true);
    };

    const attemptStart = (userIdToSend?: string, hasRetried: boolean = false) => {
      this.shiftApi.startShift({
        date: nowIso,
        timeFrom: nowIso,
        previousTotal: initialCash,
        userId: userIdToSend
      }).subscribe({
        next: (apiShift) => {
          createSuccessShift(apiShift);
        },
        error: (err) => {
          console.warn('[ShiftService] Failed to start shift on API:', err);
          const errorMsg: string = err?.error?.message || err?.message || '';

          // If still failing with employee error and haven't tried without userId yet:
          if (!hasRetried && userIdToSend) {
            console.info('[ShiftService] Retrying shift start without userId parameter...');
            attemptStart(undefined, true);
            return;
          }

          // If tried without userId and failed, try auto-linking staff profile
          if (!hasRetried && !userIdToSend && targetUserId) {
            this.accountApi.linkStaffProfile(targetUserId, {
              name: targetStaffName,
              staffRole: 1
            }).subscribe({
              next: (res: any) => {
                const linkedProfiles: any[] = res?.profiles || [];
                const staff = linkedProfiles.find(p => p.role === 1 || p.role === 2 || p.role === 'Staff' || p.role === 'Admin') || linkedProfiles[0];
                const resolvedId = staff?.profileId || res?.profileId || targetUserId;
                attemptStart(resolvedId, true);
              },
              error: () => {
                this.isLoading.set(false);
                const finalMsg = errorMsg || (this.langService.isArabic() ? 'فشل فتح الشفت' : 'Failed to start shift');
                if (onComplete) onComplete(false, finalMsg);
              }
            });
            return;
          }

          this.isLoading.set(false);
          const finalMsg = errorMsg || (this.langService.isArabic() ? 'فشل فتح الشفت' : 'Failed to start shift');

          // If backend indicates an active shift already exists across the system, sync it immediately
          if (errorMsg.includes('وردية نشطة') || errorMsg.includes('already') || errorMsg.includes('active') || err?.status === 400) {
            this.fetchCurrentShiftFromApi();
          }

          if (onComplete) onComplete(false, finalMsg);
        }
      });
    };

    // Step 1: Check if we have an account ID, resolve its Staff profile ID first
    if (targetUserId && /^[0-9a-fA-F-]{36}$/.test(targetUserId)) {
      this.accountApi.getAccountProfile(targetUserId).subscribe({
        next: (profileData: any) => {
          const profiles: any[] = profileData?.profiles || [];
          const staffProfile = profiles.find(p => p.role === 1 || p.role === 2 || p.role === 'Staff' || p.role === 'Admin') || profiles[0];
          const staffId = staffProfile?.profileId;

          if (staffId && /^[0-9a-fA-F-]{36}$/.test(staffId)) {
            // Found existing staff profileId!
            attemptStart(staffId);
          } else {
            // Account has no linked Staff profile yet -> Link now
            this.accountApi.linkStaffProfile(targetUserId, {
              name: targetStaffName,
              staffRole: 1
            }).subscribe({
              next: (linkRes: any) => {
                const linkedProfiles: any[] = linkRes?.profiles || [];
                const newStaff = linkedProfiles.find(p => p.role === 1 || p.role === 2 || p.role === 'Staff' || p.role === 'Admin') || linkedProfiles[0];
                const newStaffId = newStaff?.profileId || linkRes?.profileId;
                attemptStart(newStaffId || targetUserId);
              },
              error: () => {
                attemptStart(targetUserId);
              }
            });
          }
        },
        error: () => {
          attemptStart(targetUserId);
        }
      });
    } else {
      attemptStart(undefined);
    }
  }

  /**
   * Record a transaction under the currently active shift
   * POST /api/Shifts/{id}/items
   */
  recordTransaction(
    tx: Omit<ShiftTransaction, 'id' | 'timestamp' | 'staffName'> & { staffName?: string; timestamp?: string },
    skipApi: boolean = false
  ): void {
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

    const method = tx.paymentMethod;

    // 1. Digital Payment Channel Allocation
    if (method === 'vodafone') {
      if (tx.type === 'expense') vfOut += Math.abs(amount);
      else vfIn += amount;
    } else if (method === 'instapay') {
      if (tx.type === 'expense') ipOut += Math.abs(amount);
      else ipIn += amount;
    } else if (method === 'fawry') {
      if (tx.type === 'expense') fwOut += Math.abs(amount);
      else fwIn += amount;
    }

    // 2. Operational Revenue Categories (Skip adding new revenue if payment is by prepaid package usage)
    if (method !== 'package') {
      if (tx.type === 'canteen') canteenRev += amount;
      else if (tx.type === 'classroom') classroomRev += amount;
      else if (tx.type === 'workspace') workspaceRev += amount;
      else if (tx.type === 'package') packageRev += amount;
      else if (tx.type === 'other' || tx.type === 'printing' || (tx.type as string) === 'extra' || (tx.type as string) === 'settlement' || (tx.type as string) === 'deposit' || (tx.type as string) === 'revenue') otherRev += amount;
      else if (tx.type === 'expense') expenses += Math.abs(amount);
      else if (tx.type === 'vodafone_in') vfIn += amount;
      else if (tx.type === 'vodafone_out') vfOut += Math.abs(amount);
      else if (tx.type === 'instapay_in') ipIn += amount;
      else if (tx.type === 'instapay_out') ipOut += Math.abs(amount);
      else if (tx.type === 'fawry_in') fwIn += amount;
      else if (tx.type === 'fawry_out') fwOut += Math.abs(amount);
    }

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

    // Call Backend API ONLY for true expenses/petty cash items (غاز، مياه، نت، صيانة، نظافة، نثريات).
    // Business revenues (workspace sessions, classrooms, packages, canteen) are tracked by their own
    // respective backend APIs and aggregated into shift revenue automatically.
    // Posting revenues to /api/Shifts/{id}/items causes the backend to mistakenly accumulate them as Administrative expenses!
    if (!skipApi && current.id && !current.id.startsWith('SHIFT-') && tx.type === 'expense') {
      const payWayCode = tx.paymentMethod === 'vodafone' ? 2 : (tx.paymentMethod === 'instapay' ? 3 : (tx.paymentMethod === 'fawry' ? 4 : 1));
      const itemDto: CreateShiftItemDto = {
        cost: Math.abs(amount),
        type: 'Expense',
        payWay: payWayCode,
        item: tx.details || 'مصروفات ونثريات'
      };

      this.shiftApi.addShiftItem(current.id, itemDto).subscribe({
        error: (err) => console.warn('[ShiftService] Could not persist shift expense to API:', err)
      });
    }
  }

  /**
   * Add a manual shift item (Expense or Revenue) with full Observable lifecycle and server sync.
   * POST /api/Shifts/{id}/items
   */
  addManualShiftItem(params: {
    amount: number;
    type: 'expense' | 'revenue';
    paymentMethod: 'cash' | 'vodafone' | 'instapay' | 'fawry';
    description: string;
    category?: string;
  }): Observable<any> {
    const current = this.currentShift();
    if (!current) {
      return throwError(() => new Error('لا توجد وردية نشطة حالياً'));
    }

    const payWayCode = params.paymentMethod === 'vodafone' ? 2 : (params.paymentMethod === 'instapay' ? 3 : (params.paymentMethod === 'fawry' ? 4 : 1));

    let resolvedType: ShiftTransactionType = 'other';
    let tagPrefix = '';

    if (params.type === 'expense') {
      resolvedType = 'expense';
      tagPrefix = '[مصروف]';
    } else {
      const cat = (params.category || '').toLowerCase();
      const desc = (params.description || '').toLowerCase();

      if (cat === 'canteen' || desc.includes('كافيه') || desc.includes('مشروب') || desc.includes('بوفيه') || desc.includes('سناكس') || desc.includes('canteen') || desc.includes('catering')) {
        resolvedType = 'canteen';
        tagPrefix = '[كافيه]';
      } else if (cat === 'workspace' || desc.includes('طالب') || desc.includes('جلسة') || desc.includes('ساعات')) {
        resolvedType = 'workspace';
        tagPrefix = '[جلسة]';
      } else if (cat === 'classroom' || desc.includes('قاعة') || desc.includes('classroom')) {
        resolvedType = 'classroom';
        tagPrefix = '[قاعة]';
      } else if (cat === 'package' || desc.includes('باقة') || desc.includes('package')) {
        resolvedType = 'package';
        tagPrefix = '[باقة]';
      } else if (cat === 'printing' || desc.includes('طباعة') || desc.includes('ورق') || desc.includes('تصوير')) {
        resolvedType = 'other';
        tagPrefix = '[طباعة]';
      } else {
        resolvedType = 'other';
        tagPrefix = '[إيراد]';
      }
    }

    const taggedDescription = `${tagPrefix} ${params.description}`.trim();

    const itemDto: CreateShiftItemDto = {
      cost: params.amount,
      type: params.type === 'expense' ? 'Expense' : 'Revenue',
      payWay: payWayCode,
      item: taggedDescription
    };

    // 1. Record locally immediately for instant feedback
    this.recordTransaction({
      amount: params.amount,
      type: resolvedType,
      paymentMethod: params.paymentMethod,
      details: params.description
    }, true);

    // 2. Call backend API if real ID
    if (current.id && !current.id.startsWith('SHIFT-')) {
      return this.shiftApi.addShiftItem(current.id, itemDto).pipe(
        tap(() => {
          this.fetchCurrentShiftFromApi();
        })
      );
    }

    return of({ success: true });
  }

  /**
   * Adjust and reallocate shift revenues across operational categories.
   * Maintains total receipts and expected physical cash balance.
   */
  adjustShiftRevenues(adjustments: {
    canteenRevenue?: number;
    otherIncome?: number;
    workspaceRevenue?: number;
    classroomRevenue?: number;
  }): void {
    const current = this.currentShift();
    if (!current) return;

    const newCanteen = adjustments.canteenRevenue !== undefined ? Math.max(0, +adjustments.canteenRevenue.toFixed(2)) : (current.canteenRevenue || 0);
    const newOther = adjustments.otherIncome !== undefined ? Math.max(0, +adjustments.otherIncome.toFixed(2)) : (current.otherIncome || 0);
    const newClassroom = adjustments.classroomRevenue !== undefined ? Math.max(0, +adjustments.classroomRevenue.toFixed(2)) : (current.classroomRevenue || 0);

    let newWorkspace = current.workspaceRevenue || 0;
    if (adjustments.workspaceRevenue !== undefined) {
      newWorkspace = Math.max(0, +adjustments.workspaceRevenue.toFixed(2));
    } else {
      // Rebalance from workspace if canteen or other increased
      const pool = (current.workspaceRevenue || 0) + (current.canteenRevenue || 0) + (current.otherIncome || 0);
      const allocatedOthers = newCanteen + newOther;
      if (pool >= allocatedOthers) {
        newWorkspace = +(pool - allocatedOthers).toFixed(2);
      }
    }

    const total = +(newWorkspace + newClassroom + (current.packageRevenue || 0) + newCanteen + newOther).toFixed(2);

    this.currentShift.set({
      ...current,
      canteenRevenue: newCanteen,
      otherIncome: newOther,
      classroomRevenue: newClassroom,
      workspaceRevenue: newWorkspace,
      totalRevenue: total
    });
  }

  /**
   * Delete a shift transaction item from both the backend and local state.
   * DELETE /api/Shifts/{shiftId}/items/{itemId}
   */
  deleteShiftItem(itemId: string): Observable<boolean> {
    const current = this.currentShift();
    if (!current) {
      return throwError(() => new Error('لا توجد وردية نشطة'));
    }

    const updatedTxs = (current.transactions || []).filter(tx => tx.id !== itemId);

    let wsRev = 0, clsRev = 0, pkgRev = 0, cantRev = 0, othRev = 0, expAmt = 0;
    let vfIn = current.startVodafoneCash || 0, vfOut = 0;
    let ipIn = current.startInstapay || 0, ipOut = 0;
    let fwIn = current.startFawry || 0, fwOut = 0;

    updatedTxs.forEach(t => {
      if (t.type === 'workspace') wsRev += Math.max(0, t.amount);
      else if (t.type === 'classroom') clsRev += Math.max(0, t.amount);
      else if (t.type === 'package') pkgRev += Math.max(0, t.amount);
      else if (t.type === 'canteen') cantRev += Math.max(0, t.amount);
      else if (t.type === 'other' || t.type === 'printing') othRev += Math.max(0, t.amount);
      else if (t.type === 'expense') expAmt += Math.abs(t.amount);

      if (t.paymentMethod === 'vodafone') {
        if (t.type === 'expense') vfOut += Math.abs(t.amount);
        else vfIn += Math.max(0, t.amount);
      } else if (t.paymentMethod === 'instapay') {
        if (t.type === 'expense') ipOut += Math.abs(t.amount);
        else ipIn += Math.max(0, t.amount);
      } else if (t.paymentMethod === 'fawry') {
        if (t.type === 'expense') fwOut += Math.abs(t.amount);
        else fwIn += Math.max(0, t.amount);
      }
    });

    const totRev = +(wsRev + clsRev + pkgRev + cantRev + othRev).toFixed(2);

    this.currentShift.set({
      ...current,
      workspaceRevenue: wsRev,
      classroomRevenue: clsRev,
      packageRevenue: pkgRev,
      canteenRevenue: cantRev,
      otherIncome: othRev,
      adminExpenses: expAmt,
      vodafoneCashInside: vfIn,
      vodafoneCashOutside: vfOut,
      instapayCashInside: ipIn,
      instapayCashOutside: ipOut,
      fawryCashInside: fwIn,
      fawryCashOutside: fwOut,
      totalRevenue: totRev,
      transactions: updatedTxs,
      transactionsCount: updatedTxs.length
    });

    if (current.id && !current.id.startsWith('SHIFT-')) {
      return this.shiftApi.deleteShiftItem(current.id, itemId).pipe(
        tap(() => {
          this.fetchCurrentShiftFromApi();
        }),
        map(() => true),
        catchError((err) => {
          console.warn('[ShiftService] Failed to delete shift item on API:', err);
          return of(true);
        })
      );
    }

    return of(true);
  }

  deleteAllShiftItems(): Observable<boolean> {
    const current = this.currentShift();
    if (!current) return of(false);

    const txs = (current.transactions || []).filter(t => t.type !== 'system');
    if (txs.length === 0) {
      this.resetShiftDataForTesting();
      return of(true);
    }

    const calls = txs.map(t => {
      if (current.id && !current.id.startsWith('SHIFT-') && t.id) {
        return this.shiftApi.deleteShiftItem(current.id, t.id).pipe(catchError(() => of(null)));
      }
      return of(null);
    });

    return forkJoin(calls).pipe(
      tap(() => {
        this.resetShiftDataForTesting();
        this.fetchCurrentShiftFromApi();
      }),
      map(() => true)
    );
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

  resetShiftDataForTesting(): void {
    const active = this.currentShift();
    const formattedStart = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const cleanRecord: ShiftRecord = {
      id: active?.id || `SHIFT-${Date.now().toString().slice(-4)}`,
      staffName: active?.staffName || this.activeStaffName(),
      staffEmail: active?.staffEmail || '',
      role: active?.role || 'Staff',
      startTime: formattedStart,
      status: 'active',
      initialCashDrawer: 0,
      startVodafoneCash: 0,
      startInstapay: 0,
      startFawry: 0,
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
      transactionsCount: 0,
      transactions: []
    };

    this.currentShift.set(cleanRecord);
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
    const isActive = this.isShiftActiveDto(dto);
    const isClosed = !isActive;
    const opening = dto.previousTotal ?? dto.startCash ?? 0;

    const formattedStart = rawTime && !String(rawTime).startsWith('0001') ? parseIsoToLocal12h(rawTime) : '09:00 AM';
    const isRealEndTime = rawEndTime && !String(rawEndTime).startsWith('0001') && new Date(rawEndTime).getFullYear() >= 2000;
    const formattedEnd: string | undefined = isRealEndTime ? parseIsoToLocal12h(rawEndTime) : undefined;

    const mappedTransactions: ShiftTransaction[] = Array.isArray(dto.items) && dto.items.length > 0
      ? dto.items.map((it: any, idx: number) => {
          const itemDesc = String(it.item || it.description || 'معاملة');
          const rawType = String(it.type || '').toLowerCase();
          const descLower = itemDesc.toLowerCase();

          // Prioritize revenue categories FIRST so that student sessions, classrooms, and canteen
          // are NEVER classified as expenses, even if the backend previously saved them with category=5 or type='Expense'
          const isWorkspaceRevenue =
            rawType === 'workspace' ||
            descLower.includes('جلسة طالب') ||
            descLower.includes('محاسبة جلسة') ||
            descLower.includes('ساعات وقعدة') ||
            descLower.includes('جلسة') ||
            descLower.includes('طالب') ||
            descLower.includes('ورك سبيس') ||
            descLower.includes('workspace') ||
            descLower.includes('قعدة') ||
            descLower.includes('ساعات');

          const isClassroomRevenue =
            rawType === 'classroom' ||
            descLower.includes('حجز قاعة') ||
            descLower.includes('إيجار قاعة') ||
            descLower.includes('قاعة') ||
            descLower.includes('classroom') ||
            descLower.includes('ورشة') ||
            descLower.includes('workshop');

          const isPackageRevenue =
            rawType === 'package' ||
            descLower.includes('شراء باقة') ||
            descLower.includes('باقة') ||
            descLower.includes('package');

          const isCanteenRevenue =
            rawType === 'canteen' ||
            descLower.includes('كاترنج') ||
            descLower.includes('كافيتريا') ||
            descLower.includes('مشروبات') ||
            descLower.includes('سناكس') ||
            descLower.includes('كافيه') ||
            descLower.includes('قهوة') ||
            descLower.includes('شاي') ||
            descLower.includes('عصير') ||
            descLower.includes('مياه معدنية') ||
            descLower.includes('كانز') ||
            descLower.includes('بيبسي') ||
            descLower.includes('بوفيه') ||
            descLower.includes('canteen') ||
            descLower.includes('catering');

          const isOtherRevenue =
            rawType === 'other' ||
            rawType === 'revenue' ||
            descLower.includes('طباعة') ||
            descLower.includes('برنت') ||
            descLower.includes('ورق') ||
            descLower.includes('تصوير') ||
            descLower.includes('مطبوعات') ||
            descLower.includes('printing') ||
            descLower.includes('خدمات');

          let resolvedType: ShiftTransactionType = 'workspace';
          let isExpenseItem = false;

          if (isCanteenRevenue) {
            resolvedType = 'canteen';
          } else if (isOtherRevenue) {
            resolvedType = 'other';
          } else if (isClassroomRevenue) {
            resolvedType = 'classroom';
          } else if (isPackageRevenue) {
            resolvedType = 'package';
          } else if (isWorkspaceRevenue) {
            resolvedType = 'workspace';
          } else if (
            rawType === 'expense' ||
            rawType.includes('expense') ||
            Number(it.category) === 5 ||
            descLower.includes('مصروف') ||
            descLower.includes('نثريات') ||
            descLower.includes('فاتورة') ||
            descLower.includes('صيانة') ||
            descLower.includes('نظافة') ||
            descLower.includes('ضيافة') ||
            descLower.includes('غاز') ||
            (descLower.includes('مياه') && !descLower.includes('معدنية')) ||
            descLower.includes('كهرباء') ||
            descLower.includes('نت')
          ) {
            resolvedType = 'expense';
            isExpenseItem = true;
          } else if (descLower.includes('فودافون')) {
            resolvedType = isExpenseItem ? 'vodafone_out' : 'vodafone_in';
          } else if (descLower.includes('إنستاباي') || descLower.includes('انستاباي')) {
            resolvedType = isExpenseItem ? 'instapay_out' : 'instapay_in';
          } else if (descLower.includes('فوري')) {
            resolvedType = isExpenseItem ? 'fawry_out' : 'fawry_in';
          } else {
            resolvedType = 'workspace';
          }

          const rawAmount = Number(it.cost ?? it.amount ?? 0);
          const finalAmount = isExpenseItem ? -Math.abs(rawAmount) : Math.abs(rawAmount);

          const flowDirection: 'inside' | 'outside' | 'none' = isExpenseItem
            ? 'outside'
            : 'inside';

          return {
            id: it.id || `TX-${idx + 1}`,
            timestamp: it.createdAt ? parseIsoToLocal12h(it.createdAt) : formattedStart,
            details: itemDesc,
            type: resolvedType,
            paymentMethod: it.payWay === 2 ? 'vodafone' : (it.payWay === 3 ? 'instapay' : (it.payWay === 4 ? 'fawry' : 'cash')),
            amount: finalAmount,
            flowDirection,
            staffName: dto.userName || 'موظف الاستقبال'
          };
        })
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

    let canteenRev = dto.canteenRevenue !== undefined ? Number(dto.canteenRevenue) : 0;
    let classroomRev = dto.classroomRevenue !== undefined ? Number(dto.classroomRevenue) : 0;
    let workspaceRev = dto.workspaceRevenue !== undefined ? Number(dto.workspaceRevenue) : 0;
    let packageRev = dto.packageRevenue !== undefined ? Number(dto.packageRevenue) : 0;
    let otherRev = dto.otherIncome !== undefined ? Number(dto.otherIncome) : 0;
    let expenses = 0;

    if (Array.isArray(dto.items) && dto.items.length > 0) {
      const expenseItems = dto.items.filter((it: any) => {
        const cat = Number(it.category);
        const t = String(it.type || '').toLowerCase();
        const desc = String(it.item || it.description || '').toLowerCase();

        // Exclude revenue descriptions that were sent due to previous checkout bug
        const isRevenueText =
          desc.includes('جلسة طالب') ||
          desc.includes('حجز قاعة') ||
          desc.includes('شراء باقة') ||
          desc.includes('كافيتريا') ||
          desc.includes('طلب كاترنج') ||
          desc.includes('مشروبات') ||
          desc.includes('سناكس') ||
          desc.includes('شحن محفظة') ||
          desc.includes('طباعة') ||
          desc.includes('تصوير') ||
          desc.includes('طالب') ||
          desc.includes('ساعات') ||
          desc.includes('قعدة') ||
          desc.includes('محاسبة') ||
          desc.includes('ورك سبيس') ||
          desc.includes('بوفيه') ||
          t === 'revenue' ||
          t === 'workspace' ||
          t === 'classroom' ||
          t === 'package' ||
          t === 'canteen' ||
          t === 'other';

        const isExpenseType =
          cat === 5 ||
          t === 'expense' ||
          String(it.category).toLowerCase() === 'expense' ||
          desc.includes('مصروف') ||
          desc.includes('نثريات') ||
          desc.includes('فاتورة') ||
          desc.includes('صيانة') ||
          desc.includes('نظافة') ||
          desc.includes('ضيافة') ||
          desc.includes('غاز') ||
          (desc.includes('مياه') && !desc.includes('معدنية')) ||
          desc.includes('كهرباء') ||
          desc.includes('نت');

        return isExpenseType && !isRevenueText && Number(it.cost ?? it.amount ?? 0) > 0;
      });
      expenses = expenseItems.reduce((sum: number, it: any) => sum + Math.abs(Number(it.cost ?? it.amount ?? 0)), 0);
    } else {
      const rawAdmin = Number(dto.administrative ?? 0);
      const totalRev = Number(dto.totalRevenue ?? (canteenRev + classroomRev + workspaceRev + packageRev + otherRev));
      // Guard against corrupted administrative total where checkout revenues were accumulated as expenses
      if (rawAdmin > 0 && Math.abs(rawAdmin - totalRev) < 1.0 && totalRev > 0) {
        expenses = Number(dto.totalExpenses ?? 0);
      } else {
        expenses = Number(dto.totalExpenses ?? dto.administrative ?? 0);
      }
    }

    let vfIn = dto.vfCashInside ?? 0;
    let vfOut = dto.vfCashOutside ?? 0;
    let ipIn = dto.instapayInside ?? 0;
    let ipOut = dto.instapayOutside ?? 0;
    let fwIn = dto.fawryInside ?? 0;
    let fwOut = dto.fawryOutside ?? 0;

    if (Array.isArray(mappedTransactions) && mappedTransactions.length > 0) {
      const vfSum = mappedTransactions.filter(t => t.paymentMethod === 'vodafone' && t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const ipSum = mappedTransactions.filter(t => t.paymentMethod === 'instapay' && t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const fwSum = mappedTransactions.filter(t => t.paymentMethod === 'fawry' && t.amount > 0).reduce((s, t) => s + t.amount, 0);

      if (vfSum > vfIn) vfIn = vfSum;
      if (ipSum > ipIn) ipIn = ipSum;
      if (fwSum > fwIn) fwIn = fwSum;
    }

    // Separate Canteen & Other revenues from ledger transactions if backend returns 0 for them
    const ledgerCanteen = mappedTransactions
      .filter(t => t.type === 'canteen')
      .reduce((s, t) => s + Math.max(0, t.amount), 0);

    const ledgerOther = mappedTransactions
      .filter(t => t.type === 'other' || (t.type as string) === 'printing')
      .reduce((s, t) => s + Math.max(0, t.amount), 0);

    if (ledgerCanteen > 0 && (canteenRev === 0 || canteenRev < ledgerCanteen)) {
      const diff = +(ledgerCanteen - canteenRev).toFixed(2);
      canteenRev = ledgerCanteen;
      if (workspaceRev >= diff) {
        workspaceRev = +(workspaceRev - diff).toFixed(2);
      }
    }

    if (ledgerOther > 0 && (otherRev === 0 || otherRev < ledgerOther)) {
      const diff = +(ledgerOther - otherRev).toFixed(2);
      otherRev = ledgerOther;
      if (workspaceRev >= diff) {
        workspaceRev = +(workspaceRev - diff).toFixed(2);
      }
    }

    if (dto.canteenRevenue === undefined && dto.classroomRevenue === undefined && Array.isArray(dto.items)) {
      for (const it of dto.items) {
        const amt = Number(it.cost ?? it.amount ?? 0);
        const t = String(it.type || '').toLowerCase();
        const pay = Number(it.payWay); // 1=Cash, 2=Vodafone, 3=Instapay, 4=Fawry

        if (t === 'canteen' || t.includes('canteen') || t.includes('catering')) {
          if (canteenRev === 0) canteenRev += amt;
        } else if (t === 'classroom' || t.includes('classroom') || t.includes('room')) {
          if (classroomRev === 0) classroomRev += amt;
        } else if (t === 'workspace' || t.includes('workspace') || t.includes('student')) {
          if (workspaceRev === 0) workspaceRev += amt;
        } else if (t === 'package' || t.includes('package')) {
          if (packageRev === 0) packageRev += amt;
        } else if (t !== 'expense' && !t.includes('expense')) {
          otherRev += amt;
        }

        if (pay === 2) {
          if (t === 'expense') vfOut += Math.abs(amt);
          else vfIn += amt;
        } else if (pay === 3) {
          if (t === 'expense') ipOut += Math.abs(amt);
          else ipIn += amt;
        } else if (pay === 4) {
          if (t === 'expense') fwOut += Math.abs(amt);
          else fwIn += amt;
        }
      }
    }

    const totalRev = dto.totalRevenue ?? (canteenRev + classroomRev + workspaceRev + packageRev + otherRev);

    return {
      id: dto.id,
      staffName: dto.userName || 'موظف الاستقبال',
      staffEmail: '',
      role: 'Staff',
      startTime: formattedStart,
      endTime: formattedEnd,
      status: isClosed ? 'closed' : 'active',
      initialCashDrawer: opening,
      startVodafoneCash: dto.startVodafoneCash ?? 0,
      startInstapay: dto.startInstapay ?? 0,
      startFawry: dto.startFawry ?? 0,
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
      totalRevenue: totalRev || (dto.totalCost ?? dto.systemCash ?? 0),
      transactionsCount: dto.transactionsCount ?? mappedTransactions.length,
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
   * Recalculate current active shift financials live across all domain APIs
   */
  recalculateCurrentShift(): Observable<boolean> {
    const shift = this.currentShift();
    if (!shift || !shift.id) {
      return of(false);
    }

    const isRealGuid = /^[0-9a-fA-F-]{36}$/.test(shift.id);
    const recalc$ = isRealGuid ? this.shiftApi.recalculateShift(shift.id).pipe(catchError(() => of(null))) : of(null);

    return recalc$.pipe(
      switchMap((updatedDto) => {
        const targetDto: ShiftDto = updatedDto || { id: shift.id, timeFrom: shift.startTime, date: shift.startTime };
        return this.syncLiveDomainFinancials(targetDto).pipe(
          map(() => true),
          catchError(() => of(false))
        );
      })
    );
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
