import { Component, inject, signal, computed, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';
import {
  SettingsService,
  StudentPricingTier,
  RoomEntity,
  QuickPackagePreset
} from '../../core/services/settings.service';
import { resolveImageUrl } from '../../core/utils/image-url.util';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PrimaryButtonComponent } from '../../shared/components/primary-button/primary-button.component';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { CustomSelectComponent, SelectOption } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    PrimaryButtonComponent,
    ModalComponent,
    CustomSelectComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private langService = inject(LanguageService);
  protected settingsService = inject(SettingsService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  currentUser = this.authService.user;

  // Active Tab State ('pricing' | 'rooms' | 'packages' | 'roles')
  activeTab = signal<'pricing' | 'rooms' | 'packages' | 'roles'>('pricing');

  // Signals from SettingsService
  pricingTiers = this.settingsService.pricingTiers;
  rooms = this.settingsService.rooms;
  packagePresets = this.settingsService.packagePresets;

  // Roles & Permissions Matrix (2 Roles: Admin & Receptionist)
  rolesPermissions = [
    {
      moduleAr: 'لوحة التحكم والإحصائيات الحية',
      moduleEn: 'Dashboard & Live Analytics',
      admin: true,
      receptionist: true,
      descAr: 'عرض نسب الإشغال والطلاب المتواجدين والإيرادات اليومية',
      descEn: 'View real-time occupancy, present students, and daily revenue'
    },
    {
      moduleAr: 'جلسات مساحة العمل وإتمام الحساب',
      moduleEn: 'Workspace Sessions & Checkout',
      admin: true,
      receptionist: true,
      descAr: 'تسجيل دخول وخروج الطلاب، الدفع الجزئي، وإضافة المشروبات',
      descEn: 'Check-in/out, partial payments, and catering billing'
    },
    {
      moduleAr: 'حجوزات القاعات والغرف',
      moduleEn: 'Classrooms & Bookings',
      admin: true,
      receptionist: true,
      descAr: 'إنشاء وتعديل وتكرار وتقسيم حجوزات القاعات للمحاضرين',
      descEn: 'Create, edit, duplicate, and split classroom reservations'
    },
    {
      moduleAr: 'الكانتين والمخزون ونقاط البيع POS',
      moduleEn: 'Canteen, Inventory & POS',
      admin: true,
      receptionist: true,
      descAr: 'إضافة وتعديل المنتجات، متابعة المخزون، والبيع المباشر',
      descEn: 'Product CRUD, stock management, and cashier sales'
    },
    {
      moduleAr: 'إدارة الورديات وإغلاق الخزينة',
      moduleEn: 'Shift & Cash Reconciliation',
      admin: true,
      receptionist: true,
      descAr: 'بدء وإغلاق الوردية ومطابقة العهدة النقدية والمحافظ الإلكترونية',
      descEn: 'Open/close shift, drawer count, and e-wallet reconciliation'
    },
    {
      moduleAr: 'إدارة الباقات والخصومات',
      moduleEn: 'Packages & Discount Management',
      admin: true,
      receptionist: true,
      descAr: 'إنشاء باقات مخصصة، تعديل ساعات الباقات، وإعطاء نسب خصم خاصة',
      descEn: 'Define custom packages, adjust hours, and grant discounts'
    },
    {
      moduleAr: 'التقارير المالية المجمعة وتصدير البيانات',
      moduleEn: 'Financial Reports & Data Export',
      admin: true,
      receptionist: true,
      descAr: 'تصدير كشوف الحساب، ملفات Excel/CSV، وتقارير أداء المساحة',
      descEn: 'Export ledgers, Excel/CSV files, and performance audits'
    },
    {
      moduleAr: 'إعدادات النظام وإدارة المستخدمين',
      moduleEn: 'System Settings & User Management',
      admin: true,
      receptionist: false,
      descAr: 'إضافة وحذف المستخدمين، تغيير كلمات المرور، وتعديل أسعار القاعات',
      descEn: 'Manage staff accounts, change passwords, and configure hourly rates'
    }
  ];

  // 1. Pricing Tier Modal State
  isTierModalOpen = signal<boolean>(false);
  tierModalMode = signal<'add' | 'edit'>('add');
  editingTierId = signal<string | null>(null);
  formFromHours = signal<number>(0);
  formToHours = signal<number>(1);
  formPriceEgp = signal<number>(10);
  formTierLabelAr = signal<string>('');
  formTierLabelEn = signal<string>('');
  tierFormError = signal<string | null>(null);

  // 2. Room Entity Modal State
  isRoomModalOpen = signal<boolean>(false);
  roomModalMode = signal<'add' | 'edit'>('add');
  editingRoomId = signal<string | null>(null);
  formRoomName = signal<string>('');
  formRoomType = signal<'Classroom' | 'Silent Zone' | 'Shared Space'>('Classroom');
  formRoomCapacity = signal<number>(30);
  formRoomPrice = signal<number>(100);
  formRoomImage = signal<string>('');
  formRoomActive = signal<boolean>(true);
  roomFormError = signal<string | null>(null);
  selectedRoomImageFile = signal<File | null>(null);
  isSavingRoom = signal<boolean>(false);

  // 3. Quick Package Preset Modal State & Filter
  packageFilter = signal<'all' | 'student' | 'instructor'>('all');
  isPackageModalOpen = signal<boolean>(false);
  packageModalMode = signal<'add' | 'edit'>('add');
  editingPackageId = signal<string | null>(null);
  formPkgType = signal<'student' | 'instructor'>('student');
  formPkgHours = signal<number>(10);
  formPkgPrice = signal<number>(200);
  formPkgValidity = signal<number>(30);
  formPkgValiditySelection = signal<string>('30');
  customValidityDays = signal<number>(30);
  formPkgNameAr = signal<string>('');
  packageFormError = signal<string | null>(null);

  quickHourPills = [5, 10, 15, 20, 25, 30, 50, 100];
  quickCapacityPills = [10, 20, 30, 50, 100];
  quickTierRanges = [
    { label: '0 - 1 h', from: 0, to: 1 },
    { label: '1 - 3 h', from: 1, to: 3 },
    { label: '3 - 6 h', from: 3, to: 6 },
    { label: '6 - 12 h', from: 6, to: 12 }
  ];

  studentPackageCount = computed(() => this.packagePresets().filter(p => p.packageType !== 'instructor').length);
  instructorPackageCount = computed(() => this.packagePresets().filter(p => p.packageType === 'instructor').length);

  modalHourlyRate = computed(() => {
    const hours = Number(this.formPkgHours());
    const price = Number(this.formPkgPrice());
    if (!hours || hours <= 0 || !price || price <= 0) return 0;
    return +(price / hours).toFixed(1);
  });

  filteredPackagePresets = computed(() => {
    const list = this.packagePresets();
    const filter = this.packageFilter();
    if (filter === 'student') {
      return list.filter(p => p.packageType !== 'instructor');
    }
    if (filter === 'instructor') {
      return list.filter(p => p.packageType === 'instructor');
    }
    return list;
  });

  // Custom Select Options for Modals
  roomTypeOptions = computed<SelectOption[]>(() => [
    { label: this.t().classroomOption, value: 'Classroom' },
    { label: this.t().silentZoneOption, value: 'Silent Zone' },
    { label: this.t().sharedSpaceOption, value: 'Shared Space' }
  ]);

  pkgValidityOptions = computed<SelectOption[]>(() => [
    { label: `15 ${this.t().validityDays}`, value: '15' },
    { label: `30 ${this.t().validityDays}`, value: '30' },
    { label: `45 ${this.t().validityDays}`, value: '45' },
    { label: `60 ${this.t().validityDays}`, value: '60' },
    { label: `90 ${this.t().validityDays}`, value: '90' },
    { label: `180 ${this.t().validityDays}`, value: '180' },
    { label: `365 ${this.t().validityDays}`, value: '365' },
    { label: `⚙️ ${this.t().customOptionLabel}`, value: 'custom' }
  ]);

  pkgTypeOptions = computed<SelectOption[]>(() => [
    { label: this.t().studentPackageTypeOption, value: 'student' },
    { label: this.t().instructorPackageTypeOption, value: 'instructor' }
  ]);

  onRoomTypeChange(val: string): void {
    this.formRoomType.set(val as 'Classroom' | 'Silent Zone' | 'Shared Space');
  }

  onPkgTypeChange(val: string): void {
    if (val === 'student' || val === 'instructor') {
      this.formPkgType.set(val);
    }
  }

  onPkgValidityChange(val: string): void {
    this.formPkgValiditySelection.set(val);
    if (val === 'custom') {
      this.formPkgValidity.set(this.customValidityDays() || 30);
    } else {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        this.formPkgValidity.set(num);
      }
    }
  }

  onCustomValidityDaysChange(val: number): void {
    const num = Number(val);
    this.customValidityDays.set(num);
    if (this.formPkgValiditySelection() === 'custom' && !isNaN(num) && num > 0) {
      this.formPkgValidity.set(num);
    }
  }

  ngOnInit(): void {
    this.settingsService.syncRoomsFromBackend();
    this.settingsService.syncPricingPlansFromBackend();
    this.settingsService.syncPackagePricingPlansFromBackend();
  }

  setTab(tab: 'pricing' | 'rooms' | 'packages' | 'roles'): void {
    this.activeTab.set(tab);
    if (tab === 'pricing') {
      this.settingsService.syncRoomsFromBackend();
      this.settingsService.syncPricingPlansFromBackend();
    } else if (tab === 'rooms') {
      this.settingsService.syncRoomsFromBackend();
    } else if (tab === 'packages') {
      this.settingsService.syncPackagePricingPlansFromBackend();
    }
  }

  // --- Pricing Tier Handlers ---
  openAddTierModal(): void {
    this.tierModalMode.set('add');
    this.editingTierId.set(null);
    this.formFromHours.set(null as any);
    this.formToHours.set(null as any);
    this.formPriceEgp.set(null as any);
    this.formTierLabelAr.set('');
    this.formTierLabelEn.set('');
    this.tierFormError.set(null);
    this.isTierModalOpen.set(true);
  }

  openEditTierModal(tier: StudentPricingTier): void {
    this.tierModalMode.set('edit');
    this.editingTierId.set(tier.id);
    this.formFromHours.set(tier.fromHours);
    this.formToHours.set(tier.toHours);
    this.formPriceEgp.set(tier.priceEgp);
    this.formTierLabelAr.set(tier.labelAr || '');
    this.formTierLabelEn.set(tier.labelEn || '');
    this.tierFormError.set(null);
    this.isTierModalOpen.set(true);
  }

  saveTier(): void {
    const from = Number(this.formFromHours());
    const to = Number(this.formToHours());
    const price = Number(this.formPriceEgp());

    if (isNaN(from) || from < 0) {
      this.tierFormError.set(this.t().validFromHoursRequired);
      return;
    }
    if (isNaN(to) || to <= from) {
      this.tierFormError.set(this.t().toHoursGreaterThanFrom);
      return;
    }
    if (isNaN(price) || price < 0) {
      this.tierFormError.set(this.t().validPriceRequired);
      return;
    }

    // Overlap validation: prevent saving overlapping tiers
    const editingId = this.editingTierId();
    const existingTiers = this.settingsService.pricingTiers();
    const hasOverlap = existingTiers.some(t => {
      if (this.tierModalMode() === 'edit' && t.id === editingId) return false;
      return !(to <= t.fromHours || from >= t.toHours);
    });

    if (hasOverlap) {
      this.tierFormError.set(this.isArabic()
        ? 'يوجد تداخل وتعارض بين نطاق هذه الشريحة وشريحة أخرى مسجلة مسبقاً!'
        : 'This hourly range overlaps with an existing pricing tier!');
      return;
    }

    // Auto-generate description directly from the actual from/to bounds
    const labelAr = `${from} - ${to} ساعة`;
    const labelEn = `${from} - ${to} hrs`;

    if (this.tierModalMode() === 'add') {
      this.settingsService.addPricingTier({
        fromHours: from,
        toHours: to,
        priceEgp: price,
        labelAr,
        labelEn
      });
    } else {
      const id = this.editingTierId();
      if (id) {
        this.settingsService.updatePricingTier({
          id,
          fromHours: from,
          toHours: to,
          priceEgp: price,
          labelAr,
          labelEn
        });
      }
    }

    this.isTierModalOpen.set(false);
  }

  deleteTier(id: string): void {
    this.settingsService.deletePricingTier(id);
  }

  // --- Room Entity Handlers ---
  openAddRoomModal(): void {
    this.roomModalMode.set('add');
    this.editingRoomId.set(null);
    this.formRoomName.set('');
    this.formRoomType.set('Classroom');
    this.formRoomCapacity.set(null as any);
    this.formRoomPrice.set(null as any);
    this.formRoomImage.set('');
    this.selectedRoomImageFile.set(null);
    this.formRoomActive.set(true);
    this.roomFormError.set(null);
    this.isSavingRoom.set(false);
    this.isRoomModalOpen.set(true);
  }

  openEditRoomModal(room: RoomEntity): void {
    this.roomModalMode.set('edit');
    this.editingRoomId.set(room.id);
    this.formRoomName.set(room.name);
    this.formRoomType.set(room.type);
    this.formRoomCapacity.set(room.capacity);
    this.formRoomPrice.set(room.hourlyPrice);
    this.formRoomImage.set(room.imageUrl || '');
    this.selectedRoomImageFile.set(null);
    this.formRoomActive.set(room.isActive);
    this.roomFormError.set(null);
    this.isSavingRoom.set(false);
    this.isRoomModalOpen.set(true);
  }

  onRoomImageFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedRoomImageFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        this.formRoomImage.set(result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeRoomImage(): void {
    this.formRoomImage.set('');
    this.selectedRoomImageFile.set(null);
  }

  saveRoom(): void {
    const name = this.formRoomName().trim();
    const type = this.formRoomType();
    const cap = Number(this.formRoomCapacity());
    const price = type === 'Classroom' ? Number(this.formRoomPrice()) : 0;
    const imageUrl = this.formRoomImage().trim();
    const isActive = this.formRoomActive();
    const imageFile = this.selectedRoomImageFile() || undefined;

    if (!name) {
      this.roomFormError.set(this.t().roomNameRequired);
      return;
    }

    // BUG-07: Room name max length
    if (name.length > 50) {
      this.roomFormError.set(this.isArabic()
        ? 'يجب ألا يتجاوز اسم القاعة 50 حرفاً لضمان تناسق الجداول.'
        : 'Room name cannot exceed 50 characters to preserve layout.');
      return;
    }

    // Capacity validation (optional, but if provided must be positive integer)
    if (this.formRoomCapacity() && (isNaN(cap) || cap <= 0 || !Number.isInteger(cap))) {
      this.roomFormError.set(this.isArabic()
        ? 'يجب أن تكون سعة القاعة عدداً صحيحاً موجباً أكبر من صفر.'
        : 'Room capacity must be a positive integer greater than zero.');
      return;
    }

    // Hourly price validation only applies to Classrooms
    if (type === 'Classroom' && this.formRoomPrice()) {
      if (isNaN(price) || price < 0) {
        this.roomFormError.set(this.isArabic()
          ? 'يجب أن يكون سعر الإيجار صفراً أو قيمة مالية موجبة.'
          : 'Hourly rental rate must be zero or a positive amount.');
        return;
      }
    }

    this.isSavingRoom.set(true);
    this.roomFormError.set(null);

    if (this.roomModalMode() === 'add') {
      this.settingsService.addRoom({
        name,
        nameEn: name,
        type,
        capacity: cap,
        hourlyPrice: price,
        imageUrl,
        isActive
      }, imageFile).subscribe({
        next: () => {
          this.isSavingRoom.set(false);
          this.isRoomModalOpen.set(false);
          this.selectedRoomImageFile.set(null);
        },
        error: (err) => {
          this.isSavingRoom.set(false);
          let msg = err?.error?.messageAr || err?.error?.message || err?.error?.messageEn;
          if (!msg && err?.error?.errors && typeof err.error.errors === 'object') {
            const fieldErrors = Object.values(err.error.errors).flat() as string[];
            if (fieldErrors.length > 0) msg = fieldErrors.join(' | ');
          }
          if (!msg) {
            msg = err?.message || (this.isArabic() ? 'فشل إضافة القاعة. يرجى مراجعة البيانات والمحاولة مرة أخرى.' : 'Failed to add room. Please try again.');
          }
          this.roomFormError.set(msg);
        }
      });
    } else {
      const id = this.editingRoomId();
      if (id) {
        this.settingsService.updateRoom({
          id,
          name,
          nameEn: name,
          type,
          capacity: cap || 30,
          hourlyPrice: price,
          imageUrl,
          isActive
        }, imageFile).subscribe({
          next: () => {
            this.isSavingRoom.set(false);
            this.isRoomModalOpen.set(false);
            this.selectedRoomImageFile.set(null);
          },
          error: (err) => {
            this.isSavingRoom.set(false);
            let msg = err?.error?.messageAr || err?.error?.message || err?.error?.messageEn;
            if (!msg && err?.error?.errors && typeof err.error.errors === 'object') {
              const fieldErrors = Object.values(err.error.errors).flat() as string[];
              if (fieldErrors.length > 0) msg = fieldErrors.join(' | ');
            }
            if (!msg) {
              msg = err?.message || (this.isArabic() ? 'فشل تعديل القاعة. يرجى مراجعة البيانات والمحاولة مرة أخرى.' : 'Failed to update room. Please try again.');
            }
            this.roomFormError.set(msg);
          }
        });
      }
    }
  }

  toggleRoomActive(id: string): void {
    this.settingsService.toggleRoomActive(id);
  }

  deleteRoom(id: string): void {
    this.settingsService.deleteRoom(id);
  }

  getRoomImage(imageUrl?: string | null): string {
    return resolveImageUrl(imageUrl);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const placeholder = img.nextElementSibling as HTMLElement;
      if (placeholder) {
        placeholder.style.display = 'flex';
      }
    }
  }

  // --- Package Presets Handlers ---
  openAddPackageModal(): void {
    this.packageModalMode.set('add');
    this.editingPackageId.set(null);
    this.formPkgType.set(this.packageFilter() === 'instructor' ? 'instructor' : 'student');
    this.formPkgHours.set(null as any);
    this.formPkgPrice.set(null as any);
    this.formPkgValiditySelection.set('30');
    this.formPkgValidity.set(30);
    this.customValidityDays.set(null as any);
    this.formPkgNameAr.set('');
    this.packageFormError.set(null);
    this.isPackageModalOpen.set(true);
  }

  openEditPackageModal(preset: QuickPackagePreset): void {
    this.packageModalMode.set('edit');
    this.editingPackageId.set(preset.id);
    this.formPkgType.set(preset.packageType || 'student');
    this.formPkgHours.set(preset.hours);
    this.formPkgPrice.set(preset.price);
    const standardDays = ['15', '30', '45', '60', '90', '180', '365'];
    const daysStr = String(preset.validityDays);
    if (standardDays.includes(daysStr)) {
      this.formPkgValiditySelection.set(daysStr);
    } else {
      this.formPkgValiditySelection.set('custom');
      this.customValidityDays.set(preset.validityDays || 30);
    }
    this.formPkgValidity.set(preset.validityDays || 30);
    this.formPkgNameAr.set(preset.nameAr || '');
    this.packageFormError.set(null);
    this.isPackageModalOpen.set(true);
  }

  savePackagePreset(): void {
    const packageType = this.formPkgType();
    const hours = Number(this.formPkgHours());
    const price = Number(this.formPkgPrice());
    const validityDays = this.formPkgValiditySelection() === 'custom'
      ? Math.max(1, Number(this.customValidityDays()) || 30)
      : Math.max(1, Number(this.formPkgValidity()) || 30);
    const nameAr = this.formPkgNameAr().trim() || `${this.isArabic() ? 'باقة' : 'Pass'} ${hours} ${this.isArabic() ? 'ساعة' : 'hrs'}`;

    if (isNaN(hours) || hours <= 0) {
      this.packageFormError.set(this.t().packageHoursRequired);
      return;
    }

    if (this.packageModalMode() === 'add') {
      this.settingsService.addPackagePreset({
        packageType,
        hours,
        price: price || 200,
        validityDays,
        nameAr,
        nameEn: `Pass ${hours} hrs`
      });
    } else {
      const id = this.editingPackageId();
      if (id) {
        this.settingsService.updatePackagePreset({
          id,
          packageType,
          hours,
          price: price || 200,
          validityDays,
          nameAr,
          nameEn: `Pass ${hours} hrs`
        });
      }
    }

    this.isPackageModalOpen.set(false);
  }

  deletePackagePreset(id: string): void {
    this.settingsService.deletePackagePreset(id);
  }
}
