/**
 * User and authentication models.
 * Matches backend /api/Auth and /api/Accounts endpoints exactly.
 */

/** Roles used for authentication and route guard checks */
export type AuthRole = 'admin' | 'user';

/** Backend UserRole enum values (OpenAPI) */
export enum UserRole {
  Admin = 1,
  Staff = 2,
  Student = 3,
  Instructor = 4,
  Parent = 5
}

/** Staff role options */
export enum StaffRole {
  Admin = 1,
  Receptionist = 2
}

/** Authenticated user — stored locally in the frontend */
export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  role: AuthRole;
  avatar?: string;
  /** JWT access token */
  token?: string;
  /** JWT refresh token */
  refreshToken?: string;
}

/**
 * Backend login/refresh response DTO.
 * Matches AuthResponseDto from /api/Auth/login and /api/Auth/refresh-token.
 */
export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  account?: AccountDto;
  // Fallbacks for compatibility
  token?: string;
  accountId?: string;
  username?: string;
  email?: string;
  role?: number;
  roles?: number[];
  profileId?: string;
  avatar?: string;
}

/** Profile info within MeResponseDto */
export interface ProfileInfoDto {
  role: UserRole | number;
  profileId: string;
  profileName?: string;
  extraInfo?: string;
}

/**
 * Backend /api/Auth/me response DTO.
 * Matches MeResponseDto.
 */
export interface MeResponseDto {
  id: string;
  username: string;
  email?: string;
  phoneNumber?: string;
  isActive: boolean;
  lastLoginAt?: string;
  roles?: number[];
  profiles?: ProfileInfoDto[];
  avatar?: string;
  // Fallback alias
  accountId?: string;
}

/** Profile detail within MeResponseDto / AccountProfileDto */
export interface ProfileDetailDto {
  role: number;
  profileId: string;
  profileName?: string;
  phoneNumber?: string;
  whatsapp?: string;
  walletBalance?: number;
  facultyName?: string;
  parentName?: string;
  colour?: string;
  canBook?: boolean;
  createdAt?: string;
}

/** Login request DTO — matches /api/Auth/login */
export interface LoginRequestDto {
  identifier: string;
  password: string;
  email?: string; // Fallback helper
}

/** Register request DTO — matches /api/Auth/register */
export interface RegisterRequestDto {
  username: string;
  password: string;
  email?: string;
  phoneNumber?: string;
  name: string;
  whatsapp?: string;
  facultyId?: string;
  parentId?: string;
}

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

export type MockUser = StaffUser;

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

