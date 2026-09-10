/**
 * Classroom domain models and type definitions.
 * Clean Architecture Layer 1: Model & DTOs
 * Central single source of truth for all classroom DTOs and UI interfaces.
 */

import { PayWay, DiscountType, SessionStatus } from './workspace-session.model';

export { PayWay, DiscountType, SessionStatus };

// ==========================================
// 1. ENUMS
// ==========================================

export enum ClassroomTypeEnum {
  New = 1,
  Reservation = 2,
  InstructorPackage = 3
}

export enum BookingStatusEnum {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4
}
export { BookingStatusEnum as BookingStatus };

export type RoomColorTheme = 'brown' | 'blue' | 'purple' | 'emerald' | 'orange' | 'rose';

export type ClassroomStatus = 'active' | 'available' | 'scheduled' | 'completed' | 'cancelled';

export type TimeAlertStatus = 'normal' | 'ending_soon' | 'ended_grace' | 'overtime_charged';

export type PaymentMethod = 'cash' | 'vodafone' | 'fawry' | 'instapay' | 'package';

export type ClassroomSessionStatus = 'Active' | 'CheckedOut' | 'Cancelled' | 'Scheduled';

export type ClassroomPaymentMethod = 'Cash' | 'Vodafone' | 'Fawry' | 'Instapay' | 'Package';

export type ClassroomType = 'Lecture' | 'Workshop' | 'Training' | 'Meeting' | 'Exam';

// ==========================================
// 2. BACKEND DTOs (Matching Backend OpenAPI Specs)
// ==========================================

/** Classroom session from backend GET /api/Classrooms */
export interface ClassroomDto {
  id: string;
  date?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  roomId?: string | null;
  printing?: number;
  discount?: number;
  reservationCost?: number;
  payWay?: PayWay | number;
  status?: SessionStatus | number;
  discountType?: DiscountType | number | null;
  type?: ClassroomTypeEnum | number;
  activity?: string | null;
  note?: string | null;
  instructorId?: string | null;
  // UI & Enriched Fields (from Join / Lookup)
  roomName?: string | null;
  instructorName?: string | null;
  instructorPhone?: string | null;
  instructorPhoneNumber?: string | null;
  instructorEmail?: string;
  paidAmount?: number;
  classroomPackageId?: string;
  discountId?: string;
  reservationId?: string;
  durationHours?: number;
  hourlyRate?: number;
  rentalCost?: number;
  cateringTotal?: number;
  printingCharges?: number;
  totalCost?: number;
  paymentMethod?: ClassroomPaymentMethod;
  packageId?: string;
  packageName?: string;
  discountPercent?: number;
  notes?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
}

/** Classroom session detail DTO from GET /api/Classrooms/{id} */
export interface ClassroomDetailDto extends ClassroomDto {
  instructorName?: string | null;
  instructorPhoneNumber?: string | null;
  roomName?: string | null;
  totalCost?: number;
}

/** Create classroom session request — POST /api/Classrooms */
export interface CreateClassroomDto {
  date?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  roomId?: string | null;
  printing?: number;
  discount?: number;
  reservationCost?: number;
  payWay?: PayWay | number;
  discountType?: DiscountType | number | null;
  type?: ClassroomTypeEnum | number;
  title?: string | null;
  activity?: string | null;
  expectedAttendees?: number | null;
  note?: string | null;
  instructorId?: string | null;
  // UI & Shift Audit aliases
  instructorName?: string;
  instructorPhone?: string;
  instructorEmail?: string;
  hourlyRate?: number;
  printingCharges?: number;
  discountPercent?: number;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  shiftId?: string | null;
  staffId?: string | null;
}

/** Update classroom session request — PUT /api/Classrooms/{id} */
export interface UpdateClassroomDto {
  date?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  roomId?: string | null;
  printing?: number;
  discount?: number;
  reservationCost?: number;
  payWay?: PayWay | number;
  status?: SessionStatus | number;
  discountType?: DiscountType | number | null;
  type?: ClassroomTypeEnum | number;
  title?: string | null;
  activity?: string | null;
  note?: string | null;
  instructorId?: string | null;
  // UI convenience
  startTime?: string;
  endTime?: string;
  shiftId?: string | null;
  staffId?: string | null;
}

/** Checkout classroom session — PUT /api/Classrooms/{id}/checkout */
export interface CheckoutClassroomDto {
  timeTo?: string | null;
  actualAttendees?: number | null;
  paymentMethod?: string | number | null;
  usePackageHours?: number | null;
  packageId?: string | null;
  paidAmount?: number;
  reservationCost?: number;
  printing?: number;
  discount?: number;
  discountType?: DiscountType | number | null;
  payWay?: PayWay | number;
  note?: string | null;
  // Shift & Audit tracking
  shiftId?: string | null;
  staffId?: string | null;
  // UI & Calculation details
  roomRate?: number;
  durationHours?: number;
  finalAmount?: number;
  cateringAmount?: number;
  changeDue?: number;
}

export enum RecurrenceFrequency {
  Daily = 1,
  Weekly = 2,
  Monthly = 3
}

/** Reservation DTO from /api/Reservations */
export interface ReservationDto {
  id: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  dayOfWeek?: number | null;
  roomId?: string | null;
  roomName?: string | null;
  discount?: number;
  discountType?: DiscountType | number | null;
  reservationCost?: number;
  activity?: string | null;
  note?: string | null;
  instructorId?: string | null;
  instructorName?: string | null;
  instructorPhone?: string | null;
  instructorPhoneNumber?: string | null;
  recurrenceFrequency?: RecurrenceFrequency | number | null;
  recurrenceInterval?: number;
  daysOfWeek?: number[] | string | null;
  totalSessions?: number | null;
  isOngoing?: boolean;
  canceledDates?: string[];
  upcomingSessions?: string[];
  status?: SessionStatus | number;
}

/** Create reservation request — POST /api/Reservations */
export interface CreateReservationDto {
  timeFrom?: string | null;
  timeTo?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  dayOfWeek?: number | null;
  roomId?: string | null;
  discount?: number;
  discountType?: DiscountType | number | null;
  reservationCost?: number;
  activity?: string | null;
  note?: string | null;
  instructorId?: string | null;
  recurrenceFrequency?: RecurrenceFrequency | number | null;
  recurrenceInterval?: number;
  daysOfWeek?: number[] | string | null;
  totalSessions?: number | null;
  isOngoing?: boolean;
  // UI convenience
  instructorName?: string;
  instructorPhone?: string;
  roomName?: string;
}

/** Update reservation request — PUT /api/Reservations/{id} */
export interface UpdateReservationDto extends Partial<CreateReservationDto> {}

/** Standalone Reservation Conflict Check Request — POST /api/Reservations/check-conflict */
export interface CheckReservationConflictDto {
  roomId: string;
  dateFrom: string;
  dateTo?: string;
  timeFrom: string;
  timeTo: string;
  recurrenceFrequency?: RecurrenceFrequency | number;
  recurrenceInterval?: number;
  daysOfWeek?: number[];
  totalSessions?: number;
  isOngoing?: boolean;
  excludeReservationId?: string | null;
}

/** Individual Conflict Details */
export interface ReservationConflictItemDto {
  date: string;
  timeFrom: string;
  timeTo: string;
  conflictType: 'Classroom' | 'Workspace' | 'Reservation' | string;
  conflictingEntityId?: string;
  conflictingEntityName?: string;
  reason?: string;
}

/** Conflict Check Result Response */
export interface ReservationConflictCheckResultDto {
  hasConflict: boolean;
  message?: string;
  totalDatesChecked: number;
  conflictingDatesCount: number;
  conflicts: ReservationConflictItemDto[];
  availableDates: string[];
  conflictingDates: string[];
}

/** Cancel a day from reservation interval — POST /api/Reservations/{id}/cancel-day */
export interface CancelReservationDayDto {
  date: string;
  reason?: string;
}

/** Create Classroom Session from Reservation — POST /api/Reservations/{id}/create-classroom */
export interface CreateClassroomFromReservationDto {
  date: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  expectedAttendees?: number;
  note?: string;
}

/** Booking (Admin reservation) DTO from /api/Bookings */
export interface BookingDto {
  id: string;
  roomId?: string | null;
  roomName?: string | null;
  instructorId?: string | null;
  instructorName?: string | null;
  date?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  status?: BookingStatusEnum | number;
  note?: string | null;
  createdAt?: string;
  activity?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  cost?: number;
  notes?: string;
}

/** Update booking status — PUT /api/Bookings/{id}/status */
export interface UpdateBookingStatusDto {
  status: BookingStatusEnum | number;
  notes?: string;
}

/** Catering item response DTO */
export interface CateringItemDto {
  id: string;
  productId?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** Add catering item request — POST /api/classrooms/{classroomId}/catering */
export interface AddCateringItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/** Update catering item — PUT /api/classrooms/{classroomId}/catering/{id} */
export interface UpdateCateringItemDto {
  quantity?: number;
  unitPrice?: number;
}

/** Room DTO from /api/Rooms */
export interface RoomDto {
  id: string;
  name: string;
  supportsWorkspace?: boolean;
  supportsClassroom?: boolean;
  workspaceZone?: number;
  isActive?: boolean;
  imageUrl?: string;
  capacity?: number;
  description?: string;
  createdAt?: string;
  nameEn?: string;
  hourlyPrice?: number;
}

/** Create room request — POST /api/Rooms */
export interface CreateRoomDto {
  name: string;
  supportsWorkspace?: boolean;
  supportsClassroom?: boolean;
  workspaceZone?: number;
  isActive?: boolean;
  imageUrl?: string;
  imageFile?: File;
  capacity?: number;
  description?: string;
}

// ==========================================
// 3. FRONTEND UI MODELS
// ==========================================

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
  instructorId?: string;
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
  type?: string;
  capacity?: number;
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
  paymentMode?: 'package' | 'cash';
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
  attendeesCount?: number;
  usePackageHours?: number;
  packageId?: string;
  notes?: string;
  shiftId?: string;
  staffId?: string;
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
  reservationId?: string;
  occurrenceDate?: string;
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
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency | number | null;
  recurrenceInterval?: number;
  daysOfWeek?: number[] | string | null;
  totalSessions?: number | null;
  isOngoing?: boolean;
  canceledDates?: string[];
  upcomingSessions?: string[];
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
  hourlyRate?: number;
  image?: string;
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
