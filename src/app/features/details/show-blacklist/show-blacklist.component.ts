import { Component, inject, signal, computed, ChangeDetectorRef, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';

import { DetailsService } from '../../../core/services/details.service';
import { BlacklistRecord } from '../../../core/models/details.model';
import { getTodayDateISO } from '../../../core/utils/date-time.util';
// [MOCK DATA DISABLED FOR LIVE API - See src/testing/mocks/details.mock.ts for offline presentation/testing]

export type { BlacklistRecord };

export interface UnifiedMemberOption {
  id: string;
  name: string;
  phone: string;
  faculty: string;
  type: 'student' | 'instructor';
  typeAr: string;
  avatarInitial: string;
}

@Component({
  selector: 'app-show-blacklist',
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
  templateUrl: './show-blacklist.component.html',
  styleUrl: './show-blacklist.component.css'
})
export class ShowBlacklistComponent implements OnInit {
  private langService = inject(LanguageService);
  private detailsService = inject(DetailsService);
  protected workspaceService = inject(WorkspaceService);
  private cdr = inject(ChangeDetectorRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Master State
  blacklist = signal<BlacklistRecord[]>([]);

  // Searchable Member Auto-Suggest Dropdown State
  memberSearchQuery = signal<string>('');
  isSuggestionsOpen = signal<boolean>(false);
  selectedStudentId = signal<string>('');

  // Unified List of Students & Instructors
  allRegisteredMembers = computed<UnifiedMemberOption[]>(() => {
    const students = this.workspaceService.activeStudents();
    const list: UnifiedMemberOption[] = students.map((s: any) => {
      const name = s.name || '';
      return {
        id: s.id,
        name,
        phone: s.phone || '',
        faculty: s.faculty || s.college || '',
        type: 'student',
        typeAr: this.isArabic() ? 'طالب' : 'Student',
        avatarInitial: name.trim().charAt(0) || 'S'
      };
    });

    return list;
  });

  filteredRegisteredMembers = computed(() => {
    const q = this.memberSearchQuery().toLowerCase().trim();
    const all = this.allRegisteredMembers();
    if (!q) return all.slice(0, 10);

    return all.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.faculty.toLowerCase().includes(q)
    );
  });

  // Search & Pagination State
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(5);

  // Add Block Modal State
  isBlockModalOpen = signal<boolean>(false);

  // Modal Form Controls
  formName = signal<string>('');
  formPhone = signal<string>('');
  formFaculty = signal<string>('');
  formReason = signal<string>('');
  formSeverity = signal<'temporary' | 'permanent'>('temporary');
  formNotes = signal<string>('');
  formError = signal<string | null>(null);

  severityOptions = computed<SelectOption[]>(() => [
    { label: this.t().tempBlock30Days, value: 'temporary' },
    { label: this.t().permBlockFinal, value: 'permanent' }
  ]);

  // Unblock Confirmation Dialog State
  isUnblockModalOpen = signal<boolean>(false);
  recordToUnblock = signal<BlacklistRecord | null>(null);

  // Details Modal State
  isDetailsModalOpen = signal<boolean>(false);
  recordDetails = signal<BlacklistRecord | null>(null);

  ngOnInit(): void {
    this.loadBlacklist();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isSuggestionsOpen.set(false);
  }

  openMemberSuggestions(): void {
    this.isSuggestionsOpen.set(true);
  }

  onMemberSearchChange(query: string): void {
    this.memberSearchQuery.set(query);
    this.isSuggestionsOpen.set(true);
  }

  selectMember(member: UnifiedMemberOption): void {
    this.selectedStudentId.set(member.id);
    this.formName.set(member.name);
    this.formPhone.set(member.phone);
    this.formFaculty.set(member.faculty);
    this.memberSearchQuery.set(member.name);
    this.isSuggestionsOpen.set(false);
  }

  loadBlacklist(): void {
    this.detailsService.getBlacklist().subscribe({
      next: (list) => {
        const seenKeys = new Set<string>();
        const deduped: BlacklistRecord[] = [];
        (list || []).forEach(item => {
          const key = (item.phone || item.name || item.id).trim().toLowerCase();
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            deduped.push(item);
          }
        });
        this.blacklist.set(deduped);
      },
      error: () => {
        this.blacklist.set([]);
      }
    });
  }

  private saveToStorage(list: BlacklistRecord[]): void {
  }

  // Filtered List Computation
  filteredBlacklist = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.blacklist();
    if (!q) return list;

    return list.filter(r => {
      const nameMatch = r.name.toLowerCase().includes(q) || (r.nameEn && r.nameEn.toLowerCase().includes(q));
      const phoneMatch = r.phone.includes(q);
      const facultyMatch = (r.faculty && r.faculty.toLowerCase().includes(q)) || (r.facultyEn && r.facultyEn.toLowerCase().includes(q));
      const reasonMatch = r.reason.toLowerCase().includes(q) || (r.reasonEn && r.reasonEn.toLowerCase().includes(q));
      return nameMatch || phoneMatch || facultyMatch || reasonMatch;
    });
  });

  // KPI Computations
  totalBlockedCount = computed(() =>
    this.blacklist().filter(r => r.status === 'blocked').length
  );

  blockedThisMonthCount = computed(() => {
    const currentMonthPrefix = getTodayDateISO().slice(0, 7); // e.g. '2026-08'
    return this.blacklist().filter(r => r.blockedDate.startsWith(currentMonthPrefix) && r.status === 'blocked').length;
  });

  resolvedCount = computed(() =>
    this.blacklist().filter(r => r.status === 'resolved').length
  );

  // Pagination Computations
  totalPages = computed(() => Math.ceil(this.filteredBlacklist().length / this.pageSize()) || 1);

  paginatedBlacklist = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBlacklist().slice(start, start + this.pageSize());
  });

  startIndex = computed(() => (this.filteredBlacklist().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1));
  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredBlacklist().length));

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

  // Add Block Modal Handlers
  openBlockModal(): void {
    this.selectedStudentId.set('');
    this.memberSearchQuery.set('');
    this.isSuggestionsOpen.set(false);
    this.formName.set('');
    this.formPhone.set('');
    this.formFaculty.set('');
    this.formReason.set('');
    this.formSeverity.set('temporary');
    this.formNotes.set('');
    this.formError.set(null);
    this.isBlockModalOpen.set(true);
  }

  closeBlockModal(): void {
    this.isBlockModalOpen.set(false);
  }

  saveBlock(): void {
    const name = this.formName().trim();
    const phone = this.formPhone().trim();
    const faculty = this.formFaculty().trim();
    const reason = this.formReason().trim();
    const severity = this.formSeverity();
    const notes = this.formNotes().trim();

    if (!name) {
      this.formError.set(this.t().memberNameRequired);
      return;
    }

    if (!phone) {
      this.formError.set(this.t().phoneNumberRequired);
      return;
    }

    if (!reason) {
      this.formError.set(this.t().blockReasonRequired);
      return;
    }

    // Check if student is ALREADY in active blacklist
    const normName = name.toLowerCase();
    const isAlreadyBlocked = this.blacklist().some(r =>
      r.status !== 'resolved' && (
        (phone && r.phone && r.phone.trim() === phone) ||
        (name && r.name && r.name.trim().toLowerCase() === normName)
      )
    );

    if (isAlreadyBlocked) {
      this.formError.set(this.isArabic() ? 'هذا الطالب مضاف بالفعل في القائمة السوداء (Blacklist)!' : 'This student is already in the blacklist!');
      return;
    }

    const studentId = this.selectedStudentId() || undefined;

    this.detailsService.addBlacklist({
      name,
      nameEn: name,
      phone,
      faculty,
      facultyEn: faculty,
      reason,
      reasonEn: reason,
      severity,
      notes
    }).subscribe({
      next: (created) => {
        this.blacklist.set([created, ...this.blacklist()]);

        // Sync with WorkspaceService if student is registered
        const matched = (this.allRegisteredMembers() as any[]).find((s: any) => s.id === studentId || s.phone === phone);
        if (matched && matched.type === 'student') {
          this.workspaceService.blockStudent({ id: matched.id, name: matched.name, phone: matched.phone } as any, reason);
        }

        this.closeBlockModal();
      },
      error: () => {
        this.closeBlockModal();
      }
    });
  }

  // Unblock Dialog Handlers
  openUnblockModal(record: BlacklistRecord): void {
    this.recordToUnblock.set(record);
    this.isUnblockModalOpen.set(true);
  }

  closeUnblockModal(): void {
    this.isUnblockModalOpen.set(false);
    this.recordToUnblock.set(null);
  }

  confirmUnblock(): void {
    const target = this.recordToUnblock();
    if (target) {
      this.detailsService.resolveBlacklist(target.id).subscribe({
        next: () => {
          const updated = this.blacklist().map(r => {
            if (r.id === target.id) {
              return { ...r, status: 'resolved' as const };
            }
            return r;
          });
          this.blacklist.set(updated);

          // Sync unblock with WorkspaceService
          this.workspaceService.unblockStudent(target.id);
          this.closeUnblockModal();
        },
        error: () => {
          this.closeUnblockModal();
        }
      });
    }
  }

  // Details Modal Handlers
  openDetailsModal(record: BlacklistRecord): void {
    this.recordDetails.set(record);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.recordDetails.set(null);
  }
}
