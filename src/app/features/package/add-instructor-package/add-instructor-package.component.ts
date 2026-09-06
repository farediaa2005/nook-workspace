import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { PackageService } from '../../../core/services/package.service';
import { SettingsService } from '../../../core/services/settings.service';
import { InstructorApiService } from '../../../core/services/api/instructor-api.service';
import { PackageMemberOption, PaymentMethod, ValidityPresetOption } from '../../../core/models/package.model';

@Component({
  selector: 'app-add-instructor-package',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-instructor-package.component.html',
  styleUrl: './add-instructor-package.component.css'
})
export class AddInstructorPackageComponent {
  private langService = inject(LanguageService);
  protected packageService = inject(PackageService);
  protected settingsService = inject(SettingsService);
  private instructorApi = inject(InstructorApiService);
  private router = inject(Router);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  todayDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Quick Add Instructor Modal State
  isQuickAddInstructorModalOpen = signal<boolean>(false);
  quickInstructorName = signal<string>('');
  quickInstructorPhone = signal<string>('');
  quickInstructorSpecialty = signal<string>('');
  quickInstructorEmail = signal<string>('');
  isSubmittingQuickInstructor = signal<boolean>(false);

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

  validityPresets = signal([
    { id: 'val-15', days: 15 as const, labelAr: '15 يوم', labelEn: '15 Days' },
    { id: 'val-30', days: 30 as const, labelAr: '30 يوم', labelEn: '30 Days' },
    { id: 'val-60', days: 60 as const, labelAr: '60 يوم', labelEn: '60 Days' },
    { id: 'custom', days: 'custom' as const, labelAr: 'مخصص حر', labelEn: 'Custom' }
  ]);

  // Form Fields
  selectedPackageId = signal<string>('custom');
  customHours = signal<number>(10);
  customTotalPrice = signal<number>(1000);
  customHourlyRate = computed(() => {
    const h = Math.max(1, this.customHours());
    return +(this.customTotalPrice() / h).toFixed(2);
  });

  onCustomHoursChange(hours: number): void {
    this.customHours.set(Math.max(1, hours));
  }

  onCustomTotalPriceChange(price: number): void {
    this.customTotalPrice.set(Math.max(0, price));
  }

  memberSearchQuery = signal<string>('');
  isMemberDropdownOpen = signal<boolean>(false);
  selectedMembers = signal<PackageMemberOption[]>([]);
  memberError = signal<string | null>(null);

  validityOption = signal<number | 'custom'>('custom');
  startDate = signal<string>(new Date().toISOString().split('T')[0]);
  expiryDate = signal<string>(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  validityDays = computed(() => {
    try {
      const start = new Date(this.startDate());
      const end = new Date(this.expiryDate());
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
  });

  isDiscountOpen = signal<boolean>(false);
  discountType = signal<'fixed' | 'percentage'>('fixed');
  discountValue = signal<number>(0);
  couponCode = signal<string>('');

  paymentMethod = signal<PaymentMethod>('cash');
  amountReceived = signal<number | null>(1000);
  notes = signal<string>('');
  submitted = signal<boolean>(false);

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
      return this.customTotalPrice();
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
    if (this.paymentMethod() !== 'cash') return 0;
    const recv = this.amountReceived();
    if (recv === null || recv === undefined || isNaN(recv)) return 0;
    return Math.max(0, +(recv - this.finalTotal()).toFixed(2));
  });

  isCashShort = computed(() => {
    if (this.paymentMethod() !== 'cash') return false;
    const recv = this.amountReceived();
    if (recv === null || recv === undefined || isNaN(recv)) return false;
    return recv < this.finalTotal();
  });

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

  selectPackage(pkg: any): void {
    this.selectedPackageId.set(pkg.id);
    if (pkg.id === 'custom') {
      this.customHours.set(20);
      this.customTotalPrice.set(2000);
    } else {
      this.customHours.set(pkg.hours);
      this.customTotalPrice.set(pkg.price || 0);
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
    this.memberError.set(null);
  }

  removeMember(memberId: string): void {
    this.selectedMembers.update(list => list.filter(m => m.id !== memberId));
  }

  selectValidityOption(preset: ValidityPresetOption): void {
    if (preset.days === 'custom') {
      this.validityOption.set('custom');
    } else {
      this.validityOption.set(preset.days);
      const start = new Date(this.startDate() || new Date());
      start.setDate(start.getDate() + preset.days);
      this.expiryDate.set(start.toISOString().split('T')[0]);
    }
  }

  onStartDateChange(dateVal: string): void {
    this.startDate.set(dateVal);
    const opt = this.validityOption();
    if (typeof opt === 'number') {
      const start = new Date(dateVal || new Date());
      start.setDate(start.getDate() + opt);
      this.expiryDate.set(start.toISOString().split('T')[0]);
    }
  }

  onExpiryDateChange(dateVal: string): void {
    this.expiryDate.set(dateVal);
    this.validityOption.set('custom');
  }

  applyCoupon(): void {
    const code = this.couponCode().trim().toUpperCase();
    if (!code) return;
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

  onAmountReceivedInput(val: string): void {
    const parsed = parseFloat(val);
    this.amountReceived.set(isNaN(parsed) ? null : parsed);
  }

  savePackage(): void {
    this.submitted.set(true);
    const members = this.selectedMembers();

    if (members.length === 0) {
      this.memberError.set(
        this.isArabic()
          ? 'يرجى اختيار محاضر أو جهة واحدة على الأقل للاشتراك في الباقة'
          : 'Please select at least one instructor or organization'
      );
      return;
    }

    if (this.paymentMethod() === 'cash') {
      if (this.amountReceived() === null || this.amountReceived() === undefined || isNaN(this.amountReceived()!) || this.amountReceived()! <= 0) {
        this.packageService.showToast(
          this.isArabic() ? 'يرجى إدخال المبلغ المستلم' : 'Please enter the received amount',
          'error'
        );
        return;
      }
      if (this.isCashShort()) {
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
      purchaseDate: this.startDate(),
      expiryDate: this.expiryDate(),
      paymentMethod: this.paymentMethod(),
      status: 'active' as const,
      notes: this.notes().trim() || undefined,
      history: []
    }));

    this.packageService.addPackages(packagesToCreate);
    this.router.navigate(['/package/instructor']);
  }

  openQuickAddInstructorModal(initialName?: string): void {
    this.quickInstructorName.set(initialName || this.memberSearchQuery().trim());
    this.quickInstructorPhone.set('');
    this.quickInstructorSpecialty.set('');
    this.quickInstructorEmail.set('');
    this.isMemberDropdownOpen.set(false);
    this.isQuickAddInstructorModalOpen.set(true);
  }

  closeQuickAddInstructorModal(): void {
    this.isQuickAddInstructorModalOpen.set(false);
  }

  submitQuickAddInstructor(): void {
    const name = this.quickInstructorName().trim();
    const phone = this.quickInstructorPhone().trim();
    if (!name || !phone) {
      this.packageService.showToast(
        this.isArabic() ? 'يرجى إدخال اسم المحاضر ورقم الهاتف' : 'Please enter instructor name and phone number',
        'error'
      );
      return;
    }

    this.isSubmittingQuickInstructor.set(true);
    const specialty = this.quickInstructorSpecialty().trim() || (this.isArabic() ? 'محاضر معتمد' : 'Certified Instructor');

    this.instructorApi.createInstructor({
      name,
      phoneNumber: phone
    }).subscribe({
      next: (created) => {
        this.isSubmittingQuickInstructor.set(false);
        const instructorId = created?.id || `INS-${Date.now()}`;
        const memberOption: PackageMemberOption = {
          id: instructorId,
          nameAr: name,
          nameEn: name,
          subAr: specialty,
          subEn: specialty,
          phone: phone,
          email: this.quickInstructorEmail().trim(),
          type: 'instructor'
        };

        this.packageService.addOrUpdateMember(memberOption);
        this.addMember(memberOption);
        this.closeQuickAddInstructorModal();
        this.packageService.showToast(
          this.isArabic() ? `تم تسجيل المحاضر "${name}" وإضافته للباقة بنجاح!` : `Instructor "${name}" registered & added to pass!`,
          'success'
        );
      },
      error: () => {
        this.isSubmittingQuickInstructor.set(false);
        const fallbackId = `INS-${Date.now().toString().slice(-4)}`;
        const memberOption: PackageMemberOption = {
          id: fallbackId,
          nameAr: name,
          nameEn: name,
          subAr: specialty,
          subEn: specialty,
          phone: phone,
          email: this.quickInstructorEmail().trim(),
          type: 'instructor'
        };
        this.packageService.addOrUpdateMember(memberOption);
        this.addMember(memberOption);
        this.closeQuickAddInstructorModal();
        this.packageService.showToast(
          this.isArabic() ? `تم إضافة المحاضر "${name}" بنجاح!` : `Instructor "${name}" added successfully!`,
          'success'
        );
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/package/instructor']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.member-autocomplete-wrap')) {
      this.isMemberDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isMemberDropdownOpen.set(false);
  }
}
