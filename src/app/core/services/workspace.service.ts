import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, tap, catchError, forkJoin, map } from 'rxjs';
import {
  ActiveStudentSession,
  Student,
  CreateStudentDto,
  UpdateStudentDto,
  SessionCheckInDto,
  SessionCheckOutDto
} from '../models/student.model';
import { WorkspaceApiService } from './api/workspace-api.service';
import { StudentApiService, BackendStudentDto } from './api/student-api.service';
import { WorkspaceSessionDto, WorkspaceDetailDto } from '../models/workspace-session.model';
import { FacultyApiService } from './api/faculty-api.service';
import { BlacklistApiService } from './api/blacklist-api.service';
import { ShiftService } from './shift.service';
import { AuthService } from './auth.service';
import { WalletApiService } from './api/wallet-api.service';
import { CateringService } from './catering.service';
import { PackageService } from './package.service';
import { parseIsoToLocalDate, getTodayDateISO, parseIsoToLocal24h } from '../utils/date-time.util';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface BlacklistRecord {
  id: string;
  studentId: string;
  name: string;
  phone: string;
  email?: string;
  faculty?: string;
  college?: string;
  reason: string;
  blockedDate: string;
}

export interface StudentProfileRecord {
  id?: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  college?: string;
  faculty?: string;
  walletAmount?: number;
}

export { getTodayDateISO };

export const isSameDayAsToday = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const str = String(dateStr).trim();
  if (!str) return false;

  const todayISO = getTodayDateISO();
  const localDate = parseIsoToLocalDate(str);
  return localDate === todayISO;
};

export function parseDurationMinutes(durStr?: string): number {
  if (!durStr) return 0;
  let total = 0;
  const hMatch = durStr.match(/(\d+)\s*(?:h|س|hours?|ساعة|ساعات)/i);
  const mMatch = durStr.match(/(\d+)\s*(?:m|د|mins?|دقيقة|دقائق)/i);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  return total;
}

export function formatMinutesToDuration(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0h 00m';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function parseIsoOrTimeToDisplay(timeStr?: string | null, dateStr?: string | null): string {
  if (!timeStr) {
    if (dateStr && String(dateStr).includes('T')) {
      return parseIsoOrTimeToDisplay(dateStr, null);
    }
    return '';
  }

  const str = String(timeStr).trim();
  if (!str) return '';

  return parseIsoToLocal24h(str);
}

export function parseSessionTimeToDate(timeStr?: string, dateStr?: string): Date {
  const now = new Date();
  if (!timeStr) return now;

  if (timeStr.includes('T')) {
    const fullIso = timeStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(timeStr) ? timeStr : timeStr + 'Z';
    const parsed = new Date(fullIso);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  if (dateStr) {
    dateStr = parseIsoToLocalDate(dateStr);
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          year = y;
          month = m;
          day = d;
        }
      }
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);
        const p3 = parseInt(parts[2], 10);
        if (p3 > 1000) {
          day = p1 > 12 ? p1 : (p2 > 12 ? p2 : p1);
          month = (p1 > 12 ? p2 : (p2 > 12 ? p1 : p2)) - 1;
          year = p3;
        }
      }
    }
  }

  let hours = now.getHours();
  let minutes = now.getMinutes();

  let clean = timeStr.trim();
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

export function calculateSessionDuration(timeFrom?: string, timeTo?: string, dateFrom?: string, dateTo?: string): string {
  if (!timeFrom) return '0h 00m';
  const start = parseSessionTimeToDate(timeFrom, dateFrom);
  const end = timeTo ? parseSessionTimeToDate(timeTo, dateTo || dateFrom) : new Date();

  let diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000;
  }

  // Prevent multi-day blowout when calculating live duration or missing checkout across dates
  if (diffMs > 18 * 60 * 60 * 1000) {
    if (timeTo) {
      const sameDayStart = parseSessionTimeToDate(timeFrom, dateFrom);
      const sameDayEnd = parseSessionTimeToDate(timeTo, dateFrom);
      let sameDayDiff = sameDayEnd.getTime() - sameDayStart.getTime();
      if (sameDayDiff < 0) sameDayDiff += 24 * 60 * 60 * 1000;
      diffMs = sameDayDiff;
    } else {
      const todayStart = parseSessionTimeToDate(timeFrom, undefined);
      const now = new Date();
      let todayDiff = now.getTime() - todayStart.getTime();
      if (todayDiff < 0) todayDiff += 24 * 60 * 60 * 1000;
      if (todayDiff > 0 && todayDiff <= 18 * 60 * 60 * 1000) {
        diffMs = todayDiff;
      } else {
        diffMs = 60 * 60 * 1000;
      }
    }
  }

  const totalMins = Math.max(1, Math.floor(diffMs / 60000));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private api = inject(WorkspaceApiService);
  private studentApi = inject(StudentApiService);
  private facultyApi = inject(FacultyApiService);
  private blacklistApi = inject(BlacklistApiService);
  private shiftService = inject(ShiftService);
  private authService = inject(AuthService);
  private walletApi = inject(WalletApiService);
  private cateringService = inject(CateringService);
  private packageService = inject(PackageService);

  // Pure in-memory reactive state — ZERO localStorage dependencies
  private activeStudentsState = signal<ActiveStudentSession[]>([]);
  private historyStudentsState = signal<ActiveStudentSession[]>([]);
  private blacklistState = signal<BlacklistRecord[]>([]);
  private backendStudentsState = signal<StudentProfileRecord[]>([]);

  readonly isLoading = signal<boolean>(false);
  readonly isLoadingDirectory = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly activeStudents = this.activeStudentsState.asReadonly();
  readonly historyStudents = this.historyStudentsState.asReadonly();
  readonly blacklist = this.blacklistState.asReadonly();
  readonly backendStudents = this.backendStudentsState.asReadonly();

  // Internal maps for fast O(1) relational joins
  private studentMap = new Map<string, BackendStudentDto>();
  private facultiesMap = new Map<string, string>(); // lowercase name -> id

  // Persistent session catering cache prefix
  private readonly CATERING_CACHE_PREFIX = 'nook_catering_session_';

  private getSessionCateringCache(sessionId: string): { total: number; items: any[] } | null {
    try {
      const raw = localStorage.getItem(this.CATERING_CACHE_PREFIX + sessionId);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  private setSessionCateringCache(sessionId: string, total: number, items: any[]): void {
    try {
      localStorage.setItem(this.CATERING_CACHE_PREFIX + sessionId, JSON.stringify({ total, items }));
    } catch {}
  }

  private removeSessionCateringCache(sessionId: string): void {
    try {
      localStorage.removeItem(this.CATERING_CACHE_PREFIX + sessionId);
    } catch {}
  }

  /** Sync catering items directly from backend API for a workspace session */
  syncSessionCatering(sessionId: string): void {
    if (!sessionId || !/^[0-9a-fA-F-]{36}$/.test(sessionId)) return;

    this.api.getCateringItems(sessionId).subscribe({
      next: (items) => {
        if (items && Array.isArray(items) && items.length > 0) {
          const currentSession = this.activeStudentsState().find(s => s.id === sessionId);
          const currentItems = currentSession?.cateringItems || [];
          const allProducts = this.cateringService.products();

          const enrichedItems = items.map(it => {
            const prodId = it.productId || (it as any).product?.id || it.id;
            const prod = allProducts.find(p => p.id === prodId);
            const existing = currentItems.find(c => c.productId === prodId || c.id === it.id);

            const name = it.name || (it as any).product?.nameAr || (it as any).product?.name || existing?.name || prod?.nameAr || prod?.name || 'صنف كاترنج';
            const unitPrice = Number(it.unitPrice || (it as any).price || existing?.unitPrice || prod?.sellingPrice || 0);
            const quantity = Number(it.quantity || existing?.quantity || 1);
            const totalPrice = Number(it.totalPrice || (it as any).total || (unitPrice * quantity) || existing?.totalPrice || (prod?.sellingPrice ? prod.sellingPrice * quantity : 0));

            return {
              ...it,
              id: it.id || existing?.id || `${Date.now()}_${Math.random()}`,
              productId: prodId,
              name,
              nameAr: (it as any).nameAr || existing?.nameAr || prod?.nameAr,
              unitPrice,
              quantity,
              totalPrice,
              price: totalPrice,
              product: (it as any).product || existing?.product || prod
            };
          });

          const total = enrichedItems.reduce((sum, it) => sum + (it.totalPrice || it.price || 0), 0);
          const roundedTotal = +total.toFixed(2);
          const finalTotal = roundedTotal > 0 ? roundedTotal : (currentSession?.cateringTotal || 0);

          this.setSessionCateringCache(sessionId, finalTotal, enrichedItems);
          this.activeStudentsState.update(list =>
            list.map(s => s.id === sessionId ? { ...s, cateringTotal: finalTotal, cateringItems: enrichedItems } : s)
          );
        }
      },
      error: () => {
        // Silently retain cached local items if API is unreachable or empty
      }
    });
  }

  // 1. Inside Right Now: Dynamic count of all currently active students
  readonly insideCount = computed(() => {
    return this.activeStudentsState().filter(s => s.status === 'active').length;
  });

  // 2. Avg. Session: Dynamically computed from actual durations of all students
  readonly avgSession = computed(() => {
    const active = this.activeStudentsState().filter(s => s.status === 'active');
    const history = this.historyStudentsState();

    if (active.length === 0 && history.length === 0) {
      return '0h 00m';
    }

    const validDurations: number[] = [];

    // History completed sessions
    for (const s of history) {
      const rawMins = parseDurationMinutes(s.duration);
      if (rawMins > 0 && rawMins <= 18 * 60) {
        validDurations.push(rawMins);
      } else if (s.checkInTime && s.checkOutTime) {
        const start = parseSessionTimeToDate(s.checkInTime, s.date);
        const end = parseSessionTimeToDate(s.checkOutTime, s.checkOutDate || s.date);
        let diffMs = end.getTime() - start.getTime();
        if (diffMs < 0) diffMs += 24 * 3600 * 1000;
        const computedMins = Math.floor(diffMs / 60000);
        if (computedMins > 0 && computedMins <= 18 * 60) {
          validDurations.push(computedMins);
        }
      }
    }

    // Active sessions currently seated
    for (const s of active) {
      const rawMins = parseDurationMinutes(s.duration);
      if (rawMins > 0 && rawMins <= 18 * 60) {
        validDurations.push(rawMins);
      }
    }

    if (validDurations.length === 0) return '0h 00m';

    const totalMinutes = validDurations.reduce((sum, m) => sum + m, 0);
    const avg = totalMinutes / validDurations.length;
    return formatMinutesToDuration(avg);
  });

  // 3. Today's Check-ins: Cumulative count of all students who checked in today
  readonly todayCheckins = computed(() => {
    const activeCount = this.activeStudentsState().filter(s => s.status === 'active').length;
    const historyTodayCount = this.historyStudentsState().filter(s => {
      if (s.status !== 'completed' && s.status !== 'active') return false;
      return isSameDayAsToday(s.date) || isSameDayAsToday(s.checkOutDate);
    }).length;

    return activeCount + historyTodayCount;
  });

  // 4. Checkouts Today: Dynamically counted based on completed checkouts today
  readonly checkoutsToday = computed(() => {
    return this.historyStudentsState().filter(s =>
      s.status === 'completed' && (isSameDayAsToday(s.date) || isSameDayAsToday(s.checkOutDate))
    ).length;
  });

  // Toasts
  readonly toast = signal<ToastNotification | null>(null);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.loadFromBackend();
    }
  }

  /** Save/Update student full profile in the in-memory registry */
  public saveStudentProfile(profile: { name: string; phone: string; whatsapp?: string; email?: string; college?: string; faculty?: string; id?: string; walletAmount?: number }): void {
    if (!profile.name && !profile.phone) return;
    const cleanPhone = (profile.phone || '').trim();
    const cleanName = (profile.name || '').trim();
    const cleanEmail = profile.email && profile.email !== '-' ? profile.email.trim() : '';
    const cleanWhatsapp = profile.whatsapp && profile.whatsapp !== '-' ? profile.whatsapp.trim() : cleanPhone;
    const cleanCollege = profile.college && profile.college !== '-' ? profile.college.trim() : '';
    const cleanFaculty = profile.faculty && profile.faculty !== '-' ? profile.faculty.trim() : '';

    const newRecord: StudentProfileRecord = {
      id: profile.id,
      name: cleanName,
      phone: cleanPhone,
      whatsapp: cleanWhatsapp,
      email: cleanEmail,
      college: cleanCollege,
      faculty: cleanFaculty,
      walletAmount: profile.walletAmount
    };

    this.backendStudentsState.update(list => {
      const existingIdx = list.findIndex(s =>
        (profile.id && s.id === profile.id) ||
        (cleanPhone && s.phone === cleanPhone) ||
        (cleanName && s.name.toLowerCase() === cleanName.toLowerCase())
      );
      if (existingIdx >= 0) {
        const next = [...list];
        next[existingIdx] = { ...next[existingIdx], ...newRecord };
        return next;
      }
      return [newRecord, ...list];
    });
  }

  /** Retrieve full student profile from in-memory registry or student map */
  public getStudentProfile(phoneOrNameOrId?: string): StudentProfileRecord | null {
    if (!phoneOrNameOrId) return null;
    const key = String(phoneOrNameOrId).trim().toLowerCase();

    // Check backend students list
    const found = this.backendStudentsState().find(s =>
      (s.id && s.id.toLowerCase() === key) ||
      (s.phone && s.phone.toLowerCase() === key) ||
      (s.name && s.name.toLowerCase() === key)
    );
    if (found) return found;

    // Check student map
    const student = this.studentMap.get(key) || Array.from(this.studentMap.values()).find(s =>
      s.id.toLowerCase() === key ||
      (s.phoneNumber && s.phoneNumber.toLowerCase() === key) ||
      (s.name && s.name.toLowerCase() === key)
    );
    if (student) {
      const phone = student.phoneNumber || student.whatsapp || '';
      return {
        id: student.id,
        name: student.name || '',
        phone: phone,
        whatsapp: student.whatsapp || phone,
        email: student.email || '',
        college: student.college || student.facultyName || '',
        faculty: student.facultyName || ''
      };
    }

    return null;
  }

  /** Retrieve all registered student profiles for autocomplete and directory */
  public getAllStudentProfiles(): StudentProfileRecord[] {
    return this.backendStudentsState();
  }

  /** Direct registration of a new student */
  public registerNewStudent(profile: { name: string; phone: string; whatsapp?: string; email?: string; college?: string; faculty?: string }): void {
    const cleanProfile: StudentProfileRecord = {
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      whatsapp: profile.whatsapp?.trim() || profile.phone.trim(),
      email: profile.email?.trim() || '',
      college: profile.college?.trim() || '',
      faculty: profile.faculty?.trim() || ''
    };

    const facName = (cleanProfile.faculty || cleanProfile.college || '').trim();
    const facKey = facName.toLowerCase();
    const matchedFacultyId = this.facultiesMap.get(facKey);

    const executeCreate = (facultyId?: string) => {
      this.studentApi.createStudent({
        name: cleanProfile.name,
        phoneNumber: cleanProfile.phone,
        whatsapp: cleanProfile.whatsapp || cleanProfile.phone,
        email: cleanProfile.email || undefined,
        college: cleanProfile.college || undefined,
        university: cleanProfile.college || undefined,
        facultyId: facultyId || undefined
      }).subscribe({
        next: (created) => {
          const withId: StudentProfileRecord = {
            ...cleanProfile,
            id: created?.id,
            faculty: created?.facultyName || cleanProfile.faculty || facName
          };
          this.saveStudentProfile(withId);
          if (created?.id) {
            this.studentMap.set(created.id, created);
          }
          this.showToast(`تم تسجيل الطالب "${cleanProfile.name}" في النظام بنجاح!`, 'success');
        },
        error: (err) => {
          this.saveStudentProfile(cleanProfile);
          this.showToast(`تم حفظ بيانات الطالب محلياً: ${err?.message || ''}`, 'info');
        }
      });
    };

    if (facName && !matchedFacultyId) {
      this.facultyApi.createFaculty({ name: facName }).subscribe({
        next: (createdFac) => {
          if (createdFac?.id) {
            this.facultiesMap.set(facKey, createdFac.id);
            executeCreate(createdFac.id);
          } else {
            executeCreate();
          }
        },
        error: () => executeCreate()
      });
    } else {
      executeCreate(matchedFacultyId);
    }
  }

  /** Delete a student from registered students */
  public deleteStudentProfile(phoneOrIdOrName: string): void {
    const clean = phoneOrIdOrName.trim().toLowerCase();
    const student = this.backendStudentsState().find(s =>
      (s.id && s.id.toLowerCase() === clean) ||
      (s.phone && s.phone.toLowerCase() === clean) ||
      (s.name && s.name.toLowerCase() === clean)
    );

    const guid = student?.id;
    if (guid && /^[0-9a-fA-F-]{36}$/.test(guid)) {
      this.studentApi.deleteStudent(guid).subscribe({
        next: () => {
          this.backendStudentsState.update(list => list.filter(s => s.id !== guid));
          this.studentMap.delete(guid);
          this.showToast('تم حذف بيانات الطالب من السيرفر بنجاح!', 'info');
        },
        error: () => {
          this.backendStudentsState.update(list => list.filter(s => s.id !== guid));
          this.showToast('تم حذف بيانات الطالب من القائمة!', 'info');
        }
      });
    } else {
      this.backendStudentsState.update(list => list.filter(s =>
        s.id !== clean && s.phone?.toLowerCase() !== clean && s.name?.toLowerCase() !== clean
      ));
      this.showToast('تم حذف بيانات الطالب من القائمة!', 'info');
    }
  }

  /** Load live sessions, students, faculties, and blacklist from API */
  public loadFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;

    this.isLoading.set(true);
    this.error.set(null);

    // Concurrently fetch faculties, blacklists, and students first to ensure mapping data is ready
    forkJoin({
      faculties: this.facultyApi.getFaculties().pipe(catchError(() => of([]))),
      blacklists: this.blacklistApi.getBlacklists().pipe(catchError(() => of([]))),
      students: this.studentApi.getStudents().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ faculties, blacklists, students }) => {
        // 1. Populate faculties map
        (faculties || []).forEach((f: any) => {
          if (f.name) this.facultiesMap.set(f.name.toLowerCase().trim(), f.id);
          if (f.nameEn) this.facultiesMap.set(f.nameEn.toLowerCase().trim(), f.id);
        });

        // 2. Populate students map and directory state
        const profileList: StudentProfileRecord[] = [];
        (students || []).forEach(s => {
          this.studentMap.set(s.id, s);
          const phone = s.phoneNumber || s.whatsapp || '';
          profileList.push({
            id: s.id,
            name: s.name,
            phone: phone,
            whatsapp: s.whatsapp || s.phoneNumber || '',
            email: s.email || '',
            college: s.college || s.facultyName || '',
            faculty: s.facultyName || ''
          });
        });
        this.backendStudentsState.set(profileList);

        // 3. Populate blacklist state (deduplicated by studentId/phone/name)
        const uniqueBlacklistMap = new Map<string, BlacklistRecord>();
        (blacklists || []).forEach(b => {
          const matchedSt = (b.studentId ? this.studentMap.get(b.studentId) : null) ||
            (b.name ? Array.from(this.studentMap.values()).find(s => s.name && s.name.trim().toLowerCase() === b.name.trim().toLowerCase()) : null);
          const name = b.name || b.studentName || matchedSt?.name || 'طالب محظور';
          const phone = b.studentPhone || (b as any).phone || (b as any).phoneNumber || matchedSt?.phoneNumber || matchedSt?.whatsapp || '';
          const key = (b.studentId || phone || name).trim().toLowerCase();

          if (!uniqueBlacklistMap.has(key)) {
            uniqueBlacklistMap.set(key, {
              id: b.id,
              studentId: b.studentId || matchedSt?.id || b.id,
              name,
              phone,
              reason: b.reason || 'مخالفة القواعد',
              blockedDate: b.blacklistedAt ? parseIsoToLocalDate(b.blacklistedAt) : getTodayDateISO()
            });
          }
        });
        this.blacklistState.set(Array.from(uniqueBlacklistMap.values()));

        // 4. Fetch live workspace sessions
        this.fetchSessions();
      },
      error: (err) => {
        console.error('[WorkspaceService] Error during bootstrap fetch:', err);
        this.fetchSessions();
      }
    });
  }

  fetchSessions(params?: { DateFrom?: string; DateTo?: string }): void {
    const queryParams: any = {};
    if (params?.DateFrom) queryParams.DateFrom = params.DateFrom;
    if (params?.DateTo) queryParams.DateTo = params.DateTo;

    this.api.getSessions(queryParams).pipe(
      catchError((err) => {
        console.warn('[WorkspaceService] Could not fetch sessions from API:', err?.message);
        this.error.set(err?.message || 'Failed to fetch workspace sessions');
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe({
      next: (sessions) => {
        this.isLoading.set(false);
        if (sessions && sessions.length > 0) {
          const mapped: ActiveStudentSession[] = sessions.map(dto => this.mapDtoToSession(dto));
          const active = mapped.filter(s => s.status === 'active');
          const history = mapped.filter(s => s.status === 'completed' || s.status === 'blocked');

          this.activeStudentsState.set(active);
          this.historyStudentsState.set(history);

          // Synchronize catering items from backend API for all active sessions
          active.forEach(s => {
            if (s.id && /^[0-9a-fA-F-]{36}$/.test(s.id)) {
              this.syncSessionCatering(s.id);
            }
          });
        } else {
          this.activeStudentsState.set([]);
          this.historyStudentsState.set([]);
        }
      }
    });
  }

  showToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    this.toast.set({ id: Date.now().toString(), message, type });
    setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  /** Checks whether a student/member/instructor is currently on the blacklist */
  public isStudentBlacklisted(name?: string | null, phone?: string | null, studentId?: string | null): boolean {
    const list = this.blacklistState();
    if (!list || list.length === 0) return false;

    const cleanName = (name || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const cleanId = (studentId || '').trim().toLowerCase();

    return list.some(b => {
      if (cleanId && (b.studentId?.toLowerCase() === cleanId || b.id?.toLowerCase() === cleanId)) {
        return true;
      }
      const bPhone = (b.phone || '').replace(/\D/g, '');
      if (cleanPhone && bPhone) {
        if (cleanPhone === bPhone) return true;
        if (cleanPhone.length >= 8 && bPhone.length >= 8 && (cleanPhone.endsWith(bPhone.slice(-8)) || bPhone.endsWith(cleanPhone.slice(-8)))) {
          return true;
        }
      }
      const bName = (b.name || '').trim().toLowerCase();
      if (cleanName && bName && (cleanName === bName || cleanName.includes(bName) || bName.includes(cleanName))) {
        return true;
      }
      return false;
    });
  }

  /** Check in a student to workspace session */
  checkInStudent(newStudent: Omit<ActiveStudentSession, 'id' | 'duration' | 'status' | 'billingType'> & { billingType?: 'new-session' | 'package' | 'coupon'; studentId?: string; zone?: number }): void {
    // 0. Blacklist Enforcement Guard (Requirement 9)
    if (this.isStudentBlacklisted(newStudent.name, newStudent.phone, newStudent.studentId)) {
      this.showToast('لا يمكن تسجيل دخول طالب محظور (BLOCKED). يرجى فك الحظر أولاً من قائمة الحظر', 'error');
      return;
    }

    const facKey = (newStudent.faculty || newStudent.college || '').toLowerCase().trim();
    const matchedFacultyId = this.facultiesMap.get(facKey) || undefined;

    // Save student profile in directory
    this.saveStudentProfile({
      name: newStudent.name,
      phone: newStudent.phone,
      whatsapp: newStudent.whatsapp || newStudent.phone,
      email: newStudent.email && newStudent.email !== '-' ? newStudent.email : '',
      college: newStudent.college && newStudent.college !== '-' ? newStudent.college : '',
      faculty: newStudent.faculty && newStudent.faculty !== '-' ? newStudent.faculty : ''
    });

    const onCheckInSuccess = (createdSession: any, studentGuid?: string) => {
      const realSession: ActiveStudentSession = {
        id: createdSession.id,
        studentId: studentGuid || createdSession.studentId || undefined,
        name: newStudent.name,
        phone: newStudent.phone,
        whatsapp: newStudent.whatsapp || newStudent.phone,
        email: newStudent.email,
        faculty: newStudent.faculty,
        college: newStudent.college,
        date: newStudent.date || getTodayDateISO(),
        checkInTime: newStudent.checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: '0h 01m',
        cost: newStudent.sessionPrice || newStudent.cost || 30,
        billingType: newStudent.billingType || 'new-session',
        packageOrCoupon: newStudent.packageOrCoupon,
        printingCount: newStudent.printingCount,
        printingPrice: newStudent.printingPrice,
        walletAmount: newStudent.walletAmount,
        wifiCode: newStudent.wifiCode,
        roomId: newStudent.roomId,
        roomName: newStudent.roomName,
        addedBy: newStudent.addedBy || this.shiftService.activeStaffName(),
        status: 'active'
      };

      this.activeStudentsState.update(list => [realSession, ...list]);
      this.showToast(`تم تسجيل دخول الطالب "${realSession.name}" بنجاح!`, 'success');
    };

    const onCheckInError = (err: any) => {
      console.error('[WorkspaceService] Error during checkin:', err);
      this.showToast(`تعذر تسجيل الجلسة في السيرفر: ${err?.message || 'خطأ في الاتصال'}`, 'error');
    };

    const executeCheckIn = (studentGuid?: string) => {
      const zone = newStudent.zone ?? (newStudent.roomName?.toLowerCase().includes('silent') ? 1 : 0);
      const payload = {
        studentId: studentGuid || null,
        roomId: newStudent.roomId || null,
        zone,
        date: newStudent.date || new Date().toISOString(),
        timeFrom: newStudent.checkInTime ? parseSessionTimeToDate(newStudent.checkInTime, newStudent.date).toISOString() : new Date().toISOString(),
        timeTo: newStudent.expectedCheckout ? parseSessionTimeToDate(newStudent.expectedCheckout, newStudent.date).toISOString() : null,
        printing: newStudent.printingCount || 0,
        wallet: newStudent.walletAmount || 0,
        discount: newStudent.cost || 0,
        note: newStudent.name
      };

      if (!studentGuid && newStudent.roomId) {
        this.api.walkIn({
          studentName: newStudent.name,
          phoneNumber: newStudent.phone,
          whatsapp: newStudent.whatsapp || newStudent.phone,
          facultyId: matchedFacultyId,
          roomId: newStudent.roomId,
          notes: newStudent.name
        }).subscribe({
          next: (created) => onCheckInSuccess(created, created?.studentId || undefined),
          error: () => {
            this.api.checkIn(payload).subscribe({
              next: (created) => onCheckInSuccess(created, studentGuid),
              error: onCheckInError
            });
          }
        });
      } else {
        this.api.checkIn(payload).subscribe({
          next: (created) => onCheckInSuccess(created, studentGuid),
          error: onCheckInError
        });
      }
    };

    // If student already has GUID, directly check in
    if (newStudent.studentId && /^[0-9a-fA-F-]{36}$/.test(newStudent.studentId)) {
      executeCheckIn(newStudent.studentId);
      return;
    }

    // Check if phone or name matches existing student in studentMap
    const existing = Array.from(this.studentMap.values()).find(s =>
      (newStudent.phone && (s.phoneNumber === newStudent.phone || s.whatsapp === newStudent.phone)) ||
      (newStudent.name && s.name.toLowerCase() === newStudent.name.toLowerCase().trim())
    );

    if (existing?.id) {
      executeCheckIn(existing.id);
      return;
    }

    // Otherwise create student first on backend
    this.studentApi.createStudent({
      name: newStudent.name,
      phoneNumber: newStudent.phone,
      whatsapp: newStudent.whatsapp || newStudent.phone,
      roomId: newStudent.roomId || null,
      zone: newStudent.zone ?? (newStudent.roomName?.toLowerCase().includes('silent') ? 1 : 0),
      addedBy: newStudent.addedBy || this.shiftService.activeStaffName(),
      printingPrice: newStudent.printingPrice || 2.0,
      facultyId: matchedFacultyId
    }).subscribe({
      next: (createdStudent) => {
        if (createdStudent?.id) {
          this.studentMap.set(createdStudent.id, createdStudent);
          this.saveStudentProfile({ ...newStudent, id: createdStudent.id });
        }
        if (createdStudent?.status === 'active' || createdStudent?.roomId) {
          onCheckInSuccess(createdStudent, createdStudent?.id);
        } else {
          executeCheckIn(createdStudent?.id);
        }
      },
      error: () => {
        executeCheckIn(undefined);
      }
    });
  }

  /** Update session details (e.g. from Student Checkout edit modal) */
  updateSessionDetails(
    sessionId: string,
    updatedData: {
      name?: string;
      phone?: string;
      faculty?: string;
      checkInTime?: string;
      hourlyRate?: number;
      depositAmount?: number;
      printingPages?: number;
    }
  ): Observable<boolean> {
    const session = this.activeStudentsState().find(s => s.id === sessionId);
    if (session) {
      this.activeStudentsState.update(list =>
        list.map(s => s.id === sessionId ? { ...s, ...updatedData } : s)
      );
    }
    return this.api.updateSession(sessionId, updatedData as any).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  /** Check out a student session */
  checkOutStudent(
    studentId: string,
    checkoutOptions?: {
      paymentMethod?: string;
      totalCost?: number;
      amountReceived?: number;
      outstandingBalance?: number;
      walletAmount?: number;
      paymentStatus?: 'paid' | 'partially_paid' | 'pending';
      duration?: string;
      usePackageHours?: number;
      packageId?: string;
      discountId?: string;
      couponCode?: string;
      payWay?: number;
      packageHoursAlreadyDeducted?: boolean;
      cateringAmount?: number;
      printingAmount?: number;
    }
  ): void {
    const student = this.activeStudentsState().find(s => s.id === studentId);
    if (!student) return;

    const remaining = checkoutOptions?.outstandingBalance || 0;
    const isPartial = remaining > 0;
    const today = getTodayDateISO();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let finalDuration = checkoutOptions?.duration;
    if (!finalDuration || finalDuration === '0h 00m' || finalDuration === '0 س 00 د' || finalDuration === '0h 0m') {
      finalDuration = calculateSessionDuration(student.checkInTime, nowTime, student.date, today);
    }

    const updatedWallet = checkoutOptions?.walletAmount !== undefined
      ? checkoutOptions.walletAmount
      : (student.walletAmount || 0);

    const completedStudent: ActiveStudentSession = {
      ...student,
      date: student.date ? (isSameDayAsToday(student.date) ? student.date : today) : today,
      checkOutDate: today,
      status: 'completed',
      checkOutTime: nowTime,
      duration: finalDuration,
      cost: checkoutOptions?.totalCost !== undefined ? checkoutOptions.totalCost : student.cost,
      outstandingBalance: remaining,
      walletAmount: updatedWallet,
      paymentStatus: isPartial ? 'partially_paid' : 'paid'
    };

    // Update in-memory student profile with new wallet
    this.saveStudentProfile({
      id: student.studentId,
      name: student.name,
      phone: student.phone,
      whatsapp: student.whatsapp,
      email: student.email,
      college: student.college,
      faculty: student.faculty,
      walletAmount: updatedWallet
    });

    // Remove from active state and add to history
    this.activeStudentsState.update(list => list.filter(s => s.id !== studentId));
    this.historyStudentsState.update(list => [completedStudent, ...list]);
    this.removeSessionCateringCache(studentId);

    const receivedAmt = checkoutOptions?.amountReceived !== undefined ? checkoutOptions.amountReceived : (student.cost || 30);
    this.showToast(
      isPartial
        ? `تم إنهاء جلسة الطالب "${student.name}" كدفع جزئي (المتبقي: ${remaining} ج.م)`
        : `تم إنهاء جلسة الطالب "${student.name}" بنجاح!`,
      isPartial ? 'info' : 'success'
    );

    // =========================================================================
    // SEPARATE WORKSPACE SEATING, CATERING / DRINKS, AND PRINTING / SERVICES
    // =========================================================================
    const cateringAmount = Number(checkoutOptions?.cateringAmount ?? student.cateringTotal ?? 0);
    const printingAmount = Number(checkoutOptions?.printingAmount ?? ((student.printingCount || student.printingPages || 0) * (student.printingPrice || 1.5)));

    const effectiveCatering = Math.min(cateringAmount, receivedAmt);
    const effectivePrinting = Math.min(printingAmount, Math.max(0, +(receivedAmt - effectiveCatering).toFixed(2)));
    const workspaceOnlyAmt = Math.max(0, +(receivedAmt - effectiveCatering - effectivePrinting).toFixed(2));
    const payMethod = (checkoutOptions?.paymentMethod as any) || 'cash';

    // 1. Record Workspace Seating Session (ساعات وقعدة الورك سبيس)
    if (workspaceOnlyAmt > 0 || (effectiveCatering === 0 && effectivePrinting === 0)) {
      this.shiftService.recordTransaction({
        type: 'workspace',
        paymentMethod: payMethod,
        amount: workspaceOnlyAmt > 0 ? workspaceOnlyAmt : receivedAmt,
        details: `محاسبة جلسة طالب (ساعات وقعدة) - ${student.name}${isPartial ? ` (دفع جزئي: مستلم ${workspaceOnlyAmt} ج.م)` : ''}`
      });
    }

    // 2. Record Catering & Drinks separately (الكافيه والمشروبات)
    if (effectiveCatering > 0) {
      const itemsList = student.cateringItems && student.cateringItems.length > 0
        ? `: ${student.cateringItems.map((i: any) => `${i.name || 'طلب'} (x${i.quantity || 1})`).join(', ')}`
        : '';
      this.shiftService.recordTransaction({
        type: 'canteen',
        paymentMethod: payMethod,
        amount: effectiveCatering,
        details: `مشروبات وكافيه طالب - ${student.name}${itemsList}`
      });
    }

    // 3. Record Printing & Handouts separately (إيرادات تانية - برنت ورق وخدمات)
    if (effectivePrinting > 0) {
      this.shiftService.recordTransaction({
        type: 'other',
        paymentMethod: payMethod,
        amount: effectivePrinting,
        details: `خدمات طباعة وتصوير ورق - ${student.name}${student.printingCount ? ` (${student.printingCount} ورقة)` : ''}`
      });
    }

    // Call Backend Dedicated Student Checkout API (Section 4.1)
    const targetStudentGuid = student.studentId || (/^[0-9a-fA-F-]{36}$/.test(studentId) ? studentId : undefined);
    const durationMinutes = parseDurationMinutes(finalDuration);
    const durationHours = +(Math.max(0.1, durationMinutes / 60)).toFixed(2);
    const currentShift = this.shiftService.currentShift();
    const shiftId = currentShift?.id && /^[0-9a-fA-F-]{36}$/.test(currentShift.id) ? currentShift.id : undefined;

    if (targetStudentGuid) {
      this.studentApi.checkoutStudent(targetStudentGuid, {
        studentId: targetStudentGuid,
        checkOutTime: new Date().toISOString(),
        durationHours,
        totalCost: checkoutOptions?.totalCost !== undefined ? checkoutOptions.totalCost : (student.cost || 30),
        amountReceived: receivedAmt,
        walletAmount: updatedWallet,
        paymentMethod: checkoutOptions?.paymentMethod || 'cash',
        shiftId
      }).subscribe({
        error: (err) => console.warn('[WorkspaceService] Student Checkout API notice:', err?.message)
      });
    }

    // Call Backend Workspace Session Checkout API if session ID is GUID
    if (/^[0-9a-fA-F-]{36}$/.test(studentId)) {
      this.api.checkOut(studentId, {
        timeTo: new Date().toISOString(),
        paidAmount: receivedAmt,
        paymentMethod: checkoutOptions?.paymentMethod || (checkoutOptions?.payWay === 3 ? 'Wallet' : (checkoutOptions?.payWay === 2 ? 'Visa' : 'Cash')),
        payWay: this.mapPaymentMethodToPayWay(checkoutOptions?.paymentMethod),
        wallet: updatedWallet,
        usePackageHours: checkoutOptions?.usePackageHours,
        packageId: checkoutOptions?.packageId,
        discountId: checkoutOptions?.discountId,
        couponCode: checkoutOptions?.couponCode,
        totalCost: checkoutOptions?.totalCost || student.cost || 30
      }).subscribe({
        error: (err) => console.warn('[WorkspaceService] Checkout API notice:', err?.message)
      });
    }

    // Deduct student package hours if not already deducted by calling component
    if (!checkoutOptions?.packageHoursAlreadyDeducted) {
      const isPackage = checkoutOptions?.paymentMethod === 'package' ||
        student.billingType === 'package' ||
        !!checkoutOptions?.packageId ||
        !!checkoutOptions?.usePackageHours;

      if (isPackage) {
        const hoursToDeduct = checkoutOptions?.usePackageHours || Math.max(1, Math.round(durationHours));
        const targetId = checkoutOptions?.packageId || student.studentId || student.phone || student.id;
        this.packageService.deductStudentPackageHours(targetId, hoursToDeduct);
      }
    }
  }

  // ==========================================
  // DIGITAL WALLET INTEGRATION (Section 9)
  // ==========================================

  getStudentWalletBalance(studentId: string): Observable<any> {
    return this.walletApi.getBalance(studentId);
  }

  getStudentWalletTransactions(studentId: string): Observable<any[]> {
    return this.walletApi.getTransactions(studentId);
  }

  topUpStudentWallet(studentId: string, amount: number, paymentMethod: string = 'Cash', notes?: string): Observable<any> {
    return this.walletApi.topUpDirect({
      studentId,
      amount,
      note: notes || `Direct Top-up (${paymentMethod})`
    }).pipe(
      tap((tx) => {
        this.activeStudentsState.update(list =>
          list.map(s => s.studentId === studentId || s.id === studentId ? { ...s, walletAmount: (s.walletAmount || 0) + amount } : s)
        );
        this.shiftService.recordTransaction({
          type: 'workspace',
          paymentMethod: (paymentMethod.toLowerCase() as any) || 'cash',
          amount,
          details: `شحن محفظة الطالب - ${amount} ج.م`
        });
        this.showToast(`تم شحن المحفظة بمبلغ ${amount} ج.م بنجاح!`, 'success');
      })
    );
  }

  deductStudentWallet(studentId: string, amount: number, notes?: string): Observable<any> {
    return this.walletApi.deduct({
      studentId,
      amount,
      note: notes || 'Workspace Session Deduction'
    }).pipe(
      tap(() => {
        this.activeStudentsState.update(list =>
          list.map(s => s.studentId === studentId || s.id === studentId ? { ...s, walletAmount: (s.walletAmount || 0) - amount } : s)
        );
      })
    );
  }

  settleOutstandingBalance(studentPhoneOrId: string, amount: number): void {
    this.historyStudentsState.update(list =>
      list.map(s => {
        if (s.id === studentPhoneOrId || s.phone === studentPhoneOrId) {
          const currentBal = s.outstandingBalance || 0;
          const newBal = Math.max(0, currentBal - amount);
          return {
            ...s,
            outstandingBalance: newBal,
            paymentStatus: newBal === 0 ? ('paid' as const) : ('partially_paid' as const)
          };
        }
        return s;
      })
    );

    this.shiftService.recordTransaction({
      type: 'workspace',
      paymentMethod: 'cash',
      amount,
      details: `تحصيل مديونية سابقة للطالب (${studentPhoneOrId})`
    });

    this.showToast(`تم تحصيل ${amount} ج.م من المديونية السابقة بنجاح!`, 'success');
  }

  addCateringToStudent(studentId: string, amount: number, items?: any[]): void {
    const allProducts = this.cateringService.products();
    const normalizedItems = (items || []).map(item => {
      const prodId = item.productId || item.product?.id || item.id;
      const prod = allProducts.find(p => p.id === prodId);
      const unitPrice = Number((item.unitPrice ?? item.price ?? item.product?.piecePrice ?? item.product?.sellingPrice ?? prod?.sellingPrice) || 0);
      const quantity = Number(item.quantity || 1);
      const totalPrice = Number((item.totalPrice ?? item.total ?? (unitPrice * quantity)) || (prod?.sellingPrice ? prod.sellingPrice * quantity : 0));
      const name = item.name || item.product?.nameAr || item.product?.name || prod?.nameAr || prod?.name || 'صنف كاترنج';
      return {
        id: item.id || prodId || `${Date.now()}_${Math.random()}`,
        productId: prodId,
        name,
        nameAr: item.nameAr || item.product?.nameAr || prod?.nameAr,
        unitPrice,
        quantity,
        totalPrice,
        price: totalPrice,
        product: item.product || prod
      };
    });

    this.activeStudentsState.update(list =>
      list.map(s => {
        if (s.id === studentId) {
          const currentTotal = s.cateringTotal || 0;
          const newTotal = +(currentTotal + amount).toFixed(2);
          const currentItems = s.cateringItems || [];
          const combinedItems = [...currentItems, ...normalizedItems];
          this.setSessionCateringCache(studentId, newTotal, combinedItems);
          return {
            ...s,
            cateringTotal: newTotal,
            cateringItems: combinedItems
          };
        }
        return s;
      })
    );

    // Call backend API to add items if items provided
    if (normalizedItems.length > 0) {
      normalizedItems.forEach(item => {
        if (item.productId && /^[0-9a-fA-F-]{36}$/.test(studentId)) {
          this.api.addCateringItem(studentId, {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }).subscribe({
            next: () => {
              this.syncSessionCatering(studentId);
            },
            error: (err) => console.warn('[WorkspaceService] Add catering item notice:', err?.message)
          });
        }
      });
    }

    this.showToast(`تم إضافة كاترنج بقيمة ${amount} ج.م للطالب بنجاح!`, 'success');
  }

  /** Remove a single catering item from a student session */
  removeCateringFromStudent(studentId: string, itemId: string): void {
    const student = this.activeStudentsState().find(s => s.id === studentId);
    if (!student) return;

    const currentItems = student.cateringItems || [];
    const itemToRemove = currentItems.find(i => i.id === itemId || i.productId === itemId);
    const updatedItems = currentItems.filter(i => i.id !== itemId && i.productId !== itemId);
    const newTotal = +updatedItems.reduce((sum, it) => sum + (it.totalPrice || it.price || 0), 0).toFixed(2);

    this.setSessionCateringCache(studentId, newTotal, updatedItems);
    this.activeStudentsState.update(list =>
      list.map(s => s.id === studentId ? { ...s, cateringTotal: newTotal, cateringItems: updatedItems } : s)
    );

    if (/^[0-9a-fA-F-]{36}$/.test(studentId) && itemToRemove?.id && /^[0-9a-fA-F-]{36}$/.test(itemToRemove.id)) {
      this.api.removeCateringItem(studentId, itemToRemove.id).subscribe({
        error: (err) => console.warn('[WorkspaceService] Remove catering item notice:', err?.message)
      });
    }

    this.showToast('تم حذف الصنف من الحساب بنجاح', 'info');
  }

  updateStudent(idOrStudent: string | ActiveStudentSession, updates?: Partial<ActiveStudentSession>): void {
    let targetId: string;
    let patch: Partial<ActiveStudentSession>;

    if (typeof idOrStudent === 'object') {
      targetId = idOrStudent.id;
      patch = idOrStudent;
    } else {
      targetId = idOrStudent;
      patch = updates || {};
    }

    const currentStudent = this.activeStudentsState().find(s => s.id === targetId || s.studentId === targetId) ||
      this.historyStudentsState().find(s => s.id === targetId || s.studentId === targetId) ||
      this.backendStudentsState().find(s => s.id === targetId || s.phone === targetId);
    const merged = { ...currentStudent, ...patch };

    const resolvedName = patch.name || merged.name || '';
    const resolvedPhone = patch.phone || merged.phone || '';
    const resolvedWhatsapp = patch.whatsapp || merged.whatsapp || resolvedPhone;
    const resolvedEmail = patch.email !== undefined ? patch.email : (merged.email || '');
    const resolvedCollege = patch.college !== undefined ? patch.college : (merged.college || '');
    const resolvedFaculty = patch.faculty !== undefined ? patch.faculty : (merged.faculty || '');
    const resolvedStudentId = (patch as any).studentId || (merged as any).studentId || (/^[0-9a-fA-F-]{36}$/.test(targetId) && !this.activeStudentsState().some(s => s.id === targetId) ? targetId : (currentStudent as any)?.studentId || currentStudent?.id);

    // Update in-memory profile
    if (resolvedName || resolvedPhone) {
      this.saveStudentProfile({
        name: resolvedName,
        phone: resolvedPhone,
        whatsapp: resolvedWhatsapp,
        email: resolvedEmail,
        college: resolvedCollege,
        faculty: resolvedFaculty,
        id: resolvedStudentId
      });
    }

    this.activeStudentsState.update(list => list.map(s => (s.id === targetId || s.studentId === targetId ? { ...s, ...patch } : s)));
    this.historyStudentsState.update(list => list.map(s => (s.id === targetId || s.studentId === targetId ? { ...s, ...patch } : s)));

    // If student has backend GUID, update in backend
    const targetStudentGuid = resolvedStudentId;
    if (targetStudentGuid && /^[0-9a-fA-F-]{36}$/.test(targetStudentGuid)) {
      const facName = (resolvedFaculty || resolvedCollege).trim();
      const facKey = facName.toLowerCase();
      const matchedFacultyId = this.facultiesMap.get(facKey);

      const executeUpdate = (facultyId?: string) => {
        this.studentApi.updateStudent(targetStudentGuid, {
          name: resolvedName,
          phoneNumber: resolvedPhone,
          whatsapp: resolvedWhatsapp,
          email: resolvedEmail || undefined,
          college: resolvedCollege || undefined,
          university: resolvedCollege || undefined,
          facultyId: facultyId || undefined
        }).subscribe({
          next: (updated) => {
            if (updated?.id) {
              this.studentMap.set(updated.id, updated);
              this.saveStudentProfile({
                id: updated.id,
                name: updated.name || resolvedName,
                phone: updated.phoneNumber || resolvedPhone,
                whatsapp: updated.whatsapp || resolvedWhatsapp,
                email: resolvedEmail,
                college: resolvedCollege,
                faculty: updated.facultyName || resolvedFaculty
              });
            }
          },
          error: (err) => console.warn('[WorkspaceService] Update student backend notice:', err?.message)
        });
      };

      if (facName && !matchedFacultyId) {
        this.facultyApi.createFaculty({ name: facName }).subscribe({
          next: (createdFac) => {
            if (createdFac?.id) {
              this.facultiesMap.set(facKey, createdFac.id);
              executeUpdate(createdFac.id);
            } else {
              executeUpdate();
            }
          },
          error: () => executeUpdate()
        });
      } else {
        executeUpdate(matchedFacultyId);
      }
    }

    // If workspace session has GUID, update session
    if (targetId && /^[0-9a-fA-F-]{36}$/.test(targetId)) {
      this.api.updateSession(targetId, {
        note: patch.name || currentStudent?.name || null,
        wiFi: patch.wifiCode ? 1 : undefined,
        printing: patch.printingCount,
        wallet: patch.walletAmount
      }).subscribe({
        error: (err) => console.warn('[WorkspaceService] Update session notice:', err?.message)
      });
    }

    this.showToast('تم تحديث بيانات الطالب بنجاح!', 'success');
  }

  deleteStudent(id: string): void {
    const student = this.activeStudentsState().find(s => s.id === id) || this.historyStudentsState().find(s => s.id === id);

    this.activeStudentsState.update(list => list.filter(s => s.id !== id));
    this.historyStudentsState.update(list => list.filter(s => s.id !== id));
    this.removeSessionCateringCache(id);

    if (student) {
      this.showToast(`تم حذف جلسة الطالب "${student.name}" بنجاح!`, 'info');
    }

    if (/^[0-9a-fA-F-]{36}$/.test(id)) {
      this.api.deleteSession(id).subscribe({
        error: (err) => console.warn('[WorkspaceService] Delete session notice:', err?.message)
      });
    }
  }

  blockStudent(student: Student, reason?: string): void {
    // 1. Requirement 7: Forbid blocking if student is currently checked-in
    if (student.status === 'active' || this.activeStudentsState().some(s => s.id === student.id && s.status === 'active')) {
      this.showToast('لا يمكن حظر الطالب أثناء تواجده في مساحة العمل. يرجى إنهاء الجلسة (Check-out) وتسوية الحساب أولاً', 'error');
      return;
    }

    const targetStudentId = student.studentId || student.id;
    const targetPhone = student.phone ? student.phone.trim() : '';
    const targetName = student.name ? student.name.trim().toLowerCase() : '';

    // Prevent blacklisting an ALREADY blacklisted student
    const isAlreadyBlacklisted = this.blacklistState().some(r => {
      const matchId = !!(r.studentId && (r.studentId === student.id || r.studentId === student.studentId || r.id === student.id));
      const matchPhone = !!(targetPhone && r.phone && r.phone.trim() === targetPhone);
      const matchName = !!(targetName && r.name && r.name.trim().toLowerCase() === targetName);
      return matchId || matchPhone || matchName;
    });

    if (isAlreadyBlacklisted) {
      this.showToast(`الطالب "${student.name}" مضاف بالفعل في القائمة السوداء (Blacklist)!`, 'error');
      return;
    }

    const blockReason = reason || 'مخالفة قواعد وقوانين مساحة العمل';

    // 2. Requirement 8: Blocked students MUST NOT appear in active students; they belong in history
    this.activeStudentsState.update(list => list.filter(s => s.id !== student.id));

    this.historyStudentsState.update(list => {
      const exists = list.some(s => s.id === student.id);
      if (exists) {
        return list.map(s => s.id === student.id ? { ...s, status: 'blocked' as const } : s);
      }
      const blockedSession: ActiveStudentSession = {
        ...student,
        status: 'blocked',
        billingType: (student.billingType as any) || 'new-session',
        checkOutDate: student.checkOutDate || getTodayDateISO()
      };
      return [blockedSession, ...list];
    });

    // Call Blacklist API
    this.blacklistApi.addToBlacklist({
      name: student.name,
      studentId: /^[0-9a-fA-F-]{36}$/.test(targetStudentId) ? targetStudentId : undefined,
      reason: blockReason,
      blacklistedAt: new Date().toISOString()
    }).subscribe({
      next: (res) => {
        const record: BlacklistRecord = {
          id: res?.id || 'BLK-' + Date.now(),
          studentId: targetStudentId,
          name: student.name,
          phone: student.phone,
          email: student.email,
          faculty: student.faculty,
          college: student.college,
          reason: blockReason,
          blockedDate: getTodayDateISO()
        };
        this.blacklistState.update(list => [record, ...list.filter(r => r.studentId !== targetStudentId)]);
        this.showToast(`تم حظر الطالب "${student.name}" وإضافته للبلاك ليست!`, 'error');
      },
      error: () => {
        const record: BlacklistRecord = {
          id: 'BLK-' + Date.now(),
          studentId: targetStudentId,
          name: student.name,
          phone: student.phone,
          email: student.email,
          faculty: student.faculty,
          college: student.college,
          reason: blockReason,
          blockedDate: getTodayDateISO()
        };
        this.blacklistState.update(list => [record, ...list.filter(r => r.studentId !== targetStudentId)]);
        this.showToast(`تم حظر الطالب "${student.name}"!`, 'error');
      }
    });
  }

  unblockStudent(recordOrStudentId: string): void {
    const record = this.blacklistState().find(
      r => r.id === recordOrStudentId || r.studentId === recordOrStudentId
    );
    const targetStudentId = record?.studentId || recordOrStudentId;
    const blacklistId = record?.id || recordOrStudentId;

    this.blacklistState.update(list =>
      list.filter(r => r.id !== recordOrStudentId && r.studentId !== recordOrStudentId)
    );

    this.activeStudentsState.update(list =>
      list.map(s => (s.id === targetStudentId && s.status === 'blocked' ? { ...s, status: 'active' as const } : s))
    );

    this.historyStudentsState.update(list =>
      list.map(s => (s.id === targetStudentId && s.status === 'blocked' ? { ...s, status: 'completed' as const } : s))
    );

    if (blacklistId && /^[0-9a-fA-F-]{36}$/.test(blacklistId)) {
      this.blacklistApi.removeFromBlacklist(blacklistId).subscribe({
        error: (err) => console.warn('[WorkspaceService] Unblock notice:', err?.message)
      });
    }

    this.showToast(`تم إلغاء حظر الطالب "${record?.name || targetStudentId}" بنجاح!`, 'success');
  }

  /** Get single session by ID — checks in-memory signals first, falls back to live API */
  getSessionById(id: string): Observable<ActiveStudentSession | null> {
    const fromActive = this.activeStudentsState().find(s => s.id === id);
    if (fromActive) return of(fromActive);

    const fromHistory = this.historyStudentsState().find(s => s.id === id);
    if (fromHistory) return of(fromHistory);

    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
      return of(null);
    }

    return this.api.getSessionById(id).pipe(
      map(dto => {
        if (!dto) return null;
        return this.mapDtoToSession(dto);
      }),
      catchError(() => of(null))
    );
  }

  // --- Backend 1-to-1 Swappable Observable Methods ---
  getStudents(): Observable<ActiveStudentSession[]> {
    return of(this.activeStudentsState());
  }

  addStudent(dto: CreateStudentDto): Observable<ActiveStudentSession> {
    this.checkInStudent({
      name: dto.name,
      phone: dto.phone || dto.phoneNumber || '',
      email: dto.email,
      faculty: dto.faculty,
      college: dto.college,
      billingType: 'new-session',
      date: getTodayDateISO(),
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sessionPrice: dto.sessionPrice || 30,
      notes: dto.notes
    });
    return of(this.activeStudentsState()[0]);
  }

  checkIn(dto: SessionCheckInDto): Observable<ActiveStudentSession> {
    this.checkInStudent({
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      faculty: dto.faculty,
      college: dto.college,
      checkInTime: dto.checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: dto.date || getTodayDateISO(),
      billingType: dto.billingType || 'new-session',
      sessionPrice: dto.sessionPrice || 30
    });
    return of(this.activeStudentsState()[0]);
  }

  checkOut(dto: SessionCheckOutDto): Observable<boolean> {
    this.checkOutStudent(dto.studentId);
    return of(true);
  }

  private mapDtoToSession(dto: WorkspaceSessionDto | WorkspaceDetailDto | any): ActiveStudentSession {
    const timeStr = dto.timeFrom || dto.checkInTime;
    const isAct = dto.status === 1 || dto.status === 'Active' || dto.status === 'active' || (!dto.timeTo && dto.status !== 2 && dto.status !== 'Left');
    const student = dto.studentId ? this.studentMap.get(dto.studentId) : null;

    const profile = this.getStudentProfile(dto.studentId) ||
      (student?.phoneNumber ? this.getStudentProfile(student.phoneNumber) : null) ||
      (dto.studentPhoneNumber ? this.getStudentProfile(dto.studentPhoneNumber) : null) ||
      (dto.studentPhone ? this.getStudentProfile(dto.studentPhone) : null) ||
      (student?.name ? this.getStudentProfile(student.name) : null) ||
      (dto.studentName ? this.getStudentProfile(dto.studentName) : null) ||
      (dto.note ? this.getStudentProfile(dto.note) : null);

    const name = profile?.name || student?.name || dto.studentName || (dto.note && dto.note !== '-' ? dto.note : '') || 'طالب';
    const phone = profile?.phone || student?.phoneNumber || dto.studentPhoneNumber || student?.whatsapp || dto.studentPhone || '';
    const whatsapp = profile?.whatsapp || student?.whatsapp || phone || '';
    const email = profile?.email || dto.studentEmail || '';
    const faculty = profile?.faculty || student?.facultyName || dto.faculty || dto.college || '';
    const college = profile?.college || profile?.faculty || student?.facultyName || dto.college || faculty || '';

    const formattedTime = parseIsoOrTimeToDisplay(timeStr, dto.date);

    let calculatedDuration = '0h 00m';
    if (dto.timeFrom && dto.timeTo) {
      calculatedDuration = calculateSessionDuration(dto.timeFrom, dto.timeTo, dto.date, dto.date);
    } else if (dto.spentHours || dto.hours) {
      const hrs = Number(dto.spentHours || dto.hours);
      const mins = Math.round(hrs * 60);
      calculatedDuration = formatMinutesToDuration(mins);
    } else if (dto.duration && typeof dto.duration === 'string' && dto.duration !== '0h 00m' && dto.duration !== '0 س 00 د') {
      calculatedDuration = dto.duration;
    } else if (dto.totalCost && dto.totalCost > 0) {
      const estimatedMins = Math.round((dto.totalCost / 30) * 60);
      calculatedDuration = formatMinutesToDuration(Math.max(15, estimatedMins));
    } else if (timeStr && isAct) {
      calculatedDuration = calculateSessionDuration(timeStr, undefined, dto.date);
    } else {
      calculatedDuration = '1h 00m';
    }

    const sessionDate = dto.date
      ? (String(dto.date).includes('T') ? parseIsoToLocalDate(dto.date) : String(dto.date))
      : (timeStr ? (String(timeStr).includes('T') ? parseIsoToLocalDate(timeStr) : String(timeStr)) : getTodayDateISO());
    const checkoutTimeStr = dto.timeTo ? parseIsoOrTimeToDisplay(dto.timeTo, dto.date) : undefined;

    const localCatering = this.getSessionCateringCache(dto.id);
    const apiCatering = Number(dto.cateringTotal ?? (dto as any).catering ?? (dto as any).canteenTotal) || 0;
    const resolvedCatering = apiCatering > 0 ? apiCatering : (localCatering?.total && localCatering.total > 0 ? localCatering.total : 0);
    const resolvedItems = (dto.cateringItems && dto.cateringItems.length > 0)
      ? dto.cateringItems
      : (localCatering?.items && localCatering.items.length > 0 ? localCatering.items : []);

    return {
      id: dto.id,
      studentId: dto.studentId,
      name: name,
      phone: phone,
      whatsapp: whatsapp,
      email: email,
      faculty: faculty,
      college: college,
      date: sessionDate,
      checkInTime: formattedTime,
      checkOutTime: checkoutTimeStr,
      duration: calculatedDuration,
      cost: dto.totalCost ?? dto.sessionPrice ?? 0,
      billingType: (dto.billingType === 'Package' || dto.type === 2 ? 'package' : dto.billingType === 'Coupon' || dto.type === 3 ? 'coupon' : 'new-session'),
      status: isAct ? 'active' : 'completed',
      cateringTotal: resolvedCatering > 0 ? +Number(resolvedCatering).toFixed(2) : undefined,
      cateringItems: resolvedItems.length > 0 ? resolvedItems : undefined,
      printingCount: dto.printing || 0,
      walletAmount: dto.wallet || 0,
      roomId: dto.roomId || undefined,
      roomName: dto.roomName || (dto.zone === 1 ? 'Silent Room' : (dto.roomId ? 'Shared Room' : undefined)),
      addedBy: dto.addedBy || dto.createdBy || dto.userName || undefined,
      printingPrice: dto.printingPrice || undefined
    };
  }

  private mapPaymentMethodToPayWay(method?: string): number {
    switch ((method || '').toLowerCase()) {
      case 'vodafone':
      case 'vfcash':
        return 2;
      case 'fawry':
        return 3;
      case 'instapay':
        return 4;
      case 'cash':
      default:
        return 1;
    }
  }
}
