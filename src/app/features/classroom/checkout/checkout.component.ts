import { Component, computed, inject, signal, effect, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { ClassroomService } from '../../../core/services/classroom.service';
import { PackageService } from '../../../core/services/package.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { ClassroomCard, PaymentMethod } from '../../../core/models/classroom.model';
import { PackageItem } from '../../../core/models/package.model';

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
  private packageService = inject(PackageService);
  private workspaceService = inject(WorkspaceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Selected Session / Card Details
  selectedCard = signal<ClassroomCard | null>(null);

  // Financial Items
  roomRate = signal(0);
  durationHours = signal(0);
  cateringAmount = signal(0.00);
  printingAmount = signal(0.00);
  manualAdjustment = signal(0.00);
  loyaltyDiscount = signal(0.00);

  // Overtime Alerts
  overdueMinutes = signal<number>(0);
  extraHours = signal<number>(0);
  overtimeStatus = signal<'normal' | 'grace_period' | 'extra_hour'>('normal');
  overtimeAlertMessage = signal<string>('');

  // Package Integration
  checkoutBillingMode = signal<'package' | 'cash'>('cash');

  checkoutMatchedPackage = computed<PackageItem | null>(() => {
    const card = this.selectedCard();
    if (!card) return null;

    const instructorName = (card.instructor || '').trim().toLowerCase();
    const phone = (card.phone || '').trim().replace(/\D/g, '');
    const email = (card.email || '').trim().toLowerCase();
    const instructorId = card.instructorId;

    const packages = this.packageService.instructorPackages();

    return packages.find(pkg => {
      if (pkg.status !== 'active' && pkg.status !== 'near_expiry') return false;
      if ((pkg.remainingHours || 0) <= 0) return false;

      // 1. Direct ID match
      if (instructorId && pkg.memberId && instructorId === pkg.memberId) {
        return true;
      }

      // 2. Phone match (min 7 digits)
      const pkgPhone = (pkg.memberPhone || '').replace(/\D/g, '');
      if (phone.length >= 7 && pkgPhone.length >= 7 && (phone === pkgPhone || phone.endsWith(pkgPhone) || pkgPhone.endsWith(phone))) {
        return true;
      }

      // 3. Email match
      if (email.length >= 5 && email.includes('@') && pkg.memberEmail && pkg.memberEmail.toLowerCase() === email) {
        return true;
      }

      // 4. Name match
      if (instructorName && instructorName !== '-') {
        const ar = (pkg.memberNameAr || '').trim().toLowerCase();
        const en = (pkg.memberNameEn || '').trim().toLowerCase();
        if (ar && ar === instructorName) return true;
        if (en && en === instructorName) return true;
      }

      return false;
    }) || null;
  });

  isCheckoutPackage = computed(() => {
    return this.checkoutBillingMode() === 'package' && !!this.checkoutMatchedPackage();
  });

  checkoutPackageCoveredHours = computed(() => {
    if (!this.isCheckoutPackage()) return 0;
    const pkg = this.checkoutMatchedPackage();
    const dur = this.durationHours();
    if (!pkg) return 0;
    return Math.min(dur, pkg.remainingHours || 0);
  });

  checkoutPackageExtraHours = computed(() => {
    if (!this.isCheckoutPackage()) return 0;
    const dur = this.durationHours();
    const covered = this.checkoutPackageCoveredHours();
    return Math.max(0, dur - covered);
  });

  // Payment Options
  selectedPaymentMethod = signal<PaymentMethod>('cash');
  amountReceived = signal<number | null>(null);

  constructor() {
    effect(() => {
      if (!this.selectedCard()) {
        const cardIdFromQuery = this.route.snapshot.queryParamMap.get('cardId');
        if (cardIdFromQuery) {
          const card = this.classroomService.getCardById(cardIdFromQuery);
          if (card) {
            this.initFromCard(card);
            return;
          }
        }
        const activeCard = this.classroomService.activeCheckoutCard() || this.classroomService.cards().find(c => c.status === 'active');
        if (activeCard) {
          this.initFromCard(activeCard);
        }
      }
    });
  }

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
      if (card.status === 'completed' || this.classroomService.isCardCompleted(card.id)) {
        this.workspaceService.showToast(
          this.isArabic() ? 'هذا الحجز تم تسجيل المغادرة له بالفعل (Checked-Out)' : 'This booking has already been checked out.',
          'info'
        );
        this.router.navigate(['/classroom/show-classroom']);
        return;
      }
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
    const cachedCatering = card ? (this.classroomService.getClassroomCateringCache(card.id) || (card.roomId ? this.classroomService.getClassroomCateringCache(card.roomId) : null)) : null;
    const catering = Number(card.catering || (card as any)?.cateringTotal || (cachedCatering ? cachedCatering.total : 0));
    const printing = Number(card.printingCharges !== undefined && card.printingCharges !== null ? card.printingCharges : ((card as any)?.printing !== undefined && (card as any)?.printing !== null ? (card as any).printing : 0));
    const hourlyRate = card.hourlyRate || (card.rental && agreedHours ? Math.round(card.rental / agreedHours) : 0);

    this.roomRate.set(hourlyRate);
    this.durationHours.set(totalBilledHours);
    this.cateringAmount.set(catering);
    this.printingAmount.set(printing);
    this.manualAdjustment.set(0);
    this.loyaltyDiscount.set(0);
    this.amountReceived.set(null);

    // Auto-detect package
    const matchedPkg = this.checkoutMatchedPackage();
    const hasValidPkg = !!matchedPkg && (matchedPkg.remainingHours || 0) > 0;
    const hadBookedPkg = (card.packageCoveredHours || 0) > 0 || (card.paymentMode === 'package' && !!card.packageName);
    this.checkoutBillingMode.set(hasValidPkg || hadBookedPkg ? 'package' : 'cash');
  }

  // Computations
  roomRentalTotal = computed(() => {
    if (this.isCheckoutPackage()) {
      return this.roomRate() * this.checkoutPackageExtraHours();
    }
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
      const isPkg = this.isCheckoutPackage();
      const coveredHours = this.checkoutPackageCoveredHours();
      const matchedPkg = this.checkoutMatchedPackage();

      // Deduct from package if applicable
      if (isPkg && coveredHours > 0 && matchedPkg) {
        this.packageService.recordSessionUsage(matchedPkg.id, {
          duration: coveredHours,
          date: this.classroomService.getTodayDateISO(),
          sessionAr: `جلسة قاعة ${card.name} (${card.activity || 'ورشة عمل'})`,
          sessionEn: `Classroom session: ${card.name} (${card.activity || 'Workshop'})`,
          roomOrDesk: card.name
        });
      }

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
        changeDue: this.changeDue(),
        usePackageHours: isPkg ? coveredHours : 0,
        packageId: isPkg && matchedPkg ? matchedPkg.id : undefined
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
