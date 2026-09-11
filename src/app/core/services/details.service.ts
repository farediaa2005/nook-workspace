import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, map, catchError, finalize, tap, throwError, forkJoin } from 'rxjs';
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
import { CouponApiService } from './api/coupon-api.service';
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
 * Communicates with backend API and enriches client metadata.
 */
@Injectable({
  providedIn: 'root'
})
export class DetailsService {
  private facultyApi = inject(FacultyApiService);
  private instructorApi = inject(InstructorApiService);
  private blacklistApi = inject(BlacklistApiService);
  private discountApi = inject(DiscountApiService);
  private couponApi = inject(CouponApiService);
  private workspaceService = inject(WorkspaceService);

  private readonly INSTRUCTOR_CACHE_PREFIX = 'nook_instructor_details_';
  private readonly COUPON_META_PREFIX = 'nook_coupon_meta_';

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
  // 2. Instructors API Methods & Metadata Persistence
  // ==========================================

  private getCachedInstructorDetails(id: string, phone?: string): Partial<Instructor> {
    try {
      const raw = localStorage.getItem(this.INSTRUCTOR_CACHE_PREFIX + id) ||
        (phone ? localStorage.getItem(this.INSTRUCTOR_CACHE_PREFIX + phone) : null);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[DetailsService] Failed to read instructor cache:', e);
    }
    return {};
  }

  private setCachedInstructorDetails(id: string, phone: string | undefined, details: Partial<Instructor>): void {
    try {
      const serialized = JSON.stringify(details);
      if (id) {
        localStorage.setItem(this.INSTRUCTOR_CACHE_PREFIX + id, serialized);
      }
      if (phone) {
        localStorage.setItem(this.INSTRUCTOR_CACHE_PREFIX + phone, serialized);
      }
    } catch (e) {
      console.warn('[DetailsService] Failed to write instructor cache:', e);
    }
  }

  private removeCachedInstructorDetails(id: string, phone?: string): void {
    try {
      localStorage.removeItem(this.INSTRUCTOR_CACHE_PREFIX + id);
      if (phone) localStorage.removeItem(this.INSTRUCTOR_CACHE_PREFIX + phone);
    } catch (e) {}
  }

  getInstructors(): Observable<Instructor[]> {
    this.isLoading.set(true);
    return this.instructorApi.getInstructors().pipe(
      map(list => {
        const rawList = list || [];
        const mapped: Instructor[] = rawList.map((inst: any) => {
          const cached = this.getCachedInstructorDetails(inst.id, inst.phoneNumber || inst.phone);
          const email = (inst.email && inst.email !== '-') ? inst.email : (cached.email || '-');
          const specialty = (inst.specialty && inst.specialty !== '-') ? inst.specialty : (inst.specialization || cached.specialty || '-');
          const specialtyEn = inst.specialtyEn || cached.specialtyEn || specialty;
          const affiliation = (inst.affiliation && inst.affiliation !== '-') ? inst.affiliation : (inst.workplace || cached.affiliation || '-');
          const affiliationEn = inst.affiliationEn || cached.affiliationEn || affiliation;
          const bio = inst.bio || cached.bio || '';

          return {
            id: inst.id,
            name: inst.name,
            nameEn: inst.nameEn || inst.name,
            phone: inst.phoneNumber || inst.phone || '-',
            email,
            specialty,
            specialtyEn,
            affiliation,
            affiliationEn,
            totalSessions: inst.sessionsCount || inst.totalSessions || 0,
            status: (inst.isActive === false ? 'inactive' : 'active') as 'active' | 'inactive',
            bio,
            createdAt: inst.createdAt || new Date().toISOString()
          };
        });

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
          email: dto.email || (inst as any).email || '-',
          specialty: dto.specialty || (inst as any).specialty || (inst as any).specialization || '-',
          specialtyEn: dto.specialtyEn || (inst as any).specialtyEn || dto.specialty || '-',
          affiliation: dto.affiliation || (inst as any).affiliation || (inst as any).workplace || '-',
          affiliationEn: dto.affiliationEn || (inst as any).affiliationEn || dto.affiliation || '-',
          totalSessions: 0,
          status: dto.status || 'active',
          bio: dto.bio || '',
          createdAt: inst.createdAt || new Date().toISOString()
        };

        // Cache persistent metadata so F5 refresh preserves email, specialty, affiliation seamlessly
        this.setCachedInstructorDetails(inst.id, dto.phone, {
          email: dto.email,
          specialty: dto.specialty,
          specialtyEn: dto.specialtyEn || dto.specialty,
          affiliation: dto.affiliation,
          affiliationEn: dto.affiliationEn || dto.affiliation,
          bio: dto.bio
        });

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
        this.setCachedInstructorDetails(id, dto.phone, {
          email: dto.email,
          specialty: dto.specialty,
          specialtyEn: dto.specialtyEn || dto.specialty,
          affiliation: dto.affiliation,
          affiliationEn: dto.affiliationEn || dto.affiliation,
          bio: dto.bio
        });
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
        this.removeCachedInstructorDetails(id);
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
  // 4. Discounts & Promo Codes API Methods
  // ==========================================

  private getCachedCouponMeta(id: string, code?: string): { title?: string; titleEn?: string; scope?: string } {
    try {
      const raw = localStorage.getItem(this.COUPON_META_PREFIX + id) ||
        (code ? localStorage.getItem(this.COUPON_META_PREFIX + code.toUpperCase()) : null);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  private setCachedCouponMeta(id: string, code: string | undefined, meta: { title: string; titleEn?: string; scope?: string }): void {
    try {
      const serialized = JSON.stringify(meta);
      if (id) localStorage.setItem(this.COUPON_META_PREFIX + id, serialized);
      if (code) localStorage.setItem(this.COUPON_META_PREFIX + code.toUpperCase(), serialized);
    } catch (e) {}
  }

  private removeCachedCouponMeta(id: string, code?: string): void {
    try {
      localStorage.removeItem(this.COUPON_META_PREFIX + id);
      if (code) localStorage.removeItem(this.COUPON_META_PREFIX + code.toUpperCase());
    } catch (e) {}
  }

  getDiscounts(): Observable<DiscountCode[]> {
    this.isLoading.set(true);
    return forkJoin([
      this.couponApi.getCoupons().pipe(catchError(() => of([]))),
      this.discountApi.getDiscounts().pipe(catchError(() => of([])))
    ]).pipe(
      map(([coupons, discounts]) => {
        const result: DiscountCode[] = [];
        const seenCodes = new Set<string>();

        // 1. Map Coupons (Real Promo Codes with custom codes e.g. PROMO15)
        for (const c of (coupons || [])) {
          const code = (c.code || '').trim().toUpperCase();
          if (!code) continue;
          seenCodes.add(code);
          const cached = this.getCachedCouponMeta(c.id, code);
          const isFixed = c.discountType === 2;
          const title = cached.title || c.name || code;
          const titleEn = cached.titleEn || cached.title || c.name || code;
          const scope = (cached.scope as any) || 'all';

          result.push({
            id: c.id,
            code,
            title,
            titleEn,
            type: isFixed ? 'fixed' : 'percentage',
            value: c.value,
            scope,
            usageCount: Number(c.usageCount) || 0,
            usageLimit: (c.usageLimit !== null && c.usageLimit !== undefined && c.usageLimit > 0) ? c.usageLimit : ((c as any).maxUsage || (c as any).maxUses || 100),
            startDate: getTodayDateISO(),
            expiryDate: c.expiryDate ? parseIsoToLocalDate(c.expiryDate) : '2027-12-31',
            status: (c.isActive !== false ? 'active' : 'disabled') as 'active' | 'expired' | 'disabled',
            totalDiscountSaved: 0,
            createdAt: (c as any).createdAt || new Date().toISOString()
          });
        }

        // 2. Map Discounts (Faculty or general discounts)
        for (const d of (discounts || [])) {
          const cached = this.getCachedCouponMeta(d.id);
          const rawCode = (d.name || d.facultyName || cached.title || '').trim();
          const code = rawCode
            ? rawCode.toUpperCase().replace(/\s+/g, '')
            : (cached.title ? cached.title.toUpperCase().replace(/\s+/g, '') : `DISCOUNT-${d.id.slice(0, 6).toUpperCase()}`);

          if (seenCodes.has(code)) continue;
          seenCodes.add(code);

          const isFixed = d.discountType === 2 || String(d.type || '').toLowerCase() === 'fixed';
          const defaultTitle = d.facultyName ? `خصم كلية ${d.facultyName}` : (d.name || code);
          const title = cached.title || d.name || defaultTitle;
          const titleEn = cached.titleEn || d.nameEn || d.name || code;

          result.push({
            id: d.id,
            code,
            title,
            titleEn,
            type: isFixed ? 'fixed' : 'percentage',
            value: d.value,
            scope: (cached.scope as any) || 'all',
            usageCount: 0,
            usageLimit: 100,
            startDate: d.dateFrom ? parseIsoToLocalDate(d.dateFrom) : (d.startsAt ? parseIsoToLocalDate(d.startsAt) : getTodayDateISO()),
            expiryDate: d.dateTo ? parseIsoToLocalDate(d.dateTo) : (d.expiresAt ? parseIsoToLocalDate(d.expiresAt) : '2027-12-31'),
            status: (d.isActive !== false ? 'active' : 'disabled') as 'active' | 'expired' | 'disabled',
            totalDiscountSaved: 0,
            createdAt: d.createdAt || new Date().toISOString()
          });
        }

        this.discounts.set(result);
        return result;
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
    return this.couponApi.createCoupon({
      code: dto.code,
      discountType: dto.type === 'fixed' ? 2 : 1,
      value: dto.value,
      expiryDate: dto.expiryDate,
      usageLimit: dto.usageLimit,
      name: dto.title,
      isActive: dto.status !== 'disabled'
    }).pipe(
      tap(created => {
        this.setCachedCouponMeta(created.id, created.code, {
          title: dto.title,
          titleEn: dto.titleEn || dto.title,
          scope: dto.scope
        });
      }),
      map(created => {
        const newDiscount: DiscountCode = {
          id: created.id,
          code: created.code,
          title: dto.title,
          titleEn: dto.titleEn || dto.title,
          type: created.discountType === 2 ? 'fixed' : 'percentage',
          value: created.value,
          scope: dto.scope,
          usageCount: 0,
          usageLimit: created.usageLimit || dto.usageLimit,
          startDate: dto.startDate,
          expiryDate: created.expiryDate ? parseIsoToLocalDate(created.expiryDate) : dto.expiryDate,
          status: created.isActive ? 'active' : 'disabled',
          totalDiscountSaved: 0,
          createdAt: new Date().toISOString()
        };
        this.discounts.update(list => [newDiscount, ...list.filter(x => x.id !== newDiscount.id)]);
        return newDiscount;
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  updateDiscount(id: string, dto: UpdateDiscountDto): Observable<boolean> {
    this.isLoading.set(true);
    return this.couponApi.updateCoupon(id, {
      discountType: dto.type === 'fixed' ? 2 : (dto.type === 'percentage' ? 1 : undefined),
      value: dto.value,
      name: dto.title,
      isActive: dto.status === 'active'
    }).pipe(
      tap(() => {
        if (dto.title) {
          this.setCachedCouponMeta(id, undefined, {
            title: dto.title,
            titleEn: dto.titleEn || dto.title
          });
        }
        this.discounts.update(list =>
          list.map(d => d.id === id ? { ...d, ...dto } : d)
        );
      }),
      map(() => true),
      catchError(() => {
        return this.discountApi.updateDiscount(id, {
          name: dto.title || '',
          nameEn: dto.titleEn,
          discountType: dto.type === 'fixed' ? 2 : 1,
          value: dto.value
        }).pipe(
          tap(() => {
            this.discounts.update(list =>
              list.map(d => d.id === id ? { ...d, ...dto } : d)
            );
          }),
          map(() => true),
          catchError(() => of(false))
        );
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  deleteDiscount(id: string): Observable<boolean> {
    this.isLoading.set(true);
    return this.couponApi.deleteCoupon(id).pipe(
      tap(() => {
        this.removeCachedCouponMeta(id);
        this.discounts.update(list => list.filter(d => d.id !== id));
      }),
      catchError(() => {
        return this.discountApi.deleteDiscount(id).pipe(
          tap(() => {
            this.removeCachedCouponMeta(id);
            this.discounts.update(list => list.filter(d => d.id !== id));
          })
        );
      }),
      map(() => true),
      finalize(() => this.isLoading.set(false))
    );
  }
}
