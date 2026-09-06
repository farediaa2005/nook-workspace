/**
 * Classroom domain models and type definitions.
 * Central single source of truth for all classroom-related interfaces.
 */

export type RoomColorTheme = 'brown' | 'blue' | 'purple' | 'emerald' | 'orange' | 'rose';

export type ClassroomStatus = 'active' | 'available' | 'scheduled' | 'completed' | 'cancelled';

export type TimeAlertStatus = 'normal' | 'ending_soon' | 'ended_grace' | 'overtime_charged';

export type PaymentMethod = 'cash' | 'vodafone' | 'fawry' | 'instapay' | 'package';

/** Base Classroom entity */
export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied';
}

/** Live Board Classroom Card entity */
export interface ClassroomCard {
  id: string;
  roomId?: string;
  name: string;
  activity: string;
  instructor: string;
  status: ClassroomStatus;
  image: string;
  colorTheme?: RoomColorTheme;
  accentColor?: string;
  hourlyRate?: number;
  printingCharges?: number;
  startTime?: string;
  endTime?: string;
  bookingDate?: string;
  durationHours?: number;
  elapsed?: string;
  rental?: number;
  catering?: number;
  cateringItems?: any[];
  email?: string;
  phone?: string;
  paymentMode?: 'package' | 'cash';
  packageName?: string;
  packageCoveredHours?: number;
  packageExtraHours?: number;
  timeAlertStatus?: TimeAlertStatus;
  timeAlertMessage?: string;
  overdueMinutes?: number;
  depositAmount?: number;
  hasWifi?: boolean;
  wifiCost?: number;
}

/** Selectable Room definition for Booking forms */
export interface SelectableRoom {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  maxCapacity: number;
  image: string;
  imageUrl?: string;
  hourlyRate: number;
  colorTheme: RoomColorTheme;
  accentColor: string;
}

/** Canteen & Catering product item */
export interface CateringProductItem {
  id: string;
  nameEn: string;
  nameAr: string;
  price: number;
  count: number;
}

/** Coupon / Promo Code definition */
export interface ClassroomCoupon {
  code: string;
  discountPercent: number;
  discountName: string;
}

/** Payload for creating a new classroom booking */
export interface ClassroomBookingPayload {
  roomId: string;
  instructor: string;
  activitySubject: string;
  phone?: string;
  email?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  printingCharges?: number;
  discountPercent?: number;
}

/** Payload for completing classroom checkout */
export interface ClassroomCheckoutPayload {
  cardId: string;
  roomRate: number;
  durationHours: number;
  cateringAmount: number;
  printingAmount: number;
  manualAdjustment: number;
  loyaltyDiscount: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  finalAmount: number;
  changeDue: number;
}

/** Overtime and grace period calculation result */
export interface ClassroomOvertimeResult {
  overdueMinutes: number;
  extraHours: number;
  overtimeStatus: 'normal' | 'grace_period' | 'extra_hour';
  alertStatus: TimeAlertStatus;
  alertMessage: string;
}

/** Full reservation record used by the admin calendar and reservations table */
export interface AdminReservation {
  id: string;
  displayId: string;
  instructor: string;
  instructorTitle?: string;
  instructorAvatar?: string;
  activity: string;
  classroom: string;
  capacity?: number;
  date: string;        // 'Today' | ISO date string
  fullDate: string;
  startTime: string;   // '10:00' (24h)
  endTime: string;     // '12:00' (24h)
  timeRange: string;   // '10:00 - 12:00'
  durationHours: number;
  cost: number;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  colorTheme: 'yellow' | 'blue' | 'purple' | 'emerald' | 'orange' | 'rose';
  costBreakdown: {
    baseRate: number;
    baseRateLabel: string;
    equipmentAddon: number;
    earlyBirdDiscount: number;
    total: number;
  };
}

/** Room definition used in the admin calendar grid header */
export interface AdminConsoleRoom {
  id: string;
  name: string;
  capacity: number;
}

/** A single time-slot row in the 24-hour calendar grid */
export interface GridSlot {
  timeStr: string; // '00:00', '01:00', ... '23:00'
  hour: number;    // 0 to 23
}

/** A positioned reservation block rendered inside the calendar grid */
export interface RenderedBlock {
  reservation: AdminReservation;
  roomIndex: number;
  startMinutes: number;
  durationMinutes: number;
  topPx: number;
  heightPx: number;
  leftStyle: string;
  rightStyle: string;
  widthStyle: string;
}
