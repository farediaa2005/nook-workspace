export interface ProfileDto {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  status?: number;          // ProfileStatus: 1=Active, 2=Inactive
  isActive?: boolean;
  createdAt?: string | null; // ISO date-time
  updatedAt?: string | null; // ISO date-time
}

export type profileDto = ProfileDto;

export interface UpdateProfileDto {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  status?: number;          // ProfileStatus: 1=Active, 2=Inactive
  isActive?: boolean;
}

export interface UpdateAccountDto {
  username?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  isActive?: boolean;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type changePasswordDto = ChangePasswordDto;