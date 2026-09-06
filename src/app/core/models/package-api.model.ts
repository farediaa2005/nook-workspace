/**
 * Workspace Packages (Student Packages) & Classroom Packages (Instructor Packages) API DTOs.
 * Maps to /api/WorkspacePackages and /api/ClassroomPackages.
 *
 * PayWay enum: 1=Cash, 2=Vodafone, 3=Fawry, 4=Instapay
 */

import { PayWay } from './workspace-session.model';

export { PayWay };

/** Workspace Package response DTO — GET /api/WorkspacePackages */
export interface WorkspacePackageDto {
  id: string;
  studentId: string;
  purchasedAt?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  hours: number;
  remainingHours: number;
  cost: number;
  payWay?: PayWay | number;
  // UI and backward compatibility fields
  studentName?: string;
  packagePricingPlanId?: string;
  totalHours?: number;
  consumedHours?: number;
  paidAmount?: number;
  expireDate?: string;
  createdAt?: string;
}

/** Create workspace package request — POST /api/WorkspacePackages */
export interface CreateWorkspacePackageDto {
  studentId?: string;
  purchasedAt?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  hours?: number;
  cost?: number;
  payWay?: PayWay | number;
  // UI and backward compatibility fields
  totalHours?: number;
  packagePricingPlanId?: string;
  paidAmount?: number;
  studentName?: string;
  studentPhone?: string;
  packageName?: string;
  price?: number;
  hourlyRate?: number;
  expiryDate?: string;
  paymentMethod?: any;
}

/** Update workspace package request — PUT /api/WorkspacePackages/{id} */
export interface UpdateWorkspacePackageDto {
  studentId?: string;
  purchasedAt?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  hours?: number;
  remainingHours?: number;
  cost?: number;
  payWay?: PayWay | number;
}

/** Use package hours DTO (Client helper for hour deduction) */
export interface UsePackageHoursDto {
  hours: number;
  notes?: string;
}

/** Classroom Package response DTO — GET /api/ClassroomPackages */
export interface ClassroomPackageDto {
  id: string;
  instructorId: string;
  purchasedAt?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  hours: number;
  remainingHours: number;
  cost: number;
  payWay?: PayWay | number;
  // UI and backward compatibility fields
  instructorName?: string;
  roomId?: string;
  roomName?: string;
  packagePricingPlanId?: string;
  totalHours?: number;
  consumedHours?: number;
  paidAmount?: number;
  expireDate?: string;
  createdAt?: string;
}

/** Create classroom package request — POST /api/ClassroomPackages */
export interface CreateClassroomPackageDto {
  instructorId?: string;
  purchasedAt?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  hours?: number;
  cost?: number;
  payWay?: PayWay | number;
  // UI and backward compatibility fields
  totalHours?: number;
  roomId?: string;
  packagePricingPlanId?: string;
  paidAmount?: number;
  instructorName?: string;
  instructorPhone?: string;
  packageName?: string;
  price?: number;
  hourlyRate?: number;
  expiryDate?: string;
  paymentMethod?: any;
}

/** Update classroom package request — PUT /api/ClassroomPackages/{id} */
export interface UpdateClassroomPackageDto {
  instructorId?: string;
  purchasedAt?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  hours?: number;
  remainingHours?: number;
  cost?: number;
  payWay?: PayWay | number;
}

