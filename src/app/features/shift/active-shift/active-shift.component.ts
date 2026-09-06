import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ShiftService } from '../../../core/services/shift.service';
import { LanguageService } from '../../../core/services/language.service';
import { EndOfShiftModalComponent } from '../../../shared/components/end-of-shift-modal/end-of-shift-modal.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-active-shift',
  imports: [CommonModule, FormsModule, RouterLink, EndOfShiftModalComponent, CustomSelectComponent],
  templateUrl: './active-shift.component.html',
  styleUrl: './active-shift.component.css'
})
export class ActiveShiftComponent implements OnInit {
  private shiftService = inject(ShiftService);
  private langService = inject(LanguageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  hasActiveShift = this.shiftService.hasActiveShift;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['openClose'] === 'true' || params['close'] === 'true') {
        setTimeout(() => this.openCloseShiftModal(), 80);
      }
    });
  }

  // Metadata signals
  staffName = this.shiftService.activeStaffName;
  staffAvatar = this.shiftService.activeStaffAvatar;
  shiftStartTime = this.shiftService.shiftStartTime;
  shiftDuration = this.shiftService.shiftDuration;

  // 4 Payment Channels Signals
  openingCash = this.shiftService.openingCash;
  expectedCash = this.shiftService.expectedCash;
  vodafoneTotal = this.shiftService.vodafoneTotal;
  vodafoneInside = this.shiftService.vodafoneInside;
  vodafoneOutside = this.shiftService.vodafoneOutside;
  instapayTotal = this.shiftService.instapayTotal;
  instapayInside = this.shiftService.instapayInside;
  instapayOutside = this.shiftService.instapayOutside;
  fawryTotal = this.shiftService.fawryTotal;
  totalFinancialBalance = this.shiftService.totalFinancialBalance;
  adminFund = computed(() => this.shiftService.currentShift()?.adminFund ?? 0);

  // Operational Category Revenues
  workspaceCash = this.shiftService.workspaceCash;
  classroomCash = this.shiftService.classroomCash;
  packageCash = this.shiftService.packageCash;
  cateringCash = this.shiftService.cateringCash;
  otherIncome = this.shiftService.otherIncome;
  adminExpenses = this.shiftService.adminExpenses;
  posReceipts = this.shiftService.posReceipts;

  // Transaction Ledger, Search & Filter (Items 34, 35, 37)
  transactions = this.shiftService.transactions;
  selectedPaymentFilter = signal<string>('all');
  searchQuery = signal<string>('');

  paymentFilterOptions = computed<SelectOption[]>(() => [
    { label: this.t().allPaymentChannels, value: 'all' },
    { label: this.t().cashTillName, value: 'cash' },
    { label: this.t().vodafoneCashName, value: 'vodafone' },
    { label: this.t().instapayName, value: 'instapay' },
    { label: this.t().fawryName, value: 'fawry' }
  ]);

  filteredTransactions = computed(() => {
    let list = this.transactions();
    const filter = this.selectedPaymentFilter();
    const query = this.searchQuery().trim().toLowerCase();

    if (filter !== 'all') {
      list = list.filter(tx => tx.paymentMethod === filter);
    }

    if (query) {
      list = list.filter(tx =>
        (tx.details && tx.details.toLowerCase().includes(query)) ||
        (tx.id && tx.id.toLowerCase().includes(query)) ||
        (tx.staffName && tx.staffName.toLowerCase().includes(query)) ||
        (tx.timestamp && tx.timestamp.toLowerCase().includes(query)) ||
        (tx.amount && tx.amount.toString().includes(query))
      );
    }

    return list;
  });

  formatDuration = (str?: string) => this.langService.formatDurationLocale(str);

  // Currency text
  currencyText = computed(() => this.t().currency);

  // Modal State for Close Shift
  showCloseModal = signal<boolean>(false);

  openCloseShiftModal(): void {
    this.showCloseModal.set(true);
  }

  closeModal(): void {
    this.showCloseModal.set(false);
  }

  onShiftClosed(): void {
    this.showCloseModal.set(false);
    this.router.navigate(['/shift/history']);
  }
}
