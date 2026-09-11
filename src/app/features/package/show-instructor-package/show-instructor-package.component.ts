import { Component, inject, signal, computed, ChangeDetectorRef, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { PackageService } from '../../../core/services/package.service';
import {
  PackageItem,
  PackageMemberOption,
  PackageStatus,
  PaymentMethod,
  ValidityPresetOption,
  PresetPackageOption
} from '../../../core/models/package.model';

import { ShiftService } from '../../../core/services/shift.service';
import { SettingsService } from '../../../core/services/settings.service';
import { CouponApiService } from '../../../core/services/api/coupon-api.service';
import { isCouponExhausted, isCouponExpired } from '../../../core/models/coupon.model';
import { getTodayDateISO, addDaysToDateISO } from '../../../core/utils/date-time.util';

@Component({
  selector: 'app-show-instructor-package',
  imports: [FormsModule],
  templateUrl: './show-instructor-package.component.html',
  styleUrl: './show-instructor-package.component.css'
})
export class ShowInstructorPackageComponent implements OnInit {
  private langService = inject(LanguageService);
  protected packageService = inject(PackageService);
  protected settingsService = inject(SettingsService);
  protected shiftService = inject(ShiftService);
  private couponApi = inject(CouponApiService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.packageService.syncPackagesFromBackend();
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        const pkg = this.packageService.getPackageById(params['id']);
        if (pkg) {
          this.openDrawer(pkg);
        }
      }
    });
  }

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Date Constraints
  todayDate = signal<string>(getTodayDateISO());

  // Search & Filter State
  searchQuery = signal('');
  selectedStatus = signal<'all' | PackageStatus>('all');
  isStatusDropdownOpen = signal(false);

  // Pagination State
  currentPage = signal(1);
  pageSize = signal(5);

  // Action Menu State (3-dots dropdown)
  activeActionMenuId = signal<string | null>(null);

  // ----------------------------------------------------
  // 1. SELL INSTRUCTOR PACKAGE MODAL STATE (2-Column Card Architecture)
  // ----------------------------------------------------
  isSellModalOpen = signal<boolean>(false);

  // Presets dynamically linked from SettingsService + "+ باقة مخصصة"
  dynamicPackagePresets = computed(() => {
    const presetsFromSettings = this.settingsService.instructorPackagePresets();
    const mapped = presetsFromSettings.map(p => ({
      id: p.id,
      nameAr: p.nameAr || `باقة ${p.hours} ساعة`,
      nameEn: p.nameEn || `${p.hours} Hours Pass`,
      hours: p.hours,
      rate: Math.round(p.price / p.hours),
      price: p.price,
      validityDays: p.validityDays,
      badgeAr: `${p.hours} س`,
      badgeEn: `${p.hours} hrs`
    }));

    return [
      ...mapped,
      {
        id: 'custom',
        nameAr: '+ باقة مخصصة',
        nameEn: '+ Custom Package',
        hours: 10,
        rate: 0,
        price: 0,
        validityDays: undefined,
        badgeAr: 'مخصص',
        badgeEn: 'Custom'
      }
    ];
  });

  // Validity options restricted strictly to: [15 يوم, 30 يوم, 60 يوم, مخصص حر]
  validityPresets = signal([
    { id: 'val-15', days: 15 as const, labelAr: '15 يوم', labelEn: '15 Days' },
    { id: 'val-30', days: 30 as const, labelAr: '30 يوم', labelEn: '30 Days' },
    { id: 'val-60', days: 60 as const, labelAr: '60 يوم', labelEn: '60 Days' },
    { id: 'custom', days: 'custom' as const, labelAr: 'مخصص حر', labelEn: 'Custom' }
  ]);

  // Section 01: Select Package (Custom is default)
  selectedPackageId = signal<string>('custom');
  customHours = signal<number>(10);
  customHourlyRate = signal<number>(0);

  // Section 02: Member Lookup & Multi-Instructor Selection
  memberSearchQuery = signal<string>('');
  isMemberDropdownOpen = signal<boolean>(false);
  selectedMembers = signal<PackageMemberOption[]>([]);
  sellMemberError = signal<string | null>(null);

  // Section 03: Activation & Validity (Custom as first option)
  validityOption = signal<number | 'custom'>('custom');
  sellStartDate = signal<string>(getTodayDateISO());
  sellExpiryDate = signal<string>(addDaysToDateISO(60));

  sellValidityDays = computed(() => {
    try {
      const start = new Date(this.sellStartDate());
      const end = new Date(this.sellExpiryDate());
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
  });

  // Section 04: Discount, Payment Methods & Cash Calculation
  isDiscountOpen = signal<boolean>(false);
  discountType = signal<'fixed' | 'percentage'>('fixed');
  discountValue = signal<number>(0);
  couponCode = signal<string>('');

  sellPaymentMethod = signal<PaymentMethod>('cash');
  amountReceived = signal<number | null>(null);
  sellNotes = signal<string>('');
  sellSubmitted = signal<boolean>(false);

  // Selected package computations
  selectedPackage = computed(() => {
    const id = this.selectedPackageId();
    return this.dynamicPackagePresets().find((p: any) => p.id === id) || this.dynamicPackagePresets()[0];
  });

  effectiveHours = computed(() => {
    if (this.selectedPackageId() === 'custom') {
      return Math.max(1, this.customHours());
    }
    return this.selectedPackage().hours;
  });

  effectiveRate = computed(() => {
    if (this.selectedPackageId() === 'custom') {
      return Math.max(1, this.customHourlyRate());
    }
    return this.selectedPackage().rate;
  });

  effectivePackageName = computed(() => {
    if (this.selectedPackageId() === 'custom') {
      return this.isArabic()
        ? `باقة تدريبية مخصصة (${this.effectiveHours()} ساعة)`
        : `Custom Training Pass (${this.effectiveHours()} hrs)`;
    }
    return this.isArabic() ? this.selectedPackage().nameAr : this.selectedPackage().nameEn;
  });

  singlePackageCost = computed(() => {
    if (this.selectedPackageId() === 'custom') {
      return +(this.effectiveHours() * this.effectiveRate()).toFixed(2);
    }
    return this.selectedPackage().price;
  });

  effectiveInstructorCount = computed(() => {
    return Math.max(1, this.selectedMembers().length);
  });

  subtotal = computed(() => {
    return +(this.singlePackageCost() * this.effectiveInstructorCount()).toFixed(2);
  });

  discountAmount = computed(() => {
    const sub = this.subtotal();
    const val = Math.max(0, this.discountValue() || 0);
    if (val === 0) return 0;
    if (this.discountType() === 'percentage') {
      return +((sub * Math.min(100, val)) / 100).toFixed(2);
    }
    return Math.min(sub, val);
  });

  finalTotal = computed(() => {
    return Math.max(0, +(this.subtotal() - this.discountAmount()).toFixed(2));
  });

  changeDue = computed(() => {
    if (this.sellPaymentMethod() !== 'cash') return 0;
    const recv = this.amountReceived();
    if (recv === null || recv === undefined || isNaN(recv)) return 0;
    return Math.max(0, +(recv - this.finalTotal()).toFixed(2));
  });

  isCashShort = computed(() => {
    if (this.sellPaymentMethod() !== 'cash') return false;
    const recv = this.amountReceived();
    if (recv === null || recv === undefined || isNaN(recv)) return false;
    return recv < this.finalTotal();
  });

  isPaymentValid = computed(() => {
    if (this.sellPaymentMethod() === 'cash') {
      const recv = this.amountReceived();
      return recv !== null && recv !== undefined && !isNaN(recv) && recv >= this.finalTotal() && recv > 0;
    }
    return true;
  });

  isSellFormValid = computed(() => {
    const hasMembers = this.selectedMembers().length > 0;
    const validTotal = this.finalTotal() >= 0 && !isNaN(this.finalTotal());
    return hasMembers && validTotal && this.isPaymentValid();
  });

  // ----------------------------------------------------
  // 2. DETAILS & CONSUMPTION DRAWER STATE
  // ----------------------------------------------------
  selectedPackageForDrawer = signal<PackageItem | null>(null);
  isDrawerOpen = signal(false);
  isDrawerFormLocked = signal(true);

  // Editable fields in drawer
  drawerExpiryDate = signal('');
  drawerNotes = signal('');
  drawerAllocatedHours = signal(0);
  drawerUsedHours = signal(0);

  // ----------------------------------------------------
  // 3. RECORD USAGE SUB-MODAL (Inside Drawer)
  // ----------------------------------------------------
  isRecordUsageModalOpen = signal(false);
  usageSessionTitle = signal('');
  usageHoursToDeduct = signal(4);
  usageLocation = signal('Classroom Hall A');

  // ----------------------------------------------------
  // 4. DELETE CONFIRMATION MODAL STATE
  // ----------------------------------------------------
  packageToDelete = signal<PackageItem | null>(null);

  // Filtered Instructor Packages
  instructorPackages = this.packageService.instructorPackages;

  filteredPackages = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();

    return this.instructorPackages().filter(pkg => {
      // 1. Status Filter
      if (status !== 'all' && pkg.status !== status) {
        return false;
      }

      // 2. Text Search
      if (query) {
        const matchesPrimary =
          pkg.memberNameAr.toLowerCase().includes(query) ||
          pkg.memberNameEn.toLowerCase().includes(query) ||
          (pkg.memberPhone && pkg.memberPhone.includes(query)) ||
          pkg.packageNameAr.toLowerCase().includes(query) ||
          pkg.packageNameEn.toLowerCase().includes(query);

        const matchesGroupMember = pkg.members?.some(
          m =>
            m.nameAr.toLowerCase().includes(query) ||
            m.nameEn.toLowerCase().includes(query) ||
            m.phone.includes(query)
        );

        if (!matchesPrimary && !matchesGroupMember) return false;
      }

      return true;
    });
  });

  // Pagination Computations
  totalPages = computed(() => Math.ceil(this.filteredPackages().length / this.pageSize()) || 1);
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  paginatedPackages = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPackages().slice(start, start + this.pageSize());
  });

  startIndex = computed(() => (this.filteredPackages().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1));
  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredPackages().length));

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.cdr.markForCheck();
    }
  }

  setPage(page: number): void {
    this.goToPage(page);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  // Filtered Member Options for Autocomplete in Sell Modal (excluding already selected)
  instructorMemberOptions = computed(() => {
    const q = this.memberSearchQuery().toLowerCase().trim();
    const selectedIds = new Set(this.selectedMembers().map(m => m.id));
    const all = this.packageService.memberOptions().filter(m => m.type === 'instructor' && !selectedIds.has(m.id));
    if (!q) return all;
    return all.filter(
      m =>
        m.nameAr.toLowerCase().includes(q) ||
        m.nameEn.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.subAr.toLowerCase().includes(q) ||
        m.subEn.toLowerCase().includes(q)
    );
  });

  // Status Filter Handlers
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen.update(v => !v);
  }

  closeStatusDropdown(): void {
    this.isStatusDropdownOpen.set(false);
  }

  setStatus(status: 'all' | PackageStatus): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.closeStatusDropdown();
  }

  getStatusLabel(status: 'all' | PackageStatus): string {
    if (status === 'all') return this.t().allPackages;
    if (status === 'active') return this.t().activePasses;
    if (status === 'near_expiry') return this.t().nearExpiryPasses;
    if (status === 'expired') return this.t().expiredPasses;
    if (status === 'exhausted') return this.t().exhaustedPasses;
    return status;
  }

  // ----------------------------------------------------
  // SELL MODAL HANDLERS
  // ----------------------------------------------------
  openSellModal(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'بيع باقة محاضر' : 'Sell Instructor Package')) {
      return;
    }
    const today = getTodayDateISO();
    this.todayDate.set(today);
    this.memberSearchQuery.set('');
    this.selectedMembers.set([]);
    this.isMemberDropdownOpen.set(false);

    this.selectedPackageId.set('custom');
    this.customHours.set(20);
    this.customHourlyRate.set(100);

    // Default to 'custom' as requested
    this.validityOption.set('custom');

    this.sellStartDate.set(today);
    this.sellExpiryDate.set(addDaysToDateISO(60));

    this.isDiscountOpen.set(false);
    this.discountType.set('fixed');
    this.discountValue.set(0);
    this.couponCode.set('');

    this.sellPaymentMethod.set('cash');
    this.amountReceived.set(null);
    this.sellNotes.set('');
    this.sellSubmitted.set(false);
    this.sellMemberError.set(null);
    this.isSellModalOpen.set(true);
  }

  closeSellModal(): void {
    this.isSellModalOpen.set(false);
  }

  selectPackage(pkg: any): void {
    this.selectedPackageId.set(pkg.id);
    if (pkg.id === 'custom') {
      this.customHours.set(20);
      this.customHourlyRate.set(100);
    } else {
      this.customHours.set(pkg.hours);
      this.customHourlyRate.set(pkg.rate || Math.round(pkg.price / pkg.hours));
      if (pkg.validityDays) {
        this.selectValidityOption({ id: `val-${pkg.validityDays}`, days: pkg.validityDays as any, labelAr: '', labelEn: '' });
      }
    }
  }

  addMember(member: PackageMemberOption): void {
    if (!this.selectedMembers().some(m => m.id === member.id)) {
      this.selectedMembers.update(list => [...list, member]);
    }
    this.memberSearchQuery.set('');
    this.isMemberDropdownOpen.set(false);
    this.sellMemberError.set(null);
  }

  removeMember(memberId: string): void {
    this.selectedMembers.update(list => list.filter(m => m.id !== memberId));
  }

  selectValidityOption(preset: ValidityPresetOption): void {
    if (preset.days === 'custom') {
      this.validityOption.set('custom');
    } else {
      this.validityOption.set(preset.days);
      this.sellExpiryDate.set(addDaysToDateISO(preset.days, this.sellStartDate()));
    }
  }

  onStartDateChange(dateVal: string): void {
    this.sellStartDate.set(dateVal);
    const opt = this.validityOption();
    if (typeof opt === 'number') {
      this.sellExpiryDate.set(addDaysToDateISO(opt, dateVal));
    } else {
      if (this.sellExpiryDate() < dateVal) {
        this.sellExpiryDate.set(dateVal);
      }
    }
  }

  onExpiryDateChange(dateVal: string): void {
    this.sellExpiryDate.set(dateVal);
    this.validityOption.set('custom');
  }

  applyCoupon(): void {
    const code = this.couponCode().trim().toUpperCase();
    if (!code) return;
    this.couponApi.getCouponByCode(code).subscribe({
      next: (coupon) => {
        if (!coupon || coupon.isActive === false) {
          this.packageService.showToast(this.isArabic() ? 'كود الخصم غير صالح' : 'Invalid coupon code', 'error');
          return;
        }
        if (isCouponExpired(coupon)) {
          this.packageService.showToast(this.isArabic() ? 'كود الكوبون منتهي الصلاحية' : 'Coupon code expired', 'error');
          return;
        }
        if (isCouponExhausted(coupon)) {
          this.packageService.showToast(this.isArabic() ? 'تم استنفاد الحد الأقصى لاستخدام هذا الكود' : 'Coupon usage limit reached', 'error');
          return;
        }
        if (coupon.discountType === 2) {
          this.discountType.set('fixed');
          this.discountValue.set(coupon.value || 0);
        } else {
          this.discountType.set('percentage');
          this.discountValue.set(coupon.value || 0);
        }
        this.packageService.showToast(this.isArabic() ? `تم تطبيق الكوبون "${code}"!` : `Coupon "${code}" applied!`, 'success');
      },
      error: () => {
        // Fallback for demo mock codes if backend doesn't have them
        if (code === 'CORP10' || code === 'NOOK10') {
          this.discountType.set('percentage');
          this.discountValue.set(10);
          this.packageService.showToast(this.isArabic() ? 'تم تطبيق خصم 10%' : '10% discount applied!', 'success');
        } else if (code === 'CORP100' || code === 'WELCOME100') {
          this.discountType.set('fixed');
          this.discountValue.set(100);
          this.packageService.showToast(this.isArabic() ? 'تم تطبيق خصم 100 ج.م' : '100 EGP discount applied!', 'success');
        } else {
          this.packageService.showToast(this.isArabic() ? 'كود الخصم غير صالح' : 'Invalid coupon code', 'error');
        }
      }
    });
  }

  onAmountReceivedInput(val: string): void {
    const parsed = parseFloat(val);
    this.amountReceived.set(isNaN(parsed) ? null : parsed);
  }

  confirmSellPackage(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'بيع باقة محاضر' : 'Sell Instructor Package')) {
      return;
    }
    this.sellSubmitted.set(true);
    const members = this.selectedMembers();

    if (members.length === 0) {
      this.sellMemberError.set(
        this.isArabic()
          ? 'يرجى اختيار محاضر أو جهة واحدة على الأقل للاشتراك في الباقة'
          : 'Please select at least one instructor or organization'
      );
      return;
    }

    if (this.sellExpiryDate() < this.sellStartDate()) {
      this.sellMemberError.set(
        this.isArabic()
          ? 'تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ بداية الباقة'
          : 'Expiry date cannot be before start date'
      );
      return;
    }

    if (this.effectiveHours() <= 0 || isNaN(this.effectiveHours())) {
      this.sellMemberError.set(
        this.isArabic()
          ? 'عدد ساعات الباقة يجب أن يكون أكبر من صفر'
          : 'Package hours must be greater than zero'
      );
      return;
    }

    if (this.finalTotal() < 0 || isNaN(this.finalTotal())) {
      this.sellMemberError.set(
        this.isArabic()
          ? 'إجمالي تكلفة الباقة لا يمكن أن يكون بالسالب'
          : 'Total package cost cannot be negative'
      );
      return;
    }

    // Enforce 1 active package business rule
    for (const member of members) {
      const activePkg = this.packageService.getActivePackageForMember(member.id, member.phone, 'instructor');
      if (activePkg) {
        this.sellMemberError.set(
          this.isArabic()
            ? `المحاضر "${member.nameAr || member.nameEn}" لديه باقة نشطة بالفعل! لا يسمح بالاشتراك في أكثر من باقة نشطة في نفس الوقت.`
            : `Instructor "${member.nameEn || member.nameAr}" already has an active package!`
        );
        return;
      }
    }

    if (this.sellPaymentMethod() === 'cash') {
      const recv = this.amountReceived();
      if (recv === null || recv === undefined || isNaN(recv) || recv <= 0) {
        this.packageService.showToast(
          this.isArabic() ? 'يرجى إدخال المبلغ المستلم أولاً لإتمام عملية الدفع النقدي' : 'Please enter the amount received first',
          'error'
        );
        return;
      }
      if (recv < this.finalTotal()) {
        this.packageService.showToast(
          this.isArabic() ? 'المبلغ المستلم أقل من الإجمالي المطلوب' : 'Received amount is less than total due',
          'error'
        );
        return;
      }
    }

    const pkgTitle = this.effectivePackageName();
    const singleCost = +(this.finalTotal() / members.length).toFixed(2);

    const packagesToCreate = members.map(member => ({
      memberId: member.id,
      memberNameAr: member.nameAr,
      memberNameEn: member.nameEn,
      memberSubAr: member.subAr,
      memberSubEn: member.subEn,
      memberPhone: member.phone,
      memberEmail: member.email,
      members: [member],
      type: 'instructor' as const,
      packageNameAr: pkgTitle,
      packageNameEn: pkgTitle,
      allocatedHours: this.effectiveHours(),
      usedHours: 0,
      cost: singleCost,
      hourlyRate: this.effectiveRate(),
      purchaseDate: this.sellStartDate(),
      expiryDate: this.sellExpiryDate(),
      paymentMethod: this.sellPaymentMethod(),
      status: 'active' as const,
      notes: this.sellNotes().trim() || undefined,
      history: []
    }));

    const ok = this.packageService.addPackages(packagesToCreate);
    if (ok) {
      this.closeSellModal();
    }
  }

  // ----------------------------------------------------
  // DETAILS & CONSUMPTION DRAWER HANDLERS
  // ----------------------------------------------------
  openDrawer(pkg: PackageItem): void {
    this.closeActionMenu();
    this.selectedPackageForDrawer.set(pkg);
    this.drawerExpiryDate.set(pkg.expiryDate);
    this.drawerNotes.set(pkg.notes || '');
    this.drawerAllocatedHours.set(pkg.allocatedHours);
    this.drawerUsedHours.set(pkg.usedHours);
    this.isDrawerFormLocked.set(true);
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedPackageForDrawer.set(null);
  }

  toggleDrawerLock(): void {
    this.isDrawerFormLocked.update(v => !v);
  }

  saveDrawerModifications(): void {
    const pkg = this.selectedPackageForDrawer();
    if (!pkg) return;

    this.packageService.updatePackage(pkg.id, {
      expiryDate: this.drawerExpiryDate(),
      notes: this.drawerNotes()
    });

    // Refresh current drawer snapshot
    const updated = this.packageService.getPackageById(pkg.id);
    if (updated) {
      this.selectedPackageForDrawer.set(updated);
    }
    this.isDrawerFormLocked.set(true);
  }

  getConsumptionPercentage(pkg: PackageItem): number {
    if (!pkg || pkg.allocatedHours <= 0) return 0;
    const pct = Math.round((pkg.remainingHours / pkg.allocatedHours) * 100);
    return Math.min(100, Math.max(0, pct));
  }

  // ----------------------------------------------------
  // RECORD USAGE SESSION HANDLERS
  // ----------------------------------------------------
  openRecordUsageModal(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تسجيل استهلاك باقة' : 'Record Package Usage')) {
      return;
    }
    this.usageSessionTitle.set(this.isArabic() ? 'محاضرة وورشة تدريبية' : 'Classroom Workshop');
    this.usageHoursToDeduct.set(4);
    this.usageLocation.set('Classroom Hall A');
    this.isRecordUsageModalOpen.set(true);
  }

  closeRecordUsageModal(): void {
    this.isRecordUsageModalOpen.set(false);
  }

  confirmRecordUsage(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تسجيل استهلاك باقة' : 'Record Package Usage')) {
      return;
    }
    const pkg = this.selectedPackageForDrawer();
    if (!pkg) return;

    const duration = +this.usageHoursToDeduct();
    if (duration <= 0 || duration > pkg.remainingHours) {
      this.packageService.showToast(
        this.isArabic()
          ? 'عدد الساعات المراد خصمه غير صالح أو يتجاوز الرصيد المتبقي!'
          : 'Invalid hours duration or exceeds remaining balance!',
        'error'
      );
      return;
    }

    const now = new Date();
    const dateFormatted = `${getTodayDateISO()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.packageService.recordSessionUsage(pkg.id, {
      date: dateFormatted,
      duration,
      sessionAr: this.usageSessionTitle() || 'محاضرة وورشة تدريبية بالقاعة',
      sessionEn: 'Classroom Lecture & Lab Session',
      roomOrDesk: this.usageLocation()
    });

    // Refresh drawer data
    const updated = this.packageService.getPackageById(pkg.id);
    if (updated) {
      this.selectedPackageForDrawer.set(updated);
    }
    this.closeRecordUsageModal();
  }

  // ----------------------------------------------------
  // ACTION MENU & DELETE MODAL HANDLERS
  // ----------------------------------------------------
  toggleActionMenu(pkgId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeActionMenuId.update(prev => (prev === pkgId ? null : pkgId));
  }

  closeActionMenu(): void {
    this.activeActionMenuId.set(null);
  }

  // Password Guard for Package Deletion
  deletePasswordInput = signal<string>('');
  deletePasswordError = signal<string | null>(null);

  openDeleteModal(pkg: PackageItem): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'حذف باقة' : 'Delete Package')) {
      return;
    }
    this.closeActionMenu();
    this.deletePasswordInput.set('');
    this.deletePasswordError.set(null);
    this.packageToDelete.set(pkg);
  }

  closeDeleteModal(): void {
    this.packageToDelete.set(null);
    this.deletePasswordInput.set('');
    this.deletePasswordError.set(null);
  }

  confirmDelete(): void {
    const target = this.packageToDelete();
    if (target) {
      this.packageService.deletePackage(target.id);
      if (this.selectedPackageForDrawer()?.id === target.id) {
        this.closeDrawer();
      }
      this.closeDeleteModal();
    }
  }

  // ============================================================
  // EDIT PACKAGE MODAL STATE (ITEM 29)
  // ============================================================
  isEditModalOpen = signal<boolean>(false);
  editingPackage = signal<PackageItem | null>(null);
  editPackageName = signal<string>('');
  editAllocatedHours = signal<number>(0);
  editCost = signal<number>(0);
  editExpiryDate = signal<string>('');
  editNotes = signal<string>('');

  openEditModal(pkg: PackageItem): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تعديل باقة' : 'Edit Package')) {
      return;
    }
    this.closeActionMenu();
    this.editingPackage.set(pkg);
    this.editPackageName.set(this.isArabic() ? (pkg.packageNameAr || pkg.packageNameEn || '') : (pkg.packageNameEn || pkg.packageNameAr || ''));
    this.editAllocatedHours.set(pkg.allocatedHours);
    this.editCost.set(pkg.cost);
    this.editExpiryDate.set(pkg.expiryDate || '');
    this.editNotes.set(pkg.notes || '');
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingPackage.set(null);
  }

  saveEditedPackage(): void {
    const pkg = this.editingPackage();
    if (!pkg) return;

    const hours = Number(this.editAllocatedHours());
    const cost = Number(this.editCost());
    const expiry = this.editExpiryDate();

    if (isNaN(hours) || hours <= 0) {
      this.packageService.showToast(this.isArabic() ? 'عدد الساعات غير صالح (يجب أن يكون أكبر من 0)' : 'Invalid hours amount (must be > 0)', 'error');
      return;
    }

    if (isNaN(cost) || cost < 0) {
      this.packageService.showToast(this.isArabic() ? 'السعر غير صالح (لا يمكن أن يكون بالسالب)' : 'Invalid cost (cannot be negative)', 'error');
      return;
    }

    if (expiry && pkg.purchaseDate && expiry < pkg.purchaseDate) {
      this.packageService.showToast(this.isArabic() ? 'تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ الشراء' : 'Expiry date cannot be before purchase date', 'error');
      return;
    }

    this.packageService.updatePackage(pkg.id, {
      packageNameAr: this.editPackageName().trim() || pkg.packageNameAr,
      packageNameEn: this.editPackageName().trim() || pkg.packageNameEn,
      allocatedHours: hours,
      cost: cost,
      expiryDate: expiry || pkg.expiryDate,
      notes: this.editNotes()
    });

    this.closeEditModal();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.member-autocomplete-wrap')) {
      this.isMemberDropdownOpen.set(false);
    }
    if (!target.closest('.status-filter-wrap') && !target.closest('.status-select-btn')) {
      this.isStatusDropdownOpen.set(false);
    }
    if (!target.closest('.action-menu-wrap') && !target.closest('.btn-action-trigger')) {
      this.closeActionMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isMemberDropdownOpen.set(false);
    this.isStatusDropdownOpen.set(false);
    this.closeActionMenu();
    if (this.isSellModalOpen()) this.closeSellModal();
    if (this.isEditModalOpen()) this.closeEditModal();
    if (this.isDrawerOpen()) this.closeDrawer();
  }
}

