import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ShiftService } from '../../../core/services/shift.service';
import { LanguageService } from '../../../core/services/language.service';
import { ShiftRecord, ShiftHistoryItem, ShiftTransaction } from '../../../core/models/shift.model';
import { getSafeAvatar } from '../../../core/utils/avatar.util';
import { exportToCsv } from '../../../core/utils/csv.util';

@Component({
  selector: 'app-show-shift',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './show-shift.component.html',
  styleUrl: './show-shift.component.css'
})
export class ShowShiftComponent implements OnInit {
  private shiftService = inject(ShiftService);
  private langService = inject(LanguageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  currencyText = computed(() => this.t().currency);

  shiftId = signal<string>('');
  fetchedRecord = signal<ShiftRecord | null>(null);

  // Selected shift data
  activeShift = this.shiftService.currentShift;
  historyList = this.shiftService.historyItems;
  shiftRecords = this.shiftService.shiftHistory;

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.shiftId.set(id);
        this.loadShiftDetails(id);
      } else {
        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(q => {
          if (q['id']) {
            this.shiftId.set(q['id']);
            this.loadShiftDetails(q['id']);
          }
        });
      }
    });
  }

  private loadShiftDetails(id: string): void {
    if (id === 'active') {
      this.shiftService.fetchCurrentShiftFromApi();
    } else {
      this.shiftService.getShiftById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(record => {
        if (record) {
          this.fetchedRecord.set(record);
        }
      });
    }
  }

  // Selected or active shift record
  targetRecord = computed<ShiftRecord | null>(() => {
    const id = this.shiftId();
    const active = this.activeShift();

    if (id && active && (active.id === id || id === 'active')) {
      return active;
    }

    const fetched = this.fetchedRecord();
    if (fetched && (!id || fetched.id === id)) {
      return fetched;
    }

    if (id) {
      const found = this.shiftRecords().find(s => s.id === id);
      if (found) return found;
    }

    // Fallback to active shift if available, or first closed record
    if (active) return active;
    if (this.shiftRecords().length > 0) return this.shiftRecords()[0];
    return null;
  });

  // Target history item for variance calculations
  targetHistoryItem = computed<ShiftHistoryItem | null>(() => {
    const id = this.shiftId();
    if (id) {
      const found = this.historyList().find(h => h.id === id);
      if (found) return found;
    }
    if (this.historyList().length > 0) return this.historyList()[0];
    return null;
  });

  // Metadata properties
  displayStaffName = computed(() => this.targetRecord()?.staffName || this.targetHistoryItem()?.staffName || this.shiftService.activeStaffName());
  displayStaffAvatar = computed(() => getSafeAvatar(this.targetHistoryItem()?.staffAvatar || this.shiftService.activeStaffAvatar(), this.displayStaffName()));
  displayDate = computed(() => this.targetHistoryItem()?.date || new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }));
  displayStartTime = computed(() => this.targetRecord()?.startTime || this.targetHistoryItem()?.startTime || '09:00 AM');
  displayEndTime = computed(() => this.targetRecord()?.endTime || this.targetHistoryItem()?.endTime || 'Active');
  isShiftActive = computed(() => !this.targetRecord()?.endTime && this.targetRecord()?.status !== 'closed');
  shiftStatus = computed<'active' | 'balanced' | 'disputed'>(() => {
    if (this.isShiftActive()) return 'active';
    const hist = this.targetHistoryItem();
    return hist?.status || 'balanced';
  });

  // 4 Payment Channels
  openingCash = computed(() => this.targetRecord()?.initialCashDrawer ?? 0);
  vodafoneTotal = computed(() => {
    const r = this.targetRecord();
    if (!r) return 0;
    return (r.startVodafoneCash || 0) + (r.vodafoneCashInside || 0) - (r.vodafoneCashOutside || 0);
  });
  instapayTotal = computed(() => {
    const r = this.targetRecord();
    if (!r) return 0;
    return (r.startInstapay || 0) + (r.instapayCashInside || 0) - (r.instapayCashOutside || 0);
  });
  fawryTotal = computed(() => {
    const r = this.targetRecord();
    if (!r) return 0;
    return (r.startFawry || 0) + (r.fawryCashInside || 0) - (r.fawryCashOutside || 0);
  });

  // Operational Revenues
  workspaceRevenue = computed(() => this.targetRecord()?.workspaceRevenue ?? 0);
  classroomRevenue = computed(() => this.targetRecord()?.classroomRevenue ?? 0);
  packageRevenue = computed(() => this.targetRecord()?.packageRevenue ?? 0);
  cateringRevenue = computed(() => this.targetRecord()?.canteenRevenue ?? 0);
  otherIncome = computed(() => this.targetRecord()?.otherIncome ?? 0);
  adminExpenses = computed(() => this.targetRecord()?.adminExpenses ?? 0);

  posReceipts = computed(() =>
    this.workspaceRevenue() + this.classroomRevenue() + this.packageRevenue() + this.cateringRevenue() + this.otherIncome()
  );

  expectedCash = computed(() =>
    this.openingCash() + this.posReceipts() - this.adminExpenses()
  );

  actualFinalCash = computed(() => {
    const hist = this.targetHistoryItem();
    if (hist) return hist.finalTotal;
    return this.expectedCash();
  });

  varianceAmount = computed(() => {
    const hist = this.targetHistoryItem();
    if (hist) return hist.variance;
    return 0;
  });

  // Transactions list
  transactions = computed<ShiftTransaction[]>(() => {
    return this.targetRecord()?.transactions || [];
  });

  exportExcel(): void {
    const curr = this.currencyText();
    const isAr = this.isArabic();
    const txs = this.transactions();

    const headers = isAr
      ? ['الوقت', 'الوصف', 'التصنيف', 'طريقة الدفع', 'المبلغ']
      : ['Time', 'Description', 'Category', 'Payment Channel', 'Amount'];

    const rows = txs.map(t => [
      t.timestamp,
      t.details,
      t.type,
      t.paymentMethod,
      `${t.amount} ${curr}`
    ]);

    exportToCsv(`nook_shift_${this.shiftId() || 'report'}.csv`, headers, rows);
  }

  printReport(): void {
    window.print();
  }
}
