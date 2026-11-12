/**
 * User and account models.
 * Re-exports authentication models from auth.model.ts and defines account entities.
 */
export * from './auth.model';

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

