/**
 * Workspace session models matching Backend OpenAPI 3.0.4 specifications.
 * Endpoints: GET/POST /api/Workspaces, GET/PUT/DELETE /api/Workspaces/{id},
 *            PUT /api/Workspaces/{id}/checkout, POST/DELETE /api/workspaces/{workspaceId}/catering
 *
 * ZoneType enum: 0=Shared, 1=Quiet
 * WorkspaceType enum: 1=PerHour, 2=Package, 3=Coupon
 * SessionStatus enum: 1=Existing (active), 2=Left (checked-out)
 * PayWay enum: 1=Cash, 2=Vodafone, 3=Fawry, 4=Instapay
 * DiscountType enum: 1=Percentage, 2=FixedAmount
 */

export enum ZoneType {
  Shared = 0,
  Quiet = 1
}

export enum WorkspaceType {
  PerHour = 1,
  Package = 2,
  Coupon = 3
}

export enum SessionStatus {
  Existing = 1,
  Left = 2
}

export enum PayWay {
  Cash = 1,
  Vodafone = 2,
  Fawry = 3,
  Instapay = 4
}

export enum DiscountType {
  Percentage = 1,
  FixedAmount = 2
}

export type WorkspaceSessionStatus = 'Active' | 'CheckedOut' | 'Cancelled' | string;
export type WorkspacePaymentMethod = 'Cash' | 'Vodafone' | 'Fawry' | 'Instapay' | 'Package' | string;
export type WorkspaceBillingType = 'Session' | 'Package' | 'Coupon' | string;

/** Workspace session response DTO from GET /api/Workspaces */
export interface WorkspaceDto {
  id: string;
  zone?: ZoneType | number;
  timeFrom?: string | null;
  timeTo?: string | null;
  date?: string | null;
  wiFi?: number;
  printing?: number;
  discount?: number;
  registration?: number;
  wallet?: number;
  type?: WorkspaceType | number;
  payWay?: PayWay | number;
  status?: SessionStatus | number;
  discountType?: DiscountType | number | null;
  note?: string | null;
  studentId?: string | null;
  seatElementId?: string | null;
}

/** Workspace session detail DTO from GET /api/Workspaces/{id} */
export interface WorkspaceDetailDto extends WorkspaceDto {
  studentName?: string | null;
  studentPhoneNumber?: string | null;
  seatLabel?: string | null;
  totalCost?: number;
}

/** Workspace session DTO for UI & backward compatibility */
export interface WorkspaceSessionDto extends WorkspaceDto {
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  faculty?: string;
  college?: string;
  roomId?: string | null;
  roomName?: string;
  seatLabel?: string | null;
  reservationCost?: number;
  paidAmount?: number;
  totalCost?: number;
  checkInTime?: string;
  checkOutTime?: string;
  expectedCheckoutTime?: string;
  sessionPrice?: number;
  billingType?: WorkspaceBillingType;
  packageId?: string;
  packageName?: string;
  couponCode?: string;
  couponDiscount?: number;
  cateringTotal?: number;
  printingCharges?: number;
  notes?: string;
  wifiCode?: string;
  createdAt?: string;
}

/** Legacy alias */
export type BackendWorkspaceDto = WorkspaceSessionDto;

/** Create workspace session request — POST /api/Workspaces */
export interface CreateWorkspaceDto {
  zone?: ZoneType | number;
  timeFrom?: string | null;
  timeTo?: string | null;
  date?: string | null;
  wiFi?: number;
  printing?: number;
  discount?: number;
  registration?: number;
  wallet?: number;
  type?: WorkspaceType | number;
  payWay?: PayWay | number;
  discountType?: DiscountType | number | null;
  note?: string | null;
  studentId?: string | null;
  seatElementId?: string | null;
  // UI and backward compatibility fields
  roomId?: string;
  workspacePackageId?: string;
  couponId?: string;
}

/** Alias for CreateWorkspaceDto */
export type CreateWorkspaceSessionDto = CreateWorkspaceDto;

/** Update workspace session request — PUT /api/Workspaces/{id} */
export interface UpdateWorkspaceDto {
  zone?: ZoneType | number;
  timeFrom?: string | null;
  timeTo?: string | null;
  date?: string | null;
  wiFi?: number;
  printing?: number;
  discount?: number;
  registration?: number;
  wallet?: number;
  type?: WorkspaceType | number;
  payWay?: PayWay | number;
  status?: SessionStatus | number;
  discountType?: DiscountType | number | null;
  note?: string | null;
  seatElementId?: string | null;
}

/** Checkout workspace session — PUT /api/Workspaces/{id}/checkout */
export interface CheckoutWorkspaceDto {
  timeTo?: string | null;
  wiFi?: number;
  printing?: number;
  registration?: number;
  discount?: number;
  discountType?: DiscountType | number | null;
  wallet?: number;
  payWay?: PayWay | number;
  note?: string | null;
  // UI and backward compatibility fields
  paidAmount?: number;
  discountId?: string;
  paymentMethod?: string;
  totalCost?: number;
  remainingAmount?: number;
}

/** Alias for CheckoutWorkspaceDto */
export type CheckoutWorkspaceSessionDto = CheckoutWorkspaceDto;

/** Catering line item for workspace sessions */
export interface CateringLineItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

/** Student directory item for workspace directory view */
export interface StudentDirectoryItem {
  id: string;
  studentId?: string;
  name: string;
  avatar?: string;
  phone: string;
  whatsapp: string;
  email: string;
  faculty: string;
  college: string;
  currentStatus: 'active' | 'offline' | 'blocked';
  activeSession?: any;
  packageInfo?: {
    hasPackage: boolean;
    packageName?: string;
    packageNameAr?: string;
    packageNameEn?: string;
    remainingHours?: number;
    totalHours?: number;
    status?: string;
  };
  totalVisits: number;
  lastVisitDate?: string;
  lastVisitTime?: string;
  totalSpent: number;
}

