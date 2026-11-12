/**
 * Authentication and Authorization domain models matching Backend OpenAPI 3.0.4 specs.
 * Endpoints: POST /api/Auth/login, POST /api/Auth/register, GET /api/Auth/me,
 *            POST /api/Auth/refresh-token, POST /api/Auth/revoke-token,
 *            POST /api/Auth/forgot-password, POST /api/Auth/reset-password,
 *            POST /api/Auth/change-password, POST /api/Auth/google
 */

/** Roles used for frontend authentication and route guard checks */
type AuthRole = 'admin' | 'user';

/** Backend UserRole enum values (OpenAPI) */
enum UserRole {
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

/** Authenticated user entity used across the application state */
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
  account?: AuthAccountDto;
  // Backward compatibility fields
  token?: string;
  accountId?: string;
  username?: string;
  email?: string;
  role?: number;
  roles?: number[];
  profileId?: string;
  avatar?: string;
}

/** Account DTO nested in AuthResponseDto */
interface AuthAccountDto {
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

/** Profile info within MeResponseDto */
interface ProfileInfoDto {
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

/** Login request DTO — matches POST /api/Auth/login */
export interface LoginRequestDto {
  identifier: string;
  password: string;
  email?: string; // Fallback helper
}
