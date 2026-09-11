import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/services/language.service';
import { AdminReservation } from '../../../core/models/classroom.model';

@Component({
  selector: 'app-reservation-detail-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reservation-detail-panel.component.html',
  styleUrl: './reservation-detail-panel.component.css'
})
export class ReservationDetailPanelComponent {
  private langService = inject(LanguageService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  isOpen = input<boolean>(false);
  reservation = input<AdminReservation | null>(null);

  closePanel = output<void>();
  editReservation = output<AdminReservation>();
  checkoutReservation = output<AdminReservation>();
 
  onClose(): void {
    this.closePanel.emit();
  }

  onEdit(): void {
    const res = this.reservation();
    if (res) {
      this.editReservation.emit(res);
    }
  }

  onCheckout(): void {
    const res = this.reservation();
    if (res && !this.isCompleted()) {
      this.checkoutReservation.emit(res);
    }
  }

  isCompleted(): boolean {
    const res = this.reservation();
    if (!res) return false;
    return res.status === 'completed' || (res as any).isCheckedOut === true || (res as any).status === 'checked_out';
  }

  discountAmount(): number {
    const res = this.reservation();
    if (!res) return 0;
    if (res.discount && res.discount > 0) return res.discount;
    if (res.costBreakdown?.earlyBirdDiscount && res.costBreakdown.earlyBirdDiscount > 0) {
      return res.costBreakdown.earlyBirdDiscount;
    }
    if ((res as any).discountAmount && (res as any).discountAmount > 0) {
      return (res as any).discountAmount;
    }
    if (res.discountPercent && res.discountPercent > 0) {
      const finalCost = res.costBreakdown?.total || res.cost || 0;
      // If finalCost is after discount of X%, original was finalCost / (1 - X/100)
      const pct = res.discountPercent;
      if (pct < 100) {
        const original = finalCost / (1 - pct / 100);
        return +(original - finalCost).toFixed(2);
      }
      return finalCost;
    }
    return 0;
  }

  discountPercentLabel(): string {
    const res = this.reservation();
    if (!res) return '';
    if (res.discountPercent && res.discountPercent > 0) return `${res.discountPercent}%`;
    const discount = this.discountAmount();
    const base = this.baseRateAmount();
    if (base > 0 && discount > 0) {
      return `${Math.round((discount / base) * 100)}%`;
    }
    return '';
  }

  baseRateAmount(): number {
    const res = this.reservation();
    if (!res) return 0;
    const finalTotal = res.costBreakdown?.total || res.cost || 0;
    const discount = this.discountAmount();
    if (res.costBreakdown?.baseRate && res.costBreakdown.baseRate > finalTotal) {
      return res.costBreakdown.baseRate;
    }
    return +(finalTotal + discount).toFixed(2);
  }
}

