/**
 * Package & Membership domain models.
 * Used for both Student Packages and Instructor / Corporate Packages.
 */

export type PackageType = 'student' | 'instructor';
export type PackageStatus = 'active' | 'near_expiry' | 'expired' | 'exhausted';
export type PaymentMethod = 'cash' | 'vodafone' | 'fawry' | 'instapay';

export interface UsageHistory {
  id: string;
  date: string;
  duration: number; // in hours (e.g. 2.5)
  sessionAr: string;
  sessionEn: string;
  roomOrDesk?: string;
}

export interface PackageMemberOption {
  id: string;
  nameAr: string;
  nameEn: string;
  subAr: string;
  subEn: string;
  phone: string;
  email?: string;
  type: PackageType;
}

export interface PackageItem {
  id: string;
  memberId: string;
  memberNameAr: string;
  memberNameEn: string;
  memberSubAr: string;
  memberSubEn: string;
  memberPhone: string;
  memberEmail?: string;
  members?: PackageMemberOption[]; // Multi-member support for group passes
  type: PackageType;
  packageNameAr: string;
  packageNameEn: string;
  allocatedHours: number;
  usedHours: number;
  remainingHours: number;
  cost: number;
  hourlyRate: number;
  purchaseDate: string;
  expiryDate: string;
  paymentMethod: PaymentMethod;
  status: PackageStatus;
  notes?: string;
  history: UsageHistory[];
  createdAt: string;
}

export type CreatePackageDto = Omit<PackageItem, 'id' | 'remainingHours' | 'createdAt'>;
export type UpdatePackageDto = Partial<Omit<PackageItem, 'id' | 'createdAt'>>;
export interface PackageUsageDto {
  packageId: string;
  duration: number;
  sessionAr?: string;
  sessionEn?: string;
  roomOrDesk?: string;
}

export interface ValidityPresetOption {
  id: string;
  days: number | 'custom';
  hours?: number;
  labelAr: string;
  labelEn: string;
  tagAr?: string;
  tagEn?: string;
}

export interface PresetPackageOption {
  id: string;
  nameAr: string;
  nameEn: string;
  hours: number;
  rate: number;
  price: number;
  badgeAr?: string;
  badgeEn?: string;
  popular?: boolean;
}

export * from './package-api.model';
