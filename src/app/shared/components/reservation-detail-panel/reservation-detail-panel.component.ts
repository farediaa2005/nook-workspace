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
     if (res) {
       this.checkoutReservation.emit(res);
     }
   }
 }
