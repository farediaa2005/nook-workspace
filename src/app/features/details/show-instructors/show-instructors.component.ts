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
import { ClassroomService } from '../../../core/services/classroom.service';
import { Instructor } from '../../../core/models/details.model';
import { exportToCsv } from '../../../core/utils/csv.util';
import { getTodayDateISO } from '../../../core/utils/date-time.util';
import { generateAvatarSvg } from '../../../core/utils/avatar.util';
import {
  normalizeArabicDigits,
  sanitizePhoneInput,
  toEgyptianLocalPhone,
  isValidEgyptianPhone,
  isValidEmail,
  isValidPersonName,
  validateNameError,
  validatePhoneError,
  validateEmailError
} from '../../../core/utils/validators.util';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

export type { Instructor };

@Component({
  selector: 'app-show-instructors',
  standalone: true,
  imports: [StatusBadgeComponent, ConfirmDialogComponent, 
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
  private classroomService = inject(ClassroomService);
  private cdr = inject(ChangeDetectorRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Instructors Master State
  instructors = signal<Instructor[]>([]);

  // Search & Filter & Pagination State
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');
  specialtyFilter = signal<string>('all');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

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
  formStatus = signal<'active' | 'inactive'>('active');
  formBio = signal<string>('');
  formError = signal<string | null>(null);

  // Field-Level Validation Signals
  nameError = signal<string | null>(null);
  phoneError = signal<string | null>(null);
  emailError = signal<string | null>(null);

  /** Why the save button is disabled, shown next to it. */
  formMissing = computed<string[]>(() => {
    const missing: string[] = [];
    if (!isValidPersonName(this.formName().trim())) missing.push(this.t().locAValidName);
    if (!isValidEgyptianPhone(this.formPhone().trim())) missing.push(this.t().locAValidEgyptianPhone);
    const email = this.formEmail().trim();
    if (email && !isValidEmail(email)) missing.push(this.t().locAValidEmail);
    return missing;
  });

  isFormInvalid = computed<boolean>(() => {
    const hasNameErr = !isValidPersonName(this.formName().trim());
    const hasPhoneErr = !isValidEgyptianPhone(this.formPhone().trim());
    const email = this.formEmail().trim();
    const hasEmailErr = !!email && !isValidEmail(email);

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

  statusFilterOptions = computed<SelectOption[]>(() => [
    { label: this.t().stuAllStatuses, value: 'all' },
    { label: this.t().detActive, value: 'active' },
    { label: this.t().detInactive, value: 'inactive' }
  ]);

  specialtyFilterOptions = computed<SelectOption[]>(() => {
    const defaultOpt: SelectOption = { label: this.t().detAllSpecialties, value: 'all' };
    const list = this.instructors();
    const unique = Array.from(new Set(list.map(i => (i.specialty || '').trim()).filter(s => s && s !== '-'))).sort();
    return [defaultOpt, ...unique.map(u => ({ label: u, value: u }))];
  });

  getInstructorAvatar(name: string): string {
    return generateAvatarSvg(name);
  }

  getInstructorSessionCount(ins: Instructor): number {
    const cards = this.classroomService.cards();
    const insName = (ins.name || '').trim().toLowerCase();
    const insPhone = (ins.phone || '').trim().replace(/\D/g, '');
    const insId = ins.id;

    const cardMatches = cards.filter(c => {
      const cName = (c.instructor || (c as any).instructorName || '').trim().toLowerCase();
      const cPhone = (c.phone || (c as any).instructorPhone || '').trim().replace(/\D/g, '');
      const cId = (c as any).instructorId;
      if (insId && cId === insId) return true;
      if (insPhone && insPhone.length >= 8 && cPhone && cPhone === insPhone) return true;
      if (insName && cName && (cName === insName || cName.includes(insName) || insName.includes(cName))) return true;
      return false;
    }).length;

    const stored = ins.totalSessions || 0;
    return Math.max(stored, cardMatches);
  }

  // Filtered List Computation
  filteredInstructors = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();
    const sp = this.specialtyFilter();
    const list = this.instructors();

    return list.filter(ins => {
      if (st !== 'all' && ins.status !== st) return false;
      if (sp !== 'all' && ins.specialty !== sp && ins.specialtyEn !== sp) return false;
      if (q) {
        const nameMatch = (ins.name || '').toLowerCase().includes(q) || ((ins.nameEn || '').toLowerCase().includes(q));
        const phoneMatch = (ins.phone || '').includes(q);
        const emailMatch = (ins.email || '').toLowerCase().includes(q);
        const specMatch = (ins.specialty || '').toLowerCase().includes(q) || ((ins.specialtyEn || '').toLowerCase().includes(q));
        const affMatch = (ins.affiliation || '').toLowerCase().includes(q) || ((ins.affiliationEn || '').toLowerCase().includes(q));
        return nameMatch || phoneMatch || emailMatch || specMatch || affMatch;
      }
      return true;
    });
  });

  // KPI Computations
  totalInstructorsCount = computed(() => this.instructors().length);

  activeWorkshopsCount = computed(() =>
    this.instructors().reduce((acc, ins) => acc + (ins.status === 'active' ? this.getInstructorSessionCount(ins) : 0), 0)
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
    this.nameError.set(validateNameError(val, this.isArabic(), true));
    if (this.formError()) this.formError.set(null);
  }

  onPhoneChange(val: string): void {
    const normalized = normalizeArabicDigits(val);
    const clean = sanitizePhoneInput(normalized);
    this.formPhone.set(clean);
    this.phoneError.set(validatePhoneError(clean, this.isArabic(), true));
    if (this.formError()) this.formError.set(null);
  }

  onEmailChange(val: string): void {
    const clean = val.trim();
    this.formEmail.set(clean);
    this.emailError.set(validateEmailError(clean, this.isArabic(), false));
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
    const status = this.formStatus();
    const bio = this.formBio().trim();

    let hasError = false;

    const nameErr = validateNameError(name, this.isArabic(), true);
    this.nameError.set(nameErr);
    if (nameErr) hasError = true;

    const rawPhone = this.formPhone().trim();
    const phoneCanonical = toEgyptianLocalPhone(rawPhone) || sanitizePhoneInput(normalizeArabicDigits(rawPhone));
    const phoneErr = validatePhoneError(phoneCanonical, this.isArabic(), true);
    this.phoneError.set(phoneErr);
    if (phoneErr) hasError = true;

    const emailErr = validateEmailError(email, this.isArabic(), false);
    this.emailError.set(emailErr);
    if (emailErr) hasError = true;

    if (hasError) {
      this.formError.set(
        this.emailError() || this.phoneError() || this.nameError() ||
        (this.t().detPleaseCorrectTheHighlightedForm)
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
        status: status || 'active',
        bio
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success(
            this.t().detInstructorAddedSuccessfully
          );
          this.loadInstructors();
          this.closeModal();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || err?.message || (this.t().detFailedToSaveInstructor);
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
        status,
        bio
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success(
            this.t().detInstructorUpdatedSuccessfully
          );
          this.loadInstructors();
          this.closeModal();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || err?.message || (this.t().detFailedToUpdateInstructor);
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
      return this.t().detAddNewInstructor;
    }
    return this.t().detEditInstructorDetails;
  }
}
