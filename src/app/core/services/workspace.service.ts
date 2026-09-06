import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, tap, catchError } from 'rxjs';
import {
  ActiveStudentSession,
  Student,
  CreateStudentDto,
  UpdateStudentDto,
  SessionCheckInDto,
  SessionCheckOutDto
} from '../models/student.model';
import { WorkspaceApiService } from './api/workspace-api.service';
import { StudentApiService } from './api/student-api.service';
import { WorkspaceSessionDto } from '../models/workspace-session.model';
import { FacultyApiService } from './api/faculty-api.service';
// [MOCK DATA DISABLED FOR LIVE API - Uncomment below for offline presentation/testing]
// import { MOCK_ACTIVE_STUDENT_SESSIONS } from '../../../testing/mocks/students.mock';
import { ShiftService } from './shift.service';
import { AuthService } from './auth.service';

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
}

const STORAGE_KEYS = {
  ACTIVE_STUDENTS: 'nook_active_students_v3',
  HISTORY_STUDENTS: 'nook_history_students_v3',
  BLACKLIST: 'nook_blacklist_v3',
  STUDENT_PROFILES: 'nook_student_profiles_registry_v1'
};

const getTodayDateISO = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isSameDayAsToday = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const str = String(dateStr).trim();
  if (!str) return false;

  const now = new Date();
  const todayISO = getTodayDateISO();

  if (str === todayISO || str.startsWith(todayISO)) return true;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10) === todayISO;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return (
      parsed.getFullYear() === now.getFullYear() &&
      parsed.getMonth() === now.getMonth() &&
      parsed.getDate() === now.getDate()
    );
  }

  return false;
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

export function parseSessionTimeToDate(timeStr?: string, dateStr?: string): Date {
  const now = new Date();
  if (!timeStr) return now;

  if (timeStr.includes('T')) {
    const parsed = new Date(timeStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  if (dateStr) {
    if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
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

// Clean default states for fresh service instances - Live API only (Mock commented out for presentation)
// export const DEFAULT_ACTIVE_STUDENTS: ActiveStudentSession[] = MOCK_ACTIVE_STUDENT_SESSIONS;
export const DEFAULT_ACTIVE_STUDENTS: ActiveStudentSession[] = [];
const DEFAULT_HISTORY_STUDENTS: ActiveStudentSession[] = [];
const DEFAULT_BLACKLIST: BlacklistRecord[] = [];

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private api = inject(WorkspaceApiService);
  private studentApi = inject(StudentApiService);
  private shiftService = inject(ShiftService);
  private authService = inject(AuthService);

  private activeStudentsState = signal<ActiveStudentSession[]>(
    this.getStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, DEFAULT_ACTIVE_STUDENTS)
  );

  private historyStudentsState = signal<ActiveStudentSession[]>(
    this.getStoredItem(STORAGE_KEYS.HISTORY_STUDENTS, DEFAULT_HISTORY_STUDENTS)
  );

  private blacklistState = signal<BlacklistRecord[]>(
    this.getStoredItem(STORAGE_KEYS.BLACKLIST, DEFAULT_BLACKLIST)
  );

  private backendStudentsState = signal<StudentProfileRecord[]>([]);

  readonly activeStudents = this.activeStudentsState.asReadonly();
  readonly historyStudents = this.historyStudentsState.asReadonly();
  readonly blacklist = this.blacklistState.asReadonly();
  readonly backendStudents = this.backendStudentsState.asReadonly();

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

  // 3. Today's Check-ins: Cumulative count of all students who checked in today (active now + checked out today)
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

  private facultyApi = inject(FacultyApiService);
  private studentMap = new Map<string, any>();
  private facultiesMap = new Map<string, string>(); // name -> id

  // Toasts
  readonly toast = signal<ToastNotification | null>(null);

  constructor() {
    // Sanitize any existing cached history to fix corrupted '0h 00m' or multi-day blowouts in localStorage
    const currentHistory = this.historyStudentsState();
    const sanitizedHistory = this.sanitizeStoredHistory(currentHistory);
    if (sanitizedHistory !== currentHistory) {
      this.historyStudentsState.set(sanitizedHistory);
    }

    // Sanitize active students to avoid stale ghost sessions from earlier days
    const currentActive = this.activeStudentsState();
    const sanitizedActive = this.sanitizeActiveStudents(currentActive);
    if (sanitizedActive !== currentActive) {
      this.activeStudentsState.set(sanitizedActive);
    }

    if (this.authService.isAuthenticated()) {
      this.loadFromBackend();
    }
  }

  /** Save/Update student full profile in the persistent registry */
  public saveStudentProfile(profile: { name: string; phone: string; whatsapp?: string; email?: string; college?: string; faculty?: string }): void {
    if (!profile.name && !profile.phone) return;
    const cleanPhone = (profile.phone || '').trim();
    const cleanName = (profile.name || '').trim().toLowerCase();
    const cleanEmail = profile.email && profile.email !== '-' ? profile.email.trim() : '';
    const cleanWhatsapp = profile.whatsapp && profile.whatsapp !== '-' ? profile.whatsapp.trim() : cleanPhone;
    const cleanCollege = profile.college && profile.college !== '-' ? profile.college.trim() : '';
    const cleanFaculty = profile.faculty && profile.faculty !== '-' ? profile.faculty.trim() : '';

    const registry = this.getStoredItem<Record<string, StudentProfileRecord>>(STORAGE_KEYS.STUDENT_PROFILES, {});
    const key = cleanPhone || cleanName;
    const existing = registry[key] || registry[cleanName] || {};

    const merged: StudentProfileRecord = {
      name: profile.name.trim() || existing.name || '',
      phone: cleanPhone || existing.phone || '',
      whatsapp: cleanWhatsapp || existing.whatsapp || cleanPhone,
      email: cleanEmail || existing.email || '',
      college: cleanCollege || existing.college || '',
      faculty: cleanFaculty || existing.faculty || ''
    };

    if (cleanPhone) registry[cleanPhone] = merged;
    if (cleanName) registry[cleanName] = merged;
    this.setStoredItem(STORAGE_KEYS.STUDENT_PROFILES, registry);
  }

  /** Retrieve full student profile from registry or backend map */
  public getStudentProfile(phoneOrNameOrId?: string): StudentProfileRecord | null {
    if (!phoneOrNameOrId) return null;
    const key = String(phoneOrNameOrId).trim();
    const registry = this.getStoredItem<Record<string, StudentProfileRecord>>(STORAGE_KEYS.STUDENT_PROFILES, {});
    if (registry[key]) return registry[key];
    if (registry[key.toLowerCase()]) return registry[key.toLowerCase()];

    // Check backend student map
    const backendStudent = this.studentMap.get(key);
    if (backendStudent) {
      const phone = backendStudent.phoneNumber || backendStudent.whatsapp || '';
      return {
        id: backendStudent.id,
        name: backendStudent.name || '',
        phone: phone,
        whatsapp: backendStudent.whatsapp || phone,
        email: '',
        college: backendStudent.facultyName || '',
        faculty: backendStudent.facultyName || ''
      };
    }
    return null;
  }

  /** Retrieve all unique registered student profiles for autocomplete and directory */
  public getAllStudentProfiles(): StudentProfileRecord[] {
    const registry = this.getStoredItem<Record<string, StudentProfileRecord>>(STORAGE_KEYS.STUDENT_PROFILES, {});
    const uniqueMap = new Map<string, StudentProfileRecord>();

    // 1. From local persistent registry
    Object.values(registry).forEach((p: StudentProfileRecord) => {
      const k = (p.phone || p.name || p.id || '').trim().toLowerCase();
      if (k && !uniqueMap.has(k)) uniqueMap.set(k, p);
    });

    // 2. From backend students state
    this.backendStudentsState().forEach((p: StudentProfileRecord) => {
      const k = (p.phone || p.name || p.id || '').trim().toLowerCase();
      if (k) {
        const existing = uniqueMap.get(k);
        uniqueMap.set(k, {
          id: p.id || existing?.id,
          name: p.name || existing?.name || '',
          phone: p.phone || existing?.phone || '',
          whatsapp: p.whatsapp || existing?.whatsapp || p.phone || '',
          email: p.email || existing?.email || '',
          college: p.college || existing?.college || '',
          faculty: p.faculty || existing?.faculty || ''
        });
      }
    });

    return Array.from(uniqueMap.values());
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

    this.saveStudentProfile(cleanProfile);
    this.backendStudentsState.update(list => [cleanProfile, ...list.filter(s => s.phone !== cleanProfile.phone && s.name.toLowerCase() !== cleanProfile.name.toLowerCase())]);

    const facKey = (cleanProfile.faculty || cleanProfile.college || '').toLowerCase().trim();
    const matchedFacultyId = this.facultiesMap.get(facKey) || undefined;

    this.studentApi.createStudent({
      name: cleanProfile.name,
      phoneNumber: cleanProfile.phone,
      whatsapp: cleanProfile.whatsapp || cleanProfile.phone,
      facultyId: matchedFacultyId
    }).subscribe({
      next: (created) => {
        if (created?.id) {
          const withId = { ...cleanProfile, id: created.id };
          this.saveStudentProfile(withId);
          this.backendStudentsState.update(list => list.map(s => s.phone === cleanProfile.phone ? withId : s));
        }
      },
      error: () => {}
    });

    this.showToast(`تم تسجيل الطالب "${cleanProfile.name}" في النظام بنجاح!`, 'success');
  }

  /** Delete a student from local persistent registry */
  public deleteStudentProfile(phoneOrIdOrName: string): void {
    const registry = this.getStoredItem<Record<string, StudentProfileRecord>>(STORAGE_KEYS.STUDENT_PROFILES, {});
    const clean = phoneOrIdOrName.trim();
    delete registry[clean];
    delete registry[clean.toLowerCase()];
    for (const k of Object.keys(registry)) {
      const p = registry[k];
      if (p.id === clean || p.phone === clean || p.name.toLowerCase() === clean.toLowerCase()) {
        delete registry[k];
      }
    }
    this.setStoredItem(STORAGE_KEYS.STUDENT_PROFILES, registry);
    this.backendStudentsState.update(list => list.filter(s => s.id !== clean && s.phone !== clean && s.name.toLowerCase() !== clean.toLowerCase()));
    this.showToast(`تم حذف بيانات الطالب من الدليل بنجاح!`, 'info');
  }

  /** Sanitize active students to ensure durations are reasonable */
  private sanitizeActiveStudents(active: ActiveStudentSession[]): ActiveStudentSession[] {
    if (!active || active.length === 0) return active;
    let modified = false;
    const sanitized = active.map(s => {
      const mins = parseDurationMinutes(s.duration);
      if (!s.duration || mins === 0 || mins > 18 * 60) {
        modified = true;
        const computedDur = calculateSessionDuration(s.checkInTime, undefined, s.date);
        return {
          ...s,
          duration: computedDur
        };
      }
      return s;
    });

    if (modified) {
      this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, sanitized);
    }
    return sanitized;
  }

  /** Sanitize cached history records to ensure duration is calculated from checkIn/checkOut or cost */
  private sanitizeStoredHistory(history: ActiveStudentSession[]): ActiveStudentSession[] {
    if (!history || history.length === 0) return history;
    let modified = false;
    const sanitized = history.map(s => {
      const rawDur = s.duration?.trim();
      const mins = parseDurationMinutes(rawDur);
      const isAnomalous = !rawDur || mins === 0 || mins > 18 * 60 || rawDur === '0h 00m' || rawDur === '0 س 00 د' || rawDur === '0h 0m' || rawDur === '0m';
      if (isAnomalous) {
        modified = true;
        let computedDur = '1h 00m';
        if (s.checkInTime && s.checkOutTime) {
          computedDur = calculateSessionDuration(s.checkInTime, s.checkOutTime, s.date, s.checkOutDate || s.date);
          const compMins = parseDurationMinutes(computedDur);
          if (compMins > 18 * 60) {
            computedDur = calculateSessionDuration(s.checkInTime, s.checkOutTime, s.date, s.date);
          }
        } else if (s.cost && s.cost > 0) {
          const costMins = Math.max(15, Math.round((s.cost / 30) * 60));
          computedDur = formatMinutesToDuration(costMins);
        }
        return {
          ...s,
          duration: computedDur
        };
      }
      return s;
    });

    if (modified) {
      this.setStoredItem(STORAGE_KEYS.HISTORY_STUDENTS, sanitized);
    }
    return sanitized;
  }

  /** Load live sessions from API and sync signals */
  public loadFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;

    // 1. Sync Faculties for ID mapping
    this.facultyApi.getFaculties().pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (faculties) => {
        (faculties || []).forEach((f: any) => {
          if (f.name) this.facultiesMap.set(f.name.toLowerCase().trim(), f.id);
          if (f.nameEn) this.facultiesMap.set(f.nameEn.toLowerCase().trim(), f.id);
        });
      }
    });

    // 2. Sync Students
    this.studentApi.getStudents().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[WorkspaceService] Students API requires elevated role (403 Forbidden). Using cached student data.');
        }
        return of([]);
      })
    ).subscribe({
      next: (students) => {
        const profileList: StudentProfileRecord[] = [];
        (students || []).forEach(s => {
          this.studentMap.set(s.id, s);
          const p: StudentProfileRecord = {
            id: s.id,
            name: s.name,
            phone: s.phoneNumber || s.whatsapp || '',
            whatsapp: s.whatsapp || s.phoneNumber || '',
            college: s.facultyName || '',
            faculty: s.facultyName || ''
          };
          profileList.push(p);
          this.saveStudentProfile(p);
        });
        if (profileList.length > 0) {
          this.backendStudentsState.set(profileList);
        }
        this.fetchSessions();
      }
    });
  }

  private fetchSessions(): void {
    this.api.getSessions().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[WorkspaceService] Sessions API requires elevated role (403 Forbidden). Retaining cached sessions.');
        } else {
          console.warn('[WorkspaceService] Could not sync sessions from API, using cached data.');
        }
        return of(null);
      })
    ).subscribe({
      next: (sessions) => {
        if (sessions === null) {
          // Keep cached sessions on error
          return;
        }
        if (sessions && sessions.length > 0) {
          const mapped: ActiveStudentSession[] = sessions.map(dto => this.mapDtoToSession(dto));
          const active = this.sanitizeActiveStudents(mapped.filter(s => s.status === 'active'));
          const history = this.sanitizeStoredHistory(mapped.filter(s => s.status === 'completed'));

          // Merge local un-synced active sessions (e.g. client generated IDs starting with 'STU-')
          const existingActive = this.activeStudentsState();
          const localOnlyActive = existingActive.filter(local =>
            local.id.startsWith('STU-') && !active.some(a => a.name === local.name || (local.phone && a.phone === local.phone))
          );
          const mergedActive = [...active, ...localOnlyActive];

          this.activeStudentsState.set(mergedActive);
          this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, mergedActive);
          if (history.length > 0) {
            this.historyStudentsState.set(history);
            this.setStoredItem(STORAGE_KEYS.HISTORY_STUDENTS, history);
          }
        } else if (sessions && sessions.length === 0) {
          const existingActive = this.activeStudentsState();
          const localOnlyActive = existingActive.filter(local => local.id.startsWith('STU-'));
          if (localOnlyActive.length > 0) {
            this.activeStudentsState.set(localOnlyActive);
            this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, localOnlyActive);
          } else {
            this.activeStudentsState.set([]);
            this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, []);
          }
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

  checkInStudent(newStudent: Omit<ActiveStudentSession, 'id' | 'duration' | 'status'>): void {
    const student: ActiveStudentSession = {
      ...newStudent,
      id: 'STU-' + Math.floor(100 + Math.random() * 900),
      date: newStudent.date || getTodayDateISO(),
      duration: '0h 01m',
      status: 'active'
    };

    // Save full student profile in local registry immediately
    this.saveStudentProfile({
      name: newStudent.name,
      phone: newStudent.phone,
      whatsapp: newStudent.whatsapp || newStudent.phone,
      email: newStudent.email && newStudent.email !== '-' ? newStudent.email : '',
      college: newStudent.college && newStudent.college !== '-' ? newStudent.college : '',
      faculty: newStudent.faculty && newStudent.faculty !== '-' ? newStudent.faculty : ''
    });

    // Optimistic UI update
    this.activeStudentsState.update(list => {
      const updated = [student, ...list];
      this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, updated);
      return updated;
    });

    this.showToast(`تم تسجيل دخول الطالب "${student.name}" بنجاح!`, 'success');

    // Resolve matching facultyId from map if available
    const facKey = (newStudent.faculty || newStudent.college || '').toLowerCase().trim();
    const matchedFacultyId = this.facultiesMap.get(facKey) || undefined;

    // Call Backend API: Create student first if needed, then check in
    this.studentApi.createStudent({
      name: newStudent.name,
      phoneNumber: newStudent.phone,
      whatsapp: newStudent.whatsapp || newStudent.phone,
      facultyId: matchedFacultyId
    }).subscribe({
      next: (created) => {
        const studentId = created?.id || undefined;
        this.api.checkIn({
          studentId: studentId,
          date: new Date().toISOString(),
          timeFrom: new Date().toISOString(),
          printing: newStudent.printingCount || 0,
          wallet: newStudent.walletAmount || 0,
          discount: newStudent.cost || 0,
          note: newStudent.name
        }).subscribe({
          next: (res) => {
            if (res && res.id) {
              this.activeStudentsState.update(list =>
                list.map(s => s.id === student.id ? { ...s, id: res.id, studentId: studentId || s.id } : s)
              );
            }
          },
          error: (err) => console.warn('[WorkspaceService] Checkin API sync notice:', err?.message)
        });
      },
      error: () => {
        this.api.checkIn({
          date: new Date().toISOString(),
          timeFrom: new Date().toISOString(),
          printing: newStudent.printingCount || 0,
          wallet: newStudent.walletAmount || 0,
          note: newStudent.name
        }).subscribe({
          next: (res) => {
            if (res && res.id) {
              this.activeStudentsState.update(list =>
                list.map(s => s.id === student.id ? { ...s, id: res.id } : s)
              );
            }
          },
          error: (err) => console.warn('[WorkspaceService] Direct checkin notice:', err?.message)
        });
      }
    });
  }

  checkOutStudent(
    studentId: string,
    checkoutOptions?: {
      paymentMethod?: string;
      totalCost?: number;
      amountReceived?: number;
      outstandingBalance?: number;
      paymentStatus?: 'paid' | 'partially_paid' | 'pending';
      duration?: string;
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

    const completedStudent: ActiveStudentSession = {
      ...student,
      date: student.date ? (isSameDayAsToday(student.date) ? student.date : today) : today,
      checkOutDate: today,
      status: 'completed',
      checkOutTime: nowTime,
      duration: finalDuration,
      cost: checkoutOptions?.totalCost !== undefined ? checkoutOptions.totalCost : student.cost,
      outstandingBalance: remaining,
      paymentStatus: isPartial ? 'partially_paid' : 'paid'
    };

    // Remove from active
    this.activeStudentsState.update(list => {
      const updated = list.filter(s => s.id !== studentId);
      this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, updated);
      return updated;
    });

    // Add to history
    this.historyStudentsState.update(list => {
      const updated = [completedStudent, ...list];
      this.setStoredItem(STORAGE_KEYS.HISTORY_STUDENTS, updated);
      return updated;
    });

    const receivedAmt = checkoutOptions?.amountReceived !== undefined ? checkoutOptions.amountReceived : (student.cost || 30);
    this.showToast(
      isPartial
        ? `تم إنهاء جلسة الطالب "${student.name}" كدفع جزئي (المتبقي: ${remaining} ج.م)`
        : `تم إنهاء جلسة الطالب "${student.name}" بنجاح!`,
      isPartial ? 'info' : 'success'
    );

    // Record shift transaction
    this.shiftService.recordTransaction({
      type: 'workspace',
      paymentMethod: (checkoutOptions?.paymentMethod as any) || 'cash',
      amount: receivedAmt,
      details: `محاسبة جلسة طالب - ${student.name}${isPartial ? ` (دفع جزئي: مستلم ${receivedAmt} ج.م، متبقي ${remaining} ج.م)` : ''}`
    });

    // Call Backend API
    this.api.checkOut(studentId, {
      timeTo: new Date().toISOString(),
      paidAmount: receivedAmt,
      payWay: 1,
      paymentMethod: checkoutOptions?.paymentMethod || 'Cash',
      totalCost: checkoutOptions?.totalCost || student.cost || 30
    }).subscribe({
      error: (err) => console.warn('[WorkspaceService] Checkout API sync notice:', err?.message)
    });
  }

  settleOutstandingBalance(studentPhoneOrId: string, amount: number): void {
    this.historyStudentsState.update(list => {
      const updated = list.map(s => {
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
      });
      this.setStoredItem(STORAGE_KEYS.HISTORY_STUDENTS, updated);
      return updated;
    });

    this.shiftService.recordTransaction({
      type: 'workspace',
      paymentMethod: 'cash',
      amount,
      details: `تحصيل مديونية سابقة للطالب (${studentPhoneOrId})`
    });

    this.showToast(`تم تحصيل ${amount} ج.م من المديونية السابقة بنجاح!`, 'success');
  }

  addCateringToStudent(studentId: string, amount: number, items?: any[]): void {
    this.activeStudentsState.update(list => {
      const updated = list.map(s => {
        if (s.id === studentId) {
          const currentTotal = s.cateringTotal || 0;
          const newTotal = +(currentTotal + amount).toFixed(2);
          const currentItems = s.cateringItems || [];
          return {
            ...s,
            cateringTotal: newTotal,
            cateringItems: [...currentItems, ...(items || [])]
          };
        }
        return s;
      });
      this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, updated);
      return updated;
    });
    this.showToast(`تم إضافة كاترنج بقيمة ${amount} ج.م للطالب بنجاح!`, 'success');
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

    const currentStudent = this.activeStudentsState().find(s => s.id === targetId) || this.historyStudentsState().find(s => s.id === targetId);
    const merged = { ...currentStudent, ...patch };

    // Persist full profile
    if (merged.name || merged.phone) {
      this.saveStudentProfile({
        name: merged.name || '',
        phone: merged.phone || '',
        whatsapp: merged.whatsapp || merged.phone || '',
        email: merged.email || '',
        college: merged.college || '',
        faculty: merged.faculty || ''
      });
    }

    this.activeStudentsState.update(list => {
      const updated = list.map(s => (s.id === targetId ? { ...s, ...patch } : s));
      this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, updated);
      return updated;
    });

    this.historyStudentsState.update(list => {
      const updated = list.map(s => (s.id === targetId ? { ...s, ...patch } : s));
      this.setStoredItem(STORAGE_KEYS.HISTORY_STUDENTS, updated);
      return updated;
    });

    // If student has backend GUID or studentId, call backend updateStudent
    const targetStudentGuid = (patch as any).studentId || currentStudent?.studentId;
    if (targetStudentGuid && /^[0-9a-fA-F-]{36}$/.test(targetStudentGuid)) {
      const facKey = (patch.faculty || patch.college || currentStudent?.faculty || '').toLowerCase().trim();
      const matchedFacultyId = this.facultiesMap.get(facKey);
      this.studentApi.updateStudent(targetStudentGuid, {
        name: patch.name || currentStudent?.name || '',
        phoneNumber: patch.phone || currentStudent?.phone || '',
        whatsapp: patch.whatsapp || patch.phone || currentStudent?.whatsapp || currentStudent?.phone || '',
        facultyId: matchedFacultyId
      }).subscribe({
        error: (err) => console.warn('[WorkspaceService] Update student backend notice:', err?.message)
      });
    }

    this.showToast('تم تحديث بيانات الطالب بنجاح!', 'success');
  }

  deleteStudent(id: string): void {
    const student = this.activeStudentsState().find(s => s.id === id);
    this.activeStudentsState.update(list => {
      const updated = list.filter(s => s.id !== id);
      this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, updated);
      return updated;
    });

    this.historyStudentsState.update(list => {
      const updated = list.filter(s => s.id !== id);
      this.setStoredItem(STORAGE_KEYS.HISTORY_STUDENTS, updated);
      return updated;
    });

    if (student) {
      this.showToast(`تم حذف الطالب "${student.name}" بنجاح!`, 'info');
    }

    this.api.deleteSession(id).subscribe({
      error: () => { }
    });
  }

  blockStudent(student: Student, reason?: string): void {
    const newRecord: BlacklistRecord = {
      id: 'BLK-' + Math.floor(100 + Math.random() * 900),
      studentId: student.id,
      name: student.name,
      phone: student.phone,
      email: student.email,
      faculty: student.faculty,
      college: student.college,
      reason: reason || 'مخالفة قواعد وقوانين مساحة العمل',
      blockedDate: getTodayDateISO()
    };

    // Update status to 'blocked'
    this.activeStudentsState.update(list => {
      const next = list.map(s => (s.id === student.id ? { ...s, status: 'blocked' as const } : s));
      this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, next);
      return next;
    });

    this.historyStudentsState.update(list => {
      const next = list.map(s => (s.id === student.id ? { ...s, status: 'blocked' as const } : s));
      this.setStoredItem(STORAGE_KEYS.HISTORY_STUDENTS, next);
      return next;
    });

    // Add to blacklist
    this.blacklistState.update(list => {
      const next = [newRecord, ...list.filter(r => r.studentId !== student.id)];
      this.setStoredItem(STORAGE_KEYS.BLACKLIST, next);
      return next;
    });

    this.showToast(`تم حظر الطالب "${student.name}" وإضافته للبلاك ليست!`, 'error');
  }

  unblockStudent(recordOrStudentId: string): void {
    const record = this.blacklistState().find(
      r => r.id === recordOrStudentId || r.studentId === recordOrStudentId
    );
    const targetStudentId = record?.studentId || recordOrStudentId;

    // Remove from blacklist
    this.blacklistState.update(list => {
      const next = list.filter(r => r.id !== recordOrStudentId && r.studentId !== recordOrStudentId);
      this.setStoredItem(STORAGE_KEYS.BLACKLIST, next);
      return next;
    });

    // Restore status to 'active' or 'completed'
    this.activeStudentsState.update(list => {
      const next = list.map(s => (s.id === targetStudentId && s.status === 'blocked' ? { ...s, status: 'active' as const } : s));
      this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, next);
      return next;
    });

    this.historyStudentsState.update(list => {
      const next = list.map(s => (s.id === targetStudentId && s.status === 'blocked' ? { ...s, status: 'completed' as const } : s));
      this.setStoredItem(STORAGE_KEYS.HISTORY_STUDENTS, next);
      return next;
    });

    this.showToast(`تم إلغاء حظر الطالب "${record?.name || targetStudentId}" بنجاح!`, 'success');
  }

  // --- Backend 1-to-1 Swappable API Methods ---
  getStudents(): Observable<ActiveStudentSession[]> {
    return of(this.activeStudentsState());
  }

  addStudent(dto: CreateStudentDto): Observable<ActiveStudentSession> {
    const student: ActiveStudentSession = {
      id: 'STU-' + Math.floor(100 + Math.random() * 900),
      name: dto.name,
      phone: dto.phone || dto.phoneNumber || '',
      email: dto.email,
      faculty: dto.faculty,
      college: dto.college,
      date: getTodayDateISO(),
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: '0h 01m',
      cost: dto.sessionPrice || 30,
      billingType: 'new-session',
      status: 'active',
      notes: dto.notes
    };
    this.activeStudentsState.update(list => {
      const updated = [student, ...list];
      this.setStoredItem(STORAGE_KEYS.ACTIVE_STUDENTS, updated);
      return updated;
    });
    this.showToast(`تم إضافة الطالب "${student.name}" بنجاح!`, 'success');
    return of(student);
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

  private mapDtoToSession(dto: WorkspaceSessionDto | any): ActiveStudentSession {
    const timeStr = dto.timeFrom || dto.checkInTime;
    const isAct = dto.status === 1 || dto.status === 'Active' || dto.status === 'active' || (!dto.timeTo && dto.status !== 2 && dto.status !== 'Left');
    const student = dto.studentId ? this.studentMap.get(dto.studentId) : null;
    
    // Check local profile registry for full details (phone, email, whatsapp, college, faculty)
    const profile = this.getStudentProfile(dto.studentId) ||
                    this.getStudentProfile(student?.phoneNumber) ||
                    this.getStudentProfile(dto.studentPhone) ||
                    this.getStudentProfile(student?.name) ||
                    this.getStudentProfile(dto.studentName) ||
                    this.getStudentProfile(dto.note);

    const name = profile?.name || student?.name || (dto.note && dto.note !== '-' ? dto.note : '') || (dto.studentName && dto.studentName !== '-' ? dto.studentName : '') || 'طالب';
    const phone = profile?.phone || student?.phoneNumber || student?.whatsapp || (dto.studentPhone && dto.studentPhone !== '-' ? dto.studentPhone : '') || '';
    const whatsapp = profile?.whatsapp || student?.whatsapp || phone || '';
    const email = profile?.email || student?.email || (dto.studentEmail && dto.studentEmail !== '-' ? dto.studentEmail : '') || '';
    const faculty = profile?.faculty || student?.facultyName || (dto.faculty && dto.faculty !== '-' ? dto.faculty : '') || (dto.college && dto.college !== '-' ? dto.college : '') || '';
    const college = profile?.college || profile?.faculty || student?.facultyName || (dto.college && dto.college !== '-' ? dto.college : '') || faculty || '';

    let formattedTime = '';
    if (timeStr) {
      if (timeStr.includes('T')) {
        const timePart = timeStr.split('T')[1];
        formattedTime = timePart.substring(0, 5);
      } else {
        formattedTime = timeStr;
      }
    }

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

    const sessionDate = dto.date ? String(dto.date).split('T')[0] : (timeStr ? String(timeStr).split('T')[0] : getTodayDateISO());
    const checkoutTimeStr = dto.timeTo ? (dto.timeTo.includes('T') ? dto.timeTo.split('T')[1].substring(0, 5) : dto.timeTo) : undefined;

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
      status: isAct ? 'active' : 'completed'
    };
  }

  // LocalStorage state helpers
  private getStoredItem<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed)) {
            return parsed.length > 0 ? (parsed as T) : fallback;
          }
          return parsed;
        }
      }
    } catch { }
    return fallback;
  }

  private setStoredItem(key: string, value: any): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch { }
  }
}
