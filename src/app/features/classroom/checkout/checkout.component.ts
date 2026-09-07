import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { ClassroomService } from '../../../core/services/classroom.service';
import { ClassroomCard, PaymentMethod } from '../../../core/models/classroom.model';

@Component({
  selector: 'app-classroom-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class ClassroomCheckoutComponent implements OnInit {
  private langService = inject(LanguageService);
  private classroomService = inject(ClassroomService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Selected Session / Card Details
  selectedCard = signal<ClassroomCard | null>(null);

  // Financial Items
  roomRate = signal(40);
  durationHours = signal(2);
  cateringAmount = signal(0.00);
  printingAmount = signal(0.00);
  manualAdjustment = signal(0.00);
  loyaltyDiscount = signal(0.00);

  // Overtime Alerts
  overdueMinutes = signal<number>(0);
  extraHours = signal<number>(0);
  overtimeStatus = signal<'normal' | 'grace_period' | 'extra_hour'>('normal');
  overtimeAlertMessage = signal<string>('');

  // Payment Options
  selectedPaymentMethod = signal<PaymentMethod>('cash');
  amountReceived = signal<number | null>(null);

  ngOnInit(): void {
    const cardIdFromQuery = this.route.snapshot.queryParamMap.get('cardId');
    let card: ClassroomCard | undefined;

    if (cardIdFromQuery) {
      card = this.classroomService.getCardById(cardIdFromQuery);
    }

    if (!card) {
      card = this.classroomService.activeCheckoutCard() || this.classroomService.cards().find(c => c.status === 'active') || this.classroomService.cards()[0];
    }

    if (card) {
      this.initFromCard(card);
    }
  }

  initFromCard(card: ClassroomCard): void {
    this.selectedCard.set(card);

    let agreedHours = card.durationHours || 2;
    let startMins = 0;
    let endMins = 0;

    if (card.startTime && card.endTime) {
      startMins = this.classroomService.parseTimeToMinutes(card.startTime);
      endMins = this.classroomService.parseTimeToMinutes(card.endTime);
      const diff = endMins - startMins;
      if (diff > 0) {
        agreedHours = Math.max(1, Math.round(diff / 60));
      }
    }

    const overtimeInfo = this.classroomService.calculateOvertimeAndAlerts(card, this.isArabic());
    this.overdueMinutes.set(overtimeInfo.overdueMinutes);
    this.extraHours.set(overtimeInfo.extraHours);
    this.overtimeStatus.set(overtimeInfo.overtimeStatus);
    this.overtimeAlertMessage.set(overtimeInfo.alertMessage);

    const totalBilledHours = agreedHours + overtimeInfo.extraHours;
    const hourlyRate = card.hourlyRate || (card.rental && agreedHours ? Math.round(card.rental / agreedHours) : 40);
    const catering = card.catering || 0;
    const printing = card.printingCharges !== undefined ? card.printingCharges : 0;

    this.roomRate.set(hourlyRate);
    this.durationHours.set(totalBilledHours);
    this.cateringAmount.set(catering);
    this.printingAmount.set(printing);
    this.manualAdjustment.set(0);
    this.loyaltyDiscount.set(0);
    this.amountReceived.set(null);
  }

  // Computations
  roomRentalTotal = computed(() => {
    return this.roomRate() * this.durationHours();
  });

  subtotal = computed(() => {
    return this.roomRentalTotal() + this.cateringAmount() + this.printingAmount();
  });

  finalAmount = computed(() => {
    return Math.max(0, this.subtotal() - this.manualAdjustment() - this.loyaltyDiscount());
  });

  changeDue = computed(() => {
    const received = this.amountReceived();
    if (received === null || received === undefined || isNaN(received)) return 0;
    const change = received - this.finalAmount();
    return change >= 0 ? change : 0;
  });

  isPaymentValid = computed(() => {
    const finalAmt = this.finalAmount();
    if (finalAmt <= 0) return true;
    const received = this.amountReceived();
    if (received === null || received === undefined || isNaN(received)) return false;
    return received >= finalAmt;
  });

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod.set(method);
    if (method !== 'cash') {
      this.amountReceived.set(this.finalAmount());
    }
  }

  processPayment(): void {
    if (!this.isPaymentValid()) return;

    const card = this.selectedCard();
    if (card) {
      const finalAmt = this.finalAmount();
      const received = this.amountReceived() ?? finalAmt;
      this.classroomService.checkoutRoom(card.id, {
        cardId: card.id,
        roomRate: this.roomRate(),
        durationHours: this.durationHours(),
        cateringAmount: this.cateringAmount(),
        printingAmount: this.printingAmount(),
        manualAdjustment: this.manualAdjustment(),
        loyaltyDiscount: this.loyaltyDiscount(),
        paymentMethod: this.selectedPaymentMethod(),
        amountReceived: received,
        finalAmount: finalAmt,
        changeDue: this.changeDue()
      }).subscribe({
        next: () => {
          this.router.navigate(['/classroom/show-classroom']);
        },
        error: (err) => {
          console.error('Failed to checkout room:', err);
          this.router.navigate(['/classroom/show-classroom']);
        }
      });
    } else {
      this.router.navigate(['/classroom/show-classroom']);
    }
  }
}
