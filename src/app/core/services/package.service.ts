import { LanguageService } from './language.service';
import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { Observable, of, forkJoin, catchError, finalize, map, tap } from 'rxjs';
import { PackageItem, PackageMemberOption, PackageStatus, PaymentMethod, CreatePackageDto, UpdatePackageDto, UsageHistory, PresetPackageOption } from '../models/package.model';
import { WorkspacePackageApiService } from './api/workspace-package-api.service';
import { ClassroomPackageApiService } from './api/classroom-package-api.service';
import { StudentApiService } from './api/student-api.service';
import { InstructorApiService } from './api/instructor-api.service';
import { ShiftService } from './shift.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { extractApiErrorMessage } from '../utils/api-error.util';
import { PayWay, payWayFor } from '../constants/backend-enums';
import { parseIsoToLocalDate, getTodayDateISO } from '../utils/date-time.util';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

function paymentMethodToPayWay(method: PaymentMethod | string | undefined): number {
  return payWayFor(method);
}

function payWayToPaymentMethod(payWay: number | undefined): PaymentMethod {
  switch (payWay) {
    case 2:
      return 'vodafone';
    case PayWay.InstaPay:
      return 'instapay';
    case PayWay.Fawry:
      return 'fawry';
    case 1:
    default:
      return 'cash';
  }
}

@Injectable({
  providedIn: 'root'
})
export class PackageService {
  private langService = inject(LanguageService);
  private injector = inject(Injector);
  private wpApi = inject(WorkspacePackageApiService);
  private cpApi = inject(ClassroomPackageApiService);
  private studentApi = inject(StudentApiService);
  private instructorApi = inject(InstructorApiService);
  private shiftService = inject(ShiftService);
  private authService = inject(AuthService);

  private studentMap = new Map<string, any>();
  private instructorMap = new Map<string, any>();

  // Reactive State (Signals only - ZERO localStorage)
  private packagesState = signal<PackageItem[]>([]);
  private memberOptionsState = signal<PackageMemberOption[]>([]);

  // Loading & Error State
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Toast Notification State
  readonly toast = signal<ToastNotification | null>(null);

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

  /** Compute dynamic package status based on remaining hours and expiry date */
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
    // Hours left in expired packages can't be used, so they don't count as remaining.
    this.studentPackages()
      .filter(p => p.status === 'active' || p.status === 'near_expiry')
      .reduce((acc, p) => acc + (p.remainingHours || 0), 0)
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
    this.instructorPackages()
      .filter(p => p.status === 'active' || p.status === 'near_expiry')
      .reduce((acc, p) => acc + (p.remainingHours || 0), 0)
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

  /**
   * Synchronize packages and members live from Backend API.
   * Completely live without local database emulation.
   */
  public syncPackagesFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;

    this.isLoading.set(true);
    this.error.set(null);

    // Step 1: Fetch Students and Instructors in parallel to populate member lookup maps
    forkJoin({
      students: this.studentApi.getStudents().pipe(catchError(() => of([]))),
      instructors: this.instructorApi.getInstructors().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ students, instructors }) => {
        // Cache in memory maps for joining
        this.studentMap.clear();
        (students || []).forEach(s => this.studentMap.set(s.id, s));

        this.instructorMap.clear();
        (instructors || []).forEach(ins => this.instructorMap.set(ins.id, ins));

        // Build member options for dropdowns
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

        const instMembers: PackageMemberOption[] = (instructors || []).map((ins: any) => ({
          id: ins.id,
          nameAr: ins.name,
          nameEn: ins.name,
          subAr: ins.specialty || 'محاضر معتمد',
          subEn: ins.specialty || 'Certified Instructor',
          phone: ins.phoneNumber || ins.phone || '',
          email: ins.email || '',
          type: 'instructor' as const
        }));

        this.memberOptionsState.set([...studentMembers, ...instMembers]);

        // Step 2: Fetch Workspace Packages & Classroom Packages in parallel
        forkJoin({
          studentPks: this.wpApi.getPackages().pipe(catchError(() => of([]))),
          instructorPks: this.cpApi.getPackages().pipe(catchError(() => of([])))
        })
          .pipe(
            finalize(() => {
              this.isLoading.set(false);
            })
          )
          .subscribe({
            next: ({ studentPks, instructorPks }) => {
              const mappedStudents: PackageItem[] = (studentPks || []).map((p: any) => {
                const student = p.studentId ? this.studentMap.get(p.studentId) : null;
                const sName = student?.name || p.studentName || p.name || 'طالب';
                const sPhone = student?.phoneNumber || student?.whatsapp || p.studentPhoneNumber || p.studentPhone || '-';
                const totalHours = p.hours || p.totalHours || 0;
                const remainingHours = p.remainingHours != null ? p.remainingHours : totalHours;
                const cost = p.cost || p.paidAmount || p.price || 0;
                const hourlyRate = p.hourlyRate || (totalHours > 0 ? Math.round(cost / totalHours) : 0);
                const rawExp = p.dateTo || p.expireDate || p.expiryDate;
                const rawPurch = p.dateFrom || p.purchasedAt || p.createdAt || p.purchaseDate;
                const expDate = rawExp ? parseIsoToLocalDate(rawExp) : '';
                const purchaseDate = rawPurch ? parseIsoToLocalDate(rawPurch) : getTodayDateISO();
                const status = this.computePackageStatus(expDate, remainingHours, p.status);
                const faculty = student?.facultyName || p.facultyName || '-';
                const pkgNameAr = p.packageName || (totalHours > 0 ? `باقة ${totalHours} ساعة` : 'باقة طلاب');
                const pkgNameEn = p.packageNameEn || p.packageName || (totalHours > 0 ? `${totalHours} Hours Pass` : 'Student Package');

                return {
                  id: p.id,
                  memberId: p.studentId || '',
                  memberNameAr: sName,
                  memberNameEn: sName,
                  memberSubAr: faculty,
                  memberSubEn: faculty,
                  memberPhone: sPhone,
                  type: 'student',
                  packageNameAr: pkgNameAr,
                  packageNameEn: pkgNameEn,
                  allocatedHours: totalHours,
                  usedHours: Math.max(0, totalHours - remainingHours),
                  remainingHours: remainingHours,
                  cost: cost,
                  hourlyRate: hourlyRate,
                  purchaseDate: purchaseDate,
                  expiryDate: expDate,
                  paymentMethod: payWayToPaymentMethod(p.payWay),
                  status,
                  history: [],
                  createdAt: rawPurch || new Date().toISOString()
                };
              });

              const mappedInstructors: PackageItem[] = (instructorPks || []).map((p: any) => {
                const instructor = p.instructorId ? this.instructorMap.get(p.instructorId) : null;
                const insName = instructor?.name || p.instructorName || p.name || 'محاضر';
                const insPhone = instructor?.phoneNumber || p.instructorPhone || '-';
                const totalHours = p.hours || p.totalHours || 0;
                const remainingHours = p.remainingHours != null ? p.remainingHours : totalHours;
                const cost = p.cost || p.paidAmount || p.price || 0;
                const hourlyRate = p.hourlyRate || (totalHours > 0 ? Math.round(cost / totalHours) : 0);
                const rawExp = p.dateTo || p.expireDate || p.expiryDate;
                const rawPurch = p.dateFrom || p.purchasedAt || p.createdAt || p.purchaseDate;
                const expDate = rawExp ? parseIsoToLocalDate(rawExp) : '';
                const purchaseDate = rawPurch ? parseIsoToLocalDate(rawPurch) : getTodayDateISO();
                const status = this.computePackageStatus(expDate, remainingHours, p.status);

                return {
                  id: p.id,
                  memberId: p.instructorId || '',
                  memberNameAr: insName,
                  memberNameEn: insName,
                  memberSubAr: instructor?.specialty || '-',
                  memberSubEn: instructor?.specialty || '-',
                  memberPhone: insPhone,
                  type: 'instructor',
                  packageNameAr: p.packageName || p.name || `باقة قاعات ${totalHours} ساعة`,
                  packageNameEn: p.packageNameEn || p.packageName || p.name || `${totalHours} Hours Classroom Pass`,
                  allocatedHours: totalHours,
                  usedHours: Math.max(0, totalHours - remainingHours),
                  remainingHours: remainingHours,
                  cost: cost,
                  hourlyRate: hourlyRate,
                  purchaseDate: purchaseDate,
                  expiryDate: expDate,
                  paymentMethod: payWayToPaymentMethod(p.payWay),
                  status,
                  history: [],
                  createdAt: rawPurch || new Date().toISOString()
                };
              });

              const allMapped = [...mappedStudents, ...mappedInstructors];
              if (allMapped.length > 0 || this.packagesState().length === 0) {
                this.packagesState.set(allMapped);
              }
            },
            error: () => {
              this.error.set(this.langService.t().pkgLoadFailed);
              this.isLoading.set(false);
            }
          });
      },
      error: () => {
        this.isLoading.set(false);
        this.error.set(this.langService.t().pkgMembersLoadFailed);
      }
    });
  }

  /** Display Toast Message */
  /** Shows a message in the app-wide toast container (visible on every page). */
  showToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    // Resolved lazily: NotificationService depends on this service.
    const notifications = this.injector?.get(NotificationService, null);
    if (notifications) {
      notifications.show(message, type, type === 'error' ? 6000 : 4000);
    }
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

  /** Check if a member (student or instructor) already has an active or near_expiry package */
  getActivePackageForMember(memberId?: string, memberPhone?: string, type: 'student' | 'instructor' = 'student'): PackageItem | undefined {
    const list = this.packagesState();
    return list.find(p => {
      if (p.type !== type) return false;
      const isSameMember = (memberId && p.memberId && p.memberId === memberId) ||
                           (memberPhone && p.memberPhone && p.memberPhone === memberPhone && memberPhone !== '-');
      if (!isSameMember) return false;
      const currentStatus = this.computePackageStatus(p.expiryDate, p.remainingHours, p.status);
      return currentStatus === 'active' || currentStatus === 'near_expiry';
    });
  }

  /**
   * Add a New Package (calls Backend API directly)
   */
  addPackage(dto: CreatePackageDto): boolean {
    const activePkg = this.getActivePackageForMember(dto.memberId, dto.memberPhone, dto.type);
    if (activePkg) {
      const memberName = dto.memberNameAr || dto.memberNameEn || this.langService.t().pkgSelectedMember;
      const typeLabel = dto.type === 'student' ? this.langService.t().pkgTypeStudent : this.langService.t().pkgTypeInstructor;
      this.showToast(
        this.langService.tf('pkgMemberHasActive', { type: typeLabel, name: memberName }),
        'error'
      );
      return false;
    }

    const allocated = dto.allocatedHours || 0;
    const used = dto.usedHours || 0;
    const remainingHours = Math.max(0, allocated - used);
    const status = this.computePackageStatus(dto.expiryDate, remainingHours, dto.status);
    const payWay = paymentMethodToPayWay(dto.paymentMethod);

    // The sale is added to the shift once the server accepted the package (see recordSaleOnShift)
    const pkgPayMethod = (dto.paymentMethod === 'vodafone' ? 'vodafone' : (dto.paymentMethod === 'instapay' ? 'instapay' : (dto.paymentMethod === 'fawry' ? 'fawry' : 'cash'))) as 'cash' | 'vodafone' | 'instapay' | 'fawry';
    const recordSaleOnShift = () => {
      if (!(dto.cost > 0)) return;
      this.shiftService.addManualShiftItem({
        type: 'revenue',
        category: 'package',
        paymentMethod: pkgPayMethod,
        amount: dto.cost,
        description: `شراء باقة - ${dto.packageNameAr || dto.packageNameEn || 'باقة'} (${dto.memberNameAr || dto.memberNameEn || ''})`
      }).subscribe({
        error: (err) => this.showToast(this.langService.tf('pkgSoldShiftNotRecorded', { error: extractApiErrorMessage(err, this.langService.t().serverErrorFallback) }), 'error')
      });
    };

    if (dto.type === 'student') {
      const studentId = dto.memberId || Array.from(this.studentMap.keys())[0] || '';
      this.wpApi.createPackage({
        studentId: studentId,
        studentName: dto.memberNameAr || dto.memberNameEn || '',
        studentPhone: dto.memberPhone || '',
        packageName: dto.packageNameAr || dto.packageNameEn || 'باقة ساعات دراسية',
        hours: allocated,
        totalHours: allocated,
        cost: dto.cost || 0,
        price: dto.cost || 0,
        hourlyRate: dto.hourlyRate || 20,
        purchasedAt: dto.purchaseDate ? `${dto.purchaseDate}T00:00:00Z` : new Date().toISOString(),
        dateFrom: dto.purchaseDate ? `${dto.purchaseDate}T00:00:00Z` : new Date().toISOString(),
        dateTo: dto.expiryDate ? `${dto.expiryDate}T23:59:59Z` : null,
        payWay
      }).subscribe({
        next: (created) => {
          const newItem: PackageItem = {
            ...dto,
            id: created.id,
            remainingHours: created.remainingHours != null ? created.remainingHours : remainingHours,
            allocatedHours: created.hours || allocated,
            cost: created.cost || dto.cost,
            status,
            createdAt: created.purchasedAt || new Date().toISOString(),
            history: []
          };
          this.packagesState.update(list => [newItem, ...list]);
          recordSaleOnShift();
          this.showToast(this.langService.t().pkgStudentSold, 'success');
        },
        error: () => {
          this.showToast(this.langService.t().pkgStudentSaveFailed, 'error');
        }
      });
    } else {
      const instructorId = dto.memberId || Array.from(this.instructorMap.keys())[0] || '';
      this.cpApi.createPackage({
        instructorId: instructorId,
        instructorName: dto.memberNameAr || dto.memberNameEn || '',
        instructorPhone: dto.memberPhone || '',
        packageName: dto.packageNameAr || dto.packageNameEn || 'باقة ورش القاعات',
        hours: allocated,
        totalHours: allocated,
        cost: dto.cost || 0,
        price: dto.cost || 0,
        hourlyRate: dto.hourlyRate || 90,
        purchasedAt: dto.purchaseDate ? `${dto.purchaseDate}T00:00:00Z` : new Date().toISOString(),
        dateFrom: dto.purchaseDate ? `${dto.purchaseDate}T00:00:00Z` : new Date().toISOString(),
        dateTo: dto.expiryDate ? `${dto.expiryDate}T23:59:59Z` : null,
        payWay
      }).subscribe({
        next: (created) => {
          const newItem: PackageItem = {
            ...dto,
            id: created.id,
            remainingHours: created.remainingHours != null ? created.remainingHours : remainingHours,
            allocatedHours: created.hours || allocated,
            cost: created.cost || dto.cost,
            status,
            createdAt: created.purchasedAt || new Date().toISOString(),
            history: []
          };
          this.packagesState.update(list => [newItem, ...list]);
          recordSaleOnShift();
          this.showToast(this.langService.t().pkgInstructorSold, 'success');
        },
        error: () => {
          this.showToast(this.langService.t().pkgInstructorSaveFailed, 'error');
        }
      });
    }
    return true;
  }

  /** Add Multiple Packages */
  addPackages(dtos: CreatePackageDto[]): boolean {
    if (!dtos || dtos.length === 0) return false;
    let allSuccess = true;
    for (const dto of dtos) {
      const ok = this.addPackage(dto);
      if (!ok) allSuccess = false;
    }
    return allSuccess;
  }

  /** Add or Update a Member in memory options */
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
      this.memberOptionsState.update(items => items.map(i => (i.id === existing.id ? updated : i)));
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

    this.memberOptionsState.update(items => [newMember, ...items]);
    return newMember;
  }

  /** Update an Existing Package via API */
  updatePackage(id: string, dto: UpdatePackageDto): void {
    const existing = this.getPackageById(id);
    if (!existing) return;

    const allocatedHours = dto.allocatedHours !== undefined ? dto.allocatedHours : existing.allocatedHours;
    const usedHours = dto.usedHours !== undefined ? dto.usedHours : existing.usedHours;
    const remainingHours = Math.max(0, allocatedHours - usedHours);
    const expiryDate = dto.expiryDate !== undefined ? dto.expiryDate : existing.expiryDate;
    const status = this.computePackageStatus(expiryDate, remainingHours, dto.status || existing.status);

    const updatePayload = {
      hours: allocatedHours,
      remainingHours,
      cost: dto.cost !== undefined ? dto.cost : existing.cost,
      dateTo: expiryDate ? `${expiryDate}T23:59:59Z` : null,
      payWay: paymentMethodToPayWay(dto.paymentMethod || existing.paymentMethod)
    };

    const updateCall$: Observable<any> = existing.type === 'student'
      ? this.wpApi.updatePackage(id, { ...updatePayload, studentId: existing.memberId })
      : this.cpApi.updatePackage(id, { ...updatePayload, instructorId: existing.memberId });

    updateCall$.subscribe({
      next: () => {
        this.packagesState.update(list =>
          list.map(pkg => {
            if (pkg.id !== id) return pkg;
            return {
              ...pkg,
              ...dto,
              allocatedHours,
              usedHours,
              remainingHours,
              status
            };
          })
        );
        this.showToast(this.langService.t().pkgChangesSaved, 'success');
      },
      error: () => {
        this.showToast(this.langService.t().pkgChangesSaveFailed, 'error');
      }
    });
  }

  /** Record Session Usage (Deduct Hours) via API and immediate optimistic update */
  recordSessionUsage(id: string, usage: Omit<UsageHistory, 'id'>, sessionOrBookingId?: string | null): void {
    const pkg = this.getPackageById(id);
    if (!pkg) return;

    const remainingBefore = Math.max(0, Math.floor(pkg.remainingHours || 0));
    if (remainingBefore <= 0) {
      this.showToast(this.langService.t().pkgNoHoursLeft, 'error');
      return;
    }
    if (usage.duration > remainingBefore) {
      this.showToast(this.langService.tf('pkgPartialHours', { hours: remainingBefore }), 'info');
      usage = { ...usage, duration: remainingBefore };
    }

    const historyItem: UsageHistory = {
      ...usage,
      id: `USG-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`
    };

    // 1. Immediate optimistic state update so UI reflects deducted hours instantly
    const newUsed = +((pkg.usedHours || 0) + usage.duration).toFixed(2);
    const newRemaining = Math.max(0, +((pkg.allocatedHours || 0) - newUsed).toFixed(2));
    const newStatus = this.computePackageStatus(pkg.expiryDate, newRemaining, pkg.status);

    this.packagesState.update(list =>
      list.map(p => {
        if (p.id !== id) return p;
        return {
          ...p,
          usedHours: newUsed,
          remainingHours: newRemaining,
          status: newStatus,
          history: [historyItem, ...(p.history || [])]
        };
      })
    );

    const dto = { hours: usage.duration, note: usage.sessionAr || usage.sessionEn || null, sessionOrBookingId: /^[0-9a-fA-F-]{36}$/.test(sessionOrBookingId || '') ? sessionOrBookingId : null };
    const useHoursCall$: Observable<any> = pkg.type === 'student'
      ? this.wpApi.useHours(id, dto)
      : this.cpApi.useHours(id, dto);

    useHoursCall$.subscribe({
      next: () => {
        this.showToast(this.langService.tf('pkgUsageRecorded', { hours: usage.duration }), 'success');
        // Replace the optimistic entry with the server's history (ids, dates, remaining hours).
        this.loadUsageHistory(id).subscribe();
      },
      error: (err) => {
        this.showToast(this.langService.tf('pkgUsageSyncFailed', { error: extractApiErrorMessage(err, this.langService.t().connectionErrorFallback) }), 'error');
      }
    });
  }

  /** Helper for workspace checkout hour deduction */
  deductStudentPackageHours(phoneOrId: string, hours: number, sessionId?: string | null): void {
    if (!phoneOrId) return;
    const dur = hours > 0 ? hours : 1;
    const cleanQuery = phoneOrId.trim();
    const queryDigits = cleanQuery.replace(/\D/g, '');

    // Search active student packages with remaining hours
    const pkg = this.packagesState().find(p => {
      if (p.type !== 'student') return false;
      if ((p.remainingHours || 0) <= 0) return false;

      // 1. Match package ID or member ID
      if (p.id === cleanQuery || p.memberId === cleanQuery) return true;

      // 2. Match phone digits
      if (p.memberPhone) {
        const pDigits = p.memberPhone.replace(/\D/g, '');
        if (pDigits && queryDigits && (pDigits === queryDigits || pDigits.endsWith(queryDigits) || queryDigits.endsWith(pDigits))) {
          return true;
        }
      }

      // 3. Match member name
      if (p.memberNameAr && (p.memberNameAr.trim() === cleanQuery || p.memberNameAr.includes(cleanQuery) || cleanQuery.includes(p.memberNameAr))) {
        return true;
      }
      if (p.memberNameEn && (p.memberNameEn.trim().toLowerCase() === cleanQuery.toLowerCase() || p.memberNameEn.toLowerCase().includes(cleanQuery.toLowerCase()))) {
        return true;
      }
      return false;
    });

    if (pkg) {
      this.recordSessionUsage(pkg.id, {
        date: getTodayDateISO(),
        duration: dur,
        sessionAr: 'خصم ساعات جلسة مساحة العمل',
        sessionEn: 'Workspace Session Check-Out Deduction',
        roomOrDesk: this.langService.t().fbWorkspaceDesk
      }, sessionId);
    } else {
      this.showToast(this.langService.t().pkgNoActiveHours, 'error');
    }
  }

  /**
   * Hours already deducted for one session or booking, summed over the member's packages
   * (from the server usage history, which links each deduction to its session/booking).
   */
  hoursDeductedFor(sessionOrBookingId: string, memberId: string | null | undefined, type: 'student' | 'instructor'): Observable<number> {
    const ids = this.packagesState()
      .filter(p => p.type === type && !!memberId && p.memberId === memberId)
      .map(p => p.id);
    if (!sessionOrBookingId || ids.length === 0) return of(0);
    const api = type === 'instructor' ? this.cpApi : this.wpApi;
    return forkJoin(ids.map(id => api.getUsageHistory(id).pipe(catchError(() => of([]))))).pipe(
      map(lists => lists.flat()
        .filter(h => h.sessionOrBookingId === sessionOrBookingId)
        .reduce((sum, h) => sum + (Number(h.usedHours) || 0), 0))
    );
  }

  /** Loads a package's usage history from the server and stores it on the package. */
  loadUsageHistory(id: string): Observable<UsageHistory[]> {
    const pkg = this.getPackageById(id);
    const call$ = pkg?.type === 'instructor' ? this.cpApi.getUsageHistory(id) : this.wpApi.getUsageHistory(id);
    return call$.pipe(
      map(list => (list || [])
        .map(h => ({
          id: h.id,
          date: h.date || h.createdAt || '',
          duration: h.usedHours,
          sessionAr: h.note || h.sessionOrBooking || 'استهلاك ساعات',
          sessionEn: h.note || h.sessionOrBooking || 'Hours used'
        }) as UsageHistory)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))),
      tap(history => this.packagesState.update(all => all.map(p => (p.id === id ? { ...p, history } : p)))),
      catchError(err => {
        this.showToast(this.langService.tf('pkgUsageLoadFailed', { error: extractApiErrorMessage(err, this.langService.t().connectionErrorFallback) }), 'error');
        return of(pkg?.history || []);
      })
    );
  }

  /** Delete Package via API */
  deletePackage(id: string): void {
    const pkg = this.getPackageById(id);
    if (!pkg) return;

    const deleteCall$ = pkg.type === 'student'
      ? this.wpApi.deletePackage(id)
      : this.cpApi.deletePackage(id);

    deleteCall$.subscribe({
      next: () => {
        this.packagesState.update(list => list.filter(p => p.id !== id));
        this.showToast(this.langService.t().pkgDeleted, 'info');
      },
      error: () => {
        this.showToast(this.langService.t().pkgDeleteFailed, 'error');
      }
    });
  }
}
