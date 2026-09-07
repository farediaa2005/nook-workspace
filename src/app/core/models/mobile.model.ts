import { ZoneType } from './workspace-session.model';
import { BookingStatus } from './classroom-session.model';
import { PackageType } from './package.model';
import { PricingScope } from './pricing-plan.model';

/**
 * Mobile Student and Mobile Instructor domain models matching OpenAPI 3.0.4.
 * Endpoints: /api/mobile/student/* and /api/mobile/instructor/*
 */

export interface MobileStudentProfileDto {
  id: string;
  accountId?: string | null;
  name: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
  walletBalance: number;
  canBook: boolean;
  facultyId?: string | null;
  facultyName?: string | null;
}

export interface UpdateMobileStudentProfileDto {
  name: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
}

export interface MobileInstructorProfileDto {
  id: string;
  accountId?: string | null;
  name: string;
  phoneNumber?: string | null;
  colour?: string | null;
}

export interface UpdateMobileInstructorProfileDto {
  name: string;
  phoneNumber?: string | null;
  colour?: string | null;
}

export interface MobileRoomDto {
  id: string;
  name: string;
  supportsWorkspace: boolean;
  supportsClassroom: boolean;
  workspaceZone?: ZoneType | null;
  imageUrl?: string | null;
}

export interface MobileRoomAvailabilityDto {
  roomId: string;
  date?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  isAvailable: boolean;
  conflictReason?: string | null;
}

export interface MobileFloorPlanDto {
  id: string;
  name: string;
  zone: ZoneType;
  canvasWidth: number;
  canvasHeight: number;
  isPublished: boolean;
  roomId?: string | null;
  roomName?: string | null;
  elements?: MobileSeatElementDto[];
}

export interface MobileSeatElementDto {
  id: string;
  label: string;
  seatElementTypeId: string;
  seatElementTypeName: string;
  seatElementTypeImageUrl?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  isBookable: boolean;
  isAvailable: boolean;
}

export interface MobileBookingDto {
  id: string;
  startTime: string;
  endTime?: string | null;
  partySize: number;
  status: BookingStatus;
  source?: number;
  note?: string | null;
  seatElementId?: string | null;
  seatLabel?: string | null;
  roomId?: string | null;
  roomName?: string | null;
  createdAt: string;
}

export interface CreateMobileStudentBookingDto {
  seatElementId: string;
  startTime: string;
  endTime?: string | null;
  partySize?: number;
  note?: string | null;
}

export interface MobilePricingPlanDto {
  id: string;
  roomId: string;
  roomName?: string | null;
  scope: PricingScope;
  baseHours: number;
  baseCost: number;
  overageHourlyRate: number;
  note?: string | null;
}

export interface MobilePackagePricingPlanDto {
  id: string;
  name: string;
  packageType: PackageType;
  roomId?: string | null;
  roomName?: string | null;
  hours: number;
  price: number;
  validityDays?: number | null;
  note?: string | null;
}

export interface MobileReservationDto {
  id: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  dayOfWeek?: number | null;
  roomId?: string | null;
  roomName?: string | null;
  reservationCost: number;
  activity?: string | null;
  note?: string | null;
}

export interface NotificationDto {
  id: string;
  title: string;
  body?: string | null;
  isRead: boolean;
  type?: string | null;
  referenceId?: string | null;
  accountId: string;
  createdAt: string;
}
