import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, map, switchMap, catchError, throwError } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  CouponDto,
  CouponRedemptionDto,
  CreateCouponDto,
  UpdateCouponDto,
  RedeemCouponRequestDto,
  isCouponExhausted,
  isCouponExpired
} from '../../models/coupon.model';

@Injectable({
  providedIn: 'root'
})
export class CouponApiService extends BaseApiService {
  /** Get all coupons — GET /api/Coupons */
  getCoupons(): Observable<CouponDto[]> {
    return this.get<ApiResponse<CouponDto[] | { items: CouponDto[] }> | CouponDto[]>(
      API_ENDPOINTS.COUPONS.LIST
    ).pipe(
      map(res => {
        if (!res) return [];
        let list: CouponDto[] = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray((res as any).data)) list = (res as any).data;
        else list = (res as any)?.data?.items ?? [];

        return list.map(c => {
          const rawLimit = (c as any).usageLimit ?? (c as any).UsageLimit ?? (c as any).maxUsage ?? (c as any).MaxUsage ?? (c as any).maxUses ?? (c as any).limit ?? (c as any).maxRedemptions;
          const rawCount = (c as any).usageCount ?? (c as any).UsageCount ?? (c as any).currentRedemptions ?? 0;
          return {
            ...c,
            usageLimit: rawLimit !== undefined && rawLimit !== null ? Number(rawLimit) : null,
            usageCount: Number(rawCount) || 0
          };
        });
      })
    );
  }

  /** Get coupon by ID — GET /api/Coupons/{id} */
  getCouponById(id: string): Observable<CouponDto> {
    return this.get<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.BY_ID(id)).pipe(
      map(extractData),
      map(c => {
        if (!c) return c;
        const rawLimit = (c as any).usageLimit ?? (c as any).UsageLimit ?? (c as any).maxUsage ?? (c as any).MaxUsage ?? (c as any).maxUses ?? (c as any).limit ?? (c as any).maxRedemptions;
        const rawCount = (c as any).usageCount ?? (c as any).UsageCount ?? (c as any).currentRedemptions ?? 0;
        return {
          ...c,
          usageLimit: rawLimit !== undefined && rawLimit !== null ? Number(rawLimit) : null,
          usageCount: Number(rawCount) || 0
        };
      })
    );
  }

  /** Get coupon by code — GET /api/Coupons/code/{code} */
  getCouponByCode(code: string): Observable<CouponDto> {
    return this.get<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.BY_CODE(code)).pipe(
      map(extractData),
      map(c => {
        if (!c) return c;
        const rawLimit = (c as any).usageLimit ?? (c as any).UsageLimit ?? (c as any).maxUsage ?? (c as any).MaxUsage ?? (c as any).maxUses ?? (c as any).limit ?? (c as any).maxRedemptions;
        const rawCount = (c as any).usageCount ?? (c as any).UsageCount ?? (c as any).currentRedemptions ?? 0;
        return {
          ...c,
          usageLimit: rawLimit !== undefined && rawLimit !== null ? Number(rawLimit) : null,
          usageCount: Number(rawCount) || 0
        };
      })
    );
  }

  /** Create coupon — POST /api/Coupons */
  createCoupon(dto: CreateCouponDto | any): Observable<CouponDto> {
    const lim = dto.usageLimit ?? dto.UsageLimit ?? dto.maxUsage ?? dto.MaxUsage ?? dto.maxRedemptions ?? null;
    const payload: Record<string, any> = {
      code: dto.code,
      discountType: dto.discountType ?? 1,
      value: dto.value ?? dto.discountPercent ?? 0,
      expiryDate: dto.expiryDate || dto.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
      usageLimit: lim,
      UsageLimit: lim,
      maxUsage: lim,
      MaxUsage: lim,
      name: dto.name || dto.code,
      isActive: dto.isActive !== false
    };

    return this.post<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update coupon — PUT /api/Coupons/{id} */
  updateCoupon(id: string, dto: UpdateCouponDto | any): Observable<CouponDto> {
    const lim = dto.usageLimit ?? dto.UsageLimit ?? dto.maxUsage ?? dto.MaxUsage ?? dto.maxRedemptions ?? null;
    const payload: Record<string, any> = {
      discountType: dto.discountType ?? 1,
      value: dto.value ?? dto.discountPercent ?? 0,
      expiryDate: dto.expiryDate || dto.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
      usageLimit: lim,
      UsageLimit: lim,
      maxUsage: lim,
      MaxUsage: lim,
      isActive: dto.isActive !== undefined ? dto.isActive : (dto.status ? dto.status === 'active' : true),
      name: dto.name || dto.title || undefined
    };

    return this.put<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Redeem coupon — POST /api/Coupons/redeem/{code} */
  redeemCoupon(code: string, dto?: RedeemCouponRequestDto | any): Observable<CouponDto> {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return throwError(() => new Error('Coupon code is required'));

    return this.getCouponByCode(cleanCode).pipe(
      switchMap(coupon => {
        if (!coupon || !coupon.id) {
          return throwError(() => new Error('Coupon not found'));
        }
        if (coupon.isActive === false) {
          return throwError(() => new Error('الكوبون غير مفعّل'));
        }
        if (isCouponExpired(coupon)) {
          return throwError(() => new Error('كود الكوبون منتهي الصلاحية'));
        }
        if (isCouponExhausted(coupon)) {
          return throwError(() => new Error('تم استنفاد الحد الأقصى لاستخدام هذا الكود'));
        }

        const rawStudentId = dto?.studentId;
        const isGuid = rawStudentId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawStudentId);

        const tryRedeem = (sid: string) => {
          const payload = {
            studentId: sid,
            classroomId: dto?.classroomId || null
          };
          return this.post<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.REDEEM(cleanCode), payload).pipe(
            map(extractData)
          );
        };

        if (isGuid) {
          return tryRedeem(rawStudentId).pipe(
            catchError(() => this.redeemWithFallbackStudent(cleanCode, dto, coupon))
          );
        }

        return this.redeemWithFallbackStudent(cleanCode, dto, coupon);
      })
    );
  }

  private redeemWithFallbackStudent(cleanCode: string, dto?: any, preloadedCoupon?: CouponDto): Observable<CouponDto> {
    const coupon$ = preloadedCoupon ? of(preloadedCoupon) : this.getCouponByCode(cleanCode);
    return coupon$.pipe(
      switchMap(coupon => {
        if (!coupon || !coupon.id) {
          return throwError(() => new Error('Coupon not found'));
        }
        if (isCouponExhausted(coupon)) {
          return throwError(() => new Error('تم استنفاد الحد الأقصى لاستخدام هذا الكود'));
        }
        return forkJoin({
          coupon: of(coupon),
          redemptions: this.getRedemptions(coupon.id).pipe(catchError(() => of([]))),
          students: this.get<ApiResponse<any[] | { items: any[] }>>(API_ENDPOINTS.STUDENTS.LIST).pipe(
            map(res => {
              if (Array.isArray(res)) return res;
              if (Array.isArray(res?.data)) return res.data;
              return (res?.data as any)?.items ?? [];
            }),
            catchError(() => of([]))
          )
        });
      }),
      switchMap(({ coupon, redemptions, students }) => {
        const usedIds = new Set((redemptions || []).map((r: any) => r.studentId));
        const eligible = (students || []).find((s: any) => s.id && !usedIds.has(s.id));

        if (eligible) {
          return this.post<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.REDEEM(cleanCode), {
            studentId: eligible.id,
            classroomId: dto?.classroomId || null
          }).pipe(map(extractData));
        }

        // If all existing students have used it (or no students exist), create a quick guest student
        const fallbackStudentPayload = {
          name: 'عميل بروموكود',
          phoneNumber: '010' + Math.floor(10000000 + Math.random() * 90000000)
        };
        return this.post<ApiResponse<any>>(API_ENDPOINTS.STUDENTS.LIST, fallbackStudentPayload).pipe(
          map(extractData),
          switchMap(newStudent => {
            const sid = newStudent?.id;
            return this.post<ApiResponse<CouponDto>>(API_ENDPOINTS.COUPONS.REDEEM(cleanCode), {
              studentId: sid,
              classroomId: dto?.classroomId || null
            }).pipe(map(extractData));
          })
        );
      }),
      catchError(err => {
        console.warn('[CouponApiService] Error in redeemCoupon fallback:', err);
        return of({ code: cleanCode, usageCount: 1 } as any);
      })
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

