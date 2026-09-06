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

  isInsufficient = computed(() => {
    const d = this.data();
    if (d.payment.selectedMethod === 'package') return false;
    const finalTotal = d.financialBreakdown.finalTotal;
    if (finalTotal <= 0) return false;
    const received = d.payment.amountReceived;
    return received === null || isNaN(received) || received <= 0;
  });

  isPartialPayment = computed(() => {
    const d = this.data();
    if (d.payment.selectedMethod === 'package') return false;
    const finalTotal = d.financialBreakdown.finalTotal;
    const received = d.payment.amountReceived;
    return received !== null && !isNaN(received) && received > 0 && received < finalTotal;
  });

  remainingBalance = computed(() => {
    const d = this.data();
    const finalTotal = d.financialBreakdown.finalTotal;
    const received = d.payment.amountReceived || 0;
    return Math.max(0, +(finalTotal - received).toFixed(2));
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

  onProcessPayment(): void {
    if (this.isInsufficient()) return;
    const d = this.data();
    this.processPayment.emit({
      paymentMethod: d.payment.selectedMethod,
      amountReceived: d.payment.amountReceived,
      changeDue: d.payment.changeDue,
      finalTotal: d.financialBreakdown.finalTotal,
      discountPercent: d.financialBreakdown.discountPercent,
      couponCode: d.financialBreakdown.couponCode
    });
  }
}
