/**
 * User and account models.
 * Re-exports authentication models from auth.model.ts and defines account entities.
 */
export * from './auth.model';
import { ProfileDetailDto, StaffRole } from './auth.model';

/** Application user — used in settings/user management */
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

/** Staff user interface for settings user management */
export interface StaffUser {
  id: string;
  name: string;
  nameAr?: string;
  username: string;
  phone: string;
  email: string;
  role: 'Admin / Manager' | 'Receptionist' | string;
  roleAr?: string;
  status: 'active' | 'inactive' | string;
  createdAt?: string;
  password?: string;
}


/** Account DTO from backend /api/Accounts */
export interface AccountDto {
  id: string;
  username: string;
  email?: string;
  phoneNumber?: string;
  isActive: boolean;
  roles?: number[];
  lastLoginAt?: string;
  createdAt?: string;
  avatar?: string;
}

/** Account Profile DTO from /api/Accounts/{id}/profile */
export interface AccountProfileDto {
  id: string;
  username: string;
  phoneNumber?: string;
  email?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  roles?: number[];
  profiles?: ProfileDetailDto[];
  avatar?: string;
}

/** Create account request — matches OpenAPI CreateAccountDto */
export interface CreateAccountDto {
  username: string;
  password: string;
  phoneNumber?: string;
  email?: string;
  // Optional convenience fields for callers:
  userName?: string;
  role?: number;
  fullName?: string;
  staffRole?: number;
  facultyId?: string;
  academicYear?: number;
}

/** Update account request — matches OpenAPI UpdateAccountDto */
export interface UpdateAccountDto {
  username?: string;
  phoneNumber?: string;
  email?: string;
  isActive?: boolean;
  // Optional convenience fields:
  userName?: string;
  role?: any;
}

/** Link staff profile request — matches OpenAPI LinkStaffProfileDto */
export interface LinkStaffProfileDto {
  name: string;
  staffRole: StaffRole | number;
  colour?: string;
}

/** Link student profile request — matches OpenAPI LinkStudentProfileDto */
export interface LinkStudentProfileDto {
  existingStudentId?: string;
  name?: string;
  whatsapp?: string;
  canBook?: boolean;
  facultyId?: string;
  parentId?: string;
}

/** Link instructor profile request — matches OpenAPI LinkInstructorProfileDto */
export interface LinkInstructorProfileDto {
  existingInstructorId?: string;
  name?: string;
  colour?: string;
}

/** Link parent profile request — matches OpenAPI LinkParentProfileDto */
export interface LinkParentProfileDto {
  name: string;
}

