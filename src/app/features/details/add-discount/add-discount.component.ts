import { Component, inject, signal, computed, ChangeDetectorRef, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';

import { DetailsService } from '../../../core/services/details.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DiscountCode } from '../../../core/models/details.model';
import { getTodayDateISO, addDaysToDateISO } from '../../../core/utils/date-time.util';
// [MOCK DATA DISABLED FOR LIVE API - See src/testing/mocks/details.mock.ts for offline presentation/testing]

export type { DiscountCode };

@Component({
  selector: 'app-add-discount',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    SearchBoxComponent,
    PrimaryButtonComponent,
    MetricCardComponent,
    PaginationComponent,
    ModalComponent,
    CustomSelectComponent
  ],
  templateUrl: './add-discount.component.html',
  styleUrl: './add-discount.component.css'
})
export class AddDiscountComponent implements OnInit {
  private langService = inject(LanguageService);
  private detailsService = inject(DetailsService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Strict Date Constraint
  readonly todayDate = getTodayDateISO();

  // Master State
  discounts = signal<DiscountCode[]>([]);

  // Search & Pagination State
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(5);

  // Copy Feedback State
  copiedCode = signal<string | null>(null);

  // Modal State
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  modalMode = signal<'add' | 'edit'>('add');
  editingId = signal<string | null>(null);

  // Form Controls
  formCode = signal<string>('');
  formTitle = signal<string>('');
  formType = signal<'percentage' | 'fixed'>('percentage');
  formValue = signal<number>(10);
  formScope = signal<'all' | 'students' | 'instructors' | 'packages'>('all');
  formUsageLimit = signal<number>(100);
  formStartDate = signal<string>(getTodayDateISO());
  formExpiryDate = signal<string>('');
  formStatus = signal<'active' | 'disabled'>('active');
  formError = signal<string | null>(null);

  // Validation Signals
  valueError = computed<string | null>(() => {
    const type = this.formType();
    const val = Number(this.formValue());
    if (isNaN(val)) {
      return this.isArabic() ? 'يرجى إدخال قيمة صحيحة' : 'Please enter a valid value';
    }
    if (type === 'percentage') {
      if (val > 100) {
        return this.isArabic()
          ? 'نسبة الخصم لا يمكن أن تتجاوز 100%'
          : 'Percentage discount cannot exceed 100%';
      }
      if (val < 1) {
        return this.isArabic()
          ? 'نسبة الخصم يجب أن تكون 1% على الأقل'
          : 'Percentage discount must be at least 1%';
      }
    } else {
      if (val < 1) {
        return this.isArabic()
          ? 'قيمة الخصم يجب أن تكون أكبر من 0'
          : 'Discount amount must be greater than 0';
      }
    }
    return null;
  });

  isFormInvalid = computed<boolean>(() => {
    const code = this.formCode().trim();
    const title = this.formTitle().trim();
    const expiry = this.formExpiryDate();
    return (
      !code ||
      !title ||
      !expiry ||
      expiry < this.todayDate ||
      !!this.valueError()
    );
  });

  typeOptions = computed<SelectOption[]>(() => [
    { label: this.t().percentageType, value: 'percentage' },
    { label: this.t().fixedAmountType, value: 'fixed' }
  ]);

  scopeOptions = computed<SelectOption[]>(() => [
    { label: this.t().allServicesAndSessions, value: 'all' },
    { label: this.t().studentSessionsOnly, value: 'students' },
    { label: this.t().instructorWorkshopsOnly, value: 'instructors' },
    { label: this.t().hourPacksAndRooms, value: 'packages' }
  ]);

  // Delete Modal State
  isDeleteModalOpen = signal<boolean>(false);
  discountToDelete = signal<DiscountCode | null>(null);

  ngOnInit(): void {
    this.loadDiscounts();

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['openAdd'] === 'true' || params['new'] === 'true' || params['add'] === 'true') {
        setTimeout(() => this.openAddModal(), 80);
      }
    });
  }

  loadDiscounts(): void {
    this.detailsService.getDiscounts().subscribe({
      next: (list) => {
        this.discounts.set(list || []);
      },
      error: () => {
        this.discounts.set([]);
      }
    });
  }

  // Filtered List Computation
  filteredDiscounts = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.discounts();
    if (!q) return list;

    return list.filter(d => {
      const codeMatch = d.code.toLowerCase().includes(q);
      const titleMatch = d.title.toLowerCase().includes(q) || (d.titleEn && d.titleEn.toLowerCase().includes(q));
      const scopeMatch = d.scope.toLowerCase().includes(q);
      return codeMatch || titleMatch || scopeMatch;
    });
  });

  // KPI Computations
  activePromoCodesCount = computed(() =>
    this.discounts().filter(d => d.status === 'active').length
  );

  totalTimesUsedCount = computed(() =>
    this.discounts().reduce((sum, d) => sum + (d.usageCount || 0), 0)
  );

  totalDiscountValueCount = computed(() =>
    this.discounts().reduce((sum, d) => sum + (d.totalDiscountSaved || 0), 0)
  );

  // Pagination Computations
  totalPages = computed(() => Math.ceil(this.filteredDiscounts().length / this.pageSize()) || 1);

  paginatedDiscounts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredDiscounts().slice(start, start + this.pageSize());
  });

  startIndex = computed(() => (this.filteredDiscounts().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1));
  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredDiscounts().length));

  // Search input handler
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  // Pagination Handler
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.cdr.markForCheck();
    }
  }

  // Copy Code to Clipboard
  copyCode(code: string): void {
    try {
      navigator.clipboard.writeText(code);
      this.copiedCode.set(code);
      setTimeout(() => {
        if (this.copiedCode() === code) {
          this.copiedCode.set(null);
        }
      }, 2000);
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  }

  // Auto Generate Promo Code
  generateRandomCode(): void {
    const prefixes = ['NOOK', 'PROMO', 'SAVE', 'VIP', 'OFFER'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    this.formCode.set(`${prefix}${num}`);
  }

  // Modal Handlers
  openAddModal(): void {
    this.modalMode.set('add');
    this.editingId.set(null);
    this.formCode.set('');
    this.formTitle.set('');
    this.formType.set('percentage');
    this.formValue.set(15);
    this.formScope.set('all');
    this.formUsageLimit.set(100);
    this.formStartDate.set(getTodayDateISO());
    
    // Default 30 days expiry
    this.formExpiryDate.set(addDaysToDateISO(30));
    
    this.formStatus.set('active');
    this.formError.set(null);
    this.isSaving.set(false);
    this.isModalOpen.set(true);
  }

  openEditModal(discount: DiscountCode): void {
    this.modalMode.set('edit');
    this.editingId.set(discount.id);
    this.formCode.set(discount.code);
    this.formTitle.set(discount.title);
    this.formType.set(discount.type);
    this.formValue.set(discount.value);
    this.formScope.set(discount.scope);
    this.formUsageLimit.set(discount.usageLimit || 100);
    this.formStartDate.set(discount.startDate);
    this.formExpiryDate.set(discount.expiryDate);
    this.formStatus.set(discount.status === 'disabled' ? 'disabled' : 'active');
    this.formError.set(null);
    this.isSaving.set(false);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.isSaving.set(false);
  }

  saveDiscount(): void {
    const code = this.formCode().trim().toUpperCase();
    const title = this.formTitle().trim();
    const type = this.formType();
    const value = Number(this.formValue()) || 0;
    const scope = this.formScope();
    const usageLimit = Math.max(1, Number(this.formUsageLimit()) || 100);
    const startDate = this.formStartDate();
    const expiryDate = this.formExpiryDate();
    const status = this.formStatus();

    if (!code) {
      this.formError.set(this.t().promoCodeRequired);
      return;
    }

    if (!title) {
      this.formError.set(this.t().discountTitleRequired);
      return;
    }

    if (this.valueError()) {
      this.formError.set(this.valueError());
      return;
    }

    if (!expiryDate) {
      this.formError.set(this.t().expiryDateRequired);
      return;
    }

    if (expiryDate < this.todayDate) {
      this.formError.set(this.t().expiryDateCannotBePast);
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);

    if (this.modalMode() === 'add') {
      this.detailsService.createDiscount({
        code,
        title,
        titleEn: title,
        type,
        value,
        scope,
        usageLimit,
        startDate: startDate || getTodayDateISO(),
        expiryDate,
        status: status as 'active' | 'disabled'
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success(
            this.isArabic() ? 'تم حفظ كود الخصم بنجاح' : 'Promo code saved successfully'
          );
          this.loadDiscounts();
          this.closeModal();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || err?.message || (this.isArabic() ? 'فشل حفظ كود الخصم' : 'Failed to save promo code');
          this.formError.set(msg);
          this.notificationService.error(msg);
        }
      });
    } else {
      const id = this.editingId();
      if (!id) return;

      this.detailsService.updateDiscount(id, {
        title,
        titleEn: title,
        type,
        value,
        status: status as 'active' | 'disabled'
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success(
            this.isArabic() ? 'تم تحديث كود الخصم بنجاح' : 'Promo code updated successfully'
          );
          this.loadDiscounts();
          this.closeModal();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || err?.message || (this.isArabic() ? 'فشل تحديث كود الخصم' : 'Failed to update promo code');
          this.formError.set(msg);
          this.notificationService.error(msg);
        }
      });
    }
  }

  toggleStatus(discount: DiscountCode): void {
    const newStatus: 'active' | 'disabled' = discount.status === 'active' ? 'disabled' : 'active';
    this.detailsService.updateDiscount(discount.id, {
      title: discount.title,
      type: discount.type,
      value: discount.value,
      status: newStatus
    }).subscribe({
      next: () => {
        const updated = this.discounts().map(d => {
          if (d.id === discount.id) {
            return { ...d, status: newStatus };
          }
          return d;
        });
        this.discounts.set(updated);
      }
    });
  }

  // Delete Confirmation Handlers
  openDeleteModal(discount: DiscountCode): void {
    this.discountToDelete.set(discount);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.discountToDelete.set(null);
  }

  confirmDelete(): void {
    const target = this.discountToDelete();
    if (target) {
      this.detailsService.deleteDiscount(target.id).subscribe({
        next: () => {
          const updated = this.discounts().filter(d => d.id !== target.id);
          this.discounts.set(updated);
          this.closeDeleteModal();

          if (this.currentPage() > this.totalPages()) {
            this.currentPage.set(Math.max(1, this.totalPages()));
          }
        },
        error: () => {
          this.closeDeleteModal();
        }
      });
    }
  }

  getScopeLabel(scope: 'all' | 'students' | 'instructors' | 'packages'): string {
    if (this.isArabic()) {
      switch (scope) {
        case 'students': return 'الطلاب والجلسات';
        case 'instructors': return 'المحاضرين والورش';
        case 'packages': return 'باقات الساعات والقاعات';
        default: return 'جميع الخدمات';
      }
    } else {
      switch (scope) {
        case 'students': return 'Students & Sessions';
        case 'instructors': return 'Instructors & Workshops';
        case 'packages': return 'Hour Packs & Rooms';
        default: return 'All Workspace Services';
      }
    }
  }

  getModalTitle(): string {
    if (this.modalMode() === 'add') {
      return this.isArabic() ? 'إنشاء كود خصم ترويجي جديد' : 'Create New Promo Code';
    }
    return this.isArabic() ? 'تعديل تفاصيل كود الخصم' : 'Edit Promo Code Details';
  }
}
