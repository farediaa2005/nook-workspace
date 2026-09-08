import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  CouponDto,
  CouponRedemptionDto,
  CreateCouponDto,
  UpdateCouponDto,
  RedeemCouponRequestDto
} from '../../models/coupon.model';

@Injectable({
  providedIn: 'root'
})
export class CouponApiService extends BaseApiService {
  /** Get all coupons — GET /api/Coupons */
  getCoupons(): Observable<CouponDto[]> {
    return this.get<ApiResponse<CouponDto[] | { items: CouponDto[] }>>(
      API_ENDPOINTS.COUPONS.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: CouponDto[] })?.items ?? [];
      })
    );
  }

  /** Get coupon by ID — GET /api/Coupons/{id} */
  getCouponById(id: string): Observable<CouponDto> {
    return this.get<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Get coupon by code — GET /api/Coupons/code/{code} */
  getCouponByCode(code: string): Observable<CouponDto> {
    return this.get<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.BY_CODE(code)).pipe(
      map(extractData)
    );
  }

  /** Create coupon — POST /api/Coupons */
  createCoupon(dto: CreateCouponDto | any): Observable<CouponDto> {
    const payload: Record<string, any> = {
      code: dto.code,
      discountType: dto.discountType ?? 1,
      value: dto.value ?? dto.discountPercent ?? 0,
      expiryDate: dto.expiryDate || dto.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
      usageLimit: dto.usageLimit ?? dto.maxRedemptions ?? null,
      name: dto.name || dto.code,
      isActive: dto.isActive !== false
    };

    return this.post<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update coupon — PUT /api/Coupons/{id} */
  updateCoupon(id: string, dto: UpdateCouponDto | any): Observable<CouponDto> {
    const payload: Record<string, any> = {
      discountType: dto.discountType ?? 1,
      value: dto.value ?? dto.discountPercent ?? 0,
      expiryDate: dto.expiryDate || dto.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
      usageLimit: dto.usageLimit ?? dto.maxRedemptions ?? null,
      isActive: dto.isActive !== undefined ? dto.isActive : (dto.status ? dto.status === 'active' : true),
      name: dto.name || dto.title || undefined
    };

    return this.put<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Redeem coupon — POST /api/Coupons/redeem/{code} */
  redeemCoupon(code: string, dto?: RedeemCouponRequestDto | any): Observable<CouponDto> {
    const payload: Record<string, any> = {
      studentId: dto?.studentId || null,
      classroomId: dto?.classroomId || null
    };

    return this.post<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.REDEEM(code), payload).pipe(
      map(extractData)
    );
  }

  /** Get coupon redemptions — GET /api/Coupons/{id}/redemptions */
  getRedemptions(id: string): Observable<CouponRedemptionDto[]> {
    return this.get<ApiResponse<CouponRedemptionDto[] | { items: CouponRedemptionDto[] }>>(
      API_ENDPOINTS.COUPONS.REDEMPTIONS(id)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: CouponRedemptionDto[] })?.items ?? [];
      })
    );
  }

  /** Delete coupon — DELETE /api/Coupons/{id} */
  deleteCoupon(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.COUPONS.BY_ID(id)).pipe(
      map(extractData)
    );
  }
}

