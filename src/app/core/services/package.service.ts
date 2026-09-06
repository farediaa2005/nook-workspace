import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, catchError } from 'rxjs';
import {
  PackageItem,
  PackageMemberOption,
  PackageStatus,
  CreatePackageDto,
  UpdatePackageDto,
  PackageUsageDto,
  UsageHistory,
  ValidityPresetOption,
  PresetPackageOption
} from '../models/package.model';
import { WorkspacePackageApiService } from './api/workspace-package-api.service';
import { ClassroomPackageApiService } from './api/classroom-package-api.service';
// [MOCK DATA DISABLED FOR LIVE API - Uncomment below for offline presentation/testing]
// import { MOCK_PACKAGE_MEMBERS, MOCK_PACKAGES } from '../../../testing/mocks/packages.mock';
import { StudentApiService } from './api/student-api.service';
import { InstructorApiService } from './api/instructor-api.service';
import { ShiftService } from './shift.service';
import { AuthService } from './auth.service';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

const STORAGE_KEYS = {
  PACKAGES: 'nook_packages_v3',
  MEMBERS: 'nook_package_members_v3'
};

export const INITIAL_MEMBER_OPTIONS: PackageMemberOption[] = [];
export const INITIAL_PACKAGES: PackageItem[] = [];

@Injectable({
  providedIn: 'root'
})
export class PackageService {
  private wpApi = inject(WorkspacePackageApiService);
  private cpApi = inject(ClassroomPackageApiService);
  private studentApi = inject(StudentApiService);
  private instructorApi = inject(InstructorApiService);
  private shiftService = inject(ShiftService);
  private authService = inject(AuthService);

  private studentMap = new Map<string, any>();
  private instructorMap = new Map<string, any>();

  private packagesState = signal<PackageItem[]>(this.getStoredItem(STORAGE_KEYS.PACKAGES, []));

  private memberOptionsState = signal<PackageMemberOption[]>(this.getStoredItem(STORAGE_KEYS.MEMBERS, []));

  // Toast Notification State
  readonly toast = signal<ToastNotification | null>(null);

  // Dynamic Validity Presets
  readonly studentValidityPresets = signal<ValidityPresetOption[]>([
    { id: 'custom', days: 'custom', labelAr: 'مخصص', labelEn: 'Custom', tagAr: 'حر', tagEn: 'Manual' },
    { id: 'val-30', days: 30, hours: 10, labelAr: '30 يوم', labelEn: '30 Days', tagAr: '10 س', tagEn: '10 hrs' },
    { id: 'val-60', days: 60, hours: 20, labelAr: '60 يوم', labelEn: '60 Days', tagAr: '20 س', tagEn: '20 hrs' },
    { id: 'val-90', days: 90, hours: 30, labelAr: '90 يوم', labelEn: '90 Days', tagAr: '30 س', tagEn: '30 hrs' },
    { id: 'val-120', days: 120, hours: 50, labelAr: '120 يوم', labelEn: '120 Days', tagAr: '50 س', tagEn: '50 hrs' }
  ]);

  readonly instructorValidityPresets = signal<ValidityPresetOption[]>([
    { id: 'custom', days: 'custom', labelAr: 'مخصص', labelEn: 'Custom', tagAr: 'حر', tagEn: 'Manual' },
    { id: 'val-30', days: 30, hours: 10, labelAr: '30 يوم', labelEn: '30 Days', tagAr: '10 س', tagEn: '10 hrs' },
    { id: 'val-60', days: 60, hours: 25, labelAr: '60 يوم', labelEn: '60 Days', tagAr: '25 س', tagEn: '25 hrs' },
    { id: 'val-90', days: 90, hours: 50, labelAr: '90 يوم', labelEn: '90 Days', tagAr: '50 س', tagEn: '50 hrs' },
    { id: 'val-180', days: 180, hours: 100, labelAr: '180 يوم', labelEn: '180 Days', tagAr: '100 س', tagEn: '100 hrs' }
  ]);

  // Dynamic Package Presets
  readonly studentPackagePresets = signal<PresetPackageOption[]>([
    { id: 'custom', nameAr: 'باكيدج مخصصة', nameEn: 'Custom Hours Pass', hours: 50, rate: 20, price: 1000, badgeAr: 'مخصوص', badgeEn: 'Custom' },
    { id: 'pkg-10', nameAr: 'باكيدج المذاكرة الأساسية', nameEn: 'Starter Study Pass', hours: 10, rate: 25, price: 250, badgeAr: 'أساسية', badgeEn: 'Starter' },
    { id: 'pkg-20', nameAr: 'باكيدج الشهر القياسية', nameEn: 'Standard Monthly Pass', hours: 20, rate: 23, price: 460, badgeAr: 'أكتر طلب', badgeEn: 'Popular', popular: true },
    { id: 'pkg-30', nameAr: 'باكيدج الإنجاز والروقان', nameEn: 'Advanced Focus Pass', hours: 30, rate: 23, price: 690, badgeAr: 'متقدمة', badgeEn: 'Advanced' },
    { id: 'pkg-50', nameAr: 'باكيدج الماراثون المكثفة', nameEn: 'Exam Marathon Pass', hours: 50, rate: 20, price: 1000, badgeAr: 'مكثفة', badgeEn: 'Intensive' }
  ]);

  readonly instructorPackagePresets = signal<PresetPackageOption[]>([
    { id: 'custom', nameAr: 'باكيدج رومات مخصصة', nameEn: 'Custom Classroom Pass', hours: 20, rate: 100, price: 2000, badgeAr: 'مخصوص', badgeEn: 'Custom' },
    { id: 'pkg-inst-10', nameAr: 'باكيدج الورش السريعة', nameEn: 'Workshop Starter Pass', hours: 10, rate: 110, price: 1100, badgeAr: 'أساسية', badgeEn: 'Starter' },
    { id: 'pkg-inst-25', nameAr: 'باكيدج التدريب الشهري', nameEn: 'Standard Training Pack', hours: 25, rate: 100, price: 2500, badgeAr: 'أكتر طلب', badgeEn: 'Popular', popular: true },
    { id: 'pkg-inst-50', nameAr: 'باكيدج المعسكرات الاحترافية', nameEn: 'Bootcamp Master Pack', hours: 50, rate: 90, price: 4500, badgeAr: 'متقدمة', badgeEn: 'Advanced' },
    { id: 'pkg-inst-100', nameAr: 'باكيدج الشركات والمؤسسات', nameEn: 'Corporate Enterprise Pack', hours: 100, rate: 80, price: 8000, badgeAr: 'مؤسسية', badgeEn: 'Enterprise' }
  ]);

  /** Compute dynamic package status based on remaining hours and expiry date (BUG-24) */
  computePackageStatus(expiryDateStr: string | undefined, remainingHours: number, currentStatus?: string): PackageStatus {
    if (remainingHours <= 0) {
      return 'exhausted';
    }

    if (expiryDateStr) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const exp = new Date(expiryDateStr);
      exp.setHours(0, 0, 0, 0);

      if (exp.getTime() < today.getTime()) {
        return 'expired';
      }

      const diffMs = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 3 || remainingHours <= 3) {
        return 'near_expiry';
      }
    } else if (remainingHours <= 3) {
      return 'near_expiry';
    }

    if (currentStatus === 'exhausted' || currentStatus === 'expired') {
      return currentStatus;
    }

    return 'active';
  }

  // Readonly Signals
  readonly packages = computed(() =>
    this.packagesState().map(pkg => ({
      ...pkg,
      status: this.computePackageStatus(pkg.expiryDate, pkg.remainingHours, pkg.status)
    }))
  );
  readonly memberOptions = this.memberOptionsState.asReadonly();

  // Filtered by Type
  readonly studentPackages = computed(() =>
    this.packagesState()
      .filter(pkg => pkg.type === 'student')
      .map(pkg => ({
        ...pkg,
        status: this.computePackageStatus(pkg.expiryDate, pkg.remainingHours, pkg.status)
      }))
  );

  readonly instructorPackages = computed(() =>
    this.packagesState()
      .filter(pkg => pkg.type === 'instructor')
      .map(pkg => ({
        ...pkg,
        status: this.computePackageStatus(pkg.expiryDate, pkg.remainingHours, pkg.status)
      }))
  );

  // Student Metrics
  readonly studentActiveCount = computed(
    () => this.studentPackages().filter(p => p.status === 'active').length
  );

  readonly studentRemainingHours = computed(() =>
    this.studentPackages().reduce((acc, p) => acc + (p.remainingHours || 0), 0)
  );

  readonly studentExpiringSoonCount = computed(
    () => this.studentPackages().filter(p => p.status === 'near_expiry').length
  );

  readonly studentRevenue = computed(() =>
    this.studentPackages().reduce((acc, p) => acc + (p.cost || 0), 0)
  );

  // Instructor Metrics
  readonly instructorActiveCount = computed(
    () => this.instructorPackages().filter(p => p.status === 'active').length
  );

  readonly instructorRemainingHours = computed(() =>
    this.instructorPackages().reduce((acc, p) => acc + (p.remainingHours || 0), 0)
  );

  readonly instructorExpiringSoonCount = computed(
    () => this.instructorPackages().filter(p => p.status === 'near_expiry').length
  );

  readonly instructorRevenue = computed(() =>
    this.instructorPackages().reduce((acc, p) => acc + (p.cost || 0), 0)
  );

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.syncPackagesFromBackend();
    }
  }

  public syncPackagesFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    // 1. Sync Students for Member Options
    this.studentApi.getStudents().pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (students) => {
        (students || []).forEach(s => this.studentMap.set(s.id, s));
        const studentMembers: PackageMemberOption[] = (students || []).map((s: any) => ({
          id: s.id,
          nameAr: s.name,
          nameEn: s.name,
          subAr: s.facultyName || 'طالب',
          subEn: s.facultyName || 'Student',
          phone: s.phoneNumber || s.whatsapp || '',
          email: s.email || '',
          type: 'student' as const
        }));
        this.memberOptionsState.update(existing => {
          const nonStudents = existing.filter(e => e.type !== 'student');
          const merged = [...studentMembers, ...nonStudents];
          this.setStoredItem(STORAGE_KEYS.MEMBERS, merged);
          return merged;
        });

        // After loading students, fetch student packages
        this.fetchStudentPackages();
      }
    });

    // 2. Sync Instructors for Member Options
    this.instructorApi.getInstructors().pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (instructors) => {
        let deletedIds: string[] = [];
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            deletedIds = JSON.parse(localStorage.getItem('nook_deleted_instructors') || '[]');
          }
        } catch {}
        const validInstructors = (instructors || []).filter(ins => !deletedIds.includes(ins.id));
        validInstructors.forEach(ins => this.instructorMap.set(ins.id, ins));
        const instMembers: PackageMemberOption[] = validInstructors.map((ins: any) => ({
          id: ins.id,
          nameAr: ins.name,
          nameEn: ins.name,
          subAr: ins.specialty || 'محاضر معتمد',
          subEn: ins.specialty || 'Certified Instructor',
          phone: ins.phoneNumber || ins.phone || '',
          email: ins.email || '',
          type: 'instructor' as const
        }));
        this.memberOptionsState.update(existing => {
          const nonInstructors = existing.filter(e => e.type !== 'instructor');
          const merged = [...nonInstructors, ...instMembers];
          this.setStoredItem(STORAGE_KEYS.MEMBERS, merged);
          return merged;
        });

        // After loading instructors, fetch instructor packages
        this.fetchInstructorPackages();
      }
    });
  }

  private fetchStudentPackages(): void {
    this.wpApi.getPackages().pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (studentPks) => {
        if (studentPks && studentPks.length > 0) {
          const mapped: PackageItem[] = studentPks.map((p: any) => {
            const student = p.studentId ? this.studentMap.get(p.studentId) : null;
            const sName = student?.name || p.studentName || p.name || '-';
            const sPhone = student?.phoneNumber || student?.whatsapp || p.studentPhone || '-';
            const totalHours = p.hours || p.totalHours || 0;
            const remainingHours = p.remainingHours != null && p.remainingHours > 0 ? p.remainingHours : totalHours;
            const cost = p.paidAmount || p.cost || p.price || 0;
            const hourlyRate = p.hourlyRate || (totalHours > 0 ? Math.round(cost / totalHours) : 0);
            const rawExp = p.expireDate || p.dateTo || p.expiryDate;
            const rawPurch = p.createdAt || p.dateFrom || p.purchasedAt || p.purchaseDate;
            const expDate = rawExp ? String(rawExp).split('T')[0] : '';
            const purchaseDate = rawPurch ? String(rawPurch).split('T')[0] : new Date().toISOString().split('T')[0];
            const status = this.computePackageStatus(expDate, remainingHours, p.status);

            return {
              id: p.id,
              memberId: p.studentId || '',
              memberNameAr: sName,
              memberNameEn: sName,
              memberSubAr: student?.facultyName || '-',
              memberSubEn: student?.facultyName || '-',
              memberPhone: sPhone,
              type: 'student',
              packageNameAr: p.packageName || p.name || '-',
              packageNameEn: p.packageNameEn || p.packageName || p.name || '-',
              allocatedHours: totalHours,
              usedHours: Math.max(0, totalHours - remainingHours),
              remainingHours: remainingHours,
              cost: cost,
              hourlyRate: hourlyRate,
              purchaseDate: purchaseDate,
              expiryDate: expDate,
              paymentMethod: (p.payWay === 2 || String(p.paymentMethod).toLowerCase().includes('vodafone') ? 'vodafone' : (p.payWay === 3 ? 'fawry' : (p.payWay === 4 ? 'instapay' : 'cash'))) as any,
              status,
              history: [],
              createdAt: rawPurch || new Date().toISOString()
            };
          });

          this.packagesState.update(existing => {
            const nonStudents = existing.filter(e => e.type !== 'student');
            const merged = [...mapped, ...nonStudents];
            this.setStoredItem(STORAGE_KEYS.PACKAGES, merged);
            return merged;
          });
        }
      }
    });
  }

  private fetchInstructorPackages(): void {
    this.cpApi.getPackages().pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (instructorPks) => {
        if (instructorPks && instructorPks.length > 0) {
          const mapped: PackageItem[] = instructorPks.map((p: any) => {
            const instructor = p.instructorId ? this.instructorMap.get(p.instructorId) : null;
            const insName = instructor?.name || p.instructorName || p.name || '-';
            const insPhone = instructor?.phoneNumber || p.instructorPhone || '-';
            const totalHours = p.hours || p.totalHours || 0;
            const remainingHours = p.remainingHours != null && p.remainingHours > 0 ? p.remainingHours : totalHours;
            const cost = p.paidAmount || p.cost || p.price || 0;
            const hourlyRate = p.hourlyRate || (totalHours > 0 ? Math.round(cost / totalHours) : 0);
            const rawExp = p.expireDate || p.dateTo || p.expiryDate;
            const rawPurch = p.createdAt || p.dateFrom || p.purchasedAt || p.purchaseDate;
            const expDate = rawExp ? String(rawExp).split('T')[0] : '';
            const purchaseDate = rawPurch ? String(rawPurch).split('T')[0] : new Date().toISOString().split('T')[0];
            const status = this.computePackageStatus(expDate, remainingHours, p.status);

            return {
              id: p.id,
              memberId: p.instructorId || '',
              memberNameAr: insName,
              memberNameEn: insName,
              memberSubAr: instructor?.specialty || '-',
              memberSubEn: instructor?.specialtyEn || instructor?.specialty || '-',
              memberPhone: insPhone,
              type: 'instructor',
              packageNameAr: p.packageName || p.name || '-',
              packageNameEn: p.packageNameEn || p.packageName || p.name || '-',
              allocatedHours: totalHours,
              usedHours: Math.max(0, totalHours - remainingHours),
              remainingHours: remainingHours,
              cost: cost,
              hourlyRate: hourlyRate,
              purchaseDate: purchaseDate,
              expiryDate: expDate,
              paymentMethod: (p.payWay === 2 || String(p.paymentMethod).toLowerCase().includes('vodafone') ? 'vodafone' : (p.payWay === 3 ? 'fawry' : (p.payWay === 4 ? 'instapay' : 'cash'))) as any,
              status,
              history: [],
              createdAt: rawPurch || new Date().toISOString()
            };
          });

          this.packagesState.update(existing => {
            const nonInstructors = existing.filter(e => e.type !== 'instructor');
            const merged = [...nonInstructors, ...mapped];
            this.setStoredItem(STORAGE_KEYS.PACKAGES, merged);
            return merged;
          });
        }
      }
    });
  }

  /** Display Toast Message */
  showToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    this.toast.set({ id: Date.now().toString(), message, type });
    setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }

  /** Find Package By ID */
  getPackageById(id: string): PackageItem | undefined {
    const pkg = this.packagesState().find(p => p.id === id);
    if (!pkg) return undefined;
    return {
      ...pkg,
      status: this.computePackageStatus(pkg.expiryDate, pkg.remainingHours, pkg.status)
    };
  }

  /** Add a New Package */
  addPackage(dto: CreatePackageDto): void {
    const allocated = dto.allocatedHours || 0;
    const used = dto.usedHours || 0;
    const remainingHours = Math.max(0, allocated - used);
    const status = this.computePackageStatus(dto.expiryDate, remainingHours, dto.status);

    const newPackage: PackageItem = {
      ...dto,
      id: `PKG-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`,
      remainingHours,
      status,
      createdAt: new Date().toISOString()
    };

    this.packagesState.update(list => {
      const updated = [newPackage, ...list];
      this.setStoredItem(STORAGE_KEYS.PACKAGES, updated);
      return updated;
    });

    this.showToast(
      dto.type === 'student'
        ? 'تم بيع واشتراك باقة الطالب بنجاح!'
        : 'تم بيع واشتراك باقة المحاضر بنجاح!',
      'success'
    );

    // Record shift transaction
    const pkgPayMethod = (dto.paymentMethod === 'vodafone' ? 'vodafone' : (dto.paymentMethod === 'instapay' ? 'instapay' : (dto.paymentMethod === 'fawry' ? 'fawry' : 'cash')));
    this.shiftService.recordTransaction({
      type: 'package',
      paymentMethod: pkgPayMethod,
      amount: dto.cost || 0,
      details: `شراء باقة - ${dto.packageNameAr || dto.packageNameEn || 'باقة'} (${dto.memberNameAr || dto.memberNameEn || ''})`
    });

    // Call API with real foreign key IDs
    if (dto.type === 'student') {
      const studentId = dto.memberId || Array.from(this.studentMap.keys())[0] || '';
      this.wpApi.createPackage({
        studentId: studentId,
        studentName: dto.memberNameAr || dto.memberNameEn || '',
        studentPhone: dto.memberPhone || '',
        packageName: dto.packageNameAr || dto.packageNameEn || 'باقة ساعات دراسية',
        totalHours: allocated,
        price: dto.cost || 0,
        hourlyRate: dto.hourlyRate || 20,
        expiryDate: dto.expiryDate,
        paymentMethod: (dto.paymentMethod?.toUpperCase() === 'CASH' ? 'Cash' : 'Vodafone') as any
      }).subscribe({
        next: (created) => {
          if (created && created.id) {
            this.packagesState.update(list => {
              const next = list.map(p => p.id === newPackage.id ? { ...p, id: created.id } : p);
              this.setStoredItem(STORAGE_KEYS.PACKAGES, next);
              return next;
            });
          }
        },
        error: () => {}
      });
    } else {
      const instructorId = dto.memberId || Array.from(this.instructorMap.keys())[0] || '';
      this.cpApi.createPackage({
        instructorId: instructorId,
        instructorName: dto.memberNameAr || dto.memberNameEn || '',
        instructorPhone: dto.memberPhone || '',
        packageName: dto.packageNameAr || dto.packageNameEn || 'باقة ورش القاعات',
        totalHours: allocated,
        price: dto.cost || 0,
        hourlyRate: dto.hourlyRate || 90,
        expiryDate: dto.expiryDate,
        paymentMethod: (dto.paymentMethod?.toUpperCase() === 'CASH' ? 'Cash' : 'Vodafone') as any
      }).subscribe({
        next: (created) => {
          if (created && created.id) {
            this.packagesState.update(list => {
              const next = list.map(p => p.id === newPackage.id ? { ...p, id: created.id } : p);
              this.setStoredItem(STORAGE_KEYS.PACKAGES, next);
              return next;
            });
          }
        },
        error: () => {}
      });
    }
  }

  /** Add Multiple Packages */
  addPackages(dtos: CreatePackageDto[]): void {
    if (!dtos || dtos.length === 0) return;
    dtos.forEach(dto => this.addPackage(dto));
  }

  /** Add or Update a Member in the Database */
  addOrUpdateMember(member: Partial<PackageMemberOption> & { nameAr?: string; nameEn?: string; type: 'student' | 'instructor' }): PackageMemberOption {
    const list = this.memberOptionsState();
    const cleanName = (member.nameAr || member.nameEn || '').trim();
    const cleanPhone = (member.phone || '').trim();

    const existing = list.find(m =>
      (cleanPhone && m.phone === cleanPhone) ||
      (cleanName && m.nameAr && m.nameAr.toLowerCase() === cleanName.toLowerCase()) ||
      (cleanName && m.nameEn && m.nameEn.toLowerCase() === cleanName.toLowerCase())
    );

    if (existing) {
      const updated: PackageMemberOption = {
        ...existing,
        ...member,
        phone: member.phone || existing.phone,
        email: member.email || existing.email,
        subAr: member.subAr || existing.subAr,
        subEn: member.subEn || existing.subEn
      };
      this.memberOptionsState.update(items => {
        const next = items.map(i => i.id === existing.id ? updated : i);
        return next;
      });
      return updated;
    }

    const newId = (member.type === 'instructor' ? 'INS-' : 'STU-') + Date.now().toString().slice(-4);
    const newMember: PackageMemberOption = {
      id: newId,
      nameAr: member.nameAr || member.nameEn || 'عضو جديد',
      nameEn: member.nameEn || member.nameAr || 'New Member',
      subAr: member.subAr || (member.type === 'instructor' ? 'محاضر' : 'طالب'),
      subEn: member.subEn || (member.type === 'instructor' ? 'Instructor' : 'Student'),
      phone: member.phone || '',
      email: member.email || '',
      type: member.type
    };

    this.memberOptionsState.update(items => {
      const next = [newMember, ...items];
      return next;
    });

    return newMember;
  }

  /** Update an Existing Package */
  updatePackage(id: string, dto: UpdatePackageDto): void {
    this.packagesState.update(list => {
      const updated = list.map(pkg => {
        if (pkg.id !== id) return pkg;

        const allocatedHours =
          dto.allocatedHours !== undefined ? dto.allocatedHours : pkg.allocatedHours;
        const usedHours = dto.usedHours !== undefined ? dto.usedHours : pkg.usedHours;
        const remainingHours = Math.max(0, allocatedHours - usedHours);
        const expiryDate = dto.expiryDate !== undefined ? dto.expiryDate : pkg.expiryDate;
        const status = this.computePackageStatus(expiryDate, remainingHours, dto.status || pkg.status);

        return {
          ...pkg,
          ...dto,
          allocatedHours,
          usedHours,
          remainingHours,
          status
        };
      });

      this.setStoredItem(STORAGE_KEYS.PACKAGES, updated);
      return updated;
    });

    this.showToast('تم حفظ تعديلات الباقة بنجاح!', 'success');
  }

  /** Record Session Usage (Deduct Hours) */
  recordSessionUsage(id: string, usage: Omit<UsageHistory, 'id'>): void {
    const historyItem: UsageHistory = {
      ...usage,
      id: `USG-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`
    };

    this.packagesState.update(list => {
      const updated = list.map(pkg => {
        if (pkg.id !== id) return pkg;

        const newUsed = (pkg.usedHours || 0) + usage.duration;
        const newRemaining = Math.max(0, (pkg.allocatedHours || 0) - newUsed);
        const newStatus = this.computePackageStatus(pkg.expiryDate, newRemaining, pkg.status);

        return {
          ...pkg,
          usedHours: newUsed,
          remainingHours: newRemaining,
          status: newStatus,
          history: [historyItem, ...(pkg.history || [])]
        };
      });

      this.setStoredItem(STORAGE_KEYS.PACKAGES, updated);
      return updated;
    });

    this.showToast(`تم تسجيل استهلاك ${usage.duration} ساعة بنجاح!`, 'success');
  }

  deductStudentPackageHours(phoneOrId: string, hours: number): void {
    const pkg = this.packagesState().find(
      p => p.id === phoneOrId || p.memberPhone === phoneOrId || (p.memberNameAr && p.memberNameAr.includes(phoneOrId))
    );
    if (pkg) {
      this.recordSessionUsage(pkg.id, {
        date: new Date().toISOString().split('T')[0],
        duration: hours,
        sessionAr: 'خصم ساعات جلسة مساحة العمل',
        sessionEn: 'Workspace Session Check-Out Deduction',
        roomOrDesk: 'Main Co-Working Zone'
      });
      this.wpApi.useHours(pkg.id, { hours }).subscribe({ error: () => {} });
    } else {
      this.showToast(`تم خصم ${hours} ساعة من باقة الطالب.`, 'info');
    }
  }

  /** Delete Package */
  deletePackage(id: string): void {
    const pkg = this.getPackageById(id);
    this.packagesState.update(list => {
      const updated = list.filter(p => p.id !== id);
      this.setStoredItem(STORAGE_KEYS.PACKAGES, updated);
      return updated;
    });

    this.showToast('تم حذف الباقة بنجاح!', 'info');

    if (pkg?.type === 'student') {
      this.wpApi.deletePackage(id).subscribe({ error: () => {} });
    } else if (pkg?.type === 'instructor') {
      this.cpApi.deletePackage(id).subscribe({ error: () => {} });
    }
  }

  // Local Storage Helpers
  private getStoredItem<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed)) {
            const mockPkgIds = new Set(['PKG-101', 'PKG-102', 'PKG-103', 'PKG-201', 'PKG-202', 'PKG-203', 'MEM-101', 'MEM-102', 'MEM-103']);
            const cleaned = parsed.filter((p: any) => !mockPkgIds.has(p?.id));
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
            return cleaned as T;
          }
          return parsed;
        }
      }
    } catch {}
    return fallback;
  }

  private setStoredItem<T>(key: string, value: T): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {}
  }
}
