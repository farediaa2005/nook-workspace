import { Component, inject, signal, computed, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../../core/services/shift.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-end-of-shift-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './end-of-shift-modal.component.html',
  styleUrl: './end-of-shift-modal.component.css'
})
export class EndOfShiftModalComponent implements OnInit {
  private shiftService = inject(ShiftService);
  private langService = inject(LanguageService);

  @Output() closed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  currencyText = computed(() => this.t().currency);

  // Financial summary signals directly from ShiftService
  openingCash = this.shiftService.openingCash;
  posReceipts = this.shiftService.posReceipts;
  adminExpenses = this.shiftService.adminExpenses;
  expectedCash = this.shiftService.expectedCash;

  // Digital channels expected balances
  vodafoneTotal = this.shiftService.vodafoneTotal;
  vodafoneInside = this.shiftService.vodafoneInside;
  vodafoneOutside = this.shiftService.vodafoneOutside;
  instapayTotal = this.shiftService.instapayTotal;
  fawryTotal = this.shiftService.fawryTotal;
  adminFund = computed(() => this.shiftService.currentShift()?.adminFund ?? 0);

  // Total combined expected balance across all 4 channels
  totalExpectedFinancial = computed(() => 
    this.expectedCash() + this.vodafoneTotal() + this.instapayTotal() + this.fawryTotal()
  );

  // Form inputs for 4 channels (accepts string or number from ngModel)
  actualCashInput = signal<number | string | null>('');
  actualVodafoneInput = signal<number | string | null>('');
  actualInstaPayInput = signal<number | string | null>('');
  actualFawryInput = signal<number | string | null>('');
  notes = signal<string>('');
  isSubmitting = signal<boolean>(false);

  ngOnInit(): void {
    // Pre-populate digital fields with their live system balance
    this.actualVodafoneInput.set(this.vodafoneTotal());
    this.actualInstaPayInput.set(this.instapayTotal());
    this.actualFawryInput.set(this.fawryTotal());
  }

  /**
   * Helper to safely parse inputs of type string | number | null | undefined
   */
  private parseNumber(val: string | number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') {
      return isNaN(val) ? null : val;
    }
    const str = String(val).trim();
    if (str === '') return null;
    const num = Number(str);
    return isNaN(num) ? null : num;
  }

  // Parsed numerical values with safe parsing
  actualCash = computed<number | null>(() => {
    return this.parseNumber(this.actualCashInput());
  });

  actualVodafone = computed<number>(() => {
    const parsed = this.parseNumber(this.actualVodafoneInput());
    return parsed !== null ? parsed : this.vodafoneTotal();
  });

  actualInstaPay = computed<number>(() => {
    const parsed = this.parseNumber(this.actualInstaPayInput());
    return parsed !== null ? parsed : this.instapayTotal();
  });

  actualFawry = computed<number>(() => {
    const parsed = this.parseNumber(this.actualFawryInput());
    return parsed !== null ? parsed : this.fawryTotal();
  });

  // Variances per channel
  cashVariance = computed<number | null>(() => {
    const act = this.actualCash();
    if (act === null) return null;
    return act - this.expectedCash();
  });

  vodafoneVariance = computed<number>(() => {
    return this.actualVodafone() - this.vodafoneTotal();
  });

  instapayVariance = computed<number>(() => {
    return this.actualInstaPay() - this.instapayTotal();
  });

  fawryVariance = computed<number>(() => {
    return this.actualFawry() - this.fawryTotal();
  });

  // Total net variance across all 4 channels
  totalVariance = computed<number | null>(() => {
    const cv = this.cashVariance();
    if (cv === null) return null;
    return cv + this.vodafoneVariance() + this.instapayVariance() + this.fawryVariance();
  });

  isBalanced = computed<boolean>(() => {
    const tv = this.totalVariance();
    return tv !== null && Math.abs(tv) < 0.01;
  });

  isSurplus = computed<boolean>(() => {
    const tv = this.totalVariance();
    return tv !== null && tv > 0.01;
  });

  isShortage = computed<boolean>(() => {
    const tv = this.totalVariance();
    return tv !== null && tv < -0.01;
  });

  onCancel(): void {
    this.cancelled.emit();
  }

  onConfirm(): void {
    const actual = this.actualCash();
    if (actual === null || actual < 0) return;

    this.isSubmitting.set(true);
    this.shiftService.closeShiftWithReconciliation(
      actual, 
      this.actualVodafone(), 
      this.actualInstaPay(), 
      this.actualFawry(), 
      this.notes().trim() || undefined,
      (success) => {
        this.isSubmitting.set(false);
        if (success) {
          this.closed.emit();
        }
      }
    );
  }
}
