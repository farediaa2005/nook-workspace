import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import {
  CheckoutData,
  PaymentMethodType,
  ProcessPaymentEvent
} from './checkout.models';

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout-modal.component.html',
  styleUrl: './checkout-modal.component.css'
})
export class CheckoutModalComponent {
  private langService = inject(LanguageService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  formatTime = (str?: string) => this.langService.formatTimeLocale(str);

  // Dynamic Input
  data = input.required<CheckoutData>();

  // Outputs
  close = output<void>();
  paymentMethodChange = output<PaymentMethodType>();
  amountReceivedChange = output<number | null>();
  discountChange = output<number>();
  couponSubmit = output<string>();
  addCatering = output<void>();
  removeCatering = output<string>();
  editRate = output<void>();
  editPrinting = output<void>();
  processPayment = output<ProcessPaymentEvent>();

  // Local state for expandable coupon/discount input
  localCouponInput = signal<string>('');
  customDiscountMode = signal<'percentage' | 'fixed'>('percentage');
  customDiscountInput = signal<number | null>(null);

  // Wallet Interaction State ('debit' = عليه / خصم أو مديونية, 'credit' = ليه / إضافة رصيد, 'none' = بدون)
  walletMode = signal<'none' | 'debit' | 'credit'>('none');
  walletInputAmount = signal<number | null>(null);

  // Net cash required from student after wallet deduction / credit
  netCashDue = computed(() => {
    const finalTotal = this.data().financialBreakdown.finalTotal || 0;
    const mode = this.walletMode();
    const amt = this.walletInputAmount() || 0;

    if (mode === 'debit') {
      return Math.max(0, +(finalTotal - amt).toFixed(2));
    } else if (mode === 'credit') {
      return +(finalTotal + amt).toFixed(2);
    }
    return finalTotal;
  });

  // Resulting wallet balance after checkout (supports negative balance as debt)
  newWalletBalance = computed(() => {
    const d = this.data();
    const prevWallet = d.financialBreakdown.walletBalance || 0;
    const mode = this.walletMode();
    const amt = this.walletInputAmount() || 0;

    if (mode === 'debit') {
      // عليه: خصم من المحفظة حتى لو بالسالب كمديونية
      return +(prevWallet - amt).toFixed(2);
    } else if (mode === 'credit') {
      // ليه: إضافة للمحفظة
      return +(prevWallet + amt).toFixed(2);
    }

    // Default mode 'none'
    const finalTotal = d.financialBreakdown.finalTotal || 0;
    const received = d.payment.amountReceived !== null && !isNaN(d.payment.amountReceived) ? d.payment.amountReceived : 0;
    return +(prevWallet + received - finalTotal).toFixed(2);
  });

  // Effective change due to customer
  effectiveChangeDue = computed(() => {
    const cashDue = this.netCashDue();
    const received = this.data().payment.amountReceived;
    if (received === null || isNaN(received) || received <= cashDue) return 0;
    return Math.max(0, +(received - cashDue).toFixed(2));
  });

  isInsufficient = computed(() => {
    const d = this.data();
    if (d.payment.selectedMethod === 'package') return false;
    const cashDue = this.netCashDue();
    // If cash due is 0 (fully covered or charged to wallet), it's never insufficient
    if (cashDue <= 0) return false;
    const received = d.payment.amountReceived;
    return received === null || isNaN(received) || received < 0;
  });

  isPartialPayment = computed(() => {
    const d = this.data();
    if (d.payment.selectedMethod === 'package') return false;
    const cashDue = this.netCashDue();
    if (cashDue <= 0) return false;
    const received = d.payment.amountReceived;
    return received !== null && !isNaN(received) && received >= 0 && received < cashDue;
  });

  remainingBalance = computed(() => {
    const cashDue = this.netCashDue();
    const received = this.data().payment.amountReceived || 0;
    return Math.max(0, +(cashDue - received).toFixed(2));
  });

  onCustomDiscountInput(val: string): void {
    const num = parseFloat(val);
    const subtotal = this.data().financialBreakdown.subtotal || 1;
    if (isNaN(num) || num <= 0) {
      this.discountChange.emit(0);
      return;
    }
    if (this.customDiscountMode() === 'percentage') {
      const pct = Math.min(100, Math.round(num));
      this.discountChange.emit(pct);
    } else {
      const pct = Math.min(100, Math.round((num / subtotal) * 100));
      this.discountChange.emit(pct);
    }
  }

  toggleDiscountMode(mode: 'percentage' | 'fixed'): void {
    this.customDiscountMode.set(mode);
    if (this.customDiscountInput() !== null) {
      this.onCustomDiscountInput(String(this.customDiscountInput()));
    }
  }

  selectPaymentMethod(method: PaymentMethodType): void {
    this.paymentMethodChange.emit(method);
  }

  onAmountInput(val: string): void {
    const num = val !== null && val !== '' ? +val : null;
    this.amountReceivedChange.emit(num);
  }

  setDiscount(pct: number): void {
    this.discountChange.emit(pct);
  }

  onApplyCoupon(): void {
    const code = this.localCouponInput().trim();
    if (code) {
      this.couponSubmit.emit(code);
    }
  }

  // Wallet Actions
  setWalletMode(mode: 'none' | 'debit' | 'credit'): void {
    if (this.walletMode() === mode) {
      this.walletMode.set('none');
      this.walletInputAmount.set(null);
      return;
    }
    this.walletMode.set(mode);
    if (mode === 'debit') {
      if (this.walletInputAmount() === null || this.walletInputAmount() === 0) {
        this.walletInputAmount.set(this.data().financialBreakdown.finalTotal);
      }
    } else if (mode === 'credit') {
      if (this.walletInputAmount() === null || this.walletInputAmount() === 0) {
        const change = this.effectiveChangeDue();
        this.walletInputAmount.set(change > 0 ? change : null);
      }
    } else {
      this.walletInputAmount.set(null);
    }
  }

  onWalletAmountInput(val: string): void {
    const parsed = val !== null && val !== '' ? parseFloat(val) : null;
    const num = parsed !== null && !isNaN(parsed) ? Math.max(0, parsed) : null;
    this.walletInputAmount.set(num);
    if (num !== null && num > 0 && this.walletMode() === 'none') {
      this.walletMode.set('debit');
    }
  }

  applyFullBillToWallet(): void {
    this.walletMode.set('debit');
    this.walletInputAmount.set(this.data().financialBreakdown.finalTotal);
  }

  applyAvailableWalletBalance(): void {
    this.walletMode.set('debit');
    const bal = Math.max(0, this.data().financialBreakdown.walletBalance || 0);
    this.walletInputAmount.set(bal);
  }

  depositChangeToWallet(): void {
    const change = this.effectiveChangeDue();
    if (change > 0) {
      this.walletMode.set('credit');
      this.walletInputAmount.set(change);
    }
  }

  quickAddCredit(amt: number): void {
    this.walletMode.set('credit');
    const cur = this.walletInputAmount() || 0;
    this.walletInputAmount.set(cur + amt);
  }

  clearWalletAdjustment(): void {
    this.walletMode.set('none');
    this.walletInputAmount.set(null);
  }

  onProcessPayment(): void {
    if (this.isInsufficient()) return;
    const d = this.data();
    const cashDue = this.netCashDue();
    const received = d.payment.amountReceived !== null && !isNaN(d.payment.amountReceived)
      ? d.payment.amountReceived
      : (cashDue <= 0 ? 0 : d.payment.amountReceived);

    this.processPayment.emit({
      paymentMethod: d.payment.selectedMethod,
      amountReceived: received,
      changeDue: this.effectiveChangeDue(),
      finalTotal: d.financialBreakdown.finalTotal,
      discountPercent: d.financialBreakdown.discountPercent,
      couponCode: d.financialBreakdown.couponCode,
      walletMode: this.walletMode(),
      walletAdjustment: this.walletInputAmount() || 0,
      newWalletBalance: this.newWalletBalance(),
      netCashDue: cashDue
    });
  }
}
