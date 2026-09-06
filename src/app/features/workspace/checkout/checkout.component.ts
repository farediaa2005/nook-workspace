import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { WorkspaceService, calculateSessionDuration } from '../../../core/services/workspace.service';
import { SettingsService } from '../../../core/services/settings.service';
import { PackageService } from '../../../core/services/package.service';

export interface CateringLineItem {
  id: string;
  name: string;
  price: number;
}

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
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Student Information
  studentId = signal('');
  studentName = signal('');
  faculty = signal('');
  phone = signal('');
  email = signal('');

  // Session Details
  checkInTime = signal('09:00 AM');
  checkoutTime = signal(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      return +((this.baseCost() * this.discountValue()) / 100).toFixed(2);
    }
    return +(this.discountValue()).toFixed(2);
  });

  couponInput = signal('');
  couponApplied = signal(false);
  couponDiscount = signal<number>(0);

  totalDiscounts = computed(() => +(this.discountAmount() + this.couponDiscount()).toFixed(2));

  // Summary Totals
  subtotal = computed(() => +(this.baseCost() + this.cateringTotal() + this.printingTotal() + this.wifiCost()).toFixed(2));
  finalAmount = computed(() =>
    Math.max(0, +(this.subtotal() - this.totalDiscounts() - this.depositAmount()).toFixed(2))
  );

  // Payment
  selectedPaymentMethod = signal<'cash' | 'vodafone' | 'fawry' | 'instapay' | 'package'>('cash');
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

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const id = params['studentId'];
      if (id) {
        const student = this.workspaceService.activeStudents().find(s => s.id === id);
        if (student) {
          this.studentId.set(student.id);
          this.studentName.set(student.name);
          this.faculty.set(student.faculty || student.college || 'عام');
          this.phone.set(student.phone);
          this.checkInTime.set(student.checkInTime || '09:00 AM');
          
          let durStr = student.duration || '';
          if (!durStr || durStr === '0h 00m' || durStr === '0 س 00 د' || durStr === '0h 0m') {
            const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

          // Load catering items
          if (student.cateringItems && student.cateringItems.length > 0) {
            this.cateringItems.set(student.cateringItems.map((c: any) => ({
              id: c.id || Date.now().toString() + Math.random(),
              name: c.name,
              price: c.price
            })));
          } else if ((student as any).canteenOrders && (student as any).canteenOrders.length > 0) {
            this.cateringItems.set((student as any).canteenOrders.map((c: any) => ({
              id: c.id || Date.now().toString() + Math.random(),
              name: c.name,
              price: c.price
            })));
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
      }
    });
  }

  selectPaymentMethod(method: 'cash' | 'vodafone' | 'fawry' | 'instapay' | 'package'): void {
    this.selectedPaymentMethod.set(method);
  }

  applyCoupon(): void {
    const code = this.couponInput().trim().toUpperCase();
    if (!code) return;

    if (code === 'NOOK10' || code === 'SAVE10') {
      this.couponDiscount.set(20.00);
      this.couponApplied.set(true);
      this.workspaceService.showToast('تم تطبيق خصم الكوبون: 20 ج.م!', 'success');
    } else {
      this.couponDiscount.set(10.00);
      this.couponApplied.set(true);
      this.workspaceService.showToast(`تم تطبيق الكوبون "${code}": 10 ج.م!`, 'success');
    }
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
    if (this.selectedPaymentMethod() === 'package') {
      this.packageService.deductStudentPackageHours(this.phone() || this.studentId(), this.durationHours());
      this.workspaceService.showToast(
        `تم خصم ${this.durationHours()} ساعة من باقة الطالب بنجاح!`,
        'success'
      );
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
