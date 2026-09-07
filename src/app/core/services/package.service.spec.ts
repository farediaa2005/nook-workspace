import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PackageService } from './package.service';
import { PackageItem, CreatePackageDto } from '../models/package.model';

describe('PackageService Business Rules and Operations', () => {
  let service: PackageService;
  let mockWpApi: any;
  let mockCpApi: any;
  let mockStudentApi: any;
  let mockInstructorApi: any;
  let mockShiftService: any;
  let mockAuthService: any;

  beforeEach(() => {
    mockWpApi = {
      getPackages: vi.fn(),
      createPackage: vi.fn(),
      updatePackage: vi.fn(),
      deletePackage: vi.fn()
    };
    mockCpApi = {
      getPackages: vi.fn(),
      createPackage: vi.fn(),
      updatePackage: vi.fn(),
      deletePackage: vi.fn()
    };
    mockStudentApi = { getStudents: vi.fn() };
    mockInstructorApi = { getInstructors: vi.fn() };
    mockShiftService = { recordTransaction: vi.fn() };
    mockAuthService = { isAuthenticated: () => false };

    // Instantiate service manually for pure unit testing
    service = Object.create(PackageService.prototype);
    (service as any).wpApi = mockWpApi;
    (service as any).cpApi = mockCpApi;
    (service as any).studentApi = mockStudentApi;
    (service as any).instructorApi = mockInstructorApi;
    (service as any).shiftService = mockShiftService;
    (service as any).authService = mockAuthService;
    (service as any).toast = { set: vi.fn() };
    (service as any).packagesState = (service as any).packagesState || (function() {
      let val: any = [];
      const sig: any = function() { return val; };
      sig.set = (v: any) => { val = v; };
      sig.update = (fn: any) => { val = fn(val); };
      return sig;
    })();
  });

  describe('computePackageStatus', () => {
    it('should return exhausted when remainingHours <= 0', () => {
      const status = service.computePackageStatus('2026-12-31', 0);
      expect(status).toBe('exhausted');
    });

    it('should return expired when expiryDate is in the past', () => {
      const pastDate = '2020-01-01';
      const status = service.computePackageStatus(pastDate, 10);
      expect(status).toBe('expired');
    });

    it('should return near_expiry when remaining hours <= 3', () => {
      const futureDate = '2028-12-31';
      const status = service.computePackageStatus(futureDate, 2);
      expect(status).toBe('near_expiry');
    });

    it('should return active when balance and expiry date are healthy', () => {
      const futureDate = '2028-12-31';
      const status = service.computePackageStatus(futureDate, 20);
      expect(status).toBe('active');
    });
  });

  describe('getActivePackageForMember & 1 Active Package Rule', () => {
    it('should identify active package for a student', () => {
      const mockPackages: PackageItem[] = [
        {
          id: 'PKG-1',
          memberId: 'STU-100',
          memberNameAr: 'أحمد محمود',
          memberNameEn: 'Ahmed Mahmoud',
          memberPhone: '01012345678',
          type: 'student',
          packageNameAr: 'باقة دراسية',
          packageNameEn: 'Study Pass',
          allocatedHours: 20,
          usedHours: 5,
          remainingHours: 15,
          cost: 400,
          hourlyRate: 20,
          purchaseDate: '2026-09-01',
          expiryDate: '2028-09-01',
          paymentMethod: 'cash',
          status: 'active',
          history: []
        }
      ];

      (service as any).packagesState.set(mockPackages);

      const activePkg = service.getActivePackageForMember('STU-100', '01012345678', 'student');
      expect(activePkg).toBeDefined();
      expect(activePkg?.id).toBe('PKG-1');
    });

    it('should prevent adding a second active package for the same student', () => {
      const mockPackages: PackageItem[] = [
        {
          id: 'PKG-1',
          memberId: 'STU-100',
          memberNameAr: 'أحمد محمود',
          memberNameEn: 'Ahmed Mahmoud',
          memberPhone: '01012345678',
          type: 'student',
          packageNameAr: 'باقة دراسية 1',
          packageNameEn: 'Study Pass 1',
          allocatedHours: 20,
          usedHours: 5,
          remainingHours: 15,
          cost: 400,
          hourlyRate: 20,
          purchaseDate: '2026-09-01',
          expiryDate: '2028-09-01',
          paymentMethod: 'cash',
          status: 'active',
          history: []
        }
      ];

      (service as any).packagesState.set(mockPackages);

      const newDto: CreatePackageDto = {
        memberId: 'STU-100',
        memberNameAr: 'أحمد محمود',
        memberPhone: '01012345678',
        type: 'student',
        packageNameAr: 'باقة دراسية 2',
        allocatedHours: 10,
        cost: 200,
        hourlyRate: 20,
        purchaseDate: '2026-09-07',
        expiryDate: '2028-10-07',
        paymentMethod: 'cash'
      };

      const result = service.addPackage(newDto);
      expect(result).toBe(false);
    });

    it('should allow adding a new package if the previous package is expired or exhausted', () => {
      const mockPackages: PackageItem[] = [
        {
          id: 'PKG-1',
          memberId: 'STU-100',
          memberNameAr: 'أحمد محمود',
          memberNameEn: 'Ahmed Mahmoud',
          memberPhone: '01012345678',
          type: 'student',
          packageNameAr: 'باقة دراسية قديمة',
          packageNameEn: 'Old Study Pass',
          allocatedHours: 20,
          usedHours: 20,
          remainingHours: 0,
          cost: 400,
          hourlyRate: 20,
          purchaseDate: '2025-01-01',
          expiryDate: '2025-02-01',
          paymentMethod: 'cash',
          status: 'exhausted',
          history: []
        }
      ];

      (service as any).packagesState.set(mockPackages);

      const activePkg = service.getActivePackageForMember('STU-100', '01012345678', 'student');
      expect(activePkg).toBeUndefined();
    });
  });
});
