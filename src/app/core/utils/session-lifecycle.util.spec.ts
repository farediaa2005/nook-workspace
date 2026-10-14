import { describe, it, expect } from 'vitest';
import { calculateSessionDurationAndOvertime } from './session-lifecycle.util';

describe('Session Lifecycle & Overtime Billing Util (NOOK-DEV-01)', () => {
  const baseParams = {
    startTime: '14:00',
    endTime: '16:00',
    bookingDate: '2026-10-15',
    status: 'active' as const,
    hourlyRate: 100
  };

  it('should compute standard 2-hour duration without overtime when within schedule', () => {
    const now = new Date(2026, 9, 15, 15, 0, 0); // 15:00
    const result = calculateSessionDurationAndOvertime({ ...baseParams, now });

    expect(result.agreedDurationHours).toBe(2);
    expect(result.overdueMinutes).toBe(0);
    expect(result.extraHours).toBe(0);
    expect(result.totalBilledHours).toBe(2);
    expect(result.rentalCost).toBe(200);
    expect(result.overtimeCost).toBe(0);
    expect(result.totalCost).toBe(200);
    expect(result.isOverdue).toBe(false);
    expect(result.isRoomOccupied).toBe(true);
    expect(result.alertStatus).toBe('normal');
  });

  it('should flag ending_soon when 10 minutes remain before scheduled end', () => {
    const now = new Date(2026, 9, 15, 15, 50, 0); // 15:50
    const result = calculateSessionDurationAndOvertime({ ...baseParams, now });

    expect(result.alertStatus).toBe('ending_soon');
    expect(result.extraHours).toBe(0);
    expect(result.isOverdue).toBe(false);
  });

  it('should charge 1 extra hour when session runs 15 minutes past end (acceptance test)', () => {
    const now = new Date(2026, 9, 15, 16, 15, 0); // 16:15
    const result = calculateSessionDurationAndOvertime({ ...baseParams, now });

    expect(result.overdueMinutes).toBe(15);
    expect(result.extraHours).toBe(1); // 15 mins rounded up to 1 full hour
    expect(result.totalBilledHours).toBe(3); // 2 agreed + 1 extra
    expect(result.rentalCost).toBe(200);
    expect(result.overtimeCost).toBe(100);
    expect(result.totalCost).toBe(300);
    expect(result.isOverdue).toBe(true);
    expect(result.isRoomOccupied).toBe(true); // Stays occupied!
    expect(result.alertStatus).toBe('overtime');
  });

  it('should charge 2 extra hours when session runs 65 minutes past end', () => {
    const now = new Date(2026, 9, 15, 17, 5, 0); // 17:05
    const result = calculateSessionDurationAndOvertime({ ...baseParams, now });

    expect(result.overdueMinutes).toBe(65);
    expect(result.extraHours).toBe(2);
    expect(result.totalBilledHours).toBe(4);
    expect(result.overtimeCost).toBe(200);
    expect(result.totalCost).toBe(400);
    expect(result.isRoomOccupied).toBe(true);
  });

  it('should not be overdue at exact end boundary (16:00)', () => {
    const now = new Date(2026, 9, 15, 16, 0, 0); // 16:00
    const result = calculateSessionDurationAndOvertime({ ...baseParams, now });

    expect(result.overdueMinutes).toBe(0);
    expect(result.extraHours).toBe(0);
    expect(result.totalBilledHours).toBe(2);
  });

  it('should mark room not occupied when status is completed', () => {
    const result = calculateSessionDurationAndOvertime({
      ...baseParams,
      status: 'completed',
      actualCheckOutTime: new Date(2026, 9, 15, 16, 0, 0)
    });

    expect(result.isRoomOccupied).toBe(false);
  });
});
