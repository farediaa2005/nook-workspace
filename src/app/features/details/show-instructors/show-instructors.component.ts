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
import { Instructor } from '../../../core/models/details.model';
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
      `"${ins.name}"`,
      `"${ins.phone || ''}"`,
      `"${ins.email || ''}"`,
      `"${ins.specialty || ''}"`,
      `"${ins.affiliation || ''}"`,
      ins.totalSessions || 0,
      ins.status
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `nook_instructors_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Pagination Handler
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.cdr.markForCheck();
    }
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
    this.isModalOpen.set(true);
  }

  openEditModal(instructor: Instructor): void {
    this.modalMode.set('edit');
    this.editingId.set(instructor.id);
    this.formName.set(instructor.name);
    this.formPhone.set(instructor.phone);
    this.formEmail.set(instructor.email);
    this.formSpecialty.set(instructor.specialty);
    this.formAffiliation.set(instructor.affiliation);
    this.formSessions.set(instructor.totalSessions || 0);
    this.formStatus.set(instructor.status);
    this.formBio.set(instructor.bio || '');
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
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

    if (!name) {
      this.formError.set(this.t().errorInstructor);
      return;
    }

    if (!phone) {
      this.formError.set(this.t().phoneNumberRequired);
      return;
    }

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
        next: (created) => {
          this.instructors.set([created, ...this.instructors()]);
          this.closeModal();
        },
        error: () => {
          this.closeModal();
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
          const updated = this.instructors().map(ins => {
            if (ins.id === id) {
              return {
                ...ins,
                name,
                phone,
                email,
                specialty,
                affiliation,
                totalSessions: sessions,
                status,
                bio
              };
            }
            return ins;
          });
          this.instructors.set(updated);
          this.closeModal();
        },
        error: () => {
          this.closeModal();
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
