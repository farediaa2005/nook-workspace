import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ShiftService } from './shift.service';
import { AuthService } from './auth.service';
import { ShiftRecord } from '../models/shift.model';
import { provideHttpClient } from '@angular/common/http';

describe('Shift Editing & Checkout Permissions (Requirement 5)', () => {
  let shiftService: ShiftService;
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isAdmin: ReturnType<typeof vi.fn>;
    getRole: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      isAdmin: vi.fn(),
      getRole: vi.fn(),
      getUser: vi.fn().mockReturnValue({ name: 'Sara Receptionist' })
    };

    TestBed.configureTestingModule({
      providers: [
        ShiftService,
        { provide: AuthService, useValue: authServiceMock },
        provideHttpClient()
      ]
    });
    shiftService = TestBed.inject(ShiftService);
  });

  it('should allow authorized ordinary staff to edit start time while shift is OPEN', () => {
    // Non-admin user
    authServiceMock.isAdmin.mockReturnValue(false);
    authServiceMock.getRole.mockReturnValue('Staff');

    const openShift: ShiftRecord = {
      id: 'shift-open-1',
      staffName: 'Sara Receptionist',
      staffEmail: 'sara@nook.com',
      role: 'Staff',
      date: '2026-10-23',
      startTime: '09:00 AM',
      status: 'active',
      initialCashDrawer: 500,
      startVodafoneCash: 0,
      startInstapay: 0,
      startFawry: 0,
      canteenRevenue: 0,
      classroomRevenue: 0,
      workspaceRevenue: 0,
      packageRevenue: 0,
      otherIncome: 0,
      adminExpenses: 0,
      vodafoneCashInside: 0,
      vodafoneCashOutside: 0,
      instapayCashInside: 0,
      instapayCashOutside: 0,
      fawryCashInside: 0,
      fawryCashOutside: 0,
      totalRevenue: 0,
      transactionsCount: 0,
      transactions: []
    };

    expect(shiftService.canEditShift(openShift)).toBe(true);
  });

  it('should STRICTLY FORBID ordinary staff from editing shift after checkout has completed', () => {
    // Non-admin user
    authServiceMock.isAdmin.mockReturnValue(false);
    authServiceMock.getRole.mockReturnValue('Staff');

    const checkedOutShift: ShiftRecord = {
      id: 'shift-closed-1',
      staffName: 'Sara Receptionist',
      staffEmail: 'sara@nook.com',
      role: 'Staff',
      date: '2026-10-23',
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      status: 'closed',
      initialCashDrawer: 500,
      startVodafoneCash: 0,
      startInstapay: 0,
      startFawry: 0,
      canteenRevenue: 0,
      classroomRevenue: 0,
      workspaceRevenue: 0,
      packageRevenue: 0,
      otherIncome: 0,
      adminExpenses: 0,
      vodafoneCashInside: 0,
      vodafoneCashOutside: 0,
      instapayCashInside: 0,
      instapayCashOutside: 0,
      fawryCashInside: 0,
      fawryCashOutside: 0,
      totalRevenue: 0,
      transactionsCount: 0,
      transactions: []
    };

    expect(shiftService.canEditShift(checkedOutShift)).toBe(false);

    // Also verify updateShiftTime rejects with error
    let thrown = false;
    shiftService.updateShiftTime('shift-closed-1', '08:30 AM').subscribe({
      next: () => {},
      error: (err) => {
        thrown = true;
        expect(err.message).toContain('غير مصرح');
      }
    });
    expect(thrown).toBe(true);
  });

  it('should allow Admin to edit both open and checked-out shifts', () => {
    // Admin user
    authServiceMock.isAdmin.mockReturnValue(true);
    authServiceMock.getRole.mockReturnValue('Admin');

    const closedShift: ShiftRecord = {
      id: 'shift-closed-2',
      staffName: 'Old Staff',
      staffEmail: '',
      role: 'Staff',
      date: '2026-10-22',
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      status: 'closed',
      initialCashDrawer: 500,
      startVodafoneCash: 0,
      startInstapay: 0,
      startFawry: 0,
      canteenRevenue: 0,
      classroomRevenue: 0,
      workspaceRevenue: 0,
      packageRevenue: 0,
      otherIncome: 0,
      adminExpenses: 0,
      vodafoneCashInside: 0,
      vodafoneCashOutside: 0,
      instapayCashInside: 0,
      instapayCashOutside: 0,
      fawryCashInside: 0,
      fawryCashOutside: 0,
      totalRevenue: 0,
      transactionsCount: 0,
      transactions: []
    };

    expect(shiftService.canEditShift(closedShift)).toBe(true);
  });
});
