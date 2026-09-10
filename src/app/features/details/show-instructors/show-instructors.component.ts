import { Component, inject, signal, computed, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { Instructor } from '../../../core/models/details.model';
import { exportToCsv } from '../../../core/utils/csv.util';
import { getTodayDateISO } from '../../../core/utils/date-time.util';
// [MOCK DATA DISABLED FOR LIVE API - See src/testing/mocks/details.mock.ts for offline presentation/testing]

export type { Instructor };

@Component({
  selector: 'app-show-instructors',
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
  templateUrl: './show-instructors.component.html',
  styleUrl: './show-instructors.component.css'
})
export class ShowInstructorsComponent implements OnInit {
  private langService = inject(LanguageService);
  private detailsService = inject(DetailsService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Instructors Master State
  instructors = signal<Instructor[]>([]);

  // Search & Pagination State
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(5);

  // Add / Edit Modal State
  isModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  modalMode = signal<'add' | 'edit'>('add');
  editingId = signal<string | null>(null);

  // Modal Form Controls
  formName = signal<string>('');
  formPhone = signal<string>('');
  formEmail = signal<string>('');
  formSpecialty = signal<string>('');
  formAffiliation = signal<string>('');
  formSessions = signal<number>(0);
  formStatus = signal<'active' | 'inactive'>('active');
  formBio = signal<string>('');
  formError = signal<string | null>(null);

  // Field-Level Validation Signals
  nameError = signal<string | null>(null);
  phoneError = signal<string | null>(null);
  emailError = signal<string | null>(null);

  isFormInvalid = computed<boolean>(() => {
    const name = this.formName().trim();
    const phone = this.formPhone().trim();
    const email = this.formEmail().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const hasNameErr = !name;
    const hasPhoneErr = !phone || phone.length !== 11 || !/^\d{11}$/.test(phone);
    const hasEmailErr = !!email && !emailRegex.test(email);

    return hasNameErr || hasPhoneErr || hasEmailErr;
  });

  statusOptions = computed<SelectOption[]>(() => [
    { label: this.t().active, value: 'active' },
    { label: this.t().inactive, value: 'inactive' }
  ]);

  // Delete Modal State
  isDeleteModalOpen = signal<boolean>(false);
  instructorToDelete = signal<Instructor | null>(null);

  ngOnInit(): void {
    this.loadInstructors();
  }

  loadInstructors(): void {
    this.detailsService.getInstructors().subscribe({
      next: (list) => {
        this.instructors.set(list || []);
      },
      error: () => {
        this.instructors.set([]);
      }
    });
  }

  // Filtered List Computation
  filteredInstructors = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.instructors();
    if (!q) return list;

    return list.filter(ins => {
      const nameMatch = (ins.name || '').toLowerCase().includes(q) || ((ins.nameEn || '').toLowerCase().includes(q));
      const phoneMatch = (ins.phone || '').includes(q);
      const emailMatch = (ins.email || '').toLowerCase().includes(q);
      const specMatch = (ins.specialty || '').toLowerCase().includes(q) || ((ins.specialtyEn || '').toLowerCase().includes(q));
      const affMatch = (ins.affiliation || '').toLowerCase().includes(q) || ((ins.affiliationEn || '').toLowerCase().includes(q));
      return nameMatch || phoneMatch || emailMatch || specMatch || affMatch;
    });
  });

  // KPI Computations
  totalInstructorsCount = computed(() => this.instructors().length);
  
  activeWorkshopsCount = computed(() =>
    this.instructors().reduce((acc, ins) => acc + (ins.status === 'active' ? ins.totalSessions : 0), 0)
  );

  corporatePartnersCount = computed(() => {
    const affiliations = this.instructors().map(ins => ins.affiliation.trim()).filter(Boolean);
    return new Set(affiliations).size;
  });

  // Pagination Computations
  totalPages = computed(() => Math.ceil(this.filteredInstructors().length / this.pageSize()) || 1);
  
  paginatedInstructors = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredInstructors().slice(start, start + this.pageSize());
  });

  startIndex = computed(() => (this.filteredInstructors().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1));
  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredInstructors().length));

  // Search input handler
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  // Export Instructors to CSV
  exportInstructorsToCSV(): void {
    const list = this.filteredInstructors();
    if (!list || list.length === 0) {
      alert(this.t().noDataToExport);
      return;
    }

    const headers = ['ID', 'Name', 'Phone', 'Email', 'Specialty', 'Affiliation', 'Sessions', 'Status'];
    const rows = list.map(ins => [
      ins.id,
      ins.name,
      ins.phone || '',
      ins.email || '',
      ins.specialty || '',
      ins.affiliation || '',
      ins.totalSessions || 0,
      ins.status
    ]);
    exportToCsv(`nook_instructors_${getTodayDateISO()}.csv`, headers, rows);
  }

  // Pagination Handler
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.cdr.markForCheck();
    }
  }

  // Real-time Field Validation Handlers
  onNameChange(val: string): void {
    this.formName.set(val);
    if (!val.trim()) {
      this.nameError.set(this.isArabic() ? 'يرجى إدخال اسم المحاضر' : 'Instructor name is required');
    } else {
      this.nameError.set(null);
    }
    if (this.formError()) this.formError.set(null);
  }

  onPhoneChange(val: string): void {
    this.formPhone.set(val);
    const clean = val.trim();
    if (!clean) {
      this.phoneError.set(this.isArabic() ? 'رقم الهاتف مطلوب' : 'Phone number is required');
    } else if (clean.length !== 11 || !/^\d{11}$/.test(clean)) {
      this.phoneError.set(
        this.isArabic()
          ? 'رقم الهاتف يجب أن يتكون من 11 رقماً (مثال: 01012345678)'
          : 'Phone number must be exactly 11 digits (e.g. 01012345678)'
      );
    } else {
      this.phoneError.set(null);
    }
    if (this.formError()) this.formError.set(null);
  }

  onEmailChange(val: string): void {
    this.formEmail.set(val);
    const clean = val.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (clean && !emailRegex.test(clean)) {
      this.emailError.set(
        this.isArabic()
          ? 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@domain.com)'
          : 'Please enter a valid email address (e.g. name@domain.com)'
      );
    } else {
      this.emailError.set(null);
    }
    if (this.formError()) this.formError.set(null);
  }

  // Modal Handlers
  openAddModal(): void {
    this.modalMode.set('add');
    this.editingId.set(null);
    this.formName.set('');
    this.formPhone.set('');
    this.formEmail.set('');
    this.formSpecialty.set('');
    this.formAffiliation.set('');
    this.formSessions.set(0);
    this.formStatus.set('active');
    this.formBio.set('');
    this.formError.set(null);
    this.nameError.set(null);
    this.phoneError.set(null);
    this.emailError.set(null);
    this.isSaving.set(false);
    this.isModalOpen.set(true);
  }

  openEditModal(instructor: Instructor): void {
    this.modalMode.set('edit');
    this.editingId.set(instructor.id);
    this.formName.set(instructor.name);
    this.formPhone.set(instructor.phone === '-' ? '' : instructor.phone);
    this.formEmail.set(instructor.email === '-' ? '' : instructor.email);
    this.formSpecialty.set(instructor.specialty === '-' ? '' : instructor.specialty);
    this.formAffiliation.set(instructor.affiliation === '-' ? '' : instructor.affiliation);
    this.formSessions.set(instructor.totalSessions || 0);
    this.formStatus.set(instructor.status);
    this.formBio.set(instructor.bio || '');
    this.formError.set(null);
    this.nameError.set(null);
    this.phoneError.set(null);
    this.emailError.set(null);
    this.isSaving.set(false);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.isSaving.set(false);
  }

  saveInstructor(): void {
    const name = this.formName().trim();
    const phone = this.formPhone().trim();
    const email = this.formEmail().trim();
    const specialty = this.formSpecialty().trim();
    const affiliation = this.formAffiliation().trim();
    const sessions = Math.max(0, Number(this.formSessions()) || 0);
    const status = this.formStatus();
    const bio = this.formBio().trim();

    let hasError = false;

    if (!name) {
      this.nameError.set(
        this.isArabic() ? 'يرجى إدخال اسم المحاضر' : 'Instructor name is required'
      );
      hasError = true;
    } else {
      this.nameError.set(null);
    }

    if (!phone || phone.length !== 11 || !/^\d{11}$/.test(phone)) {
      this.phoneError.set(
        this.isArabic()
          ? 'رقم الهاتف يجب أن يتكون من 11 رقماً (مثال: 01012345678)'
          : 'Phone number must be exactly 11 digits (e.g. 01012345678)'
      );
      hasError = true;
    } else {
      this.phoneError.set(null);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      this.emailError.set(
        this.isArabic()
          ? 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@domain.com)'
          : 'Please enter a valid email address (e.g. name@domain.com)'
      );
      hasError = true;
    } else {
      this.emailError.set(null);
    }

    if (hasError) {
      this.formError.set(
        this.emailError() || this.phoneError() || this.nameError() ||
        (this.isArabic() ? 'يرجى تصحيح الأخطاء الموضحة في الحقول أدناه' : 'Please correct the highlighted form errors')
      );
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);

    if (this.modalMode() === 'add') {
      this.detailsService.createInstructor({
        name,
        nameEn: name,
        phone,
        email: email || '',
        specialty,
        specialtyEn: specialty,
        affiliation,
        affiliationEn: affiliation,
        totalSessions: sessions || 0,
        status: status || 'active',
        bio
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success(
            this.isArabic() ? 'تمت إضافة المحاضر بنجاح' : 'Instructor added successfully'
          );
          this.loadInstructors();
          this.closeModal();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || err?.message || (this.isArabic() ? 'فشل حفظ بيانات المحاضر' : 'Failed to save instructor');
          this.formError.set(msg);
          this.notificationService.error(msg);
        }
      });
    } else {
      const id = this.editingId();
      if (!id) return;

      this.detailsService.updateInstructor(id, {
        name,
        nameEn: name,
        phone,
        email,
        specialty,
        specialtyEn: specialty,
        affiliation,
        affiliationEn: affiliation,
        bio
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success(
            this.isArabic() ? 'تم تحديث بيانات المحاضر بنجاح' : 'Instructor updated successfully'
          );
          this.loadInstructors();
          this.closeModal();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || err?.message || (this.isArabic() ? 'فشل تحديث بيانات المحاضر' : 'Failed to update instructor');
          this.formError.set(msg);
          this.notificationService.error(msg);
        }
      });
    }
  }

  // Delete Confirmation Handlers
  openDeleteModal(instructor: Instructor): void {
    this.instructorToDelete.set(instructor);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.instructorToDelete.set(null);
  }

  confirmDelete(): void {
    const target = this.instructorToDelete();
    if (target) {
      this.detailsService.deleteInstructor(target.id).subscribe({
        next: () => {
          const updated = this.instructors().filter(i => i.id !== target.id);
          this.instructors.set(updated);
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

  getModalTitle(): string {
    if (this.modalMode() === 'add') {
      return this.isArabic() ? 'إضافة محاضر / مدرب جديد' : 'Add New Instructor';
    }
    return this.isArabic() ? 'تعديل بيانات المحاضر' : 'Edit Instructor Details';
  }
}
