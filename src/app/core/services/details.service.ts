import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, map, catchError, finalize, tap, throwError } from 'rxjs';
import {
  College,
  CreateCollegeDto,
  UpdateCollegeDto,
  Instructor,
  CreateInstructorDto,
  UpdateInstructorDto,
  BlacklistRecord,
  CreateBlacklistDto,
  DiscountCode,
  CreateDiscountDto,
  UpdateDiscountDto
} from '../models/details.model';
import { FacultyApiService } from './api/faculty-api.service';
import { InstructorApiService } from './api/instructor-api.service';
import { BlacklistApiService } from './api/blacklist-api.service';
import { DiscountApiService } from './api/discount-api.service';
import { WorkspaceService } from './workspace.service';
import { parseIsoToLocalDate, getTodayDateISO } from '../utils/date-time.util';

/**
 * Feature Service for Details Module (Layer 4 - Clean Architecture).
 * Single Source of Truth for:
 * - Colleges & Universities
 * - Instructors Directory
 * - Blacklist & Banned Members
 * - Discounts & Coupons
 *
 * Strictly communicates with backend API and contains NO local storage database or fake IDs.
 */
@Injectable({
  providedIn: 'root'
})
export class DetailsService {
  private facultyApi = inject(FacultyApiService);
  private instructorApi = inject(InstructorApiService);
  private blacklistApi = inject(BlacklistApiService);
  private discountApi = inject(DiscountApiService);
  private workspaceService = inject(WorkspaceService);

  // Reactive State Signals (Layer 4)
  readonly colleges = signal<College[]>([]);
  readonly instructors = signal<Instructor[]>([]);
  readonly blacklist = signal<BlacklistRecord[]>([]);
  readonly discounts = signal<DiscountCode[]>([]);

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // ==========================================
  // 1. Colleges (Faculties) API Methods
  // ==========================================

  getColleges(): Observable<College[]> {
    this.isLoading.set(true);
    return this.facultyApi.getFaculties().pipe(
      map(faculties => {
        const rawList = faculties || [];
        const mapped: College[] = rawList.map((f: any) => {
          // Calculate student count dynamically from active & history workspace sessions if available
          let studentCount = f.studentCount || 0;
          if (studentCount === 0) {
            const facultyName = (f.name || '').toLowerCase().trim();
            const activeStudents = this.workspaceService.activeStudents();
            const historyStudents = this.workspaceService.historyStudents();
            const matchedCount = [...activeStudents, ...historyStudents].filter(s =>
              (s.faculty || s.college || '').toLowerCase().includes(facultyName)
            ).length;
            studentCount = matchedCount;
          }

          return {
            id: f.id,
            name: f.name,
            nameEn: f.nameEn || f.name,
            university: f.university || f.universityName || '-',
            universityEn: f.universityEn || f.university || '-',
            studentsCount: studentCount,
            campus: f.campus || '-',
            campusEn: f.campusEn || '-',
            notes: f.notes || '',
            createdAt: f.createdAt || new Date().toISOString()
          };
        });

        this.colleges.set(mapped);
        return mapped;
      }),
      catchError(err => {
        console.error('[DetailsService] getColleges failed:', err);
        this.error.set('Failed to load colleges from server');
        return of([]);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  loadColleges(): void {
    this.getColleges().subscribe();
  }

  createCollege(dto: CreateCollegeDto): Observable<College> {
    this.isLoading.set(true);
    return this.facultyApi.createFaculty({
      name: dto.name,
      nameEn: dto.nameEn,
      code: dto.name.slice(0, 3).toUpperCase(),
      isActive: true
    }).pipe(
      map(f => {
        const newCollege: College = {
          id: f.id,
          name: f.name,
          nameEn: f.nameEn || dto.nameEn,
          university: dto.university || '-',
          universityEn: dto.universityEn || '-',
          studentsCount: 0,
          campus: dto.campus || '-',
          campusEn: dto.campusEn || '-',
          notes: dto.notes,
          createdAt: f.createdAt || new Date().toISOString()
        };
        this.colleges.update(list => [newCollege, ...list.filter(c => c.id !== newCollege.id)]);
        return newCollege;
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  updateCollege(id: string, dto: UpdateCollegeDto): Observable<boolean> {
    this.isLoading.set(true);
    return this.facultyApi.updateFaculty(id, {
      name: dto.name || '',
      nameEn: dto.nameEn
    }).pipe(
      tap(() => {
        this.colleges.update(list =>
          list.map(c => c.id === id ? { ...c, ...dto } : c)
        );
      }),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteCollege(id: string): Observable<boolean> {
    this.isLoading.set(true);
    return this.facultyApi.deleteFaculty(id).pipe(
      tap(() => {
        this.colleges.update(list => list.filter(c => c.id !== id));
      }),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.isLoading.set(false))
    );
  }

  // ==========================================
  // 2. Instructors API Methods
  // ==========================================

  getInstructors(): Observable<Instructor[]> {
    this.isLoading.set(true);
    return this.instructorApi.getInstructors().pipe(
      map(list => {
        const rawList = list || [];
        const mapped: Instructor[] = rawList.map((inst: any) => ({
          id: inst.id,
          name: inst.name,
          nameEn: inst.nameEn || inst.name,
          phone: inst.phoneNumber || inst.phone || '-',
          email: inst.email || '-',
          specialty: inst.specialty || inst.specialization || '-',
          specialtyEn: inst.specialtyEn || inst.specialty || inst.specialization || '-',
          affiliation: inst.affiliation || inst.workplace || '-',
          affiliationEn: inst.affiliationEn || inst.affiliation || inst.workplace || '-',
          totalSessions: inst.sessionsCount || inst.totalSessions || 0,
          status: (inst.isActive === false ? 'inactive' : 'active') as 'active' | 'inactive',
          bio: inst.bio || '',
          createdAt: inst.createdAt || new Date().toISOString()
        }));

        this.instructors.set(mapped);
        return mapped;
      }),
      catchError(err => {
        console.error('[DetailsService] getInstructors failed:', err);
        this.error.set('Failed to load instructors from server');
        return of([]);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  loadInstructors(): void {
    this.getInstructors().subscribe();
  }

  createInstructor(dto: CreateInstructorDto): Observable<Instructor> {
    this.isLoading.set(true);
    return this.instructorApi.createInstructor({
      name: dto.name,
      phoneNumber: dto.phone,
      email: dto.email,
      specialty: dto.specialty,
      affiliation: dto.affiliation,
      colour: '#f5b921'
    }).pipe(
      map(inst => {
        const newInst: Instructor = {
          id: inst.id,
          name: inst.name,
          nameEn: inst.nameEn || dto.nameEn || inst.name,
          phone: inst.phoneNumber || dto.phone || '-',
          email: (inst as any).email || dto.email || '-',
          specialty: (inst as any).specialty || (inst as any).specialization || dto.specialty || '-',
          specialtyEn: (inst as any).specialtyEn || dto.specialtyEn || '-',
          affiliation: (inst as any).affiliation || (inst as any).workplace || dto.affiliation || '-',
          affiliationEn: (inst as any).affiliationEn || dto.affiliationEn || '-',
          totalSessions: 0,
          status: dto.status || 'active',
          bio: dto.bio || '',
          createdAt: inst.createdAt || new Date().toISOString()
        };
        this.instructors.update(list => [newInst, ...list.filter(i => i.id !== newInst.id)]);
        return newInst;
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  updateInstructor(id: string, dto: UpdateInstructorDto): Observable<boolean> {
    this.isLoading.set(true);
    return this.instructorApi.updateInstructor(id, {
      name: dto.name || '',
      phoneNumber: dto.phone,
      email: dto.email,
      specialty: dto.specialty,
      affiliation: dto.affiliation,
      colour: '#f5b921'
    }).pipe(
      tap(() => {
        this.instructors.update(list =>
          list.map(i => i.id === id ? { ...i, ...dto } : i)
        );
      }),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteInstructor(id: string): Observable<boolean> {
    this.isLoading.set(true);
    return this.instructorApi.deleteInstructor(id).pipe(
      tap(() => {
        this.instructors.update(list => list.filter(i => i.id !== id));
      }),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.isLoading.set(false))
    );
  }

  // ==========================================
  // 3. Blacklist API Methods
  // ==========================================

  getBlacklist(): Observable<BlacklistRecord[]> {
    this.isLoading.set(true);
    return this.blacklistApi.getBlacklists().pipe(
      map(list => {
        const rawList = list || [];
        const mapped: BlacklistRecord[] = rawList.map(b => ({
          id: b.id,
          name: b.name || b.studentName || 'Student',
          nameEn: b.studentName || b.name,
          phone: b.studentPhone || '',
          reason: b.reasonDetails || b.reason || 'Misconduct',
          reasonEn: b.reason || b.reasonDetails,
          blockedDate: b.blacklistedAt ? parseIsoToLocalDate(b.blacklistedAt) : (b.blockedAt ? parseIsoToLocalDate(b.blockedAt) : getTodayDateISO()),
          severity: 'permanent' as const,
          status: (b.isActive !== false ? 'blocked' : 'resolved') as 'blocked' | 'resolved',
          notes: b.notes || ''
        }));

        this.blacklist.set(mapped);
        return mapped;
      }),
      catchError(err => {
        console.error('[DetailsService] getBlacklist failed:', err);
        this.error.set('Failed to load blacklist from server');
        return of([]);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  loadBlacklist(): void {
    this.getBlacklist().subscribe();
  }

  addBlacklist(dto: CreateBlacklistDto): Observable<BlacklistRecord> {
    const cleanPhone = (dto.phone || '').trim();
    const cleanName = (dto.name || '').trim().toLowerCase();
    const existingActiveBlock = this.blacklist().find(b =>
      b.status === 'blocked' && (
        (cleanPhone && b.phone && b.phone === cleanPhone) ||
        (cleanName && b.name && b.name.trim().toLowerCase() === cleanName)
      )
    );

    if (existingActiveBlock) {
      const errorMsg = 'This student is already actively blocked.';
      this.error.set(errorMsg);
      return throwError(() => new Error(errorMsg));
    }

    this.isLoading.set(true);
    return this.blacklistApi.addToBlacklist({
      studentName: dto.name,
      name: dto.name,
      studentPhone: dto.phone,
      reason: 'Other',
      reasonDetails: dto.reason,
      notes: dto.notes
    }).pipe(
      map(b => {
        const record: BlacklistRecord = {
          id: b.id,
          name: b.name || b.studentName || dto.name,
          nameEn: dto.nameEn || dto.name,
          phone: b.studentPhone || dto.phone || '',
          faculty: dto.faculty,
          college: dto.college,
          reason: b.reasonDetails || b.reason || dto.reason,
          blockedDate: getTodayDateISO(),
          severity: dto.severity || 'permanent',
          status: 'blocked' as const,
          notes: dto.notes
        };
        this.blacklist.update(list => [record, ...list.filter(x => x.id !== record.id)]);
        return record;
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  resolveBlacklist(id: string): Observable<boolean> {
    this.isLoading.set(true);
    return this.blacklistApi.removeFromBlacklist(id).pipe(
      tap(() => {
        this.blacklist.update(list => list.filter(b => b.id !== id));
      }),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.isLoading.set(false))
    );
  }

  // ==========================================
  // 4. Discounts API Methods
  // ==========================================

  getDiscounts(): Observable<DiscountCode[]> {
    this.isLoading.set(true);
    return this.discountApi.getDiscounts().pipe(
      map(list => {
        const rawList = list || [];
        const mapped: DiscountCode[] = rawList.map(d => {
          const codeName = (d.name || d.facultyName || d.id || 'DISCOUNT').toUpperCase().replace(/\s+/g, '');
          const isFixed = d.discountType === 2 || String(d.type || '').toLowerCase() === 'fixed';
          return {
            id: d.id,
            code: codeName,
            title: d.name || d.facultyName || 'خصم مساحة العمل',
            titleEn: d.nameEn || d.name || 'Workspace Discount',
            type: isFixed ? ('fixed' as const) : ('percentage' as const),
            value: d.value,
            scope: 'all' as const,
            usageCount: 0,
            usageLimit: 100,
            startDate: d.dateFrom ? parseIsoToLocalDate(d.dateFrom) : (d.startsAt ? parseIsoToLocalDate(d.startsAt) : getTodayDateISO()),
            expiryDate: d.dateTo ? parseIsoToLocalDate(d.dateTo) : (d.expiresAt ? parseIsoToLocalDate(d.expiresAt) : '2027-12-31'),
            status: (d.isActive !== false ? 'active' : 'disabled') as 'active' | 'expired' | 'disabled',
            totalDiscountSaved: 0,
            createdAt: d.createdAt || new Date().toISOString()
          };
        });

        this.discounts.set(mapped);
        return mapped;
      }),
      catchError(err => {
        console.error('[DetailsService] getDiscounts failed:', err);
        this.error.set('Failed to load discounts from server');
        return of([]);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  loadDiscounts(): void {
    this.getDiscounts().subscribe();
  }

  createDiscount(dto: CreateDiscountDto): Observable<DiscountCode> {
    this.isLoading.set(true);
    return this.discountApi.createDiscount({
      name: dto.title,
      nameEn: dto.titleEn,
      type: dto.type === 'fixed' ? 'Fixed' : 'Percentage',
      discountType: dto.type === 'fixed' ? 2 : 1,
      value: dto.value,
      scope: 'All',
      isActive: true,
      startsAt: dto.startDate,
      dateFrom: dto.startDate,
      expiresAt: dto.expiryDate,
      dateTo: dto.expiryDate
    }).pipe(
      map(d => {
        const newDiscount: DiscountCode = {
          id: d.id,
          code: dto.code,
          title: d.name || dto.title || 'خصم',
          titleEn: d.nameEn || dto.titleEn || 'Discount',
          type: dto.type,
          value: d.value,
          scope: dto.scope,
          usageCount: 0,
          usageLimit: dto.usageLimit,
          startDate: dto.startDate,
          expiryDate: dto.expiryDate,
          status: 'active' as const,
          totalDiscountSaved: 0,
          createdAt: d.createdAt || new Date().toISOString()
        };
        this.discounts.update(list => [newDiscount, ...list.filter(x => x.id !== newDiscount.id)]);
        return newDiscount;
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  updateDiscount(id: string, dto: UpdateDiscountDto): Observable<boolean> {
    this.isLoading.set(true);
    return this.discountApi.updateDiscount(id, {
      name: dto.title || '',
      nameEn: dto.titleEn,
      type: dto.type ? (dto.type === 'fixed' ? 'Fixed' : 'Percentage') : undefined,
      discountType: dto.type === 'fixed' ? 2 : 1,
      value: dto.value
    }).pipe(
      tap(() => {
        this.discounts.update(list =>
          list.map(d => d.id === id ? { ...d, ...dto } : d)
        );
      }),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteDiscount(id: string): Observable<boolean> {
    this.isLoading.set(true);
    return this.discountApi.deleteDiscount(id).pipe(
      tap(() => {
        this.discounts.update(list => list.filter(d => d.id !== id));
      }),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.isLoading.set(false))
    );
  }
}
