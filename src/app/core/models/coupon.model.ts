/**
 * Coupon domain models matching Backend OpenAPI 3.0.4 specifications.
 * Endpoints: GET/POST /api/Coupons, GET/PUT/DELETE /api/Coupons/{id},
 *            GET /api/Coupons/code/{code}, POST /api/Coupons/redeem/{code},
 *            GET /api/Coupons/{id}/redemptions
 *
 * DiscountType enum: 1=Percentage, 2=FixedAmount
 */

import { DiscountType } from './workspace-session.model';

export { DiscountType };

export type CouponZone = 'Workspace' | 'Classroom' | 'Both';

/** Coupon response DTO from GET /api/Coupons */
export interface CouponDto {
  id: string;
  code: string;
  discountType: DiscountType | number;
  value: number;
  expiryDate: string;
  usageLimit?: number | null;
  usageCount: number;
  isActive: boolean;
  isValid: boolean;
  // UI and backward compatibility fields
  name?: string;
  discountPercent?: number;
  maxRedemptions?: number;
  currentRedemptions?: number;
  zone?: CouponZone;
  expiresAt?: string;
  createdAt?: string;
}

/** Coupon redemption response DTO from GET /api/Coupons/{id}/redemptions */
export interface CouponRedemptionDto {
  id: string;
  couponId: string;
  studentId?: string | null;
  studentName?: string | null;
  classroomId?: string | null;
  classroomName?: string | null;
  redeemedAt: string;
  discountApplied?: number;
  // UI and backward compatibility fields
  couponCode?: string;
  sessionId?: string;
  discountAmount?: number;
}

/** Create coupon request — POST /api/Coupons */
export interface CreateCouponDto {
  code: string;
  discountType: DiscountType | number;
  value: number;
  expiryDate: string;
  usageLimit?: number | null;
  // UI and backward compatibility fields
  name?: string;
  discountPercent?: number;
  maxRedemptions?: number;
  zone?: CouponZone;
  isActive?: boolean;
  expiresAt?: string;
}

/** Update coupon request — PUT /api/Coupons/{id} */
export interface UpdateCouponDto {
  code?: string;
  discountType?: DiscountType | number;
  value?: number;
  expiryDate?: string;
  usageLimit?: number | null;
  isActive?: boolean;
  // UI and backward compatibility fields
  name?: string;
  discountPercent?: number;
  maxRedemptions?: number;
  zone?: CouponZone;
  expiresAt?: string;
}

/** Redeem coupon request — POST /api/Coupons/redeem/{code} */
export interface RedeemCouponRequestDto {
  studentId?: string | null;
  classroomId?: string | null;
  // UI and backward compatibility fields
  sessionId?: string;
  sessionType?: 'Workspace' | 'Classroom';
}

/** Check if a coupon has reached or exceeded its maximum usage limit */
export function isCouponExhausted(coupon?: Partial<CouponDto> | null): boolean {
  if (!coupon) return true;
  const maxLimit = coupon.usageLimit ?? (coupon as any)?.UsageLimit ?? (coupon as any)?.maxUsage ?? (coupon as any)?.maxUses ?? coupon.maxRedemptions;
  const currentUses = coupon.usageCount ?? (coupon as any)?.UsageCount ?? (coupon as any)?.currentRedemptions ?? 0;
  return maxLimit !== null && maxLimit !== undefined && maxLimit > 0 && currentUses >= maxLimit;
}

/** Check if a coupon is expired */
export function isCouponExpired(coupon?: Partial<CouponDto> | null): boolean {
  if (!coupon) return true;
  const exp = coupon.expiryDate || (coupon as any)?.expiresAt;
  if (!exp) return false;
  return new Date(exp) < new Date();
}


