/**
 * Discount domain models matching Backend OpenAPI 3.0.4 specifications.
 * Endpoints: GET/POST /api/Discounts, GET/PUT/DELETE /api/Discounts/{id},
 *            GET /api/Discounts/active, GET /api/Discounts/faculty/{facultyId}
 *
 * DiscountType enum: 1=Percentage, 2=FixedAmount
 */

import { DiscountType } from './workspace-session.model';

export { DiscountType };

export type DiscountScope = 'All' | 'Faculty' | 'Student' | 'Instructor';

/** Discount DTO from GET /api/Discounts */
export interface DiscountDto {
  id: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  discountType: DiscountType | number;
  value: number;
  facultyId?: string | null;
  facultyName?: string | null;
  // UI and backward compatibility fields
  name?: string;
  nameEn?: string;
  description?: string;
  type?: string | DiscountType;
  scope?: DiscountScope;
  isActive?: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdAt?: string;
}

/** Create discount request — POST /api/Discounts */
export interface CreateDiscountDto {
  dateFrom?: string | null;
  dateTo?: string | null;
  discountType: DiscountType | number;
  value: number;
  facultyId?: string | null;
  // UI and backward compatibility fields
  name?: string;
  nameEn?: string;
  description?: string;
  type?: string | DiscountType;
  scope?: DiscountScope;
  isActive?: boolean;
  startsAt?: string;
  expiresAt?: string;
}

/** Update discount request — PUT /api/Discounts/{id} */
export interface UpdateDiscountDto {
  dateFrom?: string | null;
  dateTo?: string | null;
  discountType?: DiscountType | number;
  value?: number;
  facultyId?: string | null;
  // UI and backward compatibility fields
  name?: string;
  nameEn?: string;
  description?: string;
  type?: string | DiscountType;
  scope?: DiscountScope;
  isActive?: boolean;
  startsAt?: string;
  expiresAt?: string;
}

