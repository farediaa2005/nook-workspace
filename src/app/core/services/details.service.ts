import { Injectable, inject } from '@angular/core';
import { Observable, of, map, catchError } from 'rxjs';
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

const DETAILS_CACHE_KEYS = {
  COLLEGES: 'nook_colleges_cache',
  INSTRUCTORS: 'nook_instructors_cache',
  BLACKLIST: 'nook_blacklist_cache',
  DISCOUNTS: 'nook_discounts_cache'
};

function getLocalCache<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = localStorage.getItem(key);
      if (item) return JSON.parse(item);
    }
  } catch {}
  return fallback;
}

function setLocalCache<T>(key: string, val: T): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  } catch {}
}

@Injectable({
  providedIn: 'root'
})
export class DetailsService {
  private facultyApi = inject(FacultyApiService);
  private instructorApi = inject(InstructorApiService);
  private blacklistApi = inject(BlacklistApiService);
  private discountApi = inject(DiscountApiService);

  // --- Colleges (Faculties) API Methods ---
  getColleges(): Observable<College[]> {
    return this.facultyApi.getFaculties().pipe(
      map(faculties => {
        const deletedIds = getLocalCache<string[]>('nook_deleted_colleges', []);
        const rawList = faculties || [];
        const validList = rawList.filter((f: any) => !deletedIds.includes(f.id));

        if (!validList || validList.length === 0) {
          const cached = getLocalCache<College[]>(DETAILS_CACHE_KEYS.COLLEGES, []);
          return cached.filter(c => !deletedIds.includes(c.id));
        }
        const mapped: College[] = validList.map((f: any) => ({
          id: f.id,
          name: f.name,
          nameEn: f.nameEn || f.name,
          university: f.university || f.universityName || '-',
          universityEn: f.universityEn || f.university || '-',
          studentsCount: f.studentCount || 0,
          campus: f.campus || '-',
          campusEn: f.campusEn || '-',
          createdAt: f.createdAt || new Date().toISOString()
        }));
        setLocalCache(DETAILS_CACHE_KEYS.COLLEGES, mapped);
        return mapped;
      }),
      catchError(() => {
        const deletedIds = getLocalCache<string[]>('nook_deleted_colleges', []);
        const cached = getLocalCache<College[]>(DETAILS_CACHE_KEYS.COLLEGES, []);
        return of(cached.filter(c => !deletedIds.includes(c.id)));
      })
    );
  }

  createCollege(dto: CreateCollegeDto): Observable<College> {
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
          nameEn: f.nameEn,
          university: dto.university || '-',
          universityEn: dto.universityEn || '-',
          studentsCount: 0,
          campus: dto.campus || '-',
          campusEn: dto.campusEn || '-',
          createdAt: f.createdAt || new Date().toISOString()
        };
        const current = getLocalCache<College[]>(DETAILS_CACHE_KEYS.COLLEGES, []);
        setLocalCache(DETAILS_CACHE_KEYS.COLLEGES, [newCollege, ...current.filter(c => c.id !== newCollege.id)]);
        return newCollege;
      }),
      catchError(() => {
        const newCollege: College = {
          ...dto,
          id: `COL-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
          createdAt: new Date().toISOString()
        };
        const current = getLocalCache<College[]>(DETAILS_CACHE_KEYS.COLLEGES, []);
        setLocalCache(DETAILS_CACHE_KEYS.COLLEGES, [newCollege, ...current]);
        return of(newCollege);
      })
    );
  }

  updateCollege(id: string, dto: UpdateCollegeDto): Observable<boolean> {
    const current = getLocalCache<College[]>(DETAILS_CACHE_KEYS.COLLEGES, []);
    const updated = current.map(c => c.id === id ? { ...c, ...dto } : c);
    setLocalCache(DETAILS_CACHE_KEYS.COLLEGES, updated);

    return this.facultyApi.updateFaculty(id, {
      name: dto.name || '',
      nameEn: dto.nameEn
    }).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  deleteCollege(id: string): Observable<boolean> {
    const deletedIds = getLocalCache<string[]>('nook_deleted_colleges', []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      setLocalCache('nook_deleted_colleges', deletedIds);
    }
    const current = getLocalCache<College[]>(DETAILS_CACHE_KEYS.COLLEGES, []);
    setLocalCache(DETAILS_CACHE_KEYS.COLLEGES, current.filter(c => c.id !== id));

    return this.facultyApi.deleteFaculty(id).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  // --- Instructors API Methods ---
  getInstructors(): Observable<Instructor[]> {
    return this.instructorApi.getInstructors().pipe(
      map(list => {
        const deletedIds = getLocalCache<string[]>('nook_deleted_instructors', []);
        const rawList = list || [];
        const validList = rawList.filter((inst: any) => !deletedIds.includes(inst.id));

        if (!validList || validList.length === 0) {
          const cached = getLocalCache<Instructor[]>(DETAILS_CACHE_KEYS.INSTRUCTORS, []);
          return cached.filter(i => !deletedIds.includes(i.id));
        }
        const mapped: Instructor[] = validList.map((inst: any) => ({
          id: inst.id,
          name: inst.name,
          nameEn: inst.nameEn || inst.name,
          phone: inst.phoneNumber || inst.phone || '-',
          email: inst.email || '-',
          specialty: inst.specialty || '-',
          specialtyEn: inst.specialtyEn || inst.specialty || '-',
          affiliation: inst.affiliation || '-',
          affiliationEn: inst.affiliationEn || inst.affiliation || '-',
          totalSessions: inst.sessionsCount || inst.totalSessions || 0,
          status: (inst.isActive === false ? 'inactive' : 'active') as 'active' | 'inactive',
          bio: inst.bio || '',
          createdAt: inst.createdAt || new Date().toISOString()
        }));
        setLocalCache(DETAILS_CACHE_KEYS.INSTRUCTORS, mapped);
        return mapped;
      }),
      catchError(() => {
        const deletedIds = getLocalCache<string[]>('nook_deleted_instructors', []);
        const cached = getLocalCache<Instructor[]>(DETAILS_CACHE_KEYS.INSTRUCTORS, []);
        return of(cached.filter(i => !deletedIds.includes(i.id)));
      })
    );
  }

  createInstructor(dto: CreateInstructorDto): Observable<Instructor> {
    return this.instructorApi.createInstructor({
      name: dto.name,
      nameEn: dto.nameEn,
      phone: dto.phone,
      email: dto.email,
      specialty: dto.specialty,
      bio: dto.bio,
      isActive: dto.status === 'active'
    }).pipe(
      map(inst => {
        const newInst: Instructor = {
          id: inst.id,
          name: inst.name,
          nameEn: inst.nameEn || inst.name,
          phone: inst.phoneNumber || inst.phone || dto.phone || '',
          email: inst.email || dto.email || '',
          specialty: inst.specialty || dto.specialty || '',
          affiliation: dto.affiliation,
          affiliationEn: dto.affiliationEn,
          totalSessions: 0,
          status: 'active' as const,
          bio: inst.bio || dto.bio || '',
          createdAt: inst.createdAt || new Date().toISOString()
        };
        const current = getLocalCache<Instructor[]>(DETAILS_CACHE_KEYS.INSTRUCTORS, []);
        setLocalCache(DETAILS_CACHE_KEYS.INSTRUCTORS, [newInst, ...current.filter(i => i.id !== newInst.id)]);
        return newInst;
      }),
      catchError(() => {
        const newInst: Instructor = {
          ...dto,
          id: `INS-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
          createdAt: new Date().toISOString()
        };
        const current = getLocalCache<Instructor[]>(DETAILS_CACHE_KEYS.INSTRUCTORS, []);
        setLocalCache(DETAILS_CACHE_KEYS.INSTRUCTORS, [newInst, ...current]);
        return of(newInst);
      })
    );
  }

  updateInstructor(id: string, dto: UpdateInstructorDto): Observable<boolean> {
    const current = getLocalCache<Instructor[]>(DETAILS_CACHE_KEYS.INSTRUCTORS, []);
    const updated = current.map(i => i.id === id ? { ...i, ...dto } : i);
    setLocalCache(DETAILS_CACHE_KEYS.INSTRUCTORS, updated);

    return this.instructorApi.updateInstructor(id, {
      name: dto.name || '',
      nameEn: dto.nameEn,
      phone: dto.phone,
      email: dto.email,
      specialty: dto.specialty,
      bio: dto.bio,
      isActive: dto.status ? dto.status === 'active' : undefined
    }).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  deleteInstructor(id: string): Observable<boolean> {
    // 1. Mark as deleted in tombstones
    const deletedIds = getLocalCache<string[]>('nook_deleted_instructors', []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      setLocalCache('nook_deleted_instructors', deletedIds);
    }
    // 2. Remove immediately from local cached instructors list
    const current = getLocalCache<Instructor[]>(DETAILS_CACHE_KEYS.INSTRUCTORS, []);
    const filtered = current.filter(i => i.id !== id);
    setLocalCache(DETAILS_CACHE_KEYS.INSTRUCTORS, filtered);

    // 3. Trigger backend delete API call
    return this.instructorApi.deleteInstructor(id).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  // --- Blacklist API Methods ---
  getBlacklist(): Observable<BlacklistRecord[]> {
    return this.blacklistApi.getBlacklists().pipe(
      map(list => {
        const resolvedIds = getLocalCache<string[]>('nook_resolved_blacklist', []);
        const rawList = list || [];
        const validList = rawList.filter((b: any) => !resolvedIds.includes(b.id));

        if (!validList || validList.length === 0) {
          const cached = getLocalCache<BlacklistRecord[]>(DETAILS_CACHE_KEYS.BLACKLIST, []);
          return cached.filter(b => !resolvedIds.includes(b.id));
        }
        const mapped: BlacklistRecord[] = validList.map(b => ({
          id: b.id,
          name: b.name || b.studentName || 'طالب محظور',
          phone: b.studentPhone || '',
          reason: b.reasonDetails || b.reason || 'مخالفة قواعد مساحة العمل',
          blockedDate: b.blacklistedAt ? String(b.blacklistedAt).split('T')[0] : (b.blockedAt ? String(b.blockedAt).split('T')[0] : new Date().toISOString().split('T')[0]),
          severity: 'permanent' as const,
          status: (b.isActive !== false ? 'blocked' : 'resolved') as 'blocked' | 'resolved',
          notes: b.notes
        }));
        setLocalCache(DETAILS_CACHE_KEYS.BLACKLIST, mapped);
        return mapped;
      }),
      catchError(() => {
        const resolvedIds = getLocalCache<string[]>('nook_resolved_blacklist', []);
        const cached = getLocalCache<BlacklistRecord[]>(DETAILS_CACHE_KEYS.BLACKLIST, []);
        return of(cached.filter(b => !resolvedIds.includes(b.id)));
      })
    );
  }

  addBlacklist(dto: CreateBlacklistDto): Observable<BlacklistRecord> {
    return this.blacklistApi.addToBlacklist({
      studentName: dto.name,
      studentPhone: dto.phone,
      reason: 'Other',
      reasonDetails: dto.reason,
      notes: dto.notes
    }).pipe(
      map(b => {
        const record: BlacklistRecord = {
          id: b.id,
          name: b.name || b.studentName || dto.name,
          phone: b.studentPhone || dto.phone || '',
          faculty: dto.faculty,
          college: dto.college,
          reason: b.reasonDetails || b.reason || dto.reason,
          blockedDate: new Date().toISOString().split('T')[0],
          severity: dto.severity,
          status: 'blocked' as const,
          notes: dto.notes
        };
        const current = getLocalCache<BlacklistRecord[]>(DETAILS_CACHE_KEYS.BLACKLIST, []);
        setLocalCache(DETAILS_CACHE_KEYS.BLACKLIST, [record, ...current.filter(x => x.id !== record.id)]);
        return record;
      }),
      catchError(() => {
        const record: BlacklistRecord = {
          ...dto,
          id: `BLK-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
          blockedDate: new Date().toISOString().split('T')[0],
          status: 'blocked'
        };
        const current = getLocalCache<BlacklistRecord[]>(DETAILS_CACHE_KEYS.BLACKLIST, []);
        setLocalCache(DETAILS_CACHE_KEYS.BLACKLIST, [record, ...current]);
        return of(record);
      })
    );
  }

  resolveBlacklist(id: string): Observable<boolean> {
    const resolvedIds = getLocalCache<string[]>('nook_resolved_blacklist', []);
    if (!resolvedIds.includes(id)) {
      resolvedIds.push(id);
      setLocalCache('nook_resolved_blacklist', resolvedIds);
    }
    const current = getLocalCache<BlacklistRecord[]>(DETAILS_CACHE_KEYS.BLACKLIST, []);
    setLocalCache(DETAILS_CACHE_KEYS.BLACKLIST, current.filter(b => b.id !== id));

    return this.blacklistApi.removeFromBlacklist(id).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  // --- Discounts API Methods ---
  getDiscounts(): Observable<DiscountCode[]> {
    return this.discountApi.getDiscounts().pipe(
      map(list => {
        const deletedIds = getLocalCache<string[]>('nook_deleted_discounts', []);
        const rawList = list || [];
        const validList = rawList.filter((d: any) => !deletedIds.includes(d.id));

        if (!validList || validList.length === 0) {
          const cached = getLocalCache<DiscountCode[]>(DETAILS_CACHE_KEYS.DISCOUNTS, []);
          return cached.filter(d => !deletedIds.includes(d.id));
        }
        const mapped: DiscountCode[] = validList.map(d => {
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
            startDate: d.dateFrom ? String(d.dateFrom).split('T')[0] : (d.startsAt ? String(d.startsAt).split('T')[0] : new Date().toISOString().split('T')[0]),
            expiryDate: d.dateTo ? String(d.dateTo).split('T')[0] : (d.expiresAt ? String(d.expiresAt).split('T')[0] : '2027-12-31'),
            status: (d.isActive !== false ? 'active' : 'disabled') as 'active' | 'expired' | 'disabled',
            totalDiscountSaved: 0,
            createdAt: d.createdAt || new Date().toISOString()
          };
        });
        setLocalCache(DETAILS_CACHE_KEYS.DISCOUNTS, mapped);
        return mapped;
      }),
      catchError(() => {
        const deletedIds = getLocalCache<string[]>('nook_deleted_discounts', []);
        const cached = getLocalCache<DiscountCode[]>(DETAILS_CACHE_KEYS.DISCOUNTS, []);
        return of(cached.filter(d => !deletedIds.includes(d.id)));
      })
    );
  }

  createDiscount(dto: CreateDiscountDto): Observable<DiscountCode> {
    return this.discountApi.createDiscount({
      name: dto.title,
      nameEn: dto.titleEn,
      type: dto.type === 'fixed' ? 'Fixed' : 'Percentage',
      value: dto.value,
      scope: 'All',
      isActive: true,
      startsAt: dto.startDate,
      expiresAt: dto.expiryDate
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
        const current = getLocalCache<DiscountCode[]>(DETAILS_CACHE_KEYS.DISCOUNTS, []);
        setLocalCache(DETAILS_CACHE_KEYS.DISCOUNTS, [newDiscount, ...current.filter(x => x.id !== newDiscount.id)]);
        return newDiscount;
      }),
      catchError(() => {
        const newDiscount: DiscountCode = {
          ...dto,
          id: `DSC-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
          usageCount: 0,
          totalDiscountSaved: 0,
          createdAt: new Date().toISOString()
        };
        const current = getLocalCache<DiscountCode[]>(DETAILS_CACHE_KEYS.DISCOUNTS, []);
        setLocalCache(DETAILS_CACHE_KEYS.DISCOUNTS, [newDiscount, ...current]);
        return of(newDiscount);
      })
    );
  }

  updateDiscount(id: string, dto: UpdateDiscountDto): Observable<boolean> {
    const current = getLocalCache<DiscountCode[]>(DETAILS_CACHE_KEYS.DISCOUNTS, []);
    const updated = current.map(d => d.id === id ? { ...d, ...dto } : d);
    setLocalCache(DETAILS_CACHE_KEYS.DISCOUNTS, updated);

    return this.discountApi.updateDiscount(id, {
      name: dto.title || '',
      nameEn: dto.titleEn,
      type: dto.type ? (dto.type === 'fixed' ? 'Fixed' : 'Percentage') : undefined,
      value: dto.value
    }).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  deleteDiscount(id: string): Observable<boolean> {
    const deletedIds = getLocalCache<string[]>('nook_deleted_discounts', []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      setLocalCache('nook_deleted_discounts', deletedIds);
    }
    const current = getLocalCache<DiscountCode[]>(DETAILS_CACHE_KEYS.DISCOUNTS, []);
    setLocalCache(DETAILS_CACHE_KEYS.DISCOUNTS, current.filter(d => d.id !== id));

    return this.discountApi.deleteDiscount(id).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }
}
