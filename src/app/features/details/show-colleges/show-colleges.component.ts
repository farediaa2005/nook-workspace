import { Component, inject, signal, computed, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

import { DetailsService } from '../../../core/services/details.service';
import { WorkspaceService, parseDurationMinutes } from '../../../core/services/workspace.service';
import { PackageService } from '../../../core/services/package.service';
import { College } from '../../../core/models/details.model';
import { getTodayDateISO, parseIsoToLocalDate } from '../../../core/utils/date-time.util';

export type { College };

export interface CollegeAnalyticsItem {
  no: number;
  id: string;
  name: string;
  nameEn?: string;
  university?: string;
  color: string;
  colorLight: string;
  studentsCount: number;
  hours: number;
  totalRevenue: number;
  percentage: number;
  svgPath: string;
  labelX: number;
  labelY: number;
  midAngle: number;
}

/**
 * Generates an ultra-distinct, non-repeating HSL color for any index up to 100+ colleges.
 * Uses the Golden Ratio Angle (137.507764°) to maximize chromatic distance across the spectrum,
 * combined with alternating lightness and saturation tiers for guaranteed visual distinctness.
 */
export function getDistinctCollegeColor(index: number): { solid: string; light: string } {
  // Golden ratio conjugate hue step (137.50776405°), ensures consecutive colors are spread out evenly
  const hue = (index * 137.50776405003785) % 360;
  
  // Modulate saturation between 72% and 92% in 4 tiers
  const saturation = 74 + (index % 4) * 6;
  
  // Modulate lightness between 48% and 60% in 3 tiers for optimal contrast on dark/light themes
  const lightness = 49 + ((index * 2) % 4) * 4;
  
  return {
    solid: `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`,
    light: `hsla(${hue.toFixed(1)}, ${saturation}%, ${lightness}%, 0.18)`
  };
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  // If full circle (360 deg)
  if (endAngle - startAngle >= 359.99) {
    return `M ${x - radius} ${y} A ${radius} ${radius} 0 1 0 ${x + radius} ${y} A ${radius} ${radius} 0 1 0 ${x - radius} ${y} Z`;
  }
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ');
}

@Component({
  selector: 'app-show-colleges',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchBoxComponent,
    PrimaryButtonComponent,
    MetricCardComponent,
    PaginationComponent,
    ModalComponent
  ],
  templateUrl: './show-colleges.component.html',
  styleUrl: './show-colleges.component.css'
})
export class ShowCollegesComponent implements OnInit {
  private langService = inject(LanguageService);
  private detailsService = inject(DetailsService);
  private workspaceService = inject(WorkspaceService);
  private packageService = inject(PackageService);
  private cdr = inject(ChangeDetectorRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // Active View Tab ('analytics' | 'directory')
  activeTab = signal<'analytics' | 'directory'>('analytics');

  // Master State
  colleges = signal<College[]>([]);

  // Analytics Date Filter State
  dateFrom = signal<string>('2024-10-01');
  dateTo = signal<string>(getTodayDateISO());
  datePreset = signal<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');

  // Hovered item in table or chart
  hoveredCollegeId = signal<string | null>(null);

  // Search & Pagination State for Directory
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Add / Edit Modal State
  isModalOpen = signal<boolean>(false);
  modalMode = signal<'add' | 'edit'>('add');
  editingId = signal<string | null>(null);

  // Modal Form Controls
  formName = signal<string>('');
  formUniversity = signal<string>('');
  formCampus = signal<string>('');
  formStudentsCount = signal<number>(0);
  formNotes = signal<string>('');
  formError = signal<string | null>(null);

  // Delete Modal State
  isDeleteModalOpen = signal<boolean>(false);
  collegeToDelete = signal<College | null>(null);

  ngOnInit(): void {
    this.loadColleges();
  }

  loadColleges(): void {
    this.detailsService.getColleges().subscribe({
      next: (list) => {
        this.colleges.set(list || []);
      },
      error: () => {
        this.colleges.set([]);
      }
    });
  }

  // --- Date Preset Actions ---
  setDatePreset(preset: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'): void {
    this.datePreset.set(preset);
    const todayISO = getTodayDateISO();

    if (preset === 'all') {
      this.dateFrom.set('');
      this.dateTo.set('');
    } else if (preset === 'today') {
      this.dateFrom.set(todayISO);
      this.dateTo.set(todayISO);
    } else if (preset === 'week') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      const y = past.getFullYear();
      const m = String(past.getMonth() + 1).padStart(2, '0');
      const d = String(past.getDate()).padStart(2, '0');
      this.dateFrom.set(`${y}-${m}-${d}`);
      this.dateTo.set(todayISO);
    } else if (preset === 'month') {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      this.dateFrom.set(`${y}-${m}-01`);
      this.dateTo.set(todayISO);
    } else if (preset === 'year') {
      const now = new Date();
      this.dateFrom.set(`${now.getFullYear()}-01-01`);
      this.dateTo.set(todayISO);
    }
  }

  onCustomDateChange(): void {
    this.datePreset.set('custom');
  }

  // --- College Graph Analytics Computation ---
  collegeAnalyticsData = computed<CollegeAnalyticsItem[]>(() => {
    const from = this.dateFrom();
    const to = this.dateTo();

    const registeredColleges = this.colleges();
    const allProfiles = this.workspaceService.getAllStudentProfiles();
    const activeSessions = this.workspaceService.activeStudents();
    const historySessions = this.workspaceService.historyStudents();
    const packages = this.packageService.studentPackages();

    const allSessions = [...activeSessions, ...historySessions];

    // Filter sessions by date
    const filteredSessions = allSessions.filter(s => {
      if (!from && !to) return true;
      const sDate = s.date ? parseIsoToLocalDate(s.date) : '';
      if (!sDate) return true;
      if (from && sDate < from) return false;
      if (to && sDate > to) return false;
      return true;
    });

    // Filter packages by date
    const filteredPackages = packages.filter(p => {
      if (!from && !to) return true;
      const pDate = p.purchaseDate ? parseIsoToLocalDate(p.purchaseDate) : '';
      if (!pDate) return true;
      if (from && pDate < from) return false;
      if (to && pDate > to) return false;
      return true;
    });

    // Map: College Key -> Aggregated Data
    const map = new Map<string, {
      id: string;
      name: string;
      university?: string;
      students: Set<string>;
      hours: number;
      revenue: number;
    }>();

    // 1. Initialize registered colleges
    for (const c of registeredColleges) {
      const cleanName = c.name.trim();
      const key = cleanName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: c.id,
          name: cleanName,
          university: c.university,
          students: new Set<string>(),
          hours: 0,
          revenue: 0
        });
      }
    }

    // 2. Add students from profiles registry
    for (const p of allProfiles) {
      const fac = (p.faculty || p.college || '').trim();
      if (!fac || fac === '-') continue;
      const key = fac.toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          id: `col-${key}`,
          name: fac,
          university: p.college !== fac ? p.college : undefined,
          students: new Set<string>(),
          hours: 0,
          revenue: 0
        };
        map.set(key, entry);
      }
      entry.students.add(p.phone || p.name);
    }

    // 3. Aggregate sessions
    for (const s of filteredSessions) {
      const fac = (s.faculty || s.college || '').trim();
      if (!fac || fac === '-') continue;
      const key = fac.toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          id: `col-${key}`,
          name: fac,
          university: s.college !== fac ? s.college : undefined,
          students: new Set<string>(),
          hours: 0,
          revenue: 0
        };
        map.set(key, entry);
      }
      entry.students.add(s.phone || s.name || s.id);

      const mins = parseDurationMinutes(s.duration);
      const h = mins > 0 ? mins / 60 : 1;
      entry.hours += h;
      entry.revenue += (Number(s.cost) || 0) + (Number(s.cateringTotal) || 0);
    }

    // 4. Aggregate packages
    for (const p of filteredPackages) {
      const fac = (p.memberSubAr || p.memberSubEn || '').trim();
      if (!fac || fac === '-' || fac === 'طالب' || fac === 'Student') continue;
      const key = fac.toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          id: `col-${key}`,
          name: fac,
          students: new Set<string>(),
          hours: 0,
          revenue: 0
        };
        map.set(key, entry);
      }
      entry.students.add(p.memberPhone || p.memberNameAr || p.id);
      entry.hours += (p.allocatedHours || 0);
      entry.revenue += (p.cost || 0);
    }

    // 5. Build list with pure real data from backend API
    const rawList = Array.from(map.values()).map((item) => {
      const sCount = item.students.size;
      const realHours = +(item.hours.toFixed(1));
      const realRevenue = Math.round(item.revenue);
      return {
        id: item.id,
        name: item.name,
        university: item.university,
        studentsCount: sCount,
        hours: realHours,
        totalRevenue: realRevenue
      };
    });

    // Sort descending by real hours, then by real student count, then alphabetically
    rawList.sort((a, b) => b.hours - a.hours || b.studentsCount - a.studentsCount || a.name.localeCompare(b.name));

    const totalHoursAll = rawList.reduce((sum, item) => sum + item.hours, 0);
    const totalStudentsAll = rawList.reduce((sum, item) => sum + item.studentsCount, 0);
    const totalCount = rawList.length;

    // Calculate percentage and SVG slice angles with non-repeating unique colors
    let currentAngle = 0;
    const itemsWithSlices: CollegeAnalyticsItem[] = rawList.map((item, index) => {
      let pct = 0;
      let sliceAngle = 0;

      if (totalHoursAll > 0) {
        pct = +((item.hours / totalHoursAll) * 100).toFixed(1);
        sliceAngle = (item.hours / totalHoursAll) * 360;
      } else if (totalStudentsAll > 0) {
        pct = +((item.studentsCount / totalStudentsAll) * 100).toFixed(1);
        sliceAngle = (item.studentsCount / totalStudentsAll) * 360;
      } else if (totalCount > 0) {
        pct = +(100 / totalCount).toFixed(1);
        sliceAngle = 360 / totalCount;
      }

      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      const midAngle = (startAngle + endAngle) / 2;
      const colorScheme = getDistinctCollegeColor(index);
      const svgPath = totalCount === 1
        ? describeArc(150, 150, 130, 0, 359.99)
        : describeArc(150, 150, 130, startAngle, endAngle);

      // Label coordinate (at 68% radius)
      const labelPos = polarToCartesian(150, 150, 88, midAngle);

      return {
        no: index + 1,
        id: item.id,
        name: item.name,
        university: item.university,
        color: colorScheme.solid,
        colorLight: colorScheme.light,
        studentsCount: item.studentsCount,
        hours: item.hours,
        totalRevenue: item.totalRevenue,
        percentage: pct,
        svgPath,
        labelX: Math.round(labelPos.x),
        labelY: Math.round(labelPos.y),
        midAngle
      };
    });

    return itemsWithSlices;
  });

  // Top Analytics Summary Metrics
  totalAnalyticsStudents = computed(() =>
    this.collegeAnalyticsData().reduce((sum, c) => sum + c.studentsCount, 0)
  );

  totalAnalyticsHours = computed(() =>
    +(this.collegeAnalyticsData().reduce((sum, c) => sum + c.hours, 0).toFixed(1))
  );

  totalAnalyticsRevenue = computed(() =>
    Math.round(this.collegeAnalyticsData().reduce((sum, c) => sum + c.totalRevenue, 0))
  );

  topCollegeItem = computed(() => {
    const list = this.collegeAnalyticsData();
    return list.length > 0 ? list[0] : null;
  });

  hoveredCollege = computed(() => {
    const id = this.hoveredCollegeId();
    if (!id) return null;
    return this.collegeAnalyticsData().find(c => c.id === id) || null;
  });

  // Filtered Directory List
  filteredColleges = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.colleges();
    if (!q) return list;

    return list.filter(col => {
      const nameMatch = col.name.toLowerCase().includes(q) || (col.nameEn && col.nameEn.toLowerCase().includes(q));
      const univMatch = col.university.toLowerCase().includes(q) || (col.universityEn && col.universityEn.toLowerCase().includes(q));
      const campusMatch = col.campus.toLowerCase().includes(q) || (col.campusEn && col.campusEn.toLowerCase().includes(q));
      const notesMatch = col.notes && col.notes.toLowerCase().includes(q);
      return nameMatch || univMatch || campusMatch || notesMatch;
    });
  });

  // KPI Computations for Directory
  totalUniversitiesCount = computed(() => {
    const univs = this.colleges().map(c => c.university.trim()).filter(Boolean);
    return new Set(univs).size;
  });

  totalCollegesCount = computed(() => this.colleges().length);

  enrolledStudentsCount = computed(() =>
    this.colleges().reduce((sum, col) => sum + (col.studentsCount || 0), 0)
  );

  // Pagination Computations
  totalPages = computed(() => Math.ceil(this.filteredColleges().length / this.pageSize()) || 1);

  paginatedColleges = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredColleges().slice(start, start + this.pageSize());
  });

  startIndex = computed(() => (this.filteredColleges().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1));
  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredColleges().length));

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

  // Modal Handlers
  openAddModal(): void {
    this.modalMode.set('add');
    this.editingId.set(null);
    this.formName.set('');
    this.formUniversity.set('');
    this.formCampus.set('');
    this.formStudentsCount.set(0);
    this.formNotes.set('');
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(college: College): void {
    this.modalMode.set('edit');
    this.editingId.set(college.id);
    this.formName.set(college.name);
    this.formUniversity.set(college.university);
    this.formCampus.set(college.campus);
    this.formStudentsCount.set(college.studentsCount || 0);
    this.formNotes.set(college.notes || '');
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveCollege(): void {
    const name = this.formName().trim();
    const university = this.formUniversity().trim();
    const campus = this.formCampus().trim();
    const studentsCount = Math.max(0, Number(this.formStudentsCount()) || 0);
    const notes = this.formNotes().trim();

    if (!name) {
      this.formError.set(this.t().collegeNameRequired);
      return;
    }

    if (!university) {
      this.formError.set(this.t().universityNameRequired);
      return;
    }

    if (this.modalMode() === 'add') {
      this.detailsService.createCollege({
        name,
        nameEn: name,
        university,
        universityEn: university,
        studentsCount: studentsCount || 0,
        campus,
        campusEn: campus,
        notes
      }).subscribe({
        next: (created) => {
          this.colleges.set([created, ...this.colleges()]);
          this.closeModal();
        },
        error: () => {
          this.closeModal();
        }
      });
    } else {
      const id = this.editingId();
      if (!id) return;

      this.detailsService.updateCollege(id, {
        name,
        nameEn: name,
        university,
        universityEn: university,
        campus,
        campusEn: campus,
        notes
      }).subscribe({
        next: () => {
          const updated = this.colleges().map(col => {
            if (col.id === id) {
              return {
                ...col,
                name,
                university,
                campus,
                studentsCount,
                notes
              };
            }
            return col;
          });
          this.colleges.set(updated);
          this.closeModal();
        },
        error: () => {
          this.closeModal();
        }
      });
    }
  }

  // Delete Confirmation Handlers
  openDeleteModal(college: College): void {
    this.collegeToDelete.set(college);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.collegeToDelete.set(null);
  }

  confirmDelete(): void {
    const target = this.collegeToDelete();
    if (target) {
      this.detailsService.deleteCollege(target.id).subscribe({
        next: () => {
          const updated = this.colleges().filter(c => c.id !== target.id);
          this.colleges.set(updated);
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
      return this.isArabic() ? 'إضافة كلية / جامعة جديدة' : 'Add New College';
    }
    return this.isArabic() ? 'تعديل بيانات الكلية' : 'Edit College Details';
  }
}
