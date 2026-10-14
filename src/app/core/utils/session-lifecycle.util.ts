import { parseTimeToMinutes } from './date-time.util';

export type SessionStatusType = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface SessionLifecycleParams {
  startTime: string; // "14:00" or "02:00 PM"
  endTime: string;   // "16:00" or "04:00 PM"
  bookingDate?: string; // "YYYY-MM-DD"
  status: SessionStatusType;
  hourlyRate: number;
  actualCheckInTime?: string | Date;
  actualCheckOutTime?: string | Date;
  now?: Date;
}

export interface SessionLifecycleResult {
  agreedDurationHours: number;
  actualElapsedMinutes: number;
  overdueMinutes: number;
  extraHours: number; // Rounded up to next started hour (Option 3 default)
  totalBilledHours: number;
  rentalCost: number;
  overtimeCost: number;
  totalCost: number;
  isOverdue: boolean;
  isRoomOccupied: boolean;
  alertStatus: 'normal' | 'ending_soon' | 'overtime';
  alertMessageAr: string;
  alertMessageEn: string;
}

/**
 * Pure calculation function for Room Occupancy & Overtime Billing Lifecycle.
 * Rule: Any room session running past scheduled end stays OCCUPIED until explicit checkout.
 * Overtime billing policy: Any started hour is rounded up to next full hour.
 */
export function calculateSessionDurationAndOvertime(
  params: SessionLifecycleParams
): SessionLifecycleResult {
  const {
    startTime,
    endTime,
    bookingDate,
    status,
    hourlyRate = 0,
    actualCheckOutTime,
    now = new Date()
  } = params;

  // 1. Calculate agreed duration
  const startMins = parseTimeToMinutes(startTime);
  let endMins = parseTimeToMinutes(endTime);
  if (endMins <= startMins) {
    endMins = startMins + 120; // fallback 2 hours
  }
  const diffMinutes = Math.max(0, endMins - startMins);
  const agreedDurationHours = Math.max(1, Math.round(diffMinutes / 60));

  // If completed, not active, or cancelled with no checkout time
  if (status === 'completed' || status === 'cancelled') {
    const rentalCost = Number((agreedDurationHours * hourlyRate).toFixed(2));
    return {
      agreedDurationHours,
      actualElapsedMinutes: diffMinutes,
      overdueMinutes: 0,
      extraHours: 0,
      totalBilledHours: agreedDurationHours,
      rentalCost,
      overtimeCost: 0,
      totalCost: rentalCost,
      isOverdue: false,
      isRoomOccupied: false,
      alertStatus: 'normal',
      alertMessageAr: '',
      alertMessageEn: ''
    };
  }

  // 2. Build target start and end Date objects
  const dateStr = bookingDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const startDateTime = new Date(y, m, d, Math.floor(startMins / 60), startMins % 60, 0);
  const endDateTime = new Date(y, m, d, Math.floor(endMins / 60), endMins % 60, 0);
  if (endDateTime.getTime() <= startDateTime.getTime()) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  // Effective current evaluation timestamp
  let effectiveNow = now;
  if (actualCheckOutTime) {
    effectiveNow = typeof actualCheckOutTime === 'string' ? new Date(actualCheckOutTime) : actualCheckOutTime;
  }

  // Elapsed minutes since start
  const actualElapsedMinutes = Math.max(0, Math.floor((effectiveNow.getTime() - startDateTime.getTime()) / 60000));

  // Check if overdue
  let overdueMinutes = 0;
  if (effectiveNow.getTime() > endDateTime.getTime()) {
    overdueMinutes = Math.floor((effectiveNow.getTime() - endDateTime.getTime()) / 60000);
  }

  const isOverdue = overdueMinutes > 0;
  // Overtime billing: 15 min past end -> 1 extra hour, 65 min past -> 2 extra hours
  const extraHours = isOverdue ? Math.ceil(overdueMinutes / 60) : 0;
  const totalBilledHours = agreedDurationHours + extraHours;

  const rentalCost = Number((agreedDurationHours * hourlyRate).toFixed(2));
  const overtimeCost = Number((extraHours * hourlyRate).toFixed(2));
  const totalCost = Number((rentalCost + overtimeCost).toFixed(2));

  // Room stays occupied while status is 'active' until explicit manual checkout
  const isRoomOccupied = status === 'active';

  // Determine alert status & messages
  let alertStatus: 'normal' | 'ending_soon' | 'overtime' = 'normal';
  let alertMessageAr = '';
  let alertMessageEn = '';

  if (isOverdue) {
    alertStatus = 'overtime';
    alertMessageAr = `تجاوز الوقت بـ ${overdueMinutes} دقيقة (+${extraHours} ساعة إضافية)`;
    alertMessageEn = `Exceeded scheduled time by ${overdueMinutes}m (+${extraHours}h overtime)`;
  } else {
    const remainingMinutes = Math.floor((endDateTime.getTime() - effectiveNow.getTime()) / 60000);
    if (remainingMinutes <= 15 && remainingMinutes >= 0 && status === 'active') {
      alertStatus = 'ending_soon';
      alertMessageAr = `ينتهي الحجز خلال ${remainingMinutes} دقيقة`;
      alertMessageEn = `Reservation ends in ${remainingMinutes}m`;
    }
  }

  return {
    agreedDurationHours,
    actualElapsedMinutes,
    overdueMinutes,
    extraHours,
    totalBilledHours,
    rentalCost,
    overtimeCost,
    totalCost,
    isOverdue,
    isRoomOccupied,
    alertStatus,
    alertMessageAr,
    alertMessageEn
  };
}
