import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { WorkspaceService, calculateSessionDuration } from '../../../core/services/workspace.service';
import { SettingsService } from '../../../core/services/settings.service';
import { PackageService } from '../../../core/services/package.service';
import { CouponApiService } from '../../../core/services/api/coupon-api.service';
import { WalletApiService } from '../../../core/services/api/wallet-api.service';
import { ActiveStudentSession } from '../../../core/models/student.model';
import { CateringLineItem } from '../../../core/models/workspace-session.model';
import { convertMinutesTo12h } from '../../../core/utils/date-time.util';

@Component({
  selector: 'app-workspace-checkout',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class WorkspaceCheckoutComponent implements OnInit {
  private langService = inject(LanguageService);
  private workspaceService = inject(WorkspaceService);
  private settingsService = inject(SettingsService);
  private packageService = inject(PackageService);
  private couponApi = inject(CouponApiService);
  private walletApi = inject(WalletApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Student Information
  studentId = signal('');
  studentName = signal('');
  faculty = signal('');
  phone = signal('');
  email = signal('');

  // Wallet State
  walletBalance = signal<number>(0);
  useWallet = signal<boolean>(false);

  // Session Details
  checkInTime = signal('09:00 AM');
  checkoutTime = signal(
    convertMinutesTo12h(new Date().getHours() * 60 + new Date().getMinutes(), false)
  );
  durationDisplay = signal('1h 00m');
  durationHours = signal(1.0);

  // Billing Details (Egyptian Pounds EGP) driven by SettingsService & hourlyRate
  hourlyRate = signal<number>(20);
  baseCost = computed(() => {
    if (this.selectedPaymentMethod() === 'package') return 0;
    return +(this.durationHours() * this.hourlyRate()).toFixed(2);
  });

  // Additional Services
  printingPages = signal<number>(0);
  printingRate = signal<number>(1.5);
  printingTotal = computed(() => +(this.printingPages() * this.printingRate()).toFixed(2));

  hasWifi = signal(false);
  wifiCost = computed(() => this.hasWifi() ? 10 : 0);

  wifiCode = signal('');
  depositAmount = signal<number>(0);

  // Catering Items
  cateringItems = signal<CateringLineItem[]>([]);
  cateringTotal = computed(() => {
    return +this.cateringItems().reduce((sum, item) => sum + item.price, 0).toFixed(2);
  });

  // Discounts & Coupons
  discountMode = signal<'percent' | 'fixed'>('percent');
  discountValue = signal<number>(0);
  discountAmount = computed(() => {
    if (this.discountMode() === 'percent') {
      return +((this.subtotal() * this.discountValue()) / 100).toFixed(2);
    }
    return +(this.discountValue()).toFixed(2);
  });

  couponInput = signal('');
  couponApplied = signal(false);
  couponDiscount = signal<number>(0);

  totalDiscounts = computed(() => +(this.discountAmount() + this.couponDiscount()).toFixed(2));

  // Summary Totals
  subtotal = computed(() => +(this.baseCost() + this.cateringTotal() + this.printingTotal() + this.wifiCost()).toFixed(2));
  
  walletDeduction = computed(() => {
    const baseFinal = Math.max(0, +(this.subtotal() - this.totalDiscounts() - this.depositAmount()).toFixed(2));
    if (this.selectedPaymentMethod() === 'wallet' || this.useWallet()) {
      return Math.min(this.walletBalance(), baseFinal);
    }
    return 0;
  });

  finalAmount = computed(() => {
    if (this.selectedPaymentMethod() === 'package') return 0;
    const baseFinal = Math.max(0, +(this.subtotal() - this.totalDiscounts() - this.depositAmount()).toFixed(2));
    if (this.selectedPaymentMethod() === 'wallet' || this.useWallet()) {
      return Math.max(0, +(baseFinal - this.walletDeduction()).toFixed(2));
    }
    return baseFinal;
  });

  // Payment
  selectedPaymentMethod = signal<'cash' | 'vodafone' | 'fawry' | 'instapay' | 'package' | 'wallet'>('cash');
  amountReceived = signal<number>(0);
  changeToReturn = computed(() =>
    Math.max(0, +(this.amountReceived() - this.finalAmount()).toFixed(2))
  );
  outstandingBalance = computed(() => {
    if (this.amountReceived() > 0 && this.amountReceived() < this.finalAmount()) {
      return +(this.finalAmount() - this.amountReceived()).toFixed(2);
    }
    return 0;
  });

  // Modals for Adding Discount / Catering Item
  showAddDiscountModal = signal(false);
  modalDiscountMode = signal<'percent' | 'fixed'>('percent');
  newDiscountInput = signal<number>(0);

  showAddItemModal = signal(false);
  newItemName = signal('');
  newItemPrice = signal<number>(0);

  // Edit Session Modal State & Form Signals
  showEditModal = signal(false);
  isSavingEdit = signal(false);
  editError = signal<string | null>(null);

  editStudentName = signal('');
  editPhone = signal('');
  editFaculty = signal('');
  editCheckInTime = signal('');
  editHourlyRate = signal<number>(20);
  editDepositAmount = signal<number>(0);
  editPrintingPages = signal<number>(0);

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params['studentId'];
      if (id) {
        const student = this.workspaceService.activeStudents().find(s => s.id === id);
        if (student) {
          this.applyStudentToCheckout(student);
        } else {
          this.workspaceService.getSessionById(id).subscribe(loaded => {
            if (loaded) {
              this.applyStudentToCheckout(loaded);
            }
          });
        }
      }
    });
  }

  private applyStudentToCheckout(student: ActiveStudentSession): void {
    this.studentId.set(student.id);
    this.studentName.set(student.name);
    this.faculty.set(student.faculty || student.college || 'عام');
    this.phone.set(student.phone);
    this.checkInTime.set(student.checkInTime || '09:00 AM');
    
    let durStr = student.duration || '';
    if (!durStr || durStr === '0h 00m' || durStr === '0 س 00 د' || durStr === '0h 0m') {
      const now = new Date();
      const nowStr = convertMinutesTo12h(now.getHours() * 60 + now.getMinutes(), this.isArabic());
      durStr = calculateSessionDuration(student.checkInTime, nowStr, student.date);
    }
    this.durationDisplay.set(durStr || '1h 00m');

    // Parse duration into hours
    let durH = 0;
    const hMatch = durStr.match(/(\d+)\s*(?:h|س|hours?)/i);
    const mMatch = durStr.match(/(\d+)\s*(?:m|د|mins?)/i);
    if (hMatch) durH += parseInt(hMatch[1], 10);
    if (mMatch) durH += parseInt(mMatch[1], 10) / 60;
    this.durationHours.set(durH > 0 ? +durH.toFixed(2) : 1);

    // Fetch student wallet balance
    const targetStudentId = student.phone || student.id;
    if (targetStudentId) {
      this.walletApi.getBalance(targetStudentId).subscribe({
        next: (res) => {
          this.walletBalance.set(res?.balance || 0);
        },
        error: () => {
          this.walletBalance.set(0);
        }
      });
    }

    // Load catering items
    if (student.cateringItems && student.cateringItems.length > 0) {
      this.cateringItems.set(student.cateringItems.map((c: any) => ({
        id: c.id || Date.now().toString() + Math.random(),
        name: c.name || c.product?.nameAr || c.product?.name || (this.isArabic() ? 'صنف كاترنج' : 'Catering Item'),
        price: c.totalPrice || c.price || ((c.unitPrice || 0) * (c.quantity || 1)) || 0
      })));
    } else if ((student as any).canteenOrders && (student as any).canteenOrders.length > 0) {
      this.cateringItems.set((student as any).canteenOrders.map((c: any) => ({
        id: c.id || Date.now().toString() + Math.random(),
        name: c.name || c.product?.nameAr || c.product?.name || (this.isArabic() ? 'صنف كاترنج' : 'Catering Item'),
        price: c.totalPrice || c.price || ((c.unitPrice || 0) * (c.quantity || 1)) || 0
      })));
    } else if (student.cateringTotal && student.cateringTotal > 0) {
      this.cateringItems.set([{
        id: 'catering_' + student.id,
        name: this.isArabic() ? 'طلبات كاترنج' : 'Catering Orders',
        price: student.cateringTotal
      }]);
    }

    const pages = student.printingPages || student.printingCount;
    if (pages) {
      this.printingPages.set(pages);
    }
    if (student.depositAmount) {
      this.depositAmount.set(student.depositAmount);
    }

    if (student.billingType === 'package' || (student.packageOrCoupon && student.packageOrCoupon.toLowerCase().includes('package'))) {
      this.selectedPaymentMethod.set('package');
    }
  }

  selectPaymentMethod(method: 'cash' | 'vodafone' | 'fawry' | 'instapay' | 'package' | 'wallet'): void {
    this.selectedPaymentMethod.set(method);
    if (method === 'wallet') {
      this.useWallet.set(true);
    }
  }

  toggleUseWallet(): void {
    this.useWallet.update(val => !val);
  }

  // Edit Session Flow
  openEditModal(): void {
    this.editStudentName.set(this.studentName());
    this.editPhone.set(this.phone());
    this.editFaculty.set(this.faculty());
    this.editCheckInTime.set(this.checkInTime());
    this.editHourlyRate.set(this.hourlyRate());
    this.editDepositAmount.set(this.depositAmount());
    this.editPrintingPages.set(this.printingPages());
    this.editError.set(null);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    if (!this.isSavingEdit()) {
      this.showEditModal.set(false);
    }
  }

  saveEditSession(): void {
    if (!this.editStudentName().trim()) {
      this.editError.set(this.isArabic() ? 'يرجى إدخال اسم الطالب' : 'Please enter student name');
      return;
    }

    this.isSavingEdit.set(true);
    this.editError.set(null);

    const updatedData = {
      name: this.editStudentName().trim(),
      phone: this.editPhone().trim(),
      faculty: this.editFaculty().trim(),
      checkInTime: this.editCheckInTime().trim(),
      hourlyRate: Math.max(0, +this.editHourlyRate()),
      depositAmount: Math.max(0, +this.editDepositAmount()),
      printingPages: Math.max(0, +this.editPrintingPages())
    };

    this.workspaceService.updateSessionDetails(this.studentId(), updatedData).subscribe({
      next: () => {
        this.isSavingEdit.set(false);
        this.studentName.set(updatedData.name);
        this.phone.set(updatedData.phone);
        this.faculty.set(updatedData.faculty);
        this.checkInTime.set(updatedData.checkInTime);
        this.hourlyRate.set(updatedData.hourlyRate);
        this.depositAmount.set(updatedData.depositAmount);
        this.printingPages.set(updatedData.printingPages);

        const now = new Date();
        const nowStr = convertMinutesTo12h(now.getHours() * 60 + now.getMinutes(), this.isArabic());
        const durStr = calculateSessionDuration(updatedData.checkInTime, nowStr);
        this.durationDisplay.set(durStr || '1h 00m');

        let durH = 0;
        const hMatch = durStr.match(/(\d+)\s*(?:h|س|hours?)/i);
        const mMatch = durStr.match(/(\d+)\s*(?:m|د|mins?)/i);
        if (hMatch) durH += parseInt(hMatch[1], 10);
        if (mMatch) durH += parseInt(mMatch[1], 10) / 60;
        this.durationHours.set(durH > 0 ? +durH.toFixed(2) : 1);

        this.showEditModal.set(false);
        this.workspaceService.showToast(
          this.isArabic() ? 'تم تحديث بيانات الجلسة بنجاح!' : 'Session updated successfully!',
          'success'
        );
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        const msg = err?.error?.message || (this.isArabic() ? 'حدث خطأ أثناء حفظ بيانات الجلسة' : 'Failed to update session');
        this.editError.set(msg);
      }
    });
  }

  applyCoupon(): void {
    const code = this.couponInput().trim().toUpperCase();
    if (!code) return;

    this.couponApi.getCouponByCode(code).subscribe({
      next: (coupon) => {
        if (coupon && coupon.isActive !== false) {
          const isExpired = coupon.expiryDate ? new Date(coupon.expiryDate) < new Date() : false;
          if (isExpired) {
            this.workspaceService.showToast('كود الكوبون منتهي الصلاحية', 'error');
            return;
          }
          const discountVal = coupon.value || 10;
          this.couponDiscount.set(discountVal);
          this.couponApplied.set(true);
          this.workspaceService.showToast(`تم تطبيق الكوبون "${code}": ${discountVal} ج.م!`, 'success');
        } else {
          this.workspaceService.showToast('كود الكوبون غير صالح أو غير مفعل', 'error');
        }
      },
      error: () => {
        this.workspaceService.showToast('كود الكوبون غير موجود في النظام', 'error');
      }
    });
  }

  openAddDiscount(): void {
    this.modalDiscountMode.set(this.discountMode());
    this.newDiscountInput.set(this.discountValue());
    this.showAddDiscountModal.set(true);
  }

  saveDiscount(): void {
    this.discountMode.set(this.modalDiscountMode());
    this.discountValue.set(this.newDiscountInput());
    this.showAddDiscountModal.set(false);
    const label = this.discountMode() === 'percent' ? `${this.discountValue()}%` : `${this.discountValue()} ج.م`;
    this.workspaceService.showToast(`تم تعديل الخصم إلى ${label}`, 'info');
  }

  openAddItem(): void {
    this.newItemName.set('');
    this.newItemPrice.set(20.00);
    this.showAddItemModal.set(true);
  }

  saveNewItem(): void {
    const name = this.newItemName().trim() || 'مشروب / صنف إضافي';
    const price = +this.newItemPrice() || 0;
    this.cateringItems.update(items => [
      ...items,
      { id: Date.now().toString(), name, price }
    ]);
    this.showAddItemModal.set(false);
    this.workspaceService.showToast(`تمت إضافة "${name}" (${price} ج.م)`, 'success');
  }

  removeCateringItem(id: string): void {
    this.cateringItems.update(items => items.filter(item => item.id !== id));
  }

  finalizeAndClose(): void {
    // 1. Package deduction
    if (this.selectedPaymentMethod() === 'package') {
      this.packageService.deductStudentPackageHours(this.phone() || this.studentId(), this.durationHours());
      this.workspaceService.showToast(
        `تم خصم ${this.durationHours()} ساعة من باقة الطالب بنجاح!`,
        'success'
      );
    }

    // 2. Wallet deduction
    const deductAmount = this.walletDeduction();
    if (deductAmount > 0) {
      this.walletApi.deduct({
        studentId: this.phone() || this.studentId(),
        amount: deductAmount,
        note: `Workspace session checkout #${this.studentId()}`
      }).subscribe({
        next: () => {
          this.workspaceService.showToast(
            `تم خصم ${deductAmount.toFixed(2)} ج.م من محفظة الطالب بنجاح!`,
            'success'
          );
        },
        error: (err) => {
          console.warn('Wallet deduction notice:', err);
        }
      });
    }

    const finalAmt = this.finalAmount();
    const amtReceived = this.amountReceived() > 0 ? this.amountReceived() : finalAmt;
    const remaining = this.outstandingBalance();

    this.workspaceService.checkOutStudent(this.studentId(), {
      paymentMethod: this.selectedPaymentMethod(),
      totalCost: finalAmt,
      amountReceived: amtReceived,
      outstandingBalance: remaining,
      duration: this.durationDisplay()
    });

    if (remaining > 0) {
      this.workspaceService.showToast(
        `تم تسجيل دفع جزئي لـ ${this.studentName()}. المتبقي: ${remaining.toFixed(2)} ج.م`,
        'info'
      );
    } else {
      this.workspaceService.showToast(
        `تم إنهاء جلسة ${this.studentName()} وتسجيل الدفع بنجاح!`,
        'success'
      );
    }
    this.router.navigate(['/workspace/show-student']);
  }
}

