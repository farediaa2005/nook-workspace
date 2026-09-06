/**
 * Student & Session domain models & DTOs for backend API readiness.
 * OpenAPI 3.0.4: GET/POST /api/Students, GET/PUT/DELETE /api/Students/{id}
 */

export interface StudentDto {
  id: string;
  name: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
  canBook?: boolean;
  facultyName?: string | null;
  parentName?: string | null;
}

export interface CreateStudentDto {
  name: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
  facultyId?: string | null;
  parentId?: string | null;
  // UI and backward compatibility fields
  phone?: string;
  email?: string;
  faculty?: string;
  college?: string;
  sessionPrice?: number;
  notes?: string;
}

export interface UpdateStudentDto {
  id?: string;
  name?: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
  canBook?: boolean;
  facultyId?: string | null;
  parentId?: string | null;
  // UI and backward compatibility fields
  phone?: string;
  email?: string;
  faculty?: string;
  college?: string;
  sessionPrice?: number;
  status?: 'active' | 'in-session' | 'inactive' | 'blocked' | 'completed';
  notes?: string;
}

export interface Student {
  id: string;
  studentId?: string;
  name: string;
  avatar?: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  faculty?: string;
  college?: string;
  date?: string;
  checkInTime?: string;
  expectedCheckout?: string;
  checkOutTime?: string;
  checkOutDate?: string;
  duration?: string;
  cost?: number;
  sessionPrice?: number;
  billingType?: 'new-session' | 'package' | 'coupon';
  packageOrCoupon?: string;
  printingCount?: number;
  printingPages?: number;
  walletAmount?: number;
  wifiCode?: string;
  wifiVoucher?: string;
  cateringTotal?: number;
  cateringItems?: any[];
  outstandingBalance?: number;
  paymentStatus?: 'paid' | 'partially_paid' | 'pending';
  depositAmount?: number;
  status: 'active' | 'in-session' | 'inactive' | 'blocked' | 'completed';
  notes?: string;
}

export interface ActiveStudentSession extends Student {
  billingType: 'new-session' | 'package' | 'coupon';
  status: 'active' | 'completed' | 'blocked';
}

export interface SessionCheckInDto {
  studentId?: string;
  name: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  faculty?: string;
  college?: string;
  checkInTime?: string;
  date?: string;
  sessionPrice?: number;
  billingType?: 'new-session' | 'package';
}

export interface SessionCheckOutDto {
  studentId: string;
  checkOutTime?: string;
  durationHours: number;
  totalCost: number;
  paymentMethod?: 'cash' | 'vodafone' | 'fawry' | 'instapay' | 'package';
  discountAmount?: number;
  couponCode?: string;
  usePackageHours?: boolean;
}

