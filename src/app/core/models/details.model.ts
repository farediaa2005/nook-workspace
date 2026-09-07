/**
 * Members & Info (Details) Domain Models and DTOs
 * Layer 1 of Clean Architecture for Details Module.
 * Defines both Backend DTOs and Frontend Presentation Models.
 */

import { FacultyDto } from './faculty.model';
import { InstructorDto } from './instructor.model';
import { BlacklistDto } from './blacklist.model';
import { DiscountDto } from './discount.model';

export type {
  FacultyDto,
  InstructorDto,
  BlacklistDto,
  DiscountDto
};

// ==========================================
// 1. College (Faculty) Domain Models & DTOs
// ==========================================

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

export interface CollegeAnalyticsItem {
  no: number;
  id: string;
  name: string;
  nameEn?: string;
  university?: string;
  color: string;
  colorLight: string;
  studentsCount: number;
  hours: number;
  totalRevenue: number;
  percentage: number;
  svgPath: string;
  labelX: number;
  labelY: number;
  midAngle: number;
}

// ==========================================
// 2. Instructor Domain Models & DTOs
// ==========================================

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

// ==========================================
// 3. Blacklist Domain Models & DTOs
// ==========================================

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
export type UpdateBlacklistDto = Partial<CreateBlacklistDto>;

// ==========================================
// 4. Discount Code Domain Models & DTOs
// ==========================================

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
