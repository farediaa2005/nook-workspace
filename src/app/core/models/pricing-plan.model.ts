/**
 * Pricing plan and package pricing models matching Backend OpenAPI 3.0.4 specifications.
 * Maps to backend /api/PricingPlans and /api/PackagePricingPlans endpoints.
 */

/** PricingScope enum — matches backend (1=Workspace, 2=Classroom) */
export enum PricingScope {
  Workspace = 1,
  Classroom = 2
}

/** PackageType enum — matches backend (1=Workspace, 2=Classroom) */
export enum PackageType {
  Workspace = 1,
  Classroom = 2
}

/** @deprecated Use PackageType instead */
export const BackendPackageType = PackageType;

/** Pricing plan DTO from /api/PricingPlans */
export interface PricingPlanDto {
  id: string;
  roomId?: string;
  roomName?: string | null;
  scope: PricingScope | number;
  baseHours: number;
  baseCost: number;
  overageHourlyRate: number;
  isActive: boolean;
  note?: string | null;
}

/** Create pricing plan request — POST /api/PricingPlans */
export interface CreatePricingPlanDto {
  roomId: string;
  scope: PricingScope | number;
  baseHours: number;
  baseCost: number;
  overageHourlyRate: number;
  isActive?: boolean;
  note?: string | null;
}

/** Update pricing plan request — PUT /api/PricingPlans/{id} */
export interface UpdatePricingPlanDto {
  roomId?: string;
  scope?: PricingScope | number;
  baseHours?: number;
  baseCost?: number;
  overageHourlyRate?: number;
  isActive?: boolean;
  note?: string | null;
}

/** Pricing suggestion from /api/PricingPlans/suggestion */
export interface PricingSuggestionDto {
  roomId: string;
  scope: number;
  hours: number;
  baseHours: number;
  baseCost: number;
  overageHours: number;
  overageRate: number;
  overageCost: number;
  suggestedTotal: number;
}

/** Package pricing plan DTO from /api/PackagePricingPlans */
export interface PackagePricingPlanDto {
  id: string;
  name: string;
  packageType: PackageType | number;
  roomId?: string | null;
  roomName?: string | null;
  hours: number;
  price: number;
  validityDays?: number | null;
  isActive: boolean;
  note?: string | null;
  createdAt?: string;
}

/** Create package pricing plan request — POST /api/PackagePricingPlans */
export interface CreatePackagePricingPlanDto {
  name: string;
  packageType: PackageType | number;
  roomId?: string | null;
  hours: number;
  price: number;
  validityDays?: number | null;
  isActive?: boolean;
  note?: string | null;
}

/** Update package pricing plan request — PUT /api/PackagePricingPlans/{id} */
export interface UpdatePackagePricingPlanDto {
  name?: string;
  packageType?: PackageType | number;
  roomId?: string | null;
  hours?: number;
  price?: number;
  validityDays?: number | null;
  isActive?: boolean;
  note?: string | null;
}

