/**
 * Classroom session models matching Backend OpenAPI 3.0.4 specifications.
 * Endpoints: GET/POST /api/Classrooms, GET/PUT/DELETE /api/Classrooms/{id},
 *            PUT /api/Classrooms/{id}/checkout, POST/DELETE /api/classrooms/{classroomId}/catering
 *
 * SessionStatus enum: 1=Existing, 2=Left
 * ClassroomType enum: 1=New, 2=Reservation, 3=InstructorPackage
 * PayWay enum: 1=Cash, 2=Vodafone, 3=Fawry, 4=Instapay
 * DiscountType enum: 1=Percentage, 2=FixedAmount
 * BookingStatus enum: 1=Pending, 2=Approved, 3=Rejected, 4=Cancelled
 */

import { PayWay, DiscountType, SessionStatus } from './workspace-session.model';

export { PayWay, DiscountType, SessionStatus };

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

/** SessionStatus for display use */
export type ClassroomSessionStatus = 'Active' | 'CheckedOut' | 'Cancelled' | 'Scheduled';

/** ClassroomPaymentMethod for display use */
export type ClassroomPaymentMethod = 'Cash' | 'Vodafone' | 'Fawry' | 'Instapay' | 'Package';

/** ClassroomType for display use */
export type ClassroomType = 'Lecture' | 'Workshop' | 'Training' | 'Meeting' | 'Exam';

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
  // UI and backward compatibility fields
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
  activity?: string | null;
  note?: string | null;
  instructorId?: string | null;
  // UI and backward compatibility fields
  instructorName?: string;
  classroomPackageId?: string;
  reservationId?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  hourlyRate?: number;
  printingCharges?: number;
  discountPercent?: number;
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
  activity?: string | null;
  note?: string | null;
  instructorId?: string | null;
  // UI and backward compatibility fields
  startTime?: string;
  endTime?: string;
}

/** Checkout classroom session — PUT /api/Classrooms/{id}/checkout */
export interface CheckoutClassroomDto {
  timeTo?: string | null;
  reservationCost?: number;
  printing?: number;
  discount?: number;
  discountType?: DiscountType | number | null;
  payWay?: PayWay | number;
  note?: string | null;
  // UI and backward compatibility fields
  paidAmount?: number;
  discountId?: string;
  paymentMethod?: string;
  roomRate?: number;
  durationHours?: number;
  finalAmount?: number;
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
  // Frontend convenience aliases
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

/** Add catering item request — POST /api/classrooms/{classroomId}/catering or /api/workspaces/{workspaceId}/catering */
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
  // UI and backward compatibility fields
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
  // UI and backward compatibility fields
  capacity?: number;
  description?: string;
}

