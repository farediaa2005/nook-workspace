import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { parseDurationMinutes, getTodayDateISO, parseIsoToLocal12h, parseIsoToLocalDate } from '../../../core/utils/date-time.util';
import { WorkspaceService, isSameDayAsToday } from '../../../core/services/workspace.service';
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
import { extractApiErrorMessage } from '../../../core/utils/api-error.util';
import { normalizeArabicDigits, sanitizePhoneInput, toEgyptianLocalPhone, validateNameError, validatePhoneError, validateEmailError } from '../../../core/utils/validators.util';
import { isSilentZone, zoneFor } from '../../../core/constants/backend-enums';

import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

interface CateringLineItem {
  id: string;
  name: string;
  price: number;
}

interface StudentDirectoryItem {
  id: string;
  studentId?: string;
  name: string;
  avatar?: string;
  phone: string;
  whatsapp: string;
  email: string;
  faculty: string;
  college: string;
  university?: string;
  notes?: string;
  seatingType?: 'Share' | 'Silent' | 'Shared' | string;
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
  totalHours?: number;
  lastVisitDate?: string;
  lastVisitTime?: string;
  totalSpent: number;
}

@Component({
  selector: 'app-show-student',
  standalone: true,
  imports: [PageHeaderComponent, StatusBadgeComponent, 
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

  /** translations with {placeholders} */

  tf = this.langService.tf;
  isArabic = this.langService.isArabic;
  formatTime = (str?: string) => this.langService.formatTimeLocale(str);
  formatDuration = (str?: string) => this.langService.formatDurationLocale(str);
  formatName = (str?: string) => this.langService.formatNameLocale(str);

  getStudentSeatingType(student?: { seatingType?: string; zone?: number; roomName?: string; activeSession?: any; currentStatus?: string; status?: string } | null): 'Shared' | 'Silent' | null {
    if (!student) return null;
    if (student.activeSession) {
      const isSilent = isSilentZone(student.activeSession.zone) ||
        student.activeSession.seatingType === 'Silent' ||
        (student.activeSession.roomName && student.activeSession.roomName.toLowerCase().includes('silent'));
      return isSilent ? 'Silent' : 'Shared';
    }
    // Seating is strictly for active sessions in workspace
    const isActive = student.currentStatus === 'active' || student.status === 'active' || (student as any).inWorkspace;
    if (isActive) {
      if (student.seatingType === 'Silent' || isSilentZone(student.zone) || (student.roomName && student.roomName.toLowerCase().includes('silent'))) {
        return 'Silent';
      }
      return 'Shared';
    }
    // If student is offline, they are not seated anywhere in the workspace
    return null;
  }

  getStudentVisitStats(student?: any): { visits: number; hours: number } {
    if (!student) return { visits: 1, hours: 2 };
    const map = this.studentVisitStatsMap();
    const phone = (student.phone || '').trim();
    const name = (student.name || '').trim().toLowerCase();
    const id = student.id;
    const studentId = (student as any).studentId;

    if (id && map.has(id)) return map.get(id)!;
    if (studentId && map.has(studentId)) return map.get(studentId)!;
    if (phone && map.has(phone)) return map.get(phone)!;
    if (name && map.has(name)) return map.get(name)!;

    return this.workspaceService.getStudentVisitStats(studentId || id || phone || name);
  }

  getStudentAvatar(student: { avatar?: string; name: string } | null | undefined): string {
    if (!student) return generateAvatarSvg('طالب');
    return getSafeAvatar(student.avatar, student.name);
  }

  onAvatarError(event: Event, name?: string): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.onerror = null;
      img.src = generateAvatarSvg(name || 'طالب');
    }
  }

  shouldShowStudentNote(student: { notes?: string; name?: string } | null | undefined): boolean {
    if (!student || !student.notes) return false;
    const note = student.notes.trim().toLowerCase();
    const name = (student.name || '').trim().toLowerCase();
    if (!note || note === '-' || note === 'null' || note === 'undefined') return false;
    // Do not show internal system room tags as user-facing notes
    if (note.startsWith('[roomid:') || note.includes('roomid:')) return false;
    return note !== name;
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
    const diffMs = now.getTime() - start.getTime();

    // If start is slightly in the future due to clock skew or just checked in
    if (diffMs <= 0) return 1;

    const mins = Math.floor(diffMs / 60000);
    return Math.max(1, mins);
  }

  getLiveStudentDuration(student: ActiveStudentSession): string {
    if (student.status !== 'active') {
      const rawDur = student.duration?.trim();
      const mins = parseDurationMinutes(rawDur);
      const isAnomalous = !rawDur || mins === 0 || rawDur === '0h 00m' || rawDur === '0 س 00 د' || rawDur === '0h 0m' || rawDur === '0m';

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
        const totalMins = Math.max(1, Math.floor(diffMs / 60000));
        const d = Math.floor(totalMins / 1440);
        const remMins = totalMins % 1440;
        const h = Math.floor(remMins / 60);
        const m = remMins % 60;
        const durStr = d > 0 ? `${d}d ${h}h ${String(m).padStart(2, '0')}m` : `${h}h ${String(m).padStart(2, '0')}m`;
        return this.formatDuration(durStr);
      }

      // If cost is available, compute estimated duration
      if (student.cost && student.cost > 0) {
        const mins = Math.max(15, Math.round((student.cost / 30) * 60));
        const d = Math.floor(mins / 1440);
        const remMins = mins % 1440;
        const h = Math.floor(remMins / 60);
        const m = remMins % 60;
        const durStr = d > 0 ? `${d}d ${h}h ${String(m).padStart(2, '0')}m` : `${h}h ${String(m).padStart(2, '0')}m`;
        return this.formatDuration(durStr);
      }

      return this.formatDuration('1h 00m');
    }

    const elapsedMins = this.getLiveElapsedMinutes(student.checkInTime, student.date);
    const d = Math.floor(elapsedMins / 1440);
    const remMins = elapsedMins % 1440;
    const h = Math.floor(remMins / 60);
    const m = remMins % 60;
    const durStr = d > 0 ? `${d}d ${h}h ${String(m).padStart(2, '0')}m` : `${h}h ${String(m).padStart(2, '0')}m`;
    return this.formatDuration(durStr);
  }

  getStudentTimeStatus(student?: ActiveStudentSession): {
    status: 'active' | 'ending_soon' | 'ended_grace' | 'overtime' | 'blocked' | 'left';
    badgeClass: string;
    badgeLabel: string;
    subText?: string;
  } {
    if (!student) {
      return {
        status: 'left',
        badgeClass: 'badge-status--left',
        badgeLabel: this.t().statusOffline
      };
    }

    if (student.status === 'blocked') {
      return {
        status: 'blocked',
        badgeClass: 'badge-status--blocked',
        badgeLabel: this.t().statusBlocked
      };
    }

    if (student.status !== 'active') {
      return {
        status: 'left',
        badgeClass: 'badge-status--left',
        badgeLabel: this.t().statusLeft
      };
    }

    const isAr = this.isArabic();
    // Read reactive signal to update every second with the live timer
    const now = this.currentLiveTime();

    if (student.expectedCheckout) {
      const endObj = this.parseTimeAndDateToDate(student.expectedCheckout, student.date);
      const diffMs = endObj.getTime() - now.getTime();

      if (diffMs > 0) {
        const remMins = Math.max(1, Math.floor(diffMs / 60000));
        if (remMins <= 5) {
          return {
            status: 'ending_soon',
            badgeClass: 'badge-status--warning',
            badgeLabel: this.langService.tf('loctMLeft', { remMins }),
            subText: this.t().locEndingSoon
          };
        }
        if (remMins <= 15) {
          return {
            status: 'ending_soon',
            badgeClass: 'badge-status--info',
            badgeLabel: this.langService.tf('loctMLeft', { remMins }),
            subText: this.t().locEndingSoon2
          };
        }
        return {
          status: 'active',
          badgeClass: 'badge-status--active',
          badgeLabel: this.t().statusActive
        };
      } else {
        // Expired -> Grace or Overtime
        const overdueMins = Math.max(1, Math.floor((now.getTime() - endObj.getTime()) / 60000));
        if (overdueMins <= 10) {
          const graceLeft = Math.max(0, 10 - overdueMins);
          return {
            status: 'ended_grace',
            badgeClass: 'badge-status--warning',
            badgeLabel: this.langService.tf('loctGraceM', { graceLeft }),
            subText: this.langService.tf('loctEndedGraceM', { graceLeft })
          };
        } else {
          let durationStr: string;
          if (overdueMins < 60) {
            durationStr = this.langService.tf('loctM2', { overdueMins });
          } else {
            const h = Math.floor(overdueMins / 60);
            const m = overdueMins % 60;
            durationStr = m === 0
              ? (this.langService.tf('loctH', { h }))
              : (this.langService.tf('loctHM2', { h, m }));
          }

          return {
            status: 'overtime',
            badgeClass: 'badge-status--overdue',
            badgeLabel: this.langService.tf('loctOverdue', { durationStr }),
            subText: this.langService.tf('loctOverdueBy', { durationStr })
          };
        }
      }
    }

    // No expected checkout: check long stay
    if (student.checkInTime) {
      const startObj = this.parseTimeAndDateToDate(student.checkInTime, student.date);
      const elapsedHours = (now.getTime() - startObj.getTime()) / (1000 * 60 * 60);
      if (elapsedHours >= 4) {
        const totalHours = Math.floor(elapsedHours);
        const d = Math.floor(totalHours / 24);
        const remH = totalHours % 24;
        let badgeLabel: string;
        let subText: string;
        if (d > 0) {
          if (isAr) {
            badgeLabel = remH > 0 ? `إقامة طويلة (${d} يوم ${remH} س)` : `إقامة طويلة (${d} يوم)`;
            subText = remH > 0 ? `متواجد منذ ${d} يوم و ${remH} ساعة` : `متواجد منذ ${d} يوم`;
          } else {
            badgeLabel = remH > 0 ? `Long stay (${d}d ${remH}h)` : `Long stay (${d}d)`;
            subText = remH > 0 ? `In workspace for ${d}d ${remH}h` : `In workspace for ${d}d`;
          }
        } else {
          badgeLabel = this.langService.tf('loctLongStayH', { totalHours });
          subText = this.langService.tf('loctInWorkspaceForHours', { totalHours });
        }
        return {
          status: 'active',
          badgeClass: 'badge-status--info',
          badgeLabel,
          subText
        };
      }
    }

    return {
      status: 'active',
      badgeClass: 'badge-status--active',
      badgeLabel: this.t().statusActive
    };
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
    const pPages = (student.printingCount && student.printingCount > 0) ? Number(student.printingCount) : 0;
    const printingCost = pPages > 0 ? Number((pPages * 1.5).toFixed(2)) : 0;

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
  regNotes = signal('');

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
      if (id && /^[0-9a-fA-F-]{36}$/.test(id)) return id.toLowerCase();
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
        faculty: clean(p.university) || faculty || '',
        college: college || '',
        notes: clean(p.notes) || '',
        seatingType: 'Share',
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
          notes: '',
          seatingType: 'Share',
          currentStatus: 'offline',
          packageInfo: pkgInfo,
          totalVisits: 0,
          totalHours: 0,
          totalSpent: pkg.cost || 0
        });
      }
    }

    // 3. Ingest active and history sessions
    const allSessions = [...activeSessions, ...historySessions];
    for (const s of allSessions) {
      const key = getOrCreateKey(s.phone, s.name, s.studentId || s.id);
      let student = studentMap.get(key);

      const seating = this.getStudentSeatingType(s);

      if (!student) {
        const name = clean(s.name) || 'طالب';
        const newStudent: StudentDirectoryItem = {
          id: s.studentId || s.id,
          studentId: s.studentId,
          name,
          avatar: s.avatar || generateAvatarSvg(name),
          phone: clean(s.phone),
          whatsapp: clean(s.whatsapp || s.phone),
          email: clean(s.email),
          faculty: clean(s.faculty) || '',
          college: '',
          notes: clean(s.notes) || '',
          seatingType: seating || undefined,
          currentStatus: 'offline',
          totalVisits: 0,
          totalHours: 0,
          totalSpent: 0
        };
        studentMap.set(key, newStudent);
        student = newStudent;
      } else {
        if (s.notes) student.notes = clean(s.notes);
        if (seating === 'Silent') student.seatingType = 'Silent';
      }

      student.totalVisits += 1;
      const dur = typeof (s as any).durationHours === 'number' && (s as any).durationHours > 0 ? (s as any).durationHours : 2;
      student.totalHours = (student.totalHours || 0) + dur;
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
        const isSilent = isSilentZone(activeMatch.zone) || activeMatch.seatingType === 'Silent' || (activeMatch.roomName && activeMatch.roomName.toLowerCase().includes('silent'));
        student.seatingType = isSilent ? 'Silent' : 'Share';
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

  studentVisitStatsMap = computed(() => {
    const dir = this.allStudentsDirectory();
    const map = new Map<string, { visits: number; hours: number }>();
    for (const d of dir) {
      const visits = Math.max(1, d.totalVisits || 1);
      const hours = Math.max(1, Math.round(d.totalHours || (visits * 2)));
      const stat = { visits, hours };
      if (d.id) map.set(d.id, stat);
      if (d.studentId) map.set(d.studentId, stat);
      if (d.phone) map.set(d.phone.trim(), stat);
      if (d.name) map.set(d.name.trim().toLowerCase(), stat);
    }
    return map;
  });

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
  ciUniversity = signal('');
  ciCollege = signal('');
  ciFaculty = signal('');
  ciNotes = signal('');
  todayDate = getTodayDateISO();
  ciDate = signal(getTodayDateISO());

  // Segmented Time Input Signals (Matching Design System)
  ciStartHour = signal('02');
  ciStartMinute = signal('07');
  ciStartPeriod = signal<'AM' | 'PM'>('PM');

  ciEndHour = signal('05');
  ciEndMinute = signal('07');
  ciEndPeriod = signal<'AM' | 'PM'>('PM');



  onCiStartHourInput(val: string): void {
    let num = val.replace(/\D/g, '');
    if (num.length > 2) num = num.slice(0, 2);
    if (num && parseInt(num, 10) > 12) num = '12';
    this.ciStartHour.set(num);
  }

  onCiStartMinuteInput(val: string): void {
    let num = val.replace(/\D/g, '');
    if (num.length > 2) num = num.slice(0, 2);
    if (num && parseInt(num, 10) > 59) num = '59';
    this.ciStartMinute.set(num);
  }

  onCiEndHourInput(val: string): void {
    let num = val.replace(/\D/g, '');
    if (num.length > 2) num = num.slice(0, 2);
    if (num && parseInt(num, 10) > 12) num = '12';
    this.ciEndHour.set(num);
  }

  onCiEndMinuteInput(val: string): void {
    let num = val.replace(/\D/g, '');
    if (num.length > 2) num = num.slice(0, 2);
    if (num && parseInt(num, 10) > 59) num = '59';
    this.ciEndMinute.set(num);
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

    const endTotalH = hours + 3;
    const endH12 = endTotalH % 12 || 12;
    const endPer: 'AM' | 'PM' = (endTotalH % 24) >= 12 ? 'PM' : 'AM';

    this.ciEndHour.set(String(endH12).padStart(2, '0'));
    this.ciEndMinute.set(String(minutes).padStart(2, '0'));
    this.ciEndPeriod.set(endPer);
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
            faculty: clean(p.university) || clean(p.faculty)
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
        blockReason: blockReason || (isBlocked ? (this.t().wsBlockedBySystem) : undefined),
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
      const blockReason = item.blockReason || matchedBlock?.reason || (this.t().wsBlockedBySystem);
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
        this.langService.tf('wsCheckInBlocked', { reason: item.blockReason || 'BLOCKED' }),
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
    const faculty = clean(fullProfile?.university) || clean(fullProfile?.faculty) || clean(item.profile.university) || clean(item.profile.faculty);
    const notes = clean(fullProfile?.notes) || clean(item.profile.notes);

    this.ciSelectedStudent.set({
      ...item.profile,
      name,
      phone,
      whatsapp,
      email,
      college,
      faculty,
      notes
    });

    this.ciName.set(name);
    this.ciPhone.set(phone);
    this.ciEmail.set(email);
    this.ciWhatsapp.set(whatsapp);
    this.ciCollege.set(college);
    this.ciFaculty.set(faculty);
    this.ciNotes.set(notes);
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
    this.ciNotes.set('');
    this.ciSearchQuery.set('');
    this.ciExistingStudentFound.set(false);
  }

  // Open Session State (وقت مفتوح)
  isOpenSession = signal<boolean>(false);

  // Promo Coupon State for Check-In
  ciCouponCode = signal<string>('');
  ciCouponApplied = signal<boolean>(false);
  ciCouponDiscountPercent = signal<number>(0);
  ciCouponFixedAmount = signal<number>(0);

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
            this.workspaceService.showToast(this.t().wsCouponCodeExpired, 'error');
            return;
          }
          const maxLimit = (coupon as any).usageLimit ?? (coupon as any).UsageLimit ?? (coupon as any).maxUsage ?? (coupon as any).maxUses;
          const currentUses = (coupon as any).usageCount ?? (coupon as any).UsageCount ?? (coupon as any).currentRedemptions ?? 0;
          if (maxLimit !== null && maxLimit !== undefined && maxLimit > 0 && currentUses >= maxLimit) {
            this.workspaceService.showToast(
              this.t().wsCouponUsageLimitReached,
              'error'
            );
            return;
          }
          // discountType 1 = percentage, 2 = fixed amount (EGP)
          if (coupon.discountType === 2) {
            this.ciCouponDiscountPercent.set(0);
            this.ciCouponFixedAmount.set(Math.max(0, Number(coupon.value) || 0));
          } else {
            this.ciCouponFixedAmount.set(0);
            this.ciCouponDiscountPercent.set(Math.min(100, Math.max(0, Number(coupon.value) || 0)));
          }
          this.ciCouponApplied.set(true);
        } else {
          this.workspaceService.showToast(this.t().wsInvalidCouponCode, 'error');
        }
      },
      error: () => {
        this.workspaceService.showToast(this.t().wsCouponCodeNotFound, 'error');
      }
    });
  }

  removeCheckInCoupon(): void {
    this.ciCouponCode.set('');
    this.ciCouponApplied.set(false);
    this.ciCouponDiscountPercent.set(0);
    this.ciCouponFixedAmount.set(0);
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
  /**
   * Expected session cost from the student pricing tiers — the same calculation the
   * checkout uses (tiers are flat prices per hour range, not an hourly rate).
   */
  ciBaseEstimate = computed(() => {
    if (this.ciBilling() === 'package') {
      const extra = this.packageExtraHours();
      return extra > 0 ? this.settingsService.calculateStudentCost(extra) : 0;
    }
    return this.settingsService.calculateStudentCost(this.ciDurationHours() || 1);
  });

  ciTotalCost = computed(() => {
    let base = this.ciBaseEstimate();
    if (this.ciBilling() !== 'package') {
      if (this.ciBilling() === 'coupon' && this.ciCouponApplied()) {
        const discount = (base * this.ciCouponDiscountPercent()) / 100 + this.ciCouponFixedAmount();
        base = Math.max(0, base - Math.min(discount, base));
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
  ciWhatsappError = signal<string | null>(null);
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
      return this.t().wsStudentPackageCoveredByRemaining;
    }

    if (this.coCustomBaseCost() !== null) {
      return this.t().wsCustomBaseRate;
    }

    const dur = this.coDurationHours();
    const tiers = [...this.settingsService.pricingTiers()].sort((a, b) => a.fromHours - b.fromHours);
    const matchedTier = tiers.find(t => dur >= t.fromHours && dur <= t.toHours);

    if (matchedTier) {
      const tierName = (this.isArabic() ? matchedTier.labelAr : matchedTier.labelEn)
        || this.langService.tf('wsTierRange', { from: matchedTier.fromHours, to: matchedTier.toHours });
      return `${tierName} (${dur.toFixed(1)} ${this.t().hrsBadge})`;
    }

    const highest = tiers[tiers.length - 1];
    if (highest && dur > highest.toHours) {
      const extraHours = Math.ceil(dur - highest.toHours);
      const label = (this.isArabic() ? highest.labelAr : highest.labelEn) || this.langService.tf('wsHoursCount', { hours: highest.toHours });
      return this.langService.tf('wsTierPlusExtra', { label, extra: extraHours });
    }

    const rate = this.coHourlyRate() || 20;
    return `${rate} ${this.t().wsEgpHr} × ${dur.toFixed(1)} ${this.t().hrsBadge}`;
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

  // Same rule as the checkout modal: discounts do not stack — the larger of the manual %
  // and the coupon applies, never more than the bill.
  coTotalDiscounts = computed(() => {
    const best = Math.max(this.coDiscountAmount(), this.coCouponDiscount());
    return Math.min(+best.toFixed(2), this.coSubtotal());
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
      title: this.t().wsCheckout,
      subtitle: `${this.t().wsFinalizingSessionFor} ${student.name} (${student.phone || ''})`,
      session: {
        studentName: student.name,
        roomName: student.roomName || student.faculty || student.college || '',
        activity: student.name,
        status: student.status,
        startTime: student.checkInTime || '09:00 AM',
        endTime: this.coCheckoutTime(),
        duration: this.coDurationDisplay(),
        durationMinutes: Math.round(this.coDurationHours() * 60)
      },
      financialBreakdown: {
        items: [
          {
            icon: 'clock',
            title: this.t().wsWorkspaceBaseCost,
            subtitle: this.coSessionSubtitle(),
            amount: this.coBaseCost(),
            canEdit: true
          },
          {
            icon: 'canteen',
            title: this.t().wsCatering,
            subtitle: this.t().wsSnacksDrinks,
            amount: this.coCateringTotal(),
            isCatering: true,
            canAdd: true,
            buttonLabel: this.t().wsAddItem
          },
          {
            icon: 'printing',
            title: this.t().wsPrintingPages,
            subtitle: this.t().handouts,
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
        buttonText: this.t().wsProcessPaymentFreeRoom
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
  editUniversity = signal('');
  editCollege = signal('');
  editFaculty = signal('');
  editNotes = signal('');
  editPackage = signal('');
  editPrinting = signal(0);
  editWallet = signal(0);

  // ----------------------------------------------------
  // Edit Session Time Modal State (Item 12)
  // ----------------------------------------------------
  isEditSessionTimeModalOpen = signal(false);
  sessionTimeToEdit = signal<ActiveStudentSession | null>(null);
  editCheckInTimeInput = signal('');
  editExpectedCheckoutInput = signal('');
  editExtraMinutesInput = signal(0);

  editRecalculatedPrice = computed(() => {
    const s = this.sessionTimeToEdit();
    if (!s) return 0;
    const isPkg = s.billingType === 'package' || (!!s.packageOrCoupon && s.packageOrCoupon.toLowerCase().includes('package'));
    if (isPkg) return 0;
    const checkIn = this.editCheckInTimeInput();
    const elapsedMins = this.getLiveElapsedMinutes(checkIn, s.date) + (this.editExtraMinutesInput() || 0);
    const hoursFloat = Math.max(0.25, +(elapsedMins / 60).toFixed(2));
    const base = this.settingsService.calculateStudentCost(hoursFloat);
    const catering = Number(s.cateringTotal || 0);
    const pCount = (s.printingCount && s.printingCount > 0) ? Number(s.printingCount) : 0;
    const printing = pCount > 0 ? +(pCount * 1.5).toFixed(2) : 0;
    return +(base + catering + printing).toFixed(2);
  });

  // Stats from service
  insideCount = this.workspaceService.insideCount;
/** What still blocks the check-in submit button, shown next to it so the cashier knows why it is disabled. */
  ciMissing = computed<string[]>(() => {
    const missing: string[] = [];
    if (!this.ciName().trim()) missing.push(this.t().locStudentName);
    const phone = this.ciPhone().trim();
    if (!phone) missing.push(this.t().locPhoneNumber);
    else if (phone.length < 11) missing.push(this.t().loc11DigitPhoneNumber);
    if (!this.selectedRoomId() || !this.selectedRoom()) missing.push(this.t().locRoom);
    if (!this.isOpenSession() && !this.isTimeRangeValid()) missing.push(this.t().locCheckOutTimeAfterCheck);
    return missing;
  });

    avgSession = computed(() => this.langService.formatDurationLocale(this.workspaceService.avgSession()));
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
    return `${(totalMins / 60).toFixed(1)} ${this.t().hrsBadge}`;
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
        const now = new Date();        const yest = new Date(now);
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
    if (!this.shiftService.guardActiveShift(this.t().wsStudentCheckIn)) {
      return;
    }
    this.ciName.set('');
    this.ciPhone.set('');
    this.ciEmail.set('');
    this.ciWhatsapp.set('');
    this.ciUniversity.set('');
    this.ciCollege.set('');
    this.ciFaculty.set('');
    this.ciNotes.set('');
    this.ciDate.set(getTodayDateISO());

    this.setStartTimeToNow();

    this.selectedRoomCategory.set('shared');
    const firstRoom = this.sharedRooms()[0] || this.silentRooms()[0];
    this.selectedRoomId.set(firstRoom ? firstRoom.id : '');

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
      this.ciNameError.set(validateNameError(val, this.isArabic(), true));
    }
  }

  onPhoneInput(val: string): void {
    const normalized = normalizeArabicDigits(val);
    const clean = sanitizePhoneInput(normalized);
    this.ciPhone.set(clean);
    const canonical = toEgyptianLocalPhone(clean);
    if (canonical && canonical.length === 11) {
      const existing = this.workspaceService.getStudentProfile(canonical);
      if (existing) {
        if (!this.ciName() && existing.name) this.ciName.set(existing.name);
        if (!this.ciWhatsapp() && existing.whatsapp) this.ciWhatsapp.set(existing.whatsapp);
        if (!this.ciEmail() && existing.email) this.ciEmail.set(existing.email);
        if (!this.ciUniversity() && existing.university) this.ciUniversity.set(existing.university);
        if (!this.ciCollege() && (existing.college || existing.faculty)) this.ciCollege.set(existing.college || existing.faculty || '');
        if (!this.ciFaculty() && (existing.faculty || existing.college)) this.ciFaculty.set(existing.faculty || existing.college || '');
        this.ciExistingStudentFound.set(true);
      }
    }
    if (this.ciSubmitted()) {
      this.ciPhoneError.set(validatePhoneError(clean, this.isArabic(), true));
    }
  }

  onWhatsappInput(val: string): void {
    const normalized = normalizeArabicDigits(val);
    const clean = sanitizePhoneInput(normalized);
    this.ciWhatsapp.set(clean);
    if (this.ciSubmitted() && clean) {
      this.ciWhatsappError.set(validatePhoneError(clean, this.isArabic(), false, this.t().wsWhatsappNumber));
    } else {
      this.ciWhatsappError.set(null);
    }
  }

  onEmailInput(val: string): void {
    const clean = val.trim();
    this.ciEmail.set(clean);
    if (this.ciSubmitted()) {
      this.ciEmailError.set(validateEmailError(clean, this.isArabic(), false));
    }
  }

  validateCheckIn(): boolean {
    let isValid = true;
    const nameErr = validateNameError(this.ciName(), this.isArabic(), true);
    this.ciNameError.set(nameErr);
    if (nameErr) isValid = false;

    const phoneErr = validatePhoneError(this.ciPhone(), this.isArabic(), true);
    this.ciPhoneError.set(phoneErr);
    if (phoneErr) isValid = false;

    const emailErr = validateEmailError(this.ciEmail(), this.isArabic(), false);
    this.ciEmailError.set(emailErr);
    if (emailErr) isValid = false;

    const whatsappErr = this.ciWhatsapp().trim()
      ? validatePhoneError(this.ciWhatsapp(), this.isArabic(), false, this.t().wsWhatsappNumber)
      : null;
    this.ciWhatsappError.set(whatsappErr);
    if (whatsappErr) isValid = false;

    // Room validation (Strict Requirement 2)
    if (!this.selectedRoomId() || !this.selectedRoom()) {
      this.ciRoomError.set(this.t().wsPleaseSelectARoomBefore);
      isValid = false;
    } else {
      this.ciRoomError.set(null);
    }

    // Time Range validation
    if (!this.isOpenSession() && !this.isTimeRangeValid()) {
      isValid = false;
    }

    return isValid;
  }

  submitCheckIn(): void {
    if (!this.shiftService.guardActiveShift(this.t().wsStudentCheckIn)) {
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
        this.t().wsCheckInDeniedThisStudent,
        'error'
      );
      return;
    }

    if (!this.selectedRoomId() || !this.selectedRoom()) {
      this.ciRoomError.set(this.t().wsPleaseSelectARoomBefore);
      this.workspaceService.showToast(this.t().wsARoomMustBeSelected, 'error');
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
      university: this.ciUniversity().trim(),
      college: this.ciCollege().trim(),
      faculty: this.ciCollege().trim() || this.ciFaculty().trim(),
      notes: this.ciNotes().trim(),
      date: this.ciDate(),
      checkInTime: this.formatTimeDisplay(this.ciTime()),
      expectedCheckout: this.ciExpectedCheckout() ? this.formatTimeDisplay(this.ciExpectedCheckout()) : undefined,
      cost: this.ciBaseEstimate(),
      billingType: this.ciBilling(),
      packageOrCoupon: packageOrCouponText,
      sessionPrice: this.ciBaseEstimate(),
      printingCount: this.ciPrinting(),
      walletAmount: this.ciWallet(),
      wifiVoucher: this.ciWifi(),
      roomId: this.selectedRoomId() || selRoom?.id,
      roomName: selRoom?.name || (this.selectedRoomCategory() === 'silent' ? 'Silent Room' : 'Shared Room'),
      zone: zoneFor(this.selectedRoomCategory()),
      addedBy: this.shiftService.currentShift()?.staffName || this.authService.getUser()?.name || 'Staff'
    });

    this.closeCheckInModal();
  }

  // ----------------------------------------------------
  // CHECKOUT MODAL HANDLERS
  // ----------------------------------------------------
  openCheckoutModal(student: ActiveStudentSession): void {
    if (!this.shiftService.guardActiveShift(this.t().wsStudentCheckout)) {
      return;
    }
    this.closeActionMenu();
    this.studentToCheckout.set(student);
    this.workspaceService.syncSessionCatering(student.id);

    const now = new Date();
    this.coCheckoutTime.set(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );

    // Dynamic Duration computation based on actual elapsed time
    const elapsedMins = this.getLiveElapsedMinutes(student.checkInTime, student.date);
    const hoursFloat = Math.max(0.25, +(elapsedMins / 60).toFixed(2));
    const d = Math.floor(elapsedMins / 1440);
    const remMins = elapsedMins % 1440;
    const h = Math.floor(remMins / 60);
    const m = remMins % 60;
    const durStr = d > 0 ? `${d}d ${h}h ${String(m).padStart(2, '0')}m` : `${h}h ${String(m).padStart(2, '0')}m`;

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
        const name = it.product?.nameAr || it.product?.name || it.nameAr || it.name || prod?.nameAr || prod?.name || (this.t().wsCateringItem);
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
        name: this.t().wsCateringOrders2,
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
        this.workspaceService.showToast(this.t().wsNoStudentDataToExport, 'info');
        return;
      }
      const headers = [
      this.t().wsCsvDirId,
      this.t().wsCsvDirName,
      this.t().wsCsvDirPhone,
      this.t().wsCsvDirWhatsapp,
      this.t().wsCsvDirEmail,
      this.t().wsCsvDirFaculty,
      this.t().wsCsvDirCollege,
      this.t().wsCsvDirPackage,
      this.t().wsCsvDirTotalVisits,
      this.t().wsCsvDirLastVisitDate,
      this.t().wsCsvDirStatus
    ];
      const rows = list.map(s => [
        s.id,
        s.name,
        s.phone || '',
        s.whatsapp || '',
        s.email || '',
        s.faculty || '',
        s.college || '',
        s.packageInfo?.packageName || (this.t().wsPayAsYouGo2),
        s.totalVisits || 0,
        s.lastVisitDate || '',
        s.currentStatus
      ]);
      exportToCsv(`nook_all_registered_students_${getTodayDateISO()}.csv`, headers, rows);
      this.workspaceService.showToast(this.t().wsStudentsDirectoryExportedSuccessfully, 'success');
      return;
    }

    const students: ActiveStudentSession[] = this.filteredStudents();
    if (!students || students.length === 0) {
      this.workspaceService.showToast(this.t().wsNoMatchingFilteredDataTo, 'info');
      return;
    }

    const currentShiftLabel = this.shiftService.currentShift()?.staffName || 'Shift #' + (this.shiftService.currentShift()?.id || '1');

    const headers = [
      this.t().wsCsvSessStudentName,
      this.t().wsCsvSessStudentId,
      this.t().wsCsvSessPhoneNumber,
      this.t().wsCsvSessCollegeFaculty,
      this.t().wsCsvSessDate,
      this.t().wsCsvSessCheckInTime,
      this.t().wsCsvSessCheckOutTime,
      this.t().wsCsvSessDuration,
      this.t().wsCsvSessRoom,
      this.t().wsCsvSessAddedBy,
      this.t().wsCsvSessPackagePlan,
      this.t().wsCsvSessPrintingCount,
      this.t().wsCsvSessPrintingCostEgp,
      this.t().wsCsvSessCateringItems,
      this.t().wsCsvSessCateringCostEgp,
      this.t().wsCsvSessWalletBeforeEgp,
      this.t().wsCsvSessAmountReceivedEgp,
      this.t().wsCsvSessWalletAfterEgp,
      this.t().wsCsvSessTotalCostEgp,
      this.t().wsCsvSessCurrentShift,
      this.t().wsCsvSessStatus
    ];

    const rows = students.map((s: ActiveStudentSession) => {
      const catCost = +(s.cateringTotal || (s.cateringItems || []).reduce((sum, it) => sum + (it.totalPrice || it.total || (it.price * (it.quantity || 1)) || 0), 0)).toFixed(2);
      const catItemsSummary = (s.cateringItems || []).map((it: any) => `${it.product?.name || it.name || 'Item'} (x${it.quantity || 1})`).join('; ') || (this.t().wsNone);
      const totalCost = +this.getStudentTotalCost(s).toFixed(2);
      const statusText = s.status === 'active' ? (this.t().wsActive) : s.status === 'blocked' ? (this.t().wsBlocked2) : (this.t().resCompleted);

      return [
        s.name,
        s.studentId || s.id,
        s.phone || '',
        s.faculty || s.college || '',
        s.date || '',
        s.checkInTime || '',
        s.checkOutTime || (s.status === 'active' ? (this.t().wsInHouse) : ''),
        this.getLiveStudentDuration(s),
        s.roomName || (s.roomId ? 'Room ' + s.roomId : (this.t().wsSharedSpace3)),
        s.addedBy || 'Staff',
        s.billingType === 'package' ? (s.packageOrCoupon || 'Package') : (this.t().wsPayAsYouGo2),
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
    this.workspaceService.showToast(this.t().wsDetailedStudentsFinancialReportExported, 'success');
  }

  openRegisterModal(): void {
    if (!this.shiftService.guardActiveShift(this.t().wsRegisterNewStudent)) {
      return;
    }
    this.regName.set('');
    this.regPhone.set('');
    this.regWhatsapp.set('');
    this.regEmail.set('');
    this.regCollege.set('');
    this.regFaculty.set('');
    this.regNotes.set('');
    this.isRegisterModalOpen.set(true);
  }

  closeRegisterModal(): void {
    this.isRegisterModalOpen.set(false);
  }

  submitRegisterStudent(): void {
    if (!this.shiftService.guardActiveShift(this.t().wsRegisterNewStudent)) {
      return;
    }
    const name = this.regName().trim();
    const rawPhone = this.regPhone().trim();
    const phone = toEgyptianLocalPhone(rawPhone) || sanitizePhoneInput(normalizeArabicDigits(rawPhone));
    const rawWhatsapp = this.regWhatsapp().trim();
    const whatsapp = rawWhatsapp ? (toEgyptianLocalPhone(rawWhatsapp) || sanitizePhoneInput(normalizeArabicDigits(rawWhatsapp))) : phone;
    const email = this.regEmail().trim();

    const nameErr = validateNameError(name, this.isArabic(), true);
    if (nameErr) {
      this.workspaceService.showToast(nameErr, 'error');
      return;
    }

    const phoneErr = validatePhoneError(phone, this.isArabic(), true);
    if (phoneErr) {
      this.workspaceService.showToast(phoneErr, 'error');
      return;
    }

    if (rawWhatsapp) {
      const wErr = validatePhoneError(whatsapp, this.isArabic(), false, this.t().wsWhatsappNumber);
      if (wErr) {
        this.workspaceService.showToast(wErr, 'error');
        return;
      }
    }

    const emailErr = validateEmailError(email, this.isArabic(), false);
    if (emailErr) {
      this.workspaceService.showToast(emailErr, 'error');
      return;
    }

    this.workspaceService.registerNewStudent({
      name,
      phone,
      whatsapp,
      email,
      college: this.regCollege().trim(),
      faculty: this.regFaculty().trim(),
      notes: this.regNotes().trim()
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
    this.ciNotes.set(student.notes || '');
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
      notes: student.notes,
      status: student.currentStatus === 'active' ? 'active' : 'completed',
      billingType: student.packageInfo?.hasPackage ? 'package' : 'new-session'
    } as ActiveStudentSession);

    this.editName.set(student.name);
    this.editPhone.set(student.phone);
    this.editWhatsapp.set(student.whatsapp || student.phone);
    this.editEmail.set(student.email || '');
    this.editCollege.set(student.college || '');
    this.editFaculty.set(student.faculty || '');
    this.editNotes.set(student.notes || '');
    this.editPackage.set(student.packageInfo?.packageName || '');
    this.editPrinting.set(0);
    this.editWallet.set(0);
  }

  // Directory Student Delete Confirmation (NOOK-SEC-01 & O-10)
  directoryStudentToDelete = signal<StudentDirectoryItem | null>(null);
  isDeleteDirectoryStudentModalOpen = signal<boolean>(false);

  openDeleteDirectoryStudentModal(student: StudentDirectoryItem): void {
    if (!this.shiftService.guardActiveShift(this.t().wsDeleteStudentFromDirectory)) {
      return;
    }
    this.closeActionMenu();
    this.directoryStudentToDelete.set(student);
    this.isDeleteDirectoryStudentModalOpen.set(true);
  }

  closeDeleteDirectoryStudentModal(): void {
    this.isDeleteDirectoryStudentModalOpen.set(false);
    this.directoryStudentToDelete.set(null);
  }

  confirmDeleteDirectoryStudent(): void {
    const student = this.directoryStudentToDelete();
    if (!student) return;
    if (student.currentStatus === 'active' && student.activeSession) {
      this.workspaceService.deleteStudent(student.activeSession.id);
    }
    this.workspaceService.deleteStudentProfile(student.phone || student.name || student.id);
    this.closeDeleteDirectoryStudentModal();
  }

  deleteDirectoryStudent(student: StudentDirectoryItem): void {
    this.openDeleteDirectoryStudentModal(student);
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
            this.workspaceService.showToast(this.t().wsCouponCodeExpired, 'error');
            return;
          }
          const maxLimit = (coupon as any).usageLimit ?? (coupon as any).UsageLimit ?? (coupon as any).maxUsage ?? (coupon as any).maxUses;
          const currentUses = (coupon as any).usageCount ?? (coupon as any).UsageCount ?? (coupon as any).currentRedemptions ?? 0;
          if (maxLimit !== null && maxLimit !== undefined && maxLimit > 0 && currentUses >= maxLimit) {
            this.workspaceService.showToast(
              this.t().wsCouponUsageLimitReached,
              'error'
            );
            return;
          }
          // The coupon is its own discount line; it must not also set the manual % discount
          // (that counted every coupon twice, and a fixed coupon could wipe out the whole bill).
          let discountVal = Math.max(0, Number(coupon.value) || 0);
          if (coupon.discountType === 1) {
            discountVal = +((this.coSubtotal() * Math.min(100, discountVal)) / 100).toFixed(2);
          }
          const clampedDiscount = Math.min(discountVal, this.coSubtotal());
          this.coCouponDiscount.set(clampedDiscount);
          this.coCouponApplied.set(true);
          this.workspaceService.showToast(
            this.langService.tf('wspCouponAppliedEgpOff', { code, clampedDiscount }),
            'success'
          );
        } else {
          this.workspaceService.showToast(
            this.t().wsInvalidOrInactiveCouponCode,
            'error'
          );
        }
      },
      error: () => {
        this.workspaceService.showToast(
          this.t().wsCouponCodeNotFound,
          'error'
        );
      }
    });
  }

  removeCouponCode(): void {
    this.coCouponInput.set('');
    this.coCouponDiscount.set(0);
    this.coCouponApplied.set(false);
    this.coDiscountPercent.set(0);
    this.workspaceService.showToast(
      this.t().wsCouponCodeRemovedSuccessfully,
      'info'
    );
  }

  openStudentCateringModal(student: ActiveStudentSession): void {
    this.workspaceService.syncSessionCatering(student.id);
    if (!this.shiftService.guardActiveShift(this.t().wsAddCateringOrder)) {
      return;
    }
    this.activeStudentForCatering.set(student);
    this.cateringTargetStudent.set({
      id: student.id,
      name: student.name,
      instructor: student.phone || student.college || student.faculty || (this.t().wsStudent),
      currentCatering: student.cateringTotal || 0,
      items: (student.cateringItems || []).map(i => ({
        name: i.product?.name || i.name || 'منتج كاترنج',
        nameAr: i.product?.nameAr || i.nameAr,
        price: i.unitPrice || i.price || 0,
        quantity: i.quantity || 1,
        total: i.totalPrice || i.total || (i.price * i.quantity),
        time: i.timestamp || (this.t().wsDuringSession)
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
          const name = i.product?.nameAr || i.product?.name || i.nameAr || i.name || prod?.nameAr || prod?.name || (this.t().wsCateringItem);
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
    if (!this.shiftService.guardActiveShift(this.t().wsAddCateringItem)) {
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
      let remaining = Math.max(0, +(finalTotal - received).toFixed(2));
      // Change handed back in cash, money left in the wallet, and the part paid from the wallet are three
      // different things for the server (see WorkspaceService.checkOutStudent).
      let cashChangeReturned = Math.max(0, +(received - finalTotal).toFixed(2));
      let walletDeposit = 0;
      let walletDebit = 0;
      let newWallet = +(prevWallet - remaining).toFixed(2);

      if (event && event.newWalletBalance !== undefined) {
        newWallet = event.newWalletBalance;
        if (event.amountReceived !== null && !isNaN(event.amountReceived)) {
          received = event.amountReceived;
        }
        const netCashDue = event.netCashDue !== undefined ? event.netCashDue : Math.max(0, finalTotal);
        remaining = Math.max(0, +(netCashDue - received).toFixed(2));
        cashChangeReturned = Math.max(0, event.changeDue || 0);
        walletDeposit = event.walletMode === 'credit' ? Math.max(0, event.walletAdjustment || 0) : 0;
        walletDebit = event.walletMode === 'debit' ? Math.max(0, event.walletAdjustment || 0) : 0;
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
      const couponCode = this.coCouponApplied() ? this.coCouponInput().trim().toUpperCase() : '';

      this.workspaceService.checkOutStudent(student.id, {
        paymentMethod,
        totalCost: finalTotal,
        amountReceived: received,
        outstandingBalance: remaining,
        walletAmount: newWallet,
        cashChangeReturned,
        walletDeposit,
        walletDebit,
        paymentStatus: isPartial ? 'partially_paid' : 'paid',
        duration: this.coDurationDisplay(),
        packageHoursAlreadyDeducted: isPackageBilling,
        couponCode: couponCode || undefined,
        discountAmount: this.coTotalDiscounts(),
        discountReason: [
          this.coDiscountPercent() > 0 ? `${this.coDiscountPercent()}%` : '',
          couponCode ? `coupon ${couponCode}` : ''
        ].filter(Boolean).join(' + ') || undefined,
        cateringAmount: Number(this.coCateringTotal() || student.cateringTotal || 0),
        printingAmount: Number(this.coPrintingTotal() || 0)
      }).subscribe((ok) => {
        // On failure the service already showed the error; keep the modal open.
        if (!ok) return;

        // Package hours and coupon usage are only recorded after the backend accepted the checkout.
        if (isPackageBilling) {
          let durHours = this.coDurationHours();
          if (!durHours || durHours <= 0) {
            const elapsedMins = this.getLiveElapsedMinutes(student.checkInTime, student.date);
            durHours = Math.max(1, Math.round(elapsedMins / 60));
          }
          const finalDeductHours = Math.max(1, Math.round(durHours));
          const targetIdentifier = matchedPkg?.id || student.phone || student.studentId || student.id || student.name;
          this.packageService.deductStudentPackageHours(targetIdentifier, finalDeductHours, student.id);
          this.workspaceService.showToast(
            this.langService.tf('wspDeductedHrsFromStudentPackage', { finalDeductHours }),
            'success'
          );
        }

        if (couponCode) {
          this.couponApi.redeemCoupon(couponCode, {
            studentId: student.studentId || student.id,
            discountApplied: this.coCouponDiscount()
          }).subscribe({
            error: (err) => this.workspaceService.showToast(
              this.langService.tf('wsCouponNotRecorded', { error: extractApiErrorMessage(err, this.t().serverErrorFallback) }),
              'error'
            )
          });
        }

        this.closeCheckoutModal();
      });
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
    if (!this.shiftService.guardActiveShift(this.t().wsBlockStudent)) {
      return;
    }
    this.closeActionMenu();
    // Strict Requirement 7: Cannot block student while checked-in
    if (student.status === 'active') {
      this.workspaceService.showToast(
        this.t().wsCannotBlockStudentWhileChecked,
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
          this.t().wsActiveStudentCannotBeBlocked,
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

  openDeleteModal(student: ActiveStudentSession): void {
    if (!this.shiftService.guardActiveShift(this.t().wsDeleteStudentSession)) {
      return;
    }
    this.closeActionMenu();
    this.studentToDelete.set(student);
  }

  closeDeleteModal(): void {
    this.studentToDelete.set(null);
  }

  confirmDelete(): void {
    const student = this.studentToDelete();
    if (!student) return;

    this.workspaceService.deleteStudent(student.id);
    this.closeDeleteModal();
    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(Math.max(1, this.totalPages()));
    }
  }

  openEditModal(student: ActiveStudentSession): void {
    if (!this.shiftService.guardActiveShift(this.t().wsEditStudentSession)) {
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
    const university = clean(profile?.university) || clean((student as any).university) || '';
    const college = clean(profile?.college) || clean(student.college) || clean(profile?.faculty) || clean(student.faculty);
    const faculty = college;
    const notes = clean(profile?.notes) || clean(student.notes);

    this.editName.set(name);
    this.editPhone.set(phone);
    this.editWhatsapp.set(whatsapp);
    this.editEmail.set(email);
    this.editUniversity.set(university);
    this.editCollege.set(college);
    this.editFaculty.set(faculty);
    this.editNotes.set(notes);
    this.editPackage.set('');
    this.editPrinting.set(student.printingCount || 0);
    this.editWallet.set(student.walletAmount || 0);
  }

  closeEditModal(): void {
    this.studentToEdit.set(null);
  }

  saveEditStudent(): void {
    const current = this.studentToEdit();
    if (!current) return;

    const name = this.editName().trim();
    const rawPhone = this.editPhone().trim();
    const phone = toEgyptianLocalPhone(rawPhone) || sanitizePhoneInput(normalizeArabicDigits(rawPhone));
    const rawWhatsapp = this.editWhatsapp().trim();
    const whatsapp = rawWhatsapp ? (toEgyptianLocalPhone(rawWhatsapp) || sanitizePhoneInput(normalizeArabicDigits(rawWhatsapp))) : phone;
    const email = this.editEmail().trim();

    const nameErr = validateNameError(name, this.isArabic(), true);
    if (nameErr) {
      this.workspaceService.showToast(nameErr, 'error');
      return;
    }

    const phoneErr = validatePhoneError(phone, this.isArabic(), true);
    if (phoneErr) {
      this.workspaceService.showToast(phoneErr, 'error');
      return;
    }

    if (rawWhatsapp) {
      const wErr = validatePhoneError(whatsapp, this.isArabic(), false, this.t().wsWhatsappNumber);
      if (wErr) {
        this.workspaceService.showToast(wErr, 'error');
        return;
      }
    }

    const emailErr = validateEmailError(email, this.isArabic(), false);
    if (emailErr) {
      this.workspaceService.showToast(emailErr, 'error');
      return;
    }

    const updated: ActiveStudentSession = {
      ...current,
      name,
      phone,
      whatsapp,
      email,
      university: this.editUniversity().trim(),
      college: this.editCollege().trim(),
      faculty: this.editCollege().trim() || this.editFaculty().trim(),
      notes: this.editNotes().trim(),
      printingCount: this.editPrinting(),
      walletAmount: this.editWallet()
    };
    this.workspaceService.updateStudent(updated);
    this.workspaceService.saveStudentProfile({
      id: current.studentId || current.id,
      name: updated.name,
      phone: updated.phone,
      whatsapp: updated.whatsapp,
      email: updated.email,
      university: updated.university,
      college: updated.college,
      faculty: updated.faculty,
      notes: updated.notes
    });
    this.closeEditModal();
  }

  // ----------------------------------------------------
  // Edit Session Time Modal Handlers (Item 12)
  // ----------------------------------------------------
  openEditSessionTimeModal(student: ActiveStudentSession): void {
    if (!this.shiftService.guardActiveShift(this.t().wsEditSessionTime2)) {
      return;
    }
    if (!this.authService.isAuthenticated()) {
      this.workspaceService.showToast(this.t().wsUnauthorizedPleaseLogin, 'error');
      return;
    }
    this.closeActionMenu();
    this.sessionTimeToEdit.set(student);
    this.editCheckInTimeInput.set(student.checkInTime || '');
    this.editExpectedCheckoutInput.set(student.expectedCheckout || '');
    this.editExtraMinutesInput.set(0);
    this.isEditSessionTimeModalOpen.set(true);
  }

  closeEditSessionTimeModal(): void {
    this.isEditSessionTimeModalOpen.set(false);
    this.sessionTimeToEdit.set(null);
    this.editExtraMinutesInput.set(0);
  }

  addExtraMinutes(mins: number): void {
    this.editExtraMinutesInput.update(cur => Math.max(0, cur + mins));
  }

  saveSessionTime(): void {
    const s = this.sessionTimeToEdit();
    if (!s) return;

    if (!this.shiftService.guardActiveShift(this.t().wsEditSessionTime2)) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.workspaceService.showToast(this.t().wsUnauthorizedPleaseLogin, 'error');
      return;
    }

    const rawCheckIn = this.editCheckInTimeInput().trim();
    if (!rawCheckIn) {
      this.workspaceService.showToast(
        this.t().wsPleaseProvideCheckInTime,
        'error'
      );
      return;
    }

    const cleanCheckIn = normalizeArabicDigits(rawCheckIn);
    const checkInMatch = cleanCheckIn.match(/^(\d{1,2}):(\d{2})(\s*(AM|PM|ص|م))?$/i);
    if (!checkInMatch) {
      this.workspaceService.showToast(
        this.t().wsInvalidCheckInTimeFormat,
        'error'
      );
      return;
    }

    const checkInDate = this.parseTimeAndDateToDate(cleanCheckIn, s.date);
    const now = new Date();
    // Boundary check: Check-in cannot be more than 15 minutes into the future
    if (checkInDate.getTime() > now.getTime() + 15 * 60000) {
      this.workspaceService.showToast(
        this.t().wsCheckInTimeCannotBe,
        'error'
      );
      return;
    }

    const rawCheckout = this.editExpectedCheckoutInput().trim();
    let cleanCheckout: string | undefined = undefined;
    if (rawCheckout) {
      cleanCheckout = normalizeArabicDigits(rawCheckout);
      const checkoutMatch = cleanCheckout.match(/^(\d{1,2}):(\d{2})(\s*(AM|PM|ص|م))?$/i);
      if (!checkoutMatch) {
        this.workspaceService.showToast(
          this.t().wsInvalidExpectedCheckoutFormat,
          'error'
        );
        return;
      }
      const checkoutDate = this.parseTimeAndDateToDate(cleanCheckout, s.date);
      if (checkoutDate.getTime() <= checkInDate.getTime()) {
        this.workspaceService.showToast(
          this.t().wsExpectedCheckoutMustBeAfter,
          'error'
        );
        return;
      }
    }

    s.checkInTime = cleanCheckIn;
    if (cleanCheckout) {
      s.expectedCheckout = cleanCheckout;
    }
    const newPrice = this.editRecalculatedPrice();
    s.cost = newPrice;

    this.workspaceService.updateSessionTime(s.id, s.checkInTime || '', s.expectedCheckout);
    this.workspaceService.showToast(
      this.langService.tf('wspSessionTimeUpdatedForRecalculated', { name: s.name, value: newPrice.toFixed(2) }),
      'success'
    );
    this.closeEditSessionTimeModal();
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

  retryLoadSessions(): void {
    this.workspaceService.loadFromBackend();
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
