import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { PackageService } from '../../../core/services/package.service';
import { SettingsService } from '../../../core/services/settings.service';
import { StudentApiService } from '../../../core/services/api/student-api.service';
import { FacultyApiService } from '../../../core/services/api/faculty-api.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { FacultyDto } from '../../../core/models/faculty.model';
import { PackageMemberOption, PaymentMethod, ValidityPresetOption } from '../../../core/models/package.model';
import { getTodayDateISO, addDaysToDateISO } from '../../../core/utils/date-time.util';

@Component({
  selector: 'app-add-student-package',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-student-package.component.html',
  styleUrl: './add-student-package.component.css'
})
export class AddStudentPackageComponent implements OnInit {
  private langService = inject(LanguageService);
  protected packageService = inject(PackageService);
  protected settingsService = inject(SettingsService);
  private studentApi = inject(StudentApiService);
  private facultyApi = inject(FacultyApiService);
  private workspaceService = inject(WorkspaceService);
  private router = inject(Router);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  todayDate = signal<string>(getTodayDateISO());

  // Quick Add Student Modal State
  isQuickAddStudentModalOpen = signal<boolean>(false);
  quickStudentName = signal<string>('');
  quickStudentPhone = signal<string>('');
  quickStudentWhatsapp = signal<string>('');
  quickStudentFacultyId = signal<string>('');
  quickStudentFacultyName = signal<string>('');
  quickStudentEmail = signal<string>('');
  facultiesList = signal<FacultyDto[]>([]);
  isSubmittingQuickStudent = signal<boolean>(false);

  ngOnInit(): void {
    this.facultyApi.getFaculties().subscribe({
      next: (faculties) => this.facultiesList.set(faculties || []),
      error: () => {}
    });
  }

  // Presets dynamically linked from SettingsService + "+ باقة مخصصة"
  dynamicPackagePresets = computed(() => {
    const presetsFromSettings = this.settingsService.studentPackagePresets();
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
  customTotalPrice = signal<number>(250);
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
  startDate = signal<string>(getTodayDateISO());
  expiryDate = signal<string>(addDaysToDateISO(30));

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
  amountReceived = signal<number | null>(250);
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
        ? `باقة دراسية مخصصة (${this.effectiveHours()} ساعة)`
        : `Custom Study Pass (${this.effectiveHours()} hrs)`;
    }
    return this.isArabic() ? this.selectedPackage().nameAr : this.selectedPackage().nameEn;
  });

  singlePackageCost = computed(() => {
    if (this.selectedPackageId() === 'custom') {
      return this.customTotalPrice();
    }
    return this.selectedPackage().price;
  });

  effectiveStudentCount = computed(() => {
    return Math.max(1, this.selectedMembers().length);
  });

  subtotal = computed(() => {
    return +(this.singlePackageCost() * this.effectiveStudentCount()).toFixed(2);
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

  studentMemberOptions = computed(() => {
    const q = this.memberSearchQuery().toLowerCase().trim();
    const selectedIds = new Set(this.selectedMembers().map(m => m.id));
    const all = this.packageService.memberOptions().filter(m => m.type === 'student' && !selectedIds.has(m.id));
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
      this.customHours.set(10);
      this.customTotalPrice.set(200);
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
      this.expiryDate.set(addDaysToDateISO(preset.days, this.startDate()));
    }
  }

  onStartDateChange(dateVal: string): void {
    this.startDate.set(dateVal);
    const opt = this.validityOption();
    if (typeof opt === 'number') {
      this.expiryDate.set(addDaysToDateISO(opt, dateVal));
    }
  }

  onExpiryDateChange(dateVal: string): void {
    this.expiryDate.set(dateVal);
    this.validityOption.set('custom');
  }

  applyCoupon(): void {
    const code = this.couponCode().trim().toUpperCase();
    if (!code) return;
    if (code === 'STUDENT10' || code === 'NOOK10') {
      this.discountType.set('percentage');
      this.discountValue.set(10);
      this.packageService.showToast(this.isArabic() ? 'تم تطبيق خصم 10%' : '10% discount applied!', 'success');
    } else if (code === 'WELCOME50' || code === 'STUDENT50') {
      this.discountType.set('fixed');
      this.discountValue.set(50);
      this.packageService.showToast(this.isArabic() ? 'تم تطبيق خصم 50 ج.م' : '50 EGP discount applied!', 'success');
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
          ? 'يرجى اختيار طالب واحد على الأقل للاشتراك في الباقة'
          : 'Please select at least one student for the pass'
      );
      return;
    }

    if (this.expiryDate() < this.startDate()) {
      this.memberError.set(
        this.isArabic()
          ? 'تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ بداية الباقة'
          : 'Expiry date cannot be before start date'
      );
      return;
    }

    if (this.effectiveHours() <= 0 || isNaN(this.effectiveHours())) {
      this.memberError.set(
        this.isArabic()
          ? 'عدد ساعات الباقة يجب أن يكون أكبر من صفر'
          : 'Package hours must be greater than zero'
      );
      return;
    }

    if (this.finalTotal() < 0 || isNaN(this.finalTotal())) {
      this.memberError.set(
        this.isArabic()
          ? 'إجمالي تكلفة الباقة لا يمكن أن يكون بالسالب'
          : 'Total package cost cannot be negative'
      );
      return;
    }

    // Enforce 1 active package rule
    for (const member of members) {
      const activePkg = this.packageService.getActivePackageForMember(member.id, member.phone, 'student');
      if (activePkg) {
        this.memberError.set(
          this.isArabic()
            ? `الطالب "${member.nameAr || member.nameEn}" لديه باقة نشطة بالفعل! لا يسمح بالاشتراك في أكثر من باقة نشطة في نفس الوقت.`
            : `Student "${member.nameEn || member.nameAr}" already has an active package!`
        );
        return;
      }
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
      type: 'student' as const,
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

    const ok = this.packageService.addPackages(packagesToCreate);
    if (ok) {
      this.router.navigate(['/package/student']);
    }
  }

  openQuickAddStudentModal(initialName?: string): void {
    this.quickStudentName.set(initialName || this.memberSearchQuery().trim());
    this.quickStudentPhone.set('');
    this.quickStudentWhatsapp.set('');
    this.quickStudentFacultyId.set('');
    this.quickStudentFacultyName.set('');
    this.quickStudentEmail.set('');
    this.isMemberDropdownOpen.set(false);
    this.isQuickAddStudentModalOpen.set(true);
  }

  closeQuickAddStudentModal(): void {
    this.isQuickAddStudentModalOpen.set(false);
  }

  onFacultySelect(facultyId: string): void {
    this.quickStudentFacultyId.set(facultyId);
    const found = this.facultiesList().find(f => f.id === facultyId);
    if (found) {
      this.quickStudentFacultyName.set(found.name);
    } else {
      this.quickStudentFacultyName.set('');
    }
  }

  submitQuickAddStudent(): void {
    const name = this.quickStudentName().trim();
    const phone = this.quickStudentPhone().trim();
    if (!name || !phone) {
      this.packageService.showToast(
        this.isArabic() ? 'يرجى إدخال اسم الطالب ورقم الهاتف' : 'Please enter student name and phone number',
        'error'
      );
      return;
    }

    this.isSubmittingQuickStudent.set(true);
    const whatsapp = this.quickStudentWhatsapp().trim() || phone;
    const facultyId = this.quickStudentFacultyId() || undefined;
    const facultyName = this.quickStudentFacultyName().trim() || 'طالب';

    this.studentApi.createStudent({
      name,
      phoneNumber: phone,
      whatsapp,
      facultyId
    }).subscribe({
      next: (created) => {
        this.isSubmittingQuickStudent.set(false);
        const studentId = created?.id || `STU-${Date.now()}`;
        const memberOption: PackageMemberOption = {
          id: studentId,
          nameAr: name,
          nameEn: name,
          subAr: created?.facultyName || facultyName,
          subEn: created?.facultyName || facultyName,
          phone: phone,
          email: this.quickStudentEmail().trim(),
          type: 'student'
        };

        this.packageService.addOrUpdateMember(memberOption);
        this.workspaceService.registerNewStudent({
          name,
          phone,
          whatsapp,
          email: this.quickStudentEmail().trim(),
          college: facultyName,
          faculty: facultyName
        });

        this.addMember(memberOption);
        this.closeQuickAddStudentModal();
        this.packageService.showToast(
          this.isArabic() ? `تم تسجيل الطالب "${name}" وإضافته للباقة بنجاح!` : `Student "${name}" registered & added to pass!`,
          'success'
        );
      },
      error: () => {
        this.isSubmittingQuickStudent.set(false);
        const fallbackId = `STU-${Date.now().toString().slice(-4)}`;
        const memberOption: PackageMemberOption = {
          id: fallbackId,
          nameAr: name,
          nameEn: name,
          subAr: facultyName,
          subEn: facultyName,
          phone: phone,
          email: this.quickStudentEmail().trim(),
          type: 'student'
        };
        this.packageService.addOrUpdateMember(memberOption);
        this.addMember(memberOption);
        this.closeQuickAddStudentModal();
        this.packageService.showToast(
          this.isArabic() ? `تم إضافة الطالب "${name}" بنجاح!` : `Student "${name}" added successfully!`,
          'success'
        );
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/package/student']);
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
