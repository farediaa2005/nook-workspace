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
  cancelReservation = output<AdminReservation>();
  checkoutReservation = output<AdminReservation>();
  deleteReservation = output<AdminReservation>();
  startSession = output<AdminReservation>();

  get statusInfo(): { labelAr: string; labelEn: string; class: string } {
    const res = this.reservation();
    if (!res) return { labelAr: 'مجدول', labelEn: 'Scheduled', class: 'status-badge--upcoming' };

    const status = res.status;
    if (status === 'cancelled') {
      return { labelAr: 'ملغي', labelEn: 'Cancelled', class: 'status-badge--cancelled' };
    }
    if (status === 'completed' || (res as any).isCheckedOut === true) {
      return { labelAr: 'مكتمل - تم تسجيل المغادرة', labelEn: 'Completed (Checked-Out)', class: 'status-badge--completed' };
    }
    if (status === 'no_show' || this.isTimePassed(res)) {
      return { labelAr: 'لم يحضر أحد (فائت)', labelEn: 'No-Show / Missed', class: 'status-badge--noshow' };
    }
    if (status === 'active') {
      return { labelAr: 'قيد الاستخدام حالياً', labelEn: 'In Session (Active)', class: 'status-badge--active' };
    }
    return { labelAr: 'مجدول وقادم', labelEn: 'Scheduled', class: 'status-badge--upcoming' };
  }

  isTimePassed(res: AdminReservation | null): boolean {
    if (!res) return false;
    if (res.status === 'no_show') return true;

    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const rawDate = res.occurrenceDate || res.fullDate || res.date;
    const resDate = (rawDate === 'Today' ? todayISO : (rawDate || todayISO)).split('T')[0];

    if (resDate < todayISO) {
      return true;
    }
    if (resDate > todayISO) {
      return false;
    }

    // Same day: check end time
    const [eH, eM] = (res.endTime || '00:00').split(':').map(Number);
    if (!isNaN(eH)) {
      const endMinutes = eH * 60 + (isNaN(eM) ? 0 : eM);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return currentMinutes >= endMinutes;
    }
    return false;
  }

  canStartSession(): boolean {
    const res = this.reservation();
    if (!res) return false;
    if (this.isCompleted() || res.status === 'completed' || res.status === 'cancelled' || res.status === 'active' || res.status === 'no_show') {
      return false;
    }
    return !this.isTimePassed(res);
  }

  onStartSession(): void {
    const res = this.reservation();
    if (res && this.canStartSession()) {
      this.startSession.emit(res);
    }
  }

  onClose(): void {
    this.closePanel.emit();
  }

  onEdit(): void {
    const res = this.reservation();
    if (res) {
      this.editReservation.emit(res);
    }
  }

  onCancel(): void {
    const res = this.reservation();
    if (res) {
      this.cancelReservation.emit(res);
    }
  }

  onCheckout(): void {
    const res = this.reservation();
    if (res && !this.isCompleted()) {
      this.checkoutReservation.emit(res);
    }
  }

  onDelete(): void {
    const res = this.reservation();
    if (res) {
      this.deleteReservation.emit(res);
    }
  }

  isCompleted(): boolean {
    const res = this.reservation();
    if (!res) return false;
    return res.status === 'completed' || (res as any).isCheckedOut === true || (res as any).status === 'checked_out';
  }

  getRecurrenceLabel(): string {
    const res = this.reservation();
    if (!res || !res.isRecurring) return '';
    const isAr = this.isArabic();
    const freq = Number(res.recurrenceFrequency);
    if (freq === 1) return isAr ? 'يتكرر يومياً' : 'Repeats Daily';
    if (freq === 2) return isAr ? 'يتكرر أسبوعياً' : 'Repeats Weekly';
    if (freq === 3) return isAr ? 'يتكرر شهرياً' : 'Repeats Monthly';
    return isAr ? 'حجز متكرر' : 'Recurring Reservation';
  }
}

