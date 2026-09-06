import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { WorkspaceService, parseDurationMinutes } from '../../../core/services/workspace.service';
import { ShiftService } from '../../../core/services/shift.service';
import { PackageService } from '../../../core/services/package.service';
import { Student, ActiveStudentSession } from '../../../core/models/student.model';
import { PackageItem } from '../../../core/models/package.model';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { generateAvatarSvg, getSafeAvatar } from '../../../core/utils/avatar.util';
import { Router } from '@angular/router';

export interface StudentDirectoryItem {
  id: string;
  studentId?: string;
  name: string;
  avatar?: string;
  phone: string;
  whatsapp: string;
  email: string;
  faculty: string;
  college: string;
  currentStatus: 'active' | 'offline' | 'blocked';
  activeSession?: ActiveStudentSession;
  packageInfo?: {
    hasPackage: boolean;
    packageName?: string;
    packageNameAr?: string;
    packageNameEn?: string;
    remainingHours?: number;
    totalHours?: number;
    status?: string;
  };
  totalVisits: number;
  lastVisitDate?: string;
  lastVisitTime?: string;
  totalSpent: number;
}

@Component({
  selector: 'app-show-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    PrimaryButtonComponent,
    MetricCardComponent,
    SearchBoxComponent,
    CustomSelectComponent,
    PaginationComponent
  ],
  templateUrl: './show-students.component.html',
  styleUrl: './show-students.component.css'
})
export class ShowStudentsComponent implements OnInit, OnDestroy {
  private langService = inject(LanguageService);
  protected workspaceService = inject(WorkspaceService);
  private shiftService = inject(ShiftService);
  private packageService = inject(PackageService);
  private router = inject(Router);

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  formatTime = (str?: string) => this.langService.formatTimeLocale(str);
  formatDuration = (str?: string) => this.langService.formatDurationLocale(str);
  formatName = (str?: string) => this.langService.formatNameLocale(str);

  getStudentAvatar(student: { avatar?: string; name: string } | null | undefined): string {
    if (!student) return generateAvatarSvg('طالب');
    return getSafeAvatar(student.avatar, student.name);
  }

  onAvatarError(event: Event, name?: string): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = generateAvatarSvg(name || 'طالب');
    }
  }

  // Search & Filter State
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');
  packageFilter = signal<string>('all');
  collegeFilter = signal<string>('all');

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Timer for live session duration updates
  currentLiveTime = signal<Date>(new Date());
  private timerInterval: any = null;

  // Register New Student Modal State
  isRegisterModalOpen = signal<boolean>(false);
  regName = signal<string>('');
  regPhone = signal<string>('');
  regWhatsapp = signal<string>('');
  regEmail = signal<string>('');
  regCollege = signal<string>('');
  regFaculty = signal<string>('');

  // Edit Student Modal State
  isEditModalOpen = signal<boolean>(false);
  editTargetId = signal<string>('');
  editName = signal<string>('');
  editPhone = signal<string>('');
  editWhatsapp = signal<string>('');
  editEmail = signal<string>('');
  editCollege = signal<string>('');
  editFaculty = signal<string>('');

  // Delete Student Modal State
  isDeleteModalOpen = signal<boolean>(false);
  studentToDelete = signal<StudentDirectoryItem | null>(null);

  statusOptions = computed<SelectOption[]>(() => [
    { label: this.isArabic() ? 'جميع الحالات' : 'All Statuses', value: 'all' },
    { label: this.isArabic() ? '🟢 جالس الآن' : '🟢 Active Now', value: 'active' },
    { label: this.isArabic() ? '⚪ غير متواجد' : '⚪ Offline', value: 'offline' },
    { label: this.isArabic() ? '🔴 محظور' : '🔴 Blocked', value: 'blocked' }
  ]);

  packageOptions = computed<SelectOption[]>(() => [
    { label: this.isArabic() ? 'كل أنواع الاشتراكات' : 'All Packages', value: 'all' },
    { label: this.isArabic() ? 'مشترك باقة' : 'Package Subscriber', value: 'package' },
    { label: this.isArabic() ? 'دفع بالساعة' : 'Pay As You Go', value: 'paygo' }
  ]);

  collegeOptions = computed<SelectOption[]>(() => {
    const defaultOpt: SelectOption = { label: this.isArabic() ? 'جميع الجامعات / الكليات' : 'All Colleges', value: 'all' };
    const all = this.allStudentsDirectory();
    const colleges = Array.from(new Set(all.map(s => s.college || s.faculty).filter(Boolean))).sort();
    return [defaultOpt, ...colleges.map(c => ({ label: c, value: c }))];
  });

  ngOnInit(): void {
    this.workspaceService.loadFromBackend();
    this.timerInterval = setInterval(() => {
      this.currentLiveTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  /**
   * Unified Master Student Directory
   */
  allStudentsDirectory = computed<StudentDirectoryItem[]>(() => {
    const studentMap = new Map<string, StudentDirectoryItem>();

    const clean = (val?: string) => (val || '').trim();
    const normalizeKey = (phone?: string, name?: string, id?: string) => {
      const cleanPhone = (phone || '').replace(/[^\d]/g, '');
      if (cleanPhone && cleanPhone.length >= 8) return `p_${cleanPhone}`;
      if (id && String(id).trim()) return `id_${String(id).trim()}`;
      if (name && name.trim()) return `n_${name.trim().toLowerCase()}`;
      return `u_${Math.random()}`;
    };

    const getOrCreateKey = (phone?: string, name?: string, id?: string) => {
      const cleanPhone = (phone || '').replace(/[^\d]/g, '');
      if (cleanPhone && cleanPhone.length >= 8) {
        const pKey = `p_${cleanPhone}`;
        if (studentMap.has(pKey)) return pKey;
      }
      if (id && String(id).trim()) {
        const idKey = `id_${String(id).trim()}`;
        if (studentMap.has(idKey)) return idKey;
      }
      if (name && name.trim()) {
        const nKey = `n_${name.trim().toLowerCase()}`;
        if (studentMap.has(nKey)) return nKey;
      }
      return normalizeKey(phone, name, id);
    };

    // 1. Ingest Registered Student Profiles (localStorage + backend)
    const registeredProfiles = this.workspaceService.getAllStudentProfiles();
    for (const p of registeredProfiles) {
      const key = getOrCreateKey(p.phone, p.name, p.id);
      const name = clean(p.name) || 'طالب';
      studentMap.set(key, {
        id: p.id || `STU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        studentId: p.id,
        name,
        avatar: generateAvatarSvg(name),
        phone: clean(p.phone),
        whatsapp: clean(p.whatsapp || p.phone),
        email: clean(p.email),
        faculty: clean(p.faculty) || 'عام',
        college: clean(p.college) || clean(p.faculty) || 'جامعة عامة',
        currentStatus: 'offline',
        totalVisits: 0,
        totalSpent: 0
      });
    }

    // 2. Ingest Student Packages
    const studentPkgs = this.packageService.packages().filter(p => p.type === 'student');
    for (const pkg of studentPkgs) {
      const key = getOrCreateKey(pkg.memberPhone, pkg.memberNameAr || pkg.memberNameEn, pkg.id);
      const existing = studentMap.get(key);
      const pkgName = pkg.packageNameAr || pkg.packageNameEn || 'باقة طلاب';
      const pkgInfo = {
        hasPackage: true,
        packageName: pkgName,
        packageNameAr: pkg.packageNameAr,
        packageNameEn: pkg.packageNameEn,
        remainingHours: pkg.remainingHours,
        totalHours: pkg.allocatedHours,
        status: pkg.status
      };

      if (existing) {
        existing.packageInfo = pkgInfo;
        if (!existing.phone && pkg.memberPhone) existing.phone = clean(pkg.memberPhone);
        if (!existing.email && pkg.memberEmail) existing.email = clean(pkg.memberEmail);
      } else {
        const name = clean(pkg.memberNameAr || pkg.memberNameEn) || 'مشترك باقة';
        studentMap.set(key, {
          id: `PKG-${pkg.id}`,
          name,
          avatar: generateAvatarSvg(name),
          phone: clean(pkg.memberPhone),
          whatsapp: clean(pkg.memberPhone),
          email: clean(pkg.memberEmail),
          faculty: 'مشترك باقة',
          college: 'مشترك باقة',
          currentStatus: 'offline',
          packageInfo: pkgInfo,
          totalVisits: 0,
          totalSpent: pkg.cost || 0
        });
      }
    }

    // 3. Ingest active and history sessions
    const activeSessions = this.workspaceService.activeStudents();
    const historySessions = this.workspaceService.historyStudents();
    const allSessions = [...activeSessions, ...historySessions];

    for (const s of allSessions) {
      const key = getOrCreateKey(s.phone, s.name, s.studentId || s.id);
      let student = studentMap.get(key);

      if (!student) {
        const name = clean(s.name) || 'طالب';
        student = {
          id: s.studentId || s.id,
          studentId: s.studentId,
          name,
          avatar: s.avatar || generateAvatarSvg(name),
          phone: clean(s.phone),
          whatsapp: clean(s.whatsapp || s.phone),
          email: clean(s.email),
          faculty: clean(s.faculty) || 'عام',
          college: clean(s.faculty) || 'عام',
          currentStatus: 'offline',
          totalVisits: 0,
          totalSpent: 0
        };
        studentMap.set(key, student);
      }

      student.totalVisits += 1;
      const sessionCost = Number(s.cost) || 0;
      const extraCost = Number(s.cateringTotal) || 0;
      student.totalSpent += (sessionCost + extraCost);

      if (s.date) {
        if (!student.lastVisitDate || s.date > student.lastVisitDate) {
          student.lastVisitDate = s.date;
          student.lastVisitTime = s.checkInTime;
        }
      }
    }

    // 4. Mark currently active students
    for (const active of activeSessions) {
      const key = getOrCreateKey(active.phone, active.name, active.studentId || active.id);
      const student = studentMap.get(key);
      if (student) {
        student.currentStatus = 'active';
        student.activeSession = active;
        if (active.faculty && !student.faculty) {
          student.faculty = active.faculty;
        }
      }
    }

    // 5. Mark blacklisted students
    const blacklisted = this.workspaceService.blacklist();
    for (const b of blacklisted) {
      const key = getOrCreateKey(b.phone, b.name, b.studentId || b.id);
      const student = studentMap.get(key);
      if (student) {
        student.currentStatus = 'blocked';
      }
    }

    return Array.from(studentMap.values()).sort((a, b) => {
      if (a.currentStatus === 'active' && b.currentStatus !== 'active') return -1;
      if (b.currentStatus === 'active' && a.currentStatus !== 'active') return 1;
      return b.totalVisits - a.totalVisits || a.name.localeCompare(b.name, 'ar');
    });
  });

  // Filtered Directory
  filteredStudents = computed(() => {
    const list = this.allStudentsDirectory();
    const q = this.searchQuery().toLowerCase().trim();
    const stFilter = this.statusFilter();
    const pkgFilter = this.packageFilter();
    const clgFilter = this.collegeFilter();

    return list.filter(s => {
      if (q) {
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchPhone = (s.phone || '').includes(q);
        const matchWhatsapp = (s.whatsapp || '').includes(q);
        const matchEmail = (s.email || '').toLowerCase().includes(q);
        const matchFaculty = (s.faculty || '').toLowerCase().includes(q);
        const matchCollege = (s.college || '').toLowerCase().includes(q);
        const matchId = (s.studentId || s.id || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchWhatsapp && !matchEmail && !matchFaculty && !matchCollege && !matchId) {
          return false;
        }
      }

      if (stFilter !== 'all' && s.currentStatus !== stFilter) {
        return false;
      }

      if (pkgFilter === 'package' && !s.packageInfo?.hasPackage) {
        return false;
      }
      if (pkgFilter === 'paygo' && s.packageInfo?.hasPackage) {
        return false;
      }

      if (clgFilter !== 'all' && s.college !== clgFilter && s.faculty !== clgFilter) {
        return false;
      }

      return true;
    });
  });

  // Paginated Directory
  paginatedStudents = computed(() => {
    const filtered = this.filteredStudents();
    const start = (this.currentPage() - 1) * this.pageSize();
    return filtered.slice(start, start + this.pageSize());
  });

  // Metrics
  totalRegisteredCount = computed(() => this.allStudentsDirectory().length);
  activeInsideCount = computed(() => this.workspaceService.activeStudents().length);
  packageSubscribersCount = computed(() => this.allStudentsDirectory().filter(s => s.packageInfo?.hasPackage).length);
  totalVisitsCount = computed(() => this.allStudentsDirectory().reduce((sum, s) => sum + s.totalVisits, 0));

  // Pagination helper metrics
  totalPages = computed(() => Math.ceil(this.filteredStudents().length / this.pageSize()) || 1);
  startIndex = computed(() => (this.filteredStudents().length === 0) ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredStudents().length));

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  // Register Modal Actions
  openRegisterModal(): void {
    this.regName.set('');
    this.regPhone.set('');
    this.regWhatsapp.set('');
    this.regEmail.set('');
    this.regCollege.set('');
    this.regFaculty.set('');
    this.isRegisterModalOpen.set(true);
  }

  closeRegisterModal(): void {
    this.isRegisterModalOpen.set(false);
  }

  submitRegisterStudent(): void {
    const name = this.regName().trim();
    const phone = this.regPhone().trim();
    if (!name || !phone) {
      alert(this.isArabic() ? 'يرجى إدخال اسم الطالب ورقم الهاتف' : 'Please enter student name and phone number');
      return;
    }

    this.workspaceService.registerNewStudent({
      name,
      phone,
      whatsapp: this.regWhatsapp().trim() || phone,
      email: this.regEmail().trim(),
      college: this.regCollege().trim(),
      faculty: this.regFaculty().trim()
    });

    this.closeRegisterModal();
  }

  // Edit Modal Actions
  openEditModal(student: StudentDirectoryItem): void {
    this.editTargetId.set(student.id);
    this.editName.set(student.name);
    this.editPhone.set(student.phone);
    this.editWhatsapp.set(student.whatsapp || student.phone);
    this.editEmail.set(student.email || '');
    this.editCollege.set(student.college || '');
    this.editFaculty.set(student.faculty || '');
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  submitEditStudent(): void {
    const name = this.editName().trim();
    const phone = this.editPhone().trim();
    if (!name || !phone) return;

    this.workspaceService.registerNewStudent({
      name,
      phone,
      whatsapp: this.editWhatsapp().trim() || phone,
      email: this.editEmail().trim(),
      college: this.editCollege().trim(),
      faculty: this.editFaculty().trim()
    });

    this.closeEditModal();
  }

  // Delete Modal Actions
  confirmDeleteStudent(student: StudentDirectoryItem): void {
    this.studentToDelete.set(student);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.studentToDelete.set(null);
  }

  executeDeleteStudent(): void {
    const s = this.studentToDelete();
    if (s) {
      this.workspaceService.deleteStudentProfile(s.phone || s.id || s.name);
    }
    this.closeDeleteModal();
  }

  // CSV Export
  exportStudentsToCSV(): void {
    const data = this.filteredStudents();
    if (!data.length) return;

    const headers = ['ID', 'Name', 'Phone', 'WhatsApp', 'Email', 'College', 'Faculty', 'Status', 'Package', 'Total Visits', 'Total Spent'];
    const rows = data.map(s => [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      s.phone || '',
      s.whatsapp || '',
      s.email || '',
      `"${(s.college || '').replace(/"/g, '""')}"`,
      `"${(s.faculty || '').replace(/"/g, '""')}"`,
      s.currentStatus,
      s.packageInfo?.hasPackage ? s.packageInfo.packageName : 'Pay As You Go',
      s.totalVisits,
      s.totalSpent
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `students_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
