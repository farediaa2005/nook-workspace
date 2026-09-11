import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { WorkspaceService, isSameDayAsToday, parseDurationMinutes } from '../../../core/services/workspace.service';
import { ShiftService } from '../../../core/services/shift.service';
import { CateringService } from '../../../core/services/catering.service';
import { Student, ActiveStudentSession } from '../../../core/models/student.model';
import { PackageItem } from '../../../core/models/package.model';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { DateFilterDropdownComponent, DateFilterOption } from '../../../shared/components/date-filter-dropdown/date-filter-dropdown.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { CheckoutModalComponent } from '../../../shared/components/checkout-modal/checkout-modal.component';
import { CheckoutData, PaymentMethodType, ProcessPaymentEvent } from '../../../shared/components/checkout-modal/checkout.models';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { CateringPosModalComponent, PosTargetRoom } from '../../catering/components/catering-pos-modal/catering-pos-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { PackageService } from '../../../core/services/package.service';
import { StudentApiService, BackendStudentDto } from '../../../core/services/api/student-api.service';
import { generateAvatarSvg, getSafeAvatar } from '../../../core/utils/avatar.util';
import { exportToCsv } from '../../../core/utils/csv.util';
import { CouponApiService } from '../../../core/services/api/coupon-api.service';
import { getTodayDateISO, parseIsoToLocal12h, parseIsoToLocalDate } from '../../../core/utils/date-time.util';

import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';

export interface CateringLineItem {
  id: string;
  name: string;
  price: number;
}

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
  selector: 'app-show-student',
  standalone: true,
  imports: [
    FormsModule,
    MetricCardComponent,
    DateFilterDropdownComponent,
    PrimaryButtonComponent,
    CheckoutModalComponent,
    SearchBoxComponent,
    CustomSelectComponent,
    CateringPosModalComponent
  ],
  templateUrl: './show-student.component.html',
  styleUrl: './show-student.component.css'
})
export class ShowStudentComponent implements OnInit, OnDestroy {
  private langService = inject(LanguageService);
  protected workspaceService = inject(WorkspaceService);
  protected shiftService = inject(ShiftService);
  private authService = inject(AuthService);
  private studentApi = inject(StudentApiService);
  private cateringService = inject(CateringService);
  private settingsService = inject(SettingsService);
  private packageService = inject(PackageService);
  private couponApi = inject(CouponApiService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  // Live real-time timer for dynamic session durations
  currentLiveTime = signal<Date>(new Date());
  private timerInterval: any = null;

  ngOnInit(): void {
    this.workspaceService.loadFromBackend();
    this.packageService.syncPackagesFromBackend();
    this.timerInterval = setInterval(() => {
      this.currentLiveTime.set(new Date());
    }, 1000);

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['openCheckIn'] === 'true' || params['checkIn'] === 'true' || params['new'] === 'true') {
        this.openCheckInModal();
      }
      if (params['search']) {
        this.searchQuery.set(params['search']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

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

  parseTimeAndDateToDate(timeStr?: string, dateStr?: string): Date {
    const now = new Date();
    if (!timeStr) return now;

    // If timeStr is already a full ISO date string (contains 'T')
    if (timeStr.includes('T')) {
      const fullIso = timeStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(timeStr) ? timeStr : timeStr + 'Z';
      const parsed = new Date(fullIso);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Determine target year, month, day
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();

    if (dateStr) {
      dateStr = parseIsoToLocalDate(dateStr);
      if (dateStr.includes('-')) {
        // YYYY-MM-DD
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1; // 0-indexed
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            year = y;
            month = m;
            day = d;
          }
        }
      } else if (dateStr.includes('/')) {
        // Handle DD/MM/YYYY or MM/DD/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const p1 = parseInt(parts[0], 10);
          const p2 = parseInt(parts[1], 10);
          const p3 = parseInt(parts[2], 10);
          if (p3 > 1000) {
            if (p1 > 12) {
              // DD/MM/YYYY
              day = p1;
              month = p2 - 1;
              year = p3;
            } else if (p2 > 12) {
              // MM/DD/YYYY
              month = p1 - 1;
              day = p2;
              year = p3;
            } else {
              // Default locale DD/MM/YYYY
              day = p1;
              month = p2 - 1;
              year = p3;
            }
          }
        }
      }
    }

    let hours = now.getHours();
    let minutes = now.getMinutes();

    let clean = timeStr.trim();
    // Normalize corrupted double markers
    clean = clean.replace(/\b(AM\s+PM|PM\s+AM|AM\s+AM|PM\s+PM)\b/gi, m => m.toUpperCase().startsWith('P') ? 'PM' : 'AM');
    clean = clean.replace(/(ص\s+م|م\s+ص|ص\s+ص|م\s+م)/g, m => m.startsWith('م') ? 'م' : 'ص');

    const isPM = /pm|م/i.test(clean);
    const isAM = !isPM && /am|ص/i.test(clean);
    const digitsMatch = clean.match(/(\d{1,2}):(\d{2})/);
    if (digitsMatch) {
      let h = parseInt(digitsMatch[1], 10) || 0;
      const m = parseInt(digitsMatch[2], 10) || 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      hours = h;
      minutes = m;
    }

    return new Date(year, month, day, hours, minutes, 0, 0);
  }

  getLiveElapsedMinutes(timeStr?: string, dateStr?: string): number {
    const start = this.parseTimeAndDateToDate(timeStr, dateStr);
    const now = this.currentLiveTime();
    let diffMs = now.getTime() - start.getTime();

    // If start is slightly in the future due to clock skew or just checked in
    if (diffMs <= 0) return 1;

    // If start date was on a previous date with huge diff (> 18h),
    // recalculate using today's time to keep the active display natural
    if (diffMs > 18 * 60 * 60 * 1000) {
      const todayStart = this.parseTimeAndDateToDate(timeStr, undefined);
      const todayDiffMs = now.getTime() - todayStart.getTime();
      if (todayDiffMs > 0 && todayDiffMs <= 18 * 60 * 60 * 1000) {
        diffMs = todayDiffMs;
      }
    }

    const mins = Math.floor(diffMs / 60000);
    return Math.max(1, mins);
  }

  getLiveStudentDuration(student: ActiveStudentSession): string {
    if (student.status !== 'active') {
      const rawDur = student.duration?.trim();
      const mins = parseDurationMinutes(rawDur);
      const isAnomalous = !rawDur || mins === 0 || mins > 18 * 60 || rawDur === '0h 00m' || rawDur === '0 س 00 د' || rawDur === '0h 0m' || rawDur === '0m';

      if (!isAnomalous) {
        return this.formatDuration(rawDur);
      }

      // Calculate elapsed duration from checkInTime and checkOutTime (or date)
      if (student.checkInTime) {
        const start = this.parseTimeAndDateToDate(student.checkInTime, student.date);
        let end: Date;
        if (student.checkOutTime) {
          end = this.parseTimeAndDateToDate(student.checkOutTime, student.checkOutDate || student.date);
        } else {
          end = this.parseTimeAndDateToDate(undefined, student.checkOutDate || student.date);
        }

        let diffMs = end.getTime() - start.getTime();
        if (diffMs < 0) {
          diffMs += 24 * 60 * 60 * 1000;
        }
        if (diffMs > 18 * 60 * 60 * 1000) {
          const sameDayStart = this.parseTimeAndDateToDate(student.checkInTime, student.date);
          const sameDayEnd = this.parseTimeAndDateToDate(student.checkOutTime || student.checkInTime, student.date);
          let sameDayDiff = sameDayEnd.getTime() - sameDayStart.getTime();
          if (sameDayDiff < 0) sameDayDiff += 24 * 60 * 60 * 1000;
          diffMs = sameDayDiff > 0 ? sameDayDiff : 60 * 60 * 1000;
        }
        const totalMins = Math.max(1, Math.floor(diffMs / 60000));
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return this.formatDuration(`${h}h ${String(m).padStart(2, '0')}m`);
      }

      // If cost is available, compute estimated duration
      if (student.cost && student.cost > 0) {
        const mins = Math.max(15, Math.round((student.cost / 30) * 60));
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return this.formatDuration(`${h}h ${String(m).padStart(2, '0')}m`);
      }

      return this.formatDuration('1h 00m');
    }

    const elapsedMins = this.getLiveElapsedMinutes(student.checkInTime, student.date);
    const h = Math.floor(elapsedMins / 60);
    const m = elapsedMins % 60;
    const durStr = `${h}h ${String(m).padStart(2, '0')}m`;
    return this.formatDuration(durStr);
  }

  getStudentCostBreakdown(student: ActiveStudentSession): {
    baseCost: number;
    cateringCost: number;
    printingCost: number;
    totalCost: number;
    isPackage: boolean;
  } {
    const isPackage = student.billingType === 'package' || (!!student.packageOrCoupon && student.packageOrCoupon.toLowerCase().includes('package'));
    const cateringCost = Number(student.cateringTotal || (student.cateringItems || []).reduce((sum: number, it: any) => sum + (it.totalPrice || it.total || ((it.unitPrice || it.price || 0) * (it.quantity || 1)) || 0), 0)) || 0;
    const printingCost = Number(((student.printingCount || student.printingPages || 0) * 1.5).toFixed(2)) || 0;

    if (student.status === 'completed' || student.status === 'blocked') {
      const storedCost = typeof student.cost === 'number' ? student.cost : (parseFloat(String(student.cost)) || 0);
      const total = storedCost > 0 ? storedCost : +(cateringCost + printingCost).toFixed(2);
      const baseCost = isPackage ? 0 : Math.max(0, +(total - cateringCost - printingCost).toFixed(2));
      return {
        baseCost,
        cateringCost: +cateringCost.toFixed(2),
        printingCost: +printingCost.toFixed(2),
        totalCost: +total.toFixed(2),
        isPackage
      };
    }

    let baseCost = 0;
    if (!isPackage) {
      const elapsedMins = this.getLiveElapsedMinutes(student.checkInTime, student.date);
      const hoursFloat = Math.max(0.25, +(elapsedMins / 60).toFixed(2));
      baseCost = this.settingsService.calculateStudentCost(hoursFloat);
    }

    const totalCost = +(baseCost + cateringCost + printingCost).toFixed(2);
    return {
      baseCost: +baseCost.toFixed(2),
      cateringCost: +cateringCost.toFixed(2),
      printingCost: +printingCost.toFixed(2),
      totalCost,
      isPackage
    };
  }

  getStudentTotalCost(student: ActiveStudentSession): number {
    return this.getStudentCostBreakdown(student).totalCost;
  }

  // Catering Modal for Student Sessions
  isStudentCateringModalOpen = signal(false);
  isCateringProcessing = signal(false);
  cateringTargetStudent = signal<PosTargetRoom | null>(null);
  activeStudentForCatering = signal<ActiveStudentSession | null>(null);

  activeTab = signal<'active' | 'history' | 'all'>('active');
  searchQuery = signal('');

  // ----------------------------------------------------
  // DIRECT REGISTER STUDENT MODAL STATE
  // ----------------------------------------------------
  isRegisterModalOpen = signal(false);
  regName = signal('');
  regPhone = signal('');
  regWhatsapp = signal('');
  regEmail = signal('');
  regCollege = signal('');
  regFaculty = signal('');

  // ----------------------------------------------------
  // UNIFIED REGISTERED STUDENTS DIRECTORY
  // ----------------------------------------------------
  allStudentsDirectory = computed<StudentDirectoryItem[]>(() => {
    const profiles = this.workspaceService.getAllStudentProfiles();
    const activeSessions = this.workspaceService.activeStudents();
    const historySessions = this.workspaceService.historyStudents();
    const studentPkgs = this.packageService.studentPackages();
    const blacklist = this.workspaceService.blacklist();

    const clean = (val?: string) => (val && val !== '-' && val !== 'undefined' ? val.trim() : '');

    const studentMap = new Map<string, StudentDirectoryItem>();

    const getOrCreateKey = (phone?: string, name?: string, id?: string): string => {
      const cleanP = clean(phone);
      const cleanN = clean(name).toLowerCase();
      if (cleanP) return cleanP;
      if (cleanN) return cleanN;
      return id || `${Date.now()}_${Math.random()}`;
    };

    // 1. Ingest all registered profiles
    for (const p of profiles) {
      const key = getOrCreateKey(p.phone, p.name, p.id);
      const name = clean(p.name) || 'طالب';
      const faculty = clean(p.faculty);
      const college = clean(p.college);
      studentMap.set(key, {
        id: p.id || `STU-${Math.abs(key.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString().slice(0, 4)}`,
        studentId: p.id,
        name,
        avatar: generateAvatarSvg(name),
        phone: clean(p.phone),
        whatsapp: clean(p.whatsapp) || clean(p.phone),
        email: clean(p.email),
        faculty: faculty || '',
        college: college && college !== faculty ? college : '',
        currentStatus: 'offline',
        totalVisits: 0,
        totalSpent: 0
      });
    }

    // 2. Ingest packages
    for (const pkg of studentPkgs) {
      const pkgStudentId = pkg.memberId;
      const pkgPhone = clean(pkg.memberPhone);
      const pkgName = clean(pkg.memberNameAr || pkg.memberNameEn);

      // Match student by backend student ID first, then phone, then name
      let existing: StudentDirectoryItem | undefined;
      if (pkgStudentId) {
        existing = Array.from(studentMap.values()).find(s => s.studentId === pkgStudentId || s.id === pkgStudentId);
      }
      if (!existing && pkgPhone && pkgPhone.length >= 8) {
        const pKey = pkgPhone;
        existing = studentMap.get(pKey);
      }
      if (!existing && pkgName) {
        const nKey = pkgName.toLowerCase();
        existing = studentMap.get(nKey);
      }

      const pkgNameStr = pkg.packageNameAr || pkg.packageNameEn || 'باقة طلاب';
      const pkgInfo = {
        hasPackage: true,
        packageName: pkgNameStr,
        packageNameAr: pkg.packageNameAr,
        packageNameEn: pkg.packageNameEn,
        remainingHours: pkg.remainingHours,
        totalHours: pkg.allocatedHours,
        status: pkg.status
      };

      if (existing) {
        existing.packageInfo = pkgInfo;
        if (!existing.phone && pkgPhone && pkgPhone !== '-') existing.phone = pkgPhone;
        if (!existing.email && pkg.memberEmail) existing.email = clean(pkg.memberEmail);
        if (!existing.faculty && pkg.memberSubAr && pkg.memberSubAr !== '-') {
          existing.faculty = pkg.memberSubAr;
        }
      } else {
        const name = pkgName || 'مشترك باقة';
        const key = getOrCreateKey(pkgPhone, name, pkgStudentId || pkg.id);
        studentMap.set(key, {
          id: pkgStudentId || `PKG-${pkg.id}`,
          studentId: pkgStudentId,
          name,
          avatar: generateAvatarSvg(name),
          phone: pkgPhone !== '-' ? pkgPhone : '',
          whatsapp: pkgPhone !== '-' ? pkgPhone : '',
          email: clean(pkg.memberEmail),
          faculty: pkg.memberSubAr && pkg.memberSubAr !== '-' ? pkg.memberSubAr : '',
          college: '',
          currentStatus: 'offline',
          packageInfo: pkgInfo,
          totalVisits: 0,
          totalSpent: pkg.cost || 0
        });
      }
    }

    // 3. Ingest active and history sessions
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
          faculty: clean(s.faculty) || '',
          college: '',
          currentStatus: 'offline',
          totalVisits: 0,
          totalSpent: 0
        };
      }

      student.totalVisits += 1;
      const sessionCost = typeof s.cost === 'number' ? s.cost : (parseFloat(String(s.cost)) || 0);
      student.totalSpent += sessionCost + (s.cateringTotal || 0);

      // Track last visit
      if (s.date && (!student.lastVisitDate || s.date >= student.lastVisitDate)) {
        student.lastVisitDate = s.date;
        student.lastVisitTime = s.checkInTime || student.lastVisitTime;
      }
    }

    // 4. Update live currentStatus (active / blocked)
    for (const [, student] of studentMap.entries()) {
      // Check active
      const activeMatch = activeSessions.find(s =>
        (student.phone && s.phone === student.phone) ||
        (student.name && s.name.toLowerCase() === student.name.toLowerCase()) ||
        s.id === student.id || s.studentId === student.studentId
      );
      if (activeMatch) {
        student.currentStatus = 'active';
        student.activeSession = activeMatch;
      }

      // Check blacklist
      const isBlocked = blacklist.some(b =>
        (student.phone && b.phone === student.phone) ||
        (student.name && b.name.toLowerCase() === student.name.toLowerCase()) ||
        b.studentId === student.id || b.studentId === student.studentId
      );
      if (isBlocked) {
        student.currentStatus = 'blocked';
      }

      student.totalSpent = +student.totalSpent.toFixed(2);
    }

    return Array.from(studentMap.values()).sort((a, b) => {
      if (a.currentStatus === 'active' && b.currentStatus !== 'active') return -1;
      if (b.currentStatus === 'active' && a.currentStatus !== 'active') return 1;
      return (b.totalVisits || 0) - (a.totalVisits || 0);
    });
  });

  totalRegisteredStudentsCount = computed(() => this.allStudentsDirectory().length);
  packageSubscribersCount = computed(() => this.allStudentsDirectory().filter(s => s.packageInfo?.hasPackage).length);

  filteredDirectoryStudents = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.allStudentsDirectory();
    if (!query) return list;
    return list.filter(s =>
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query)) ||
      (s.whatsapp && s.whatsapp.includes(query)) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.faculty && s.faculty.toLowerCase().includes(query)) ||
      (s.college && s.college.toLowerCase().includes(query)) ||
      (s.packageInfo?.packageName && s.packageInfo.packageName.toLowerCase().includes(query))
    );
  });

  paginatedDirectoryStudents = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredDirectoryStudents().slice(start, start + this.pageSize());
  });

  // Date Filter State
  selectedDateOption = signal<'today' | 'yesterday' | 'all' | 'custom'>('today');
  customDateValue = signal('');
  isDateDropdownOpen = signal(false);

  // Pagination State (Default 10 with configurable page-size selector)
  currentPage = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly pageSizeOptionsList = computed<SelectOption[]>(() =>
    this.pageSizeOptions.map(opt => ({ label: String(opt), value: String(opt) }))
  );
  pageSizeStr = computed(() => String(this.pageSize()));

  setPageSize(size: number | string): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  private searchBlurTimeout: any = null;
  ciOnSearchBlur(): void {
    if (this.searchBlurTimeout) clearTimeout(this.searchBlurTimeout);
    this.searchBlurTimeout = setTimeout(() => {
      this.ciIsSearchDropdownOpen.set(false);
    }, 250);
  }

  // Action Menu State
  activeActionMenuId = signal<string | null>(null);

  // ----------------------------------------------------
  // 1. CHECK-IN (ADD STUDENT) MODAL STATE
  // ----------------------------------------------------
  isCheckInModalOpen = signal(false);
  ciIsEditMode = signal(false);
  ciEditingStudentId = signal<string | null>(null);
  ciSearchQuery = signal('');
  ciIsSearchDropdownOpen = signal(false);
  ciSelectedStudent = signal<Student | null>(null);
  ciExistingStudentFound = signal<boolean>(false);
  ciPaymentMethod = signal<'package' | 'cash'>('cash');
  ciActivePackage = signal<any | null>(null);

  ciName = signal('');
  ciPhone = signal('');
  ciEmail = signal('');
  ciWhatsapp = signal('');
  ciCollege = signal('');
  ciFaculty = signal('');
  todayDate = getTodayDateISO();
  ciDate = signal(getTodayDateISO());

  // Segmented Time Input Signals (Matching Design System)
  ciStartHour = signal('02');
  ciStartMinute = signal('07');
  ciStartPeriod = signal<'AM' | 'PM'>('PM');

  ciEndHour = signal('05');
  ciEndMinute = signal('07');
  ciEndPeriod = signal<'AM' | 'PM'>('PM');

  syncCiTime(): void {
    let h = parseInt(this.ciStartHour(), 10) || 12;
    if (this.ciStartPeriod() === 'PM' && h < 12) h += 12;
    if (this.ciStartPeriod() === 'AM' && h === 12) h = 0;
    const m = (this.ciStartMinute() || '00').padStart(2, '0');
  }

  syncCiExpectedCheckout(): void {
    let h = parseInt(this.ciEndHour(), 10) || 12;
    if (this.ciEndPeriod() === 'PM' && h < 12) h += 12;
    if (this.ciEndPeriod() === 'AM' && h === 12) h = 0;
    const m = (this.ciEndMinute() || '00').padStart(2, '0');
  }

  onCiStartHourInput(val: string): void {
    let num = val.replace(/\D/g, '');
    if (num.length > 2) num = num.slice(0, 2);
    if (num && parseInt(num, 10) > 12) num = '12';
    this.ciStartHour.set(num);
    this.syncCiTime();
  }

  onCiStartMinuteInput(val: string): void {
    let num = val.replace(/\D/g, '');
    if (num.length > 2) num = num.slice(0, 2);
    if (num && parseInt(num, 10) > 59) num = '59';
    this.ciStartMinute.set(num);
    this.syncCiTime();
  }

  onCiEndHourInput(val: string): void {
    let num = val.replace(/\D/g, '');
    if (num.length > 2) num = num.slice(0, 2);
    if (num && parseInt(num, 10) > 12) num = '12';
    this.ciEndHour.set(num);
    this.syncCiExpectedCheckout();
  }

  onCiEndMinuteInput(val: string): void {
    let num = val.replace(/\D/g, '');
    if (num.length > 2) num = num.slice(0, 2);
    if (num && parseInt(num, 10) > 59) num = '59';
    this.ciEndMinute.set(num);
    this.syncCiExpectedCheckout();
  }

  ciSetNowTime(): void {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    this.ciStartHour.set(String(displayHours).padStart(2, '0'));
    this.ciStartMinute.set(String(minutes).padStart(2, '0'));
    this.ciStartPeriod.set(period);
    this.syncCiTime();

    const endTotalH = hours + 3;
    const endH12 = endTotalH % 12 || 12;
    const endPer: 'AM' | 'PM' = (endTotalH % 24) >= 12 ? 'PM' : 'AM';

    this.ciEndHour.set(String(endH12).padStart(2, '0'));
    this.ciEndMinute.set(String(minutes).padStart(2, '0'));
    this.ciEndPeriod.set(endPer);
    this.syncCiExpectedCheckout();
  }

  ciStudentSuggestions = computed<any[]>(() => {
    const query = this.ciSearchQuery().toLowerCase().trim();
    if (!query) return [];

    const clean = (val?: string | null) => (val && val !== '-' && val !== 'undefined' ? val.trim() : '');

    // 1. All saved persistent profiles
    const registeredProfiles = this.workspaceService.getAllStudentProfiles();

    // 2. Active & History sessions
    const active = this.workspaceService.activeStudents();
    const history = this.workspaceService.historyStudents();

    // 3. Student Packages members
    const studentPkgs = this.packageService.studentPackages();

    const mergedMap = new Map<string, any>();

    // Add registered profiles
    for (const p of registeredProfiles) {
      const k = (p.phone || p.name || '').trim().toLowerCase();
      if (k && !mergedMap.has(k)) {
        mergedMap.set(k, {
          profile: {
            name: clean(p.name),
            phone: clean(p.phone),
            whatsapp: clean(p.whatsapp) || clean(p.phone),
            email: clean(p.email),
            college: clean(p.college),
            faculty: clean(p.faculty)
          },
          hasActivePackage: false
        });
      }
    }

    // Add active / history sessions
    for (const s of [...active, ...history]) {
      const k = (s.phone || s.name || '').trim().toLowerCase();
      const existing = mergedMap.get(k);
      mergedMap.set(k, {
        profile: {
          name: clean(s.name) || existing?.profile?.name || '',
          phone: clean(s.phone) || existing?.profile?.phone || '',
          whatsapp: clean(s.whatsapp) || existing?.profile?.whatsapp || clean(s.phone) || '',
          email: clean(s.email) || existing?.profile?.email || '',
          college: clean(s.college) || existing?.profile?.college || '',
          faculty: clean(s.faculty) || existing?.profile?.faculty || ''
        },
        hasActivePackage: s.billingType === 'package' || existing?.hasActivePackage || false
      });
    }

    // Add student package members
    for (const pkg of studentPkgs) {
      const k = (pkg.memberPhone || pkg.memberNameAr || pkg.memberNameEn || '').trim().toLowerCase();
      const existing = mergedMap.get(k);
      const pkgName = pkg.memberNameAr || pkg.memberNameEn || '';
      mergedMap.set(k, {
        profile: {
          name: clean(pkgName) || existing?.profile?.name || '',
          phone: clean(pkg.memberPhone) || existing?.profile?.phone || '',
          whatsapp: clean(pkg.memberPhone) || existing?.profile?.whatsapp || '',
          email: clean(pkg.memberEmail) || existing?.profile?.email || '',
          college: existing?.profile?.college || '',
          faculty: existing?.profile?.faculty || ''
        },
        hasActivePackage: (pkg.status === 'active' || pkg.status === 'near_expiry') && (pkg.remainingHours || 0) > 0
      });
    }

    // 4. Add backend search results (cross-referencing blacklists and live room states)
    for (const b of this.ciBackendSuggestions()) {
      const k = (b.phoneNumber || b.phone || b.name || '').trim().toLowerCase();
      const existing = mergedMap.get(k);
      const isBlocked = b.isBlocked ?? (b.canBook === false);
      const blockReason = b.blockReason || existing?.blockReason;

      mergedMap.set(k, {
        profile: {
          id: b.id,
          name: clean(b.name) || existing?.profile?.name || '',
          phone: clean(b.phoneNumber || b.phone) || existing?.profile?.phone || '',
          whatsapp: clean(b.whatsapp) || clean(b.phoneNumber || b.phone) || existing?.profile?.whatsapp || '',
          email: existing?.profile?.email || '',
          college: clean(b.facultyName) || existing?.profile?.college || '',
          faculty: clean(b.facultyName) || existing?.profile?.faculty || '',
          walletAmount: b.walletAmount ?? b.walletBalance ?? existing?.profile?.walletAmount ?? 0,
          roomId: b.roomId || existing?.profile?.roomId,
          roomName: b.roomName || existing?.profile?.roomName,
          status: b.status || existing?.profile?.status
        },
        isBlocked: isBlocked || existing?.isBlocked || false,
        blockReason: blockReason || (isBlocked ? (this.isArabic() ? 'محظور من النظام' : 'Blocked by system') : undefined),
        hasActivePackage: existing?.hasActivePackage || false
      });
    }

    const blacklist = this.workspaceService.blacklist();

    return Array.from(mergedMap.values()).map(item => {
      const cleanP = (item.profile.phone || '').trim();
      const cleanN = (item.profile.name || '').trim().toLowerCase();
      const matchedBlock = blacklist.find(b =>
        (cleanP && b.phone && b.phone === cleanP) ||
        (cleanN && b.name && b.name.toLowerCase().trim() === cleanN)
      );
      const isBlocked = item.isBlocked || !!matchedBlock;
      const blockReason = item.blockReason || matchedBlock?.reason || (this.isArabic() ? 'محظور من النظام' : 'Blocked by system');
      return {
        ...item,
        isBlocked,
        blockReason
      };
    }).filter(item => {
      const n = (item.profile.name || '').toLowerCase();
      const p = item.profile.phone || '';
      const w = item.profile.whatsapp || '';
      const e = (item.profile.email || '').toLowerCase();
      return n.includes(query) || p.includes(query) || w.includes(query) || e.includes(query);
    });
  });

  ciBackendSuggestions = signal<BackendStudentDto[]>([]);
  private ciSearchDebounce: any = null;

  ciOnSearchInput(val: string): void {
    this.ciSearchQuery.set(val);
    this.ciIsSearchDropdownOpen.set(true);

    const term = val.trim();
    if (this.ciSearchDebounce) clearTimeout(this.ciSearchDebounce);
    if (!term || term.length < 2) {
      this.ciBackendSuggestions.set([]);
      return;
    }

    this.ciSearchDebounce = setTimeout(() => {
      this.studentApi.searchStudents(term).subscribe({
        next: (list) => {
          this.ciBackendSuggestions.set(list || []);
        },
        error: () => this.ciBackendSuggestions.set([])
      });
    }, 200);
  }

  ciSelectStudentItem(item: any): void {
    if (item.isBlocked) {
      this.workspaceService.showToast(
        this.isArabic()
          ? `عفواً، لا يمكن تسجيل دخول هذا الطالب لأنه محظور (${item.blockReason || 'BLOCKED'}). يرجى فك الحظر أولاً.`
          : `Check-in denied: this student is BLOCKED (${item.blockReason || 'BLOCKED'}). Please unblock first.`,
        'error'
      );
      return;
    }

    const clean = (val?: string) => (val && val !== '-' && val !== 'undefined' ? val.trim() : '');
    const fullProfile = this.workspaceService.getStudentProfile(item.profile.phone || item.profile.name || item.profile.id);

    const name = clean(fullProfile?.name) || clean(item.profile.name);
    const phone = clean(fullProfile?.phone) || clean(item.profile.phone);
    const whatsapp = clean(fullProfile?.whatsapp) || clean(item.profile.whatsapp) || phone;
    const email = clean(fullProfile?.email) || clean(item.profile.email);
    const college = clean(fullProfile?.college) || clean(item.profile.college);
    const faculty = clean(fullProfile?.faculty) || clean(item.profile.faculty) || college;

    this.ciSelectedStudent.set({
      ...item.profile,
      name,
      phone,
      whatsapp,
      email,
      college,
      faculty
    });

    this.ciName.set(name);
    this.ciPhone.set(phone);
    this.ciEmail.set(email);
    this.ciWhatsapp.set(whatsapp);
    this.ciCollege.set(college);
    this.ciFaculty.set(faculty);
    this.ciSearchQuery.set(name);
    this.ciIsSearchDropdownOpen.set(false);
    this.ciExistingStudentFound.set(true);

    // Auto-detect package & set payment mode like Classroom
    setTimeout(() => {
      const pkg = this.matchedStudentPackage();
      if (pkg && pkg.remainingHours > 0) {
        this.ciBilling.set('package');
        this.ciPaymentMethod.set('package');
      } else {
        this.ciBilling.set('new-session');
        this.ciPaymentMethod.set('cash');
      }
    });
  }

  ciClearSelectedStudent(): void {
    this.ciSelectedStudent.set(null);
    this.ciName.set('');
    this.ciPhone.set('');
    this.ciEmail.set('');
    this.ciWhatsapp.set('');
    this.ciCollege.set('');
    this.ciFaculty.set('');
    this.ciSearchQuery.set('');
    this.ciExistingStudentFound.set(false);
  }

  // Open Session State (وقت مفتوح)
  isOpenSession = signal<boolean>(false);

  // Promo Coupon State for Check-In
  ciCouponCode = signal<string>('');
  ciCouponApplied = signal<boolean>(false);
  ciCouponDiscountPercent = signal<number>(0);

  toggleOpenSession(): void {
    const nextState = !this.isOpenSession();
    this.isOpenSession.set(nextState);
    if (nextState) {
      this.ciEndHour.set('');
      this.ciEndMinute.set('');
    } else {
      const now = new Date();
      const endTotalH = now.getHours() + 3;
      let endH = endTotalH % 12;
      if (endH === 0) endH = 12;
      const endPer: 'AM' | 'PM' = (endTotalH % 24) >= 12 ? 'PM' : 'AM';
      this.ciEndHour.set(String(endH).padStart(2, '0'));
      this.ciEndMinute.set(String(now.getMinutes()).padStart(2, '0'));
      this.ciEndPeriod.set(endPer);
    }
  }

  applyCheckInCoupon(): void {
    const code = this.ciCouponCode().trim().toUpperCase();
    if (!code) return;

    this.couponApi.getCouponByCode(code).subscribe({
      next: (coupon) => {
        if (coupon && coupon.isActive !== false) {
          const isExpired = coupon.expiryDate ? new Date(coupon.expiryDate) < new Date() : false;
          if (isExpired) {
            this.workspaceService.showToast(this.isArabic() ? 'كود الكوبون منتهي الصلاحية' : 'Coupon code expired', 'error');
            return;
          }
          const maxLimit = (coupon as any).usageLimit ?? (coupon as any).UsageLimit ?? (coupon as any).maxUsage ?? (coupon as any).maxUses;
          const currentUses = (coupon as any).usageCount ?? (coupon as any).UsageCount ?? (coupon as any).currentRedemptions ?? 0;
          if (maxLimit !== null && maxLimit !== undefined && maxLimit > 0 && currentUses >= maxLimit) {
            this.workspaceService.showToast(
              this.isArabic() ? 'تم استنفاد الحد الأقصى لاستخدام هذا الكود' : 'Coupon usage limit reached',
              'error'
            );
            return;
          }
          const discountPercent = coupon.discountType === 1 ? (coupon.value || 15) : 15;
          this.ciCouponDiscountPercent.set(discountPercent);
          this.ciCouponApplied.set(true);
        } else {
          this.workspaceService.showToast(this.isArabic() ? 'كود الكوبون غير صالح' : 'Invalid coupon code', 'error');
        }
      },
      error: () => {
        this.workspaceService.showToast(this.isArabic() ? 'كود الكوبون غير موجود' : 'Coupon code not found', 'error');
      }
    });
  }

  removeCheckInCoupon(): void {
    this.ciCouponCode.set('');
    this.ciCouponApplied.set(false);
    this.ciCouponDiscountPercent.set(0);
  }

  matchedStudentPackage = computed<PackageItem | null>(() => {
    const name = this.ciName().trim().toLowerCase();
    const phone = this.ciPhone().trim();
    const email = this.ciEmail().trim().toLowerCase();
    const packages = this.packageService.studentPackages();

    if (!name && !phone && !email) {
      return null;
    }

    return (
      packages.find(pkg => {
        if (pkg.status !== 'active' && pkg.status !== 'near_expiry') return false;
        if (phone && pkg.memberPhone && pkg.memberPhone.includes(phone)) return true;
        if (email && pkg.memberEmail && pkg.memberEmail.toLowerCase() === email) return true;
        if (name && name.length >= 2) {
          const ar = (pkg.memberNameAr || '').toLowerCase();
          const en = (pkg.memberNameEn || '').toLowerCase();
          return ar.includes(name) || en.includes(name) || name.includes(ar) || name.includes(en);
        }
        return false;
      }) || null
    );
  });

  packageCoveredHours = computed(() => {
    const pkg = this.matchedStudentPackage();
    if (!pkg || this.ciBilling() !== 'package') return 0;
    const dur = this.ciDurationHours();
    const remaining = Math.max(0, pkg.remainingHours || 0);
    return Math.min(dur, remaining);
  });

  packageExtraHours = computed(() => {
    const pkg = this.matchedStudentPackage();
    if (!pkg || this.ciBilling() !== 'package') return 0;
    const dur = this.ciDurationHours();
    const remaining = Math.max(0, pkg.remainingHours || 0);
    return Math.max(0, dur - remaining);
  });

  parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const p = match[3].toUpperCase();
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  isTimeRangeValid = computed(() => {
    if (this.isOpenSession()) return true;
    if (!this.ciTime() || !this.ciExpectedCheckout()) return true;
    const startMins = this.parseTimeToMinutes(this.ciTime());
    const endMins = this.parseTimeToMinutes(this.ciExpectedCheckout());
    return endMins > startMins;
  });

  crossesMidnight = computed(() => {
    if (this.isOpenSession() || !this.ciTime() || !this.ciExpectedCheckout()) return false;
    const startMins = this.parseTimeToMinutes(this.ciTime());
    const endMins = this.parseTimeToMinutes(this.ciExpectedCheckout());
    return endMins < startMins;
  });

  ciDurationHours = computed(() => {
    if (this.isOpenSession()) return 1;
    if (!this.ciTime() || !this.ciExpectedCheckout()) return 1;
    const startMins = this.parseTimeToMinutes(this.ciTime());
    const endMins = this.parseTimeToMinutes(this.ciExpectedCheckout());
    const diffMins = endMins - startMins;
    if (diffMins <= 0) return 0;
    return Number((diffMins / 60).toFixed(1));
  });

  ciPrintingCost = computed(() => Number((this.ciPrinting() * 1.50).toFixed(2)));
  ciTotalCost = computed(() => {
    let base = 0;
    if (this.ciBilling() === 'package') {
      const extra = this.packageExtraHours();
      base = extra * this.ciPrice();
    } else {
      base = this.ciDurationHours() * this.ciPrice();
      if (this.ciBilling() === 'coupon' && this.ciCouponApplied()) {
        const discount = (base * this.ciCouponDiscountPercent()) / 100;
        base = Math.max(0, base - discount);
      }
    }
    return Number((base + this.ciPrintingCost()).toFixed(2));
  });

  ciTime = computed(() => {
    if (!this.ciStartHour()) return '';
    const h = this.ciStartHour().padStart(2, '0');
    const m = (this.ciStartMinute() || '00').padStart(2, '0');
    return `${h}:${m} ${this.ciStartPeriod()}`;
  });

  ciExpectedCheckout = computed(() => {
    if (this.isOpenSession() || !this.ciEndHour()) return '';
    const h = this.ciEndHour().padStart(2, '0');
    const m = (this.ciEndMinute() || '00').padStart(2, '0');
    return `${h}:${m} ${this.ciEndPeriod()}`;
  });

  // Live Room Selection for Students (Shared vs Silent ONLY)
  selectedRoomCategory = signal<'shared' | 'silent'>('shared');
  selectedRoomId = signal('');

  sharedRooms = computed(() => {
    return this.settingsService.rooms().filter(r => r.isActive && r.type === 'Shared Space');
  });

  silentRooms = computed(() => {
    return this.settingsService.rooms().filter(r => r.isActive && r.type === 'Silent Zone');
  });

  availableRooms = computed(() => {
    return this.selectedRoomCategory() === 'silent' ? this.silentRooms() : this.sharedRooms();
  });

  selectedRoom = computed(() => {
    const rooms = this.availableRooms();
    const found = rooms.find(r => r.id === this.selectedRoomId());
    if (found) return found;
    return rooms[0] || null;
  });

  selectRoomCategory(category: 'shared' | 'silent'): void {
    this.selectedRoomCategory.set(category);
    const rooms = category === 'silent' ? this.silentRooms() : this.sharedRooms();
    if (rooms.length > 0) {
      this.selectedRoomId.set(rooms[0].id);
    } else {
      this.selectedRoomId.set('');
    }
  }

  selectRoom(roomId: string): void {
    this.selectedRoomId.set(roomId);
  }

  ciBilling = signal<'new-session' | 'package' | 'coupon'>('new-session');
  ciPackage = signal('');
  ciPrice = signal(20);
  ciCoupon = signal('');
  ciPrinting = signal(0);
  ciWallet = signal(0);
  ciWifi = signal('');

  selectBilling(mode: 'new-session' | 'package' | 'coupon'): void {
    this.ciBilling.set(mode);
  }

  // Check-In Form Validation Signals
  ciNameError = signal<string | null>(null);
  ciPhoneError = signal<string | null>(null);
  ciEmailError = signal<string | null>(null);
  ciRoomError = signal<string | null>(null);
  ciSubmitted = signal<boolean>(false);

  // ----------------------------------------------------
  // 2. CHECKOUT MODAL STATE (Matching Design System)
  // ----------------------------------------------------
  studentToCheckout = signal<ActiveStudentSession | null>(null);
  coCheckoutTime = signal('');
  coDurationDisplay = signal('0h 00m');
  coDurationHours = signal(0);
  coHourlyRate = signal<number>(20);
  coCustomBaseCost = signal<number | null>(null);
  isEditBaseCostOpen = signal(false);
  editBaseCostInput = signal<number>(20);

  coBaseCost = computed(() => {
    if (this.coPaymentMethod() === 'package') return 0;
    if (this.coCustomBaseCost() !== null) return this.coCustomBaseCost()!;
    return this.settingsService.calculateStudentCost(this.coDurationHours());
  });

  coSessionSubtitle = computed(() => {
    if (this.coPaymentMethod() === 'package') {
      return this.isArabic()
        ? 'باقة طالب (مغطاة بالكامل من رصيد الساعات)'
        : 'Student Package (Covered by remaining hours)';
    }

    if (this.coCustomBaseCost() !== null) {
      return this.isArabic() ? 'سعر مخصص للجلسة' : 'Custom Base Rate';
    }

    const dur = this.coDurationHours();
    const tiers = [...this.settingsService.pricingTiers()].sort((a, b) => a.fromHours - b.fromHours);
    const matchedTier = tiers.find(t => dur >= t.fromHours && dur <= t.toHours);

    if (matchedTier) {
      const tierName = this.isArabic()
        ? (matchedTier.labelAr || `شريحة ${matchedTier.fromHours} - ${matchedTier.toHours} ساعة`)
        : (matchedTier.labelEn || `Tier ${matchedTier.fromHours} - ${matchedTier.toHours} hrs`);
      return `${tierName} (${dur.toFixed(1)} ${this.isArabic() ? 'ساعة' : 'hrs'})`;
    }

    const highest = tiers[tiers.length - 1];
    if (highest && dur > highest.toHours) {
      const extraHours = Math.ceil(dur - highest.toHours);
      return this.isArabic()
        ? `${highest.labelAr || highest.toHours + ' ساعة'} + ${extraHours} ساعة إضافية`
        : `${highest.labelEn || highest.toHours + ' hrs'} + ${extraHours} extra hrs`;
    }

    const rate = this.coHourlyRate() || 20;
    return `${rate} ${this.isArabic() ? 'ج.م/ساعة' : 'EGP/hr'} × ${dur.toFixed(1)} ${this.isArabic() ? 'ساعة' : 'hrs'}`;
  });

  // Discounts
  coDiscountPercent = signal(0);
  coDiscountAmount = computed(() => +((this.coSubtotal() * this.coDiscountPercent()) / 100).toFixed(2));
  coCouponInput = signal('');
  coCouponDiscount = signal(0);
  coCouponApplied = signal(false);

  // Catering Items in Checkout (Starts empty unless student actually ordered)
  coCateringItems = signal<CateringLineItem[]>([]);
  coCateringTotal = computed(() =>
    +this.coCateringItems().reduce((sum, item) => sum + item.price, 0).toFixed(2)
  );

  // Printing in Checkout
  coPrintingPages = signal<number>(0);
  isEditPrintingOpen = signal(false);
  editPrintingPagesInput = signal<number>(0);

  coPrintingTotal = computed(() => {
    return +(this.coPrintingPages() * 1.5).toFixed(2);
  });

  // Financial Breakdown Computations
  coSubtotal = computed(() =>
    +(this.coBaseCost() + this.coCateringTotal() + this.coPrintingTotal()).toFixed(2)
  );

  coTotalDiscounts = computed(() => {
    const raw = +(this.coDiscountAmount() + this.coCouponDiscount()).toFixed(2);
    return Math.min(raw, this.coSubtotal());
  });

  coFinalAmount = computed(() =>
    Math.max(0, +(this.coSubtotal() - this.coTotalDiscounts()).toFixed(2))
  );

  // Payment
  coPaymentMethod = signal<PaymentMethodType>('cash');
  coAmountReceived = signal<number | null>(null);
  coChangeDue = computed(() => {
    const received = this.coAmountReceived();
    if (received === null || isNaN(received) || received <= 0) return 0;
    return Math.max(0, +(received - this.coFinalAmount()).toFixed(2));
  });

  isReceivedAmountInsufficient = computed(() => {
    if (this.coPaymentMethod() === 'package') return false;
    const finalAmt = this.coFinalAmount();
    if (finalAmt <= 0) return false;
    const received = this.coAmountReceived();
    return received === null || isNaN(received) || received < 0;
  });

  // Add Item Submodal in Checkout
  isAddCateringOpen = signal(false);
  newCateringName = signal('');
  newCateringPrice = signal(25);

  studentCheckoutData = computed<CheckoutData | null>(() => {
    const student = this.studentToCheckout();
    if (!student) return null;


    return {
      type: 'student',
      title: this.isArabic() ? 'دفع الحساب' : 'Checkout',
      subtitle: `${this.isArabic() ? 'إنهاء جلسة لـ' : 'Finalizing session for'} ${student.name} (${student.phone || ''})`,
      session: {
        studentName: student.name,
        roomName: student.roomName || student.faculty || student.college || '',
        activity: student.name,
        status: student.status,
        startTime: student.checkInTime || '09:00 AM',
        endTime: this.coCheckoutTime(),
        duration: this.coDurationDisplay()
      },
      financialBreakdown: {
        items: [
          {
            icon: 'clock',
            title: this.isArabic() ? 'تكلفة الجلسة' : 'Workspace Base Cost',
            subtitle: this.coSessionSubtitle(),
            amount: this.coBaseCost(),
            canEdit: true
          },
          {
            icon: 'canteen',
            title: this.isArabic() ? 'الكانتين والمشروبات' : 'CATERING',
            subtitle: this.isArabic() ? 'مشروبات وسناكس' : 'Snacks & Drinks',
            amount: this.coCateringTotal(),
            isCatering: true,
            canAdd: true,
            buttonLabel: this.isArabic() ? 'إضافة صنف' : 'ADD ITEM'
          },
          {
            icon: 'printing',
            title: this.isArabic() ? 'الطباعة وتصوير الورق' : 'PRINTING (PAGES)',
            subtitle: this.isArabic() ? 'مطبوعات ورقية' : 'Handouts',
            amount: this.coPrintingTotal(),
            isPrinting: true
          }
        ],
        cateringItems: this.coCateringItems(),
        subtotal: this.coSubtotal(),
        discountPercent: this.coDiscountPercent(),
        couponCode: this.coCouponInput(),
        couponDiscount: this.coCouponDiscount(),
        walletBalance: student.walletAmount || 0,
        finalTotal: this.coFinalAmount()
      },
      payment: {
        selectedMethod: this.coPaymentMethod(),
        amountReceived: this.coAmountReceived(),
        changeDue: this.coChangeDue(),
        buttonText: this.isArabic() ? 'إنهاء ودفع الجلسة' : 'Process Payment & Free Room'
      }
    };
  });

  // ----------------------------------------------------
  // 3. OTHER MODALS (Delete, Block, Edit)
  // ----------------------------------------------------
  studentToDelete = signal<ActiveStudentSession | null>(null);
  studentToBlock = signal<ActiveStudentSession | null>(null);
  blockReason = signal('');
  studentToEdit = signal<ActiveStudentSession | null>(null);
  editName = signal('');
  editPhone = signal('');
  editWhatsapp = signal('');
  editEmail = signal('');
  editCollege = signal('');
  editFaculty = signal('');
  editPackage = signal('');
  editPrinting = signal(0);
  editWallet = signal(0);

  // Stats from service
  insideCount = this.workspaceService.insideCount;
  avgSession = this.workspaceService.avgSession;
  todayCheckins = this.workspaceService.todayCheckins;
  checkoutsToday = this.workspaceService.checkoutsToday;
  isLoading = this.workspaceService.isLoading;

  // Filtered metrics matching selected date filter (Issue #3)
  filteredTotalVisits = computed(() => this.filteredStudents().length);

  filteredTotalHours = computed(() => {
    let totalMins = 0;
    for (const s of this.filteredStudents()) {
      totalMins += parseDurationMinutes(this.getLiveStudentDuration(s));
    }
    return `${(totalMins / 60).toFixed(1)} ${this.isArabic() ? 'ساعة' : 'hrs'}`;
  });

  filteredTotalRevenue = computed(() => {
    let total = 0;
    for (const s of this.filteredStudents()) {
      total += this.getStudentTotalCost(s);
    }
    return `${total.toFixed(2)} ${this.t().egp}`;
  });

  filteredAvgSession = computed(() => {
    const list = this.filteredStudents();
    if (list.length === 0) return '0h 00m';
    let totalMins = 0;
    for (const s of list) {
      totalMins += parseDurationMinutes(this.getLiveStudentDuration(s));
    }
    const avg = totalMins / list.length;
    const h = Math.floor(avg / 60);
    const m = Math.round(avg % 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  });

  // Filtered student list
  filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const dateOpt = this.selectedDateOption();
    const customDate = this.customDateValue();

    const list =
      this.activeTab() === 'active'
        ? this.workspaceService.activeStudents()
        : this.workspaceService.historyStudents();

    return list.filter(s => {
      // 1. Text Search Filter
      const matchesQuery =
        !query ||
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.faculty && s.faculty.toLowerCase().includes(query)) ||
        (s.college && s.college.toLowerCase().includes(query)) ||
        (s.phone && s.phone.includes(query));

      // 2. Date Filter
      let matchesDate = true;
      if (dateOpt === 'all') {
        matchesDate = true;
      } else {
        const now = new Date();
        const todayISO = getTodayDateISO();
        const todayShort = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        const yestISO = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
        const yestShort = `${yest.getMonth() + 1}/${yest.getDate()}/${yest.getFullYear()}`;

        const sDate = s.date || '';

        if (dateOpt === 'today') {
          if (this.activeTab() === 'active') {
            matchesDate = true;
          } else {
            matchesDate = isSameDayAsToday(sDate) || (!!s.checkOutDate && isSameDayAsToday(s.checkOutDate));
          }
        } else if (dateOpt === 'yesterday') {
          matchesDate = !!sDate && (sDate === yestISO || sDate === yestShort || sDate.includes(yestISO));
        } else if (dateOpt === 'custom' && customDate) {
          matchesDate = !!sDate && (sDate === customDate || sDate.includes(customDate));
        }
      }

      return matchesQuery && matchesDate;
    });
  });

  currentListLength = computed(() => {
    return this.activeTab() === 'all'
      ? this.filteredDirectoryStudents().length
      : this.filteredStudents().length;
  });

  totalPages = computed(() => Math.ceil(this.currentListLength() / this.pageSize()) || 1);
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  paginatedStudents = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredStudents().slice(start, start + this.pageSize());
  });

  startIndex = computed(() => (this.currentListLength() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1));
  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.currentListLength()));

  // ----------------------------------------------------
  // CHECK-IN (ADD STUDENT) MODAL HANDLERS
  // ----------------------------------------------------
  openCheckInModal(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تسجيل دخول طالب' : 'Student Check-in')) {
      return;
    }
    this.ciName.set('');
    this.ciPhone.set('');
    this.ciEmail.set('');
    this.ciWhatsapp.set('');
    this.ciCollege.set('');
    this.ciFaculty.set('');
    this.ciDate.set(getTodayDateISO());

    this.setStartTimeToNow();

    this.selectedRoomCategory.set('shared');
    const firstRoom = this.sharedRooms()[0] || this.silentRooms()[0];
    this.selectedRoomId.set(firstRoom ? firstRoom.id : '');

    const hourlyCost = this.settingsService.calculateStudentCost(1);
    this.ciPrice.set(hourlyCost || 20);

    this.ciBilling.set('new-session');
    this.ciPackage.set('');
    this.ciCoupon.set('');
    this.ciPrinting.set(0);
    this.ciWallet.set(0);
    this.ciWifi.set('');
    this.ciNameError.set(null);
    this.ciPhoneError.set(null);
    this.ciEmailError.set(null);
    this.ciSubmitted.set(false);
    this.isCheckInModalOpen.set(true);
  }

  setStartTimeToNow(): void {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    this.ciStartHour.set(String(hours).padStart(2, '0'));
    this.ciStartMinute.set(String(minutes).padStart(2, '0'));
    this.ciStartPeriod.set(period);

    const endTotalH = now.getHours() + 3;
    let endH = endTotalH % 12;
    if (endH === 0) endH = 12;
    const endPer: 'AM' | 'PM' = (endTotalH % 24) >= 12 ? 'PM' : 'AM';
    this.ciEndHour.set(String(endH).padStart(2, '0'));
    this.ciEndMinute.set(String(minutes).padStart(2, '0'));
    this.ciEndPeriod.set(endPer);
  }

  closeCheckInModal(): void {
    this.isCheckInModalOpen.set(false);
  }

  onNameInput(val: string): void {
    this.ciName.set(val);
    if (this.ciSubmitted()) {
      this.validateCheckIn();
    }
  }

  onPhoneInput(val: string): void {
    this.ciPhone.set(val);
    const cleanP = val.trim().replace(/[^\d]/g, '');
    if (cleanP && cleanP.length === 11) {
      const existing = this.workspaceService.getStudentProfile(cleanP);
      if (existing) {
        if (!this.ciName() && existing.name) this.ciName.set(existing.name);
        if (!this.ciWhatsapp() && existing.whatsapp) this.ciWhatsapp.set(existing.whatsapp);
        if (!this.ciEmail() && existing.email) this.ciEmail.set(existing.email);
        if (!this.ciFaculty() && existing.faculty) this.ciFaculty.set(existing.faculty);
        if (!this.ciCollege() && existing.college) this.ciCollege.set(existing.college);
        this.ciExistingStudentFound.set(true);
      }
    }
    if (this.ciSubmitted()) {
      this.validateCheckIn();
    }
  }

  onEmailInput(val: string): void {
    this.ciEmail.set(val);
    if (this.ciSubmitted()) {
      this.validateCheckIn();
    }
  }

  validateCheckIn(): boolean {
    let isValid = true;
    const name = this.ciName().trim();
    const phone = this.ciPhone().trim();
    const email = this.ciEmail().trim();

    // 1. Name validation
    if (!name) {
      this.ciNameError.set(this.isArabic() ? 'يرجى إدخال اسم الطالب' : 'Student name is required');
      isValid = false;
    } else {
      this.ciNameError.set(null);
    }

    // 2. Phone validation (must be exactly 11 digits)
    if (!phone) {
      this.ciPhoneError.set(this.isArabic() ? 'يرجى إدخال رقم الهاتف' : 'Phone number is required');
      isValid = false;
    } else if (!/^01[0-9]{9}$/.test(phone.replace(/\s+/g, ''))) {
      this.ciPhoneError.set(this.isArabic() ? 'رقم الهاتف يجب أن يتكون من 11 رقم ويبدأ بـ 01' : 'Phone must be 11 digits starting with 01');
      isValid = false;
    } else {
      this.ciPhoneError.set(null);
    }

    // 3. Email validation (optional, but if filled must be valid)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.ciEmailError.set(this.t().validEmailFormatRequired);
      isValid = false;
    } else {
      this.ciEmailError.set(null);
    }

    // 4. Room validation (Strict Requirement 2)
    if (!this.selectedRoomId() || !this.selectedRoom()) {
      this.ciRoomError.set(this.isArabic() ? 'يرجى اختيار الغرفة قبل تأكيد الدخول' : 'Please select a room before confirming check-in');
      isValid = false;
    } else {
      this.ciRoomError.set(null);
    }

    // 5. Time Range validation
    if (!this.isOpenSession() && !this.isTimeRangeValid()) {
      isValid = false;
    }

    return isValid;
  }

  submitCheckIn(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تسجيل دخول طالب' : 'Student Check-in')) {
      return;
    }
    this.ciSubmitted.set(true);
    if (!this.validateCheckIn()) {
      return;
    }

    // Blacklist check before submitting
    const studentPhone = this.ciPhone().trim();
    const isBlacklisted = this.workspaceService.blacklist().some(b => b.phone && b.phone === studentPhone);
    if (isBlacklisted) {
      this.workspaceService.showToast(
        this.isArabic()
          ? 'عفواً، لا يمكن تسجيل الدخول لأن هذا الطالب موجود في قائمة الحظر. يرجى فك الحظر أولاً.'
          : 'Check-in denied: this student is on the blacklist. Please unblock first.',
        'error'
      );
      return;
    }

    if (!this.selectedRoomId() || !this.selectedRoom()) {
      this.ciRoomError.set(this.isArabic() ? 'يرجى اختيار الغرفة قبل تأكيد الدخول' : 'Please select a room before confirming check-in');
      this.workspaceService.showToast(this.isArabic() ? 'يجب اختيار غرفة لتسجيل الدخول' : 'A room must be selected for check-in', 'error');
      return;
    }

    const packageOrCouponText =
      this.ciBilling() === 'new-session'
        ? 'Pay-as-you-go'
        : this.ciBilling() === 'package'
          ? this.ciPackage()
          : `Coupon: ${this.ciCoupon() || 'Discount'}`;

    const studentName = this.ciName().trim();
    const selRoom = this.selectedRoom();
    this.workspaceService.checkInStudent({
      name: studentName,
      avatar: generateAvatarSvg(studentName),
      phone: this.ciPhone().trim(),
      email: this.ciEmail().trim(),
      whatsapp: this.ciWhatsapp().trim() || this.ciPhone().trim(),
      college: this.ciCollege().trim(),
      faculty: this.ciFaculty().trim(),
      date: this.ciDate(),
      checkInTime: this.formatTimeDisplay(this.ciTime()),
      expectedCheckout: this.ciExpectedCheckout() ? this.formatTimeDisplay(this.ciExpectedCheckout()) : undefined,
      cost: this.ciPrice(),
      billingType: this.ciBilling(),
      packageOrCoupon: packageOrCouponText,
      sessionPrice: this.ciPrice(),
      printingCount: this.ciPrinting(),
      walletAmount: this.ciWallet(),
      wifiVoucher: this.ciWifi(),
      roomId: this.selectedRoomId() || selRoom?.id,
      roomName: selRoom?.name || (this.selectedRoomCategory() === 'silent' ? 'Silent Room' : 'Shared Room'),
      zone: this.selectedRoomCategory() === 'silent' ? 1 : 0,
      addedBy: this.shiftService.currentShift()?.staffName || this.authService.getUser()?.name || 'Staff'
    });

    this.closeCheckInModal();
  }

  // ----------------------------------------------------
  // CHECKOUT MODAL HANDLERS
  // ----------------------------------------------------
  openCheckoutModal(student: ActiveStudentSession): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'دفع حساب ومغادرة الطالب' : 'Student Checkout')) {
      return;
    }
    this.closeActionMenu();
    this.studentToCheckout.set(student);

    const now = new Date();
    this.coCheckoutTime.set(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );

    // Dynamic Duration computation based on actual elapsed time
    const elapsedMins = this.getLiveElapsedMinutes(student.checkInTime, student.date);
    const hoursFloat = Math.max(0.25, +(elapsedMins / 60).toFixed(2));
    const h = Math.floor(elapsedMins / 60);
    const m = elapsedMins % 60;
    const durStr = `${h}h ${String(m).padStart(2, '0')}m`;

    this.coDurationDisplay.set(durStr);
    this.coDurationHours.set(hoursFloat);

    this.coCustomBaseCost.set(null);
    this.coHourlyRate.set(20);

    // Real Catering Orders (Load from student.cateringItems or canteenOrders, enriched from product catalog)
    const rawCatering = (student.cateringItems || (student as any).canteenOrders || []);
    const allProducts = this.cateringService.products();
    let studentCatering = rawCatering
      .map((it: any, idx: number) => {
        const prodId = it.productId || it.product?.id || it.id;
        const prod = allProducts.find(p => p.id === prodId);
        const name = it.product?.nameAr || it.product?.name || it.nameAr || it.name || prod?.nameAr || prod?.name || (this.isArabic() ? 'صنف كاترنج' : 'Catering Item');
        const unitPrice = Number((it.unitPrice ?? it.price ?? prod?.sellingPrice) || 0);
        const quantity = Number(it.quantity || 1);
        const price = Number(it.totalPrice || it.total || (unitPrice * quantity) || it.price || (prod?.sellingPrice ? prod.sellingPrice * quantity : 0));
        return {
          id: it.id || String(idx),
          productId: prodId,
          name,
          price
        };
      })
      .filter((it: any) => it.price > 0 || (it.name !== 'صنف كاترنج' && it.name !== 'Catering Item'));

    if (studentCatering.length === 0 && (student.cateringTotal || 0) > 0) {
      studentCatering = [{
        id: 'catering_total_' + student.id,
        name: this.isArabic() ? 'طلبات كاترنج' : 'Catering Orders',
        price: student.cateringTotal!
      }];
    }
    this.coCateringItems.set(studentCatering);

    this.coDiscountPercent.set(0);
    this.coCouponInput.set('');
    this.coCouponDiscount.set(0);
    this.coCouponApplied.set(false);

    // Auto-detect if student has active package in PackageService or student session
    const hasActivePkg = this.packageService.studentPackages().some(p =>
      (p.status === 'active' || p.status === 'near_expiry') &&
      (p.remainingHours || 0) > 0 &&
      (p.memberPhone === student.phone || p.memberNameAr === student.name || p.memberNameEn === student.name)
    );
    const isPkg = student.billingType === 'package' || (!!student.packageOrCoupon && student.packageOrCoupon.toLowerCase().includes('package') && hasActivePkg);
    this.coPaymentMethod.set(isPkg ? 'package' : 'cash');

    // Requirement 11: Amount Received must be entered by user, never prefilled
    this.coAmountReceived.set(null);

    // Initialize printing pages from student record
    this.coPrintingPages.set(student.printingCount || (student as any).printingPages || 0);
  }

  openEditBaseCostModal(): void {
    this.editBaseCostInput.set(this.coBaseCost());
    this.isEditBaseCostOpen.set(true);
  }

  closeEditBaseCostModal(): void {
    this.isEditBaseCostOpen.set(false);
  }

  saveCustomBaseCost(): void {
    const val = Number(this.editBaseCostInput());
    if (!isNaN(val) && val >= 0) {
      this.coCustomBaseCost.set(val);
      this.coHourlyRate.set(Math.round(val / Math.max(0.1, this.coDurationHours())));
    }
    this.closeEditBaseCostModal();
  }

  openEditPrintingModal(): void {
    this.editPrintingPagesInput.set(this.coPrintingPages());
    this.isEditPrintingOpen.set(true);
  }

  closeEditPrintingModal(): void {
    this.isEditPrintingOpen.set(false);
  }

  savePrintingPages(): void {
    const pages = Math.max(0, +this.editPrintingPagesInput());
    this.coPrintingPages.set(pages);
    const student = this.studentToCheckout();
    if (student) {
      student.printingCount = pages;
    }
    this.closeEditPrintingModal();
  }

  exportStudentsToCSV(): void {
    if (this.activeTab() === 'all') {
      const list = this.filteredDirectoryStudents();
      if (!list || list.length === 0) {
        this.workspaceService.showToast(this.isArabic() ? 'لا توجد بيانات طلاب للتصدير' : 'No student data to export', 'info');
        return;
      }
      const headers = this.isArabic()
        ? ['كود الطالب', 'اسم الطالب', 'رقم الهاتف', 'الواتساب', 'البريد الإلكتروني', 'الجامعة', 'الكلية', 'الباقة / الاشتراك', 'عدد الزيارات', 'تاريخ آخر زيارة', 'الحالة']
        : ['ID', 'Name', 'Phone', 'WhatsApp', 'Email', 'Faculty', 'College', 'Package', 'Total Visits', 'Last Visit Date', 'Status'];
      const rows = list.map(s => [
        s.id,
        s.name,
        s.phone || '',
        s.whatsapp || '',
        s.email || '',
        s.faculty || '',
        s.college || '',
        s.packageInfo?.packageName || (this.isArabic() ? 'دفع بالساعة' : 'Pay as you go'),
        s.totalVisits || 0,
        s.lastVisitDate || '',
        s.currentStatus
      ]);
      exportToCsv(`nook_all_registered_students_${getTodayDateISO()}.csv`, headers, rows);
      this.workspaceService.showToast(this.isArabic() ? 'تم تصدير دليل الطلاب المسجلين بنجاح!' : 'Students directory exported successfully!', 'success');
      return;
    }

    const students: ActiveStudentSession[] = this.filteredStudents();
    if (!students || students.length === 0) {
      this.workspaceService.showToast(this.isArabic() ? 'لا توجد بيانات مطابقة للفلتر المعروض للتصدير' : 'No matching filtered data to export', 'info');
      return;
    }

    const currentShiftLabel = this.shiftService.currentShift()?.staffName || 'Shift #' + (this.shiftService.currentShift()?.id || '1');

    const headers = this.isArabic() ? [
      'اسم الطالب',
      'كود الطالب',
      'رقم الهاتف',
      'الكلية / التخصص',
      'تاريخ الجلسة',
      'وقت الدخول',
      'وقت الخروج',
      'المدة المقضية',
      'الغرفة / القاعة',
      'أضيف بواسطة',
      'نوع الباقة / الاشتراك',
      'عدد الورق المطبوع',
      'تكلفة الطباعة (ج.م)',
      'طلبات الكانتين',
      'تكلفة الكانتين (ج.م)',
      'رصيد المحفظة قبل التسوية (ج.م)',
      'المبلغ المستلم (ج.م)',
      'رصيد المحفظة بعد التسوية (ج.م)',
      'إجمالي تكلفة الجلسة (ج.م)',
      'الوردية الحالية',
      'حالة الجلسة'
    ] : [
      'Student Name',
      'Student ID',
      'Phone Number',
      'College / Faculty',
      'Date',
      'Check-in Time',
      'Check-out Time',
      'Duration',
      'Room',
      'Added By',
      'Package / Plan',
      'Printing Count',
      'Printing Cost (EGP)',
      'Catering Items',
      'Catering Cost (EGP)',
      'Wallet Before (EGP)',
      'Amount Received (EGP)',
      'Wallet After (EGP)',
      'Total Cost (EGP)',
      'Current Shift',
      'Status'
    ];

    const rows = students.map((s: ActiveStudentSession) => {
      const catCost = +(s.cateringTotal || (s.cateringItems || []).reduce((sum, it) => sum + (it.totalPrice || it.total || (it.price * (it.quantity || 1)) || 0), 0)).toFixed(2);
      const catItemsSummary = (s.cateringItems || []).map((it: any) => `${it.product?.name || it.name || 'Item'} (x${it.quantity || 1})`).join('; ') || (this.isArabic() ? 'لا يوجد' : 'None');
      const totalCost = +this.getStudentTotalCost(s).toFixed(2);
      const statusText = s.status === 'active' ? (this.isArabic() ? 'نشط الآن' : 'Active') : s.status === 'blocked' ? (this.isArabic() ? 'محظور' : 'Blocked') : (this.isArabic() ? 'مكتمل' : 'Completed');

      return [
        s.name,
        s.studentId || s.id,
        s.phone || '',
        s.faculty || s.college || '',
        s.date || '',
        s.checkInTime || '',
        s.checkOutTime || (s.status === 'active' ? (this.isArabic() ? 'داخل المكان' : 'In House') : ''),
        this.getLiveStudentDuration(s),
        s.roomName || (s.roomId ? 'Room ' + s.roomId : (this.isArabic() ? 'مساحة عامة' : 'Shared Space')),
        s.addedBy || 'Staff',
        s.billingType === 'package' ? (s.packageOrCoupon || 'Package') : (this.isArabic() ? 'دفع بالساعة' : 'Pay as you go'),
        s.printingCount || 0,
        catItemsSummary,
        catCost,
        s.walletAmount || 0,
        s.amountReceived !== undefined ? s.amountReceived : totalCost,
        s.walletAmount || 0,
        totalCost,
        currentShiftLabel,
        statusText
      ];
    });

    exportToCsv(`nook_students_detailed_${getTodayDateISO()}.csv`, headers, rows);
    this.workspaceService.showToast(this.isArabic() ? 'تم تصدير التقرير المالي المفصل للطلاب بنجاح!' : 'Detailed students financial report exported successfully!', 'success');
  }

  openRegisterModal(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تسجيل طالب جديد' : 'Register New Student')) {
      return;
    }
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
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تسجيل طالب جديد' : 'Register New Student')) {
      return;
    }
    const name = this.regName().trim();
    const phone = this.regPhone().trim();
    if (!name || !phone) {
      this.workspaceService.showToast(this.isArabic() ? 'يرجى إدخال اسم الطالب ورقم الهاتف على الأقل' : 'Please enter student name and phone', 'error');
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

  quickCheckInFromDirectory(student: StudentDirectoryItem): void {
    this.openCheckInModal();
    this.ciName.set(student.name);
    this.ciPhone.set(student.phone || '');
    this.ciWhatsapp.set(student.whatsapp || student.phone || '');
    this.ciEmail.set(student.email || '');
    this.ciCollege.set(student.college || '');
    this.ciFaculty.set(student.faculty || '');
    if (student.packageInfo?.hasPackage) {
      this.ciBilling.set('package');
      this.ciPaymentMethod.set('package');
    } else {
      this.ciBilling.set('new-session');
      this.ciPaymentMethod.set('cash');
    }
  }

  openEditDirectoryStudent(student: StudentDirectoryItem): void {
    this.closeActionMenu();
    this.studentToEdit.set({
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      phone: student.phone,
      whatsapp: student.whatsapp,
      email: student.email,
      college: student.college,
      faculty: student.faculty,
      status: student.currentStatus === 'active' ? 'active' : 'completed',
      billingType: student.packageInfo?.hasPackage ? 'package' : 'new-session'
    } as ActiveStudentSession);

    this.editName.set(student.name);
    this.editPhone.set(student.phone);
    this.editWhatsapp.set(student.whatsapp || student.phone);
    this.editEmail.set(student.email || '');
    this.editCollege.set(student.college || '');
    this.editFaculty.set(student.faculty || '');
    this.editPackage.set(student.packageInfo?.packageName || '');
    this.editPrinting.set(0);
    this.editWallet.set(0);
  }

  deleteDirectoryStudent(student: StudentDirectoryItem): void {
    this.closeActionMenu();
    if (student.currentStatus === 'active' && student.activeSession) {
      this.workspaceService.deleteStudent(student.activeSession.id);
    }
    this.workspaceService.deleteStudentProfile(student.phone || student.name || student.id);
  }

  setTab(tab: 'all' | 'active' | 'history'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.closeActionMenu();
    if (tab === 'history') {
      this.selectedDateOption.set('all');
    }
  }

  closeCheckoutModal(): void {
    this.studentToCheckout.set(null);
  }

  setDiscountPercent(percent: number): void {
    this.coDiscountPercent.set(percent);
  }

  applyCouponCode(code: string): void {
    this.coCouponInput.set(code);
    this.applyCoupon();
  }

  applyCoupon(): void {
    const code = this.coCouponInput().trim().toUpperCase();
    if (!code) return;

    this.couponApi.getCouponByCode(code).subscribe({
      next: (coupon) => {
        if (coupon && coupon.isActive !== false) {
          const isExpired = coupon.expiryDate ? new Date(coupon.expiryDate) < new Date() : false;
          if (isExpired) {
            this.workspaceService.showToast(this.isArabic() ? 'كود الكوبون منتهي الصلاحية' : 'Coupon code expired', 'error');
            return;
          }
          const maxLimit = (coupon as any).usageLimit ?? (coupon as any).UsageLimit ?? (coupon as any).maxUsage ?? (coupon as any).maxUses;
          const currentUses = (coupon as any).usageCount ?? (coupon as any).UsageCount ?? (coupon as any).currentRedemptions ?? 0;
          if (maxLimit !== null && maxLimit !== undefined && maxLimit > 0 && currentUses >= maxLimit) {
            this.workspaceService.showToast(
              this.isArabic() ? 'تم استنفاد الحد الأقصى لاستخدام هذا الكود' : 'Coupon usage limit reached',
              'error'
            );
            return;
          }
          let discountVal = coupon.value || 10;
          if (coupon.discountType === 1) {
            discountVal = +((this.coSubtotal() * discountVal) / 100).toFixed(2);
          }
          const clampedDiscount = Math.min(discountVal, this.coSubtotal());
          this.coCouponDiscount.set(clampedDiscount);
          this.coCouponApplied.set(true);
          this.workspaceService.showToast(
            this.isArabic() ? `تم تطبيق الكوبون "${code}": خصم ${clampedDiscount} ج.م` : `Coupon "${code}" applied: ${clampedDiscount} EGP off!`,
            'success'
          );
        } else {
          this.workspaceService.showToast(
            this.isArabic() ? 'كود الكوبون غير صالح أو غير مفعل' : 'Invalid or inactive coupon code',
            'error'
          );
        }
      },
      error: () => {
        this.workspaceService.showToast(
          this.isArabic() ? 'كود الكوبون غير موجود' : 'Coupon code not found',
          'error'
        );
      }
    });
  }

  openStudentCateringModal(student: ActiveStudentSession): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'إضافة طلب ضيافة' : 'Add Catering Order')) {
      return;
    }
    this.activeStudentForCatering.set(student);
    this.cateringTargetStudent.set({
      id: student.id,
      name: student.name,
      instructor: student.phone || student.college || student.faculty || (this.isArabic() ? 'طالب' : 'Student'),
      currentCatering: student.cateringTotal || 0,
      items: (student.cateringItems || []).map(i => ({
        name: i.product?.name || i.name || 'منتج كاترنج',
        nameAr: i.product?.nameAr || i.nameAr,
        price: i.unitPrice || i.price || 0,
        quantity: i.quantity || 1,
        total: i.totalPrice || i.total || (i.price * i.quantity),
        time: i.timestamp || (this.isArabic() ? 'أثناء الجلسة' : 'During session')
      }))
    });
    this.isStudentCateringModalOpen.set(true);
  }

  onAddCateringToStudent(payload: { roomId: string; items: any[]; total: number }): void {
    if (this.isCateringProcessing()) return;
    this.isCateringProcessing.set(true);

    try {
      const student = this.activeStudentForCatering() || this.studentToCheckout();
      if (!student) {
        this.isCateringProcessing.set(false);
        return;
      }

      // 1. Add catering amount & line items to Student Session in WorkspaceService
      // NOTE: catering-pos-modal confirmAddToRoomSession() ALREADY executed processPosSale() and shift recordTransaction()!
      // Do NOT call processPosSale again to avoid double stock deduction!
      this.workspaceService.addCateringToStudent(student.id, payload.total, payload.items);

      // 2. If Checkout modal is active for this student, sync line items immediately
      if (this.studentToCheckout()?.id === student.id) {
        const allProducts = this.cateringService.products();
        const newItems: CateringLineItem[] = payload.items.map((i: any) => {
          const prod = allProducts.find(p => p.id === (i.productId || i.product?.id || i.id));
          const name = i.product?.nameAr || i.product?.name || i.nameAr || i.name || prod?.nameAr || prod?.name || (this.isArabic() ? 'صنف كاترنج' : 'Catering Item');
          const unitPrice = Number((i.unitPrice ?? i.price ?? prod?.sellingPrice) || 0);
          const quantity = Number(i.quantity || 1);
          const price = Number(i.totalPrice || i.total || (unitPrice * quantity) || (prod?.sellingPrice ? prod.sellingPrice * quantity : 0));
          return {
            id: i.id || i.product?.id || `${Date.now()}_${Math.random()}`,
            name,
            price
          };
        });
        this.coCateringItems.update(items => [...items, ...newItems]);
      }

      this.isStudentCateringModalOpen.set(false);
      this.activeStudentForCatering.set(null);
    } finally {
      this.isCateringProcessing.set(false);
    }
  }

  removeCateringItem(id: string): void {
    this.coCateringItems.update(items => items.filter(i => i.id !== id));
    const student = this.studentToCheckout();
    if (student) {
      this.workspaceService.removeCateringFromStudent(student.id, id);
    }
  }

  openAddCateringModal(): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'إضافة صنف كاترنج' : 'Add Catering Item')) {
      return;
    }
    const student = this.studentToCheckout();
    if (student) {
      this.openStudentCateringModal(student);
    } else {
      this.newCateringName.set('');
      this.newCateringPrice.set(25);
      this.isAddCateringOpen.set(true);
    }
  }

  closeAddCateringModal(): void {
    this.isAddCateringOpen.set(false);
  }

  confirmAddCateringItem(): void {
    const name = this.newCateringName().trim();
    const price = +this.newCateringPrice();
    if (!name || isNaN(price) || price <= 0) return;

    const newItem: CateringLineItem = {
      id: Date.now().toString(),
      name,
      price
    };

    this.coCateringItems.update(items => [...items, newItem]);
    this.closeAddCateringModal();
  }

  finalizeCheckout(event?: ProcessPaymentEvent): void {
    const student = this.studentToCheckout();
    if (student) {
      const finalTotal = this.coFinalAmount();
      const prevWallet = student.walletAmount || 0;

      let received = this.coAmountReceived() !== null && !isNaN(this.coAmountReceived()!) ? this.coAmountReceived()! : 0;
      let newWallet = +(prevWallet + received - finalTotal).toFixed(2);
      let remaining = Math.max(0, +(finalTotal - received).toFixed(2));

      if (event && event.newWalletBalance !== undefined) {
        newWallet = event.newWalletBalance;
        if (event.amountReceived !== null && !isNaN(event.amountReceived)) {
          received = event.amountReceived;
        }
        const netCashDue = event.netCashDue !== undefined ? event.netCashDue : Math.max(0, finalTotal);
        remaining = Math.max(0, +(netCashDue - received).toFixed(2));
      }

      const isPartial = remaining > 0;
      const paymentMethod = event?.paymentMethod || this.coPaymentMethod();

      // Detect if student has active package or session is billed via package
      const cleanDigits = (student.phone || '').replace(/\D/g, '');
      const matchedPkg = this.packageService.studentPackages().find(p =>
        (p.status === 'active' || p.status === 'near_expiry') &&
        p.remainingHours > 0 &&
        (
          p.id === student.id ||
          (student.studentId && p.memberId === student.studentId) ||
          (cleanDigits && p.memberPhone?.replace(/\D/g, '') === cleanDigits) ||
          (p.memberNameAr && p.memberNameAr === student.name)
        )
      );

      const isPackageBilling = paymentMethod === 'package' || student.billingType === 'package' || !!matchedPkg;

      if (isPackageBilling) {
        let durHours = this.coDurationHours();
        if (!durHours || durHours <= 0) {
          const elapsedMins = this.getLiveElapsedMinutes(student.checkInTime, student.date);
          durHours = Math.max(1, Math.round(elapsedMins / 60));
        }
        const finalDeductHours = Math.max(1, Math.round(durHours));
        const targetIdentifier = matchedPkg?.id || student.phone || student.studentId || student.id || student.name;
        this.packageService.deductStudentPackageHours(targetIdentifier, finalDeductHours);
        this.workspaceService.showToast(
          this.isArabic() ? `تم خصم ${finalDeductHours} ساعة من باقة الطالب بنجاح!` : `Deducted ${finalDeductHours} hrs from student package!`,
          'success'
        );
      }

      this.workspaceService.checkOutStudent(student.id, {
        paymentMethod,
        totalCost: finalTotal,
        amountReceived: received,
        outstandingBalance: remaining,
        walletAmount: newWallet,
        paymentStatus: isPartial ? 'partially_paid' : 'paid',
        duration: this.coDurationDisplay(),
        packageHoursAlreadyDeducted: isPackageBilling,
        cateringAmount: Number(this.coCateringTotal() || student.cateringTotal || 0),
        printingAmount: Number(this.coPrintingTotal() || 0)
      });

      // Redeem coupon in backend if applied
      if (this.coCouponApplied() && this.coCouponInput().trim()) {
        this.couponApi.redeemCoupon(this.coCouponInput().trim().toUpperCase(), {
          studentId: student.studentId || student.id,
          discountApplied: this.coCouponDiscount()
        }).subscribe({
          next: () => console.log('[ShowStudent] Coupon redeemed successfully'),
          error: (err) => console.warn('[ShowStudent] Coupon redeem notice:', err?.message || err)
        });
      }

      this.closeCheckoutModal();
    }
  }

  // ----------------------------------------------------
  // ACTION MENU & OTHER MODALS
  // ----------------------------------------------------
  toggleActionMenu(studentId: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeActionMenuId() === studentId) {
      this.activeActionMenuId.set(null);
    } else {
      this.activeActionMenuId.set(studentId);
    }
  }

  closeActionMenu(): void {
    this.activeActionMenuId.set(null);
  }

  openBlockModal(student: ActiveStudentSession): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'حظر طالب' : 'Block Student')) {
      return;
    }
    this.closeActionMenu();
    // Strict Requirement 7: Cannot block student while checked-in
    if (student.status === 'active') {
      this.workspaceService.showToast(
        this.isArabic()
          ? 'لا يمكن حظر الطالب أثناء وجوده في جلسة نشطة (Checked-in). يرجى إنهاء الجلسة وتسجيل الخروج أولاً.'
          : 'Cannot block student while checked in. Please check-out the student first.',
        'error'
      );
      return;
    }
    this.studentToBlock.set(student);
    this.blockReason.set('');
  }

  closeBlockModal(): void {
    this.studentToBlock.set(null);
    this.blockReason.set('');
  }

  onUnblockStudent(studentId: string): void {
    this.closeActionMenu();
    this.workspaceService.unblockStudent(studentId);
  }

  confirmBlockStudent(): void {
    const student = this.studentToBlock();
    if (student) {
      if (student.status === 'active') {
        this.workspaceService.showToast(
          this.isArabic()
            ? 'لا يمكن حظر طالب نشط. يجب عمل Check-out أولاً.'
            : 'Active student cannot be blocked. Check-out first.',
          'error'
        );
        return;
      }
      this.workspaceService.blockStudent(student, this.blockReason());
      this.closeBlockModal();
      if (this.currentPage() > this.totalPages()) {
        this.currentPage.set(Math.max(1, this.totalPages()));
      }
    }
  }

  // Delete Modal with Shift Opener Password Requirement
  deleteShiftPassword = signal('');
  deletePasswordError = signal<string | null>(null);
  isVerifyingDeletePassword = signal(false);

  shiftOpenerName = computed(() => {
    const shift = this.shiftService.currentShift();
    return shift?.staffName || this.authService.getUser()?.name || 'مسؤول الوردية';
  });

  openDeleteModal(student: ActiveStudentSession): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'حذف جلسة الطالب' : 'Delete Student Session')) {
      return;
    }
    this.closeActionMenu();
    this.deleteShiftPassword.set('');
    this.deletePasswordError.set(null);
    this.isVerifyingDeletePassword.set(false);
    this.studentToDelete.set(student);
  }

  closeDeleteModal(): void {
    this.deleteShiftPassword.set('');
    this.deletePasswordError.set(null);
    this.isVerifyingDeletePassword.set(false);
    this.studentToDelete.set(null);
  }

  confirmDelete(): void {
    const student = this.studentToDelete();
    if (!student) return;

    const pwd = this.deleteShiftPassword().trim();
    if (!pwd) {
      this.deletePasswordError.set(
        this.isArabic()
          ? 'يرجى إدخال كلمة مرور مسؤول الوردية للتأكيد'
          : 'Please enter shift opener password to confirm'
      );
      return;
    }

    this.isVerifyingDeletePassword.set(true);
    this.deletePasswordError.set(null);

    // Verify against shift opener / logged-in staff using dedicated POST /api/Shifts/{shiftId}/verify-password
    const shift = this.shiftService.currentShift();
    const identifier = shift?.staffName || this.authService.getUser()?.name || this.authService.getUser()?.email || '';

    this.shiftService.verifyShiftOpenerPassword(pwd, shift?.id, identifier).subscribe({
      next: (isValid) => {
        this.isVerifyingDeletePassword.set(false);
        if (isValid) {
          this.workspaceService.deleteStudent(student.id);
          this.closeDeleteModal();
          if (this.currentPage() > this.totalPages()) {
            this.currentPage.set(Math.max(1, this.totalPages()));
          }
        } else {
          this.deletePasswordError.set(
            this.isArabic()
              ? 'كلمة مرور مسؤول الوردية غير صحيحة. تم إلغاء عملية الحذف.'
              : 'Incorrect shift opener password. Deletion cancelled.'
          );
        }
      },
      error: () => {
        this.isVerifyingDeletePassword.set(false);
        this.deletePasswordError.set(
          this.isArabic()
            ? 'تعذر التحقق من كلمة المرور من الخادم'
            : 'Failed to verify password with server'
        );
      }
    });
  }

  openEditModal(student: ActiveStudentSession): void {
    if (!this.shiftService.guardActiveShift(this.isArabic() ? 'تعديل جلسة الطالب' : 'Edit Student Session')) {
      return;
    }
    this.closeActionMenu();
    this.studentToEdit.set(student);

    const clean = (val?: string) => (val && val !== '-' && val !== 'undefined' ? val.trim() : '');
    const profile = this.workspaceService.getStudentProfile(student.studentId || student.phone || student.name || student.id);

    const name = clean(profile?.name) || clean(student.name);
    const phone = clean(profile?.phone) || clean(student.phone);
    const whatsapp = clean(profile?.whatsapp) || clean(student.whatsapp) || phone;
    const email = clean(profile?.email) || clean(student.email);
    const college = clean(profile?.college) || clean(student.college);
    const faculty = clean(profile?.faculty) || clean(student.faculty) || college;

    this.editName.set(name);
    this.editPhone.set(phone);
    this.editWhatsapp.set(whatsapp);
    this.editEmail.set(email);
    this.editCollege.set(college);
    this.editFaculty.set(faculty);
    this.editPackage.set('');
    this.editPrinting.set(student.printingCount || 0);
    this.editWallet.set(student.walletAmount || 0);
  }

  closeEditModal(): void {
    this.studentToEdit.set(null);
  }

  saveEditStudent(): void {
    const current = this.studentToEdit();
    if (current) {
      const updated: ActiveStudentSession = {
        ...current,
        name: this.editName().trim(),
        phone: this.editPhone().trim(),
        whatsapp: this.editWhatsapp().trim() || this.editPhone().trim(),
        email: this.editEmail().trim(),
        college: this.editCollege().trim(),
        faculty: this.editFaculty().trim(),
        printingCount: this.editPrinting(),
        walletAmount: this.editWallet()
      };
      this.workspaceService.updateStudent(updated);
      this.closeEditModal();
    }
  }

  toggleDateDropdown(): void {
    this.isDateDropdownOpen.update(v => !v);
  }

  closeDateDropdown(): void {
    this.isDateDropdownOpen.set(false);
  }

  setDateOption(option: DateFilterOption): void {
    this.selectedDateOption.set(option);
    if (option !== 'custom') {
      this.customDateValue.set('');
    }
    this.currentPage.set(1);
    this.closeDateDropdown();

    const now = new Date();
    const todayISO = getTodayDateISO();

    if (option === 'today') {
      this.workspaceService.fetchSessions({ DateFrom: todayISO, DateTo: todayISO });
    } else if (option === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestISO = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
      this.workspaceService.fetchSessions({ DateFrom: yestISO, DateTo: yestISO });
    } else if (option === 'all') {
      this.workspaceService.fetchSessions();
    }
  }

  onCustomDateSelect(dateStr: string): void {
    if (dateStr) {
      this.selectedDateOption.set('custom');
      this.customDateValue.set(dateStr);
      this.currentPage.set(1);
      this.closeDateDropdown();
      this.workspaceService.fetchSessions({ DateFrom: dateStr, DateTo: dateStr });
    }
  }

  getTodayMenuLabel(): string {
    const now = new Date();
    const locale = this.isArabic() ? 'ar-EG' : 'en-US';
    const formatted = now.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    return `${this.t().todayText} (${formatted})`;
  }

  getYesterdayMenuLabel(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const locale = this.isArabic() ? 'ar-EG' : 'en-US';
    const formatted = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    return `${this.t().yesterdayText} (${formatted})`;
  }

  getSelectedDateLabel(): string {
    const opt = this.selectedDateOption();
    const now = new Date();
    const locale = this.isArabic() ? 'ar-EG' : 'en-US';
    const todayFormatted = now.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    const yestFormatted = yest.toLocaleDateString(locale, { month: 'short', day: 'numeric' });

    if (opt === 'today') return `${this.t().todayText}, ${todayFormatted}`;
    if (opt === 'yesterday') return `${this.t().yesterdayText}, ${yestFormatted}`;
    if (opt === 'custom' && this.customDateValue()) return this.customDateValue();
    return this.t().allDates;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  setPage(page: number): void {
    this.goToPage(page);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  private formatTimeDisplay(timeStr: string): string {
    if (!timeStr) return '09:00 AM';
    if (timeStr.includes('T')) {
      return parseIsoToLocal12h(timeStr);
    }
    const clean = timeStr.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|ص|م)?/i);
    if (!match) return timeStr;
    let h = parseInt(match[1], 10);
    const m = match[2];
    let marker = (match[3] || '').toUpperCase();
    if (marker === 'ص') marker = 'AM';
    if (marker === 'م') marker = 'PM';

    if (!marker) {
      marker = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
    } else {
      h = h % 12 || 12;
    }

    const padHour = String(h).padStart(2, '0');
    return `${padHour}:${m} ${marker}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.student-search-container') && !target.closest('.student-search-input') && !target.closest('.search-autocomplete-dropdown')) {
      this.ciIsSearchDropdownOpen.set(false);
    }
    if (!target.closest('.action-menu-wrap') && !target.closest('.btn-action-trigger')) {
      this.closeActionMenu();
    }
    if (!target.closest('.date-filter-wrap')) {
      this.isDateDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.ciIsSearchDropdownOpen.set(false);
    this.isDateDropdownOpen.set(false);
    this.closeActionMenu();
    if (this.isCheckInModalOpen()) this.closeCheckInModal();
  }
}
