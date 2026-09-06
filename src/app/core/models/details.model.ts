/**
 * Members & Info Domain Models and DTOs
 */

// 1. College Models & DTOs
export interface College {
  id: string;
  name: string;
  nameEn?: string;
  university: string;
  universityEn?: string;
  studentsCount: number;
  campus: string;
  campusEn?: string;
  notes?: string;
  createdAt: string;
}

export type CreateCollegeDto = Omit<College, 'id' | 'createdAt'>;
export type UpdateCollegeDto = Partial<CreateCollegeDto>;

// 2. Instructor Models & DTOs
export interface Instructor {
  id: string;
  name: string;
  nameEn?: string;
  phone: string;
  email: string;
  specialty: string;
  specialtyEn?: string;
  affiliation: string;
  affiliationEn?: string;
  totalSessions: number;
  status: 'active' | 'inactive';
  bio?: string;
  createdAt: string;
}

export type CreateInstructorDto = Omit<Instructor, 'id' | 'createdAt'>;
export type UpdateInstructorDto = Partial<CreateInstructorDto>;

// 3. Blacklist Models & DTOs
export interface BlacklistRecord {
  id: string;
  name: string;
  nameEn?: string;
  phone: string;
  faculty?: string;
  facultyEn?: string;
  college?: string;
  reason: string;
  reasonEn?: string;
  blockedDate: string;
  severity: 'temporary' | 'permanent';
  status: 'blocked' | 'resolved';
  notes?: string;
}

export type CreateBlacklistDto = Omit<BlacklistRecord, 'id' | 'blockedDate' | 'status'>;

// 4. Discount Code Models & DTOs
export interface DiscountCode {
  id: string;
  code: string;
  title: string;
  titleEn?: string;
  type: 'percentage' | 'fixed';
  value: number;
  scope: 'all' | 'students' | 'instructors' | 'packages';
  usageCount: number;
  usageLimit: number;
  startDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'disabled';
  totalDiscountSaved: number;
  createdAt: string;
}

export type CreateDiscountDto = Omit<DiscountCode, 'id' | 'usageCount' | 'totalDiscountSaved' | 'createdAt'>;
export type UpdateDiscountDto = Partial<CreateDiscountDto>;
