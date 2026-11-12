import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  DiscountDto,
  CreateDiscountDto,
  UpdateDiscountDto
} from '../../models/discount.model';
import { DiscountRuleDto, SaveDiscountRuleDto } from '../../models/discount-rule.model';

@Injectable({
  providedIn: 'root'
})
export class DiscountApiService extends BaseApiService {
  /** Get all discounts — GET /api/Discounts */
  getDiscounts(): Observable<DiscountDto[]> {
    return this.get<ApiResponse<DiscountDto[] | { items: DiscountDto[] }>>(
      API_ENDPOINTS.DISCOUNTS.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: DiscountDto[] })?.items ?? [];
      })
    );
  }

  /** Create discount — POST /api/Discounts */
  createDiscount(dto: CreateDiscountDto | any): Observable<DiscountDto> {
    const payload: Record<string, any> = {
      name: dto.name || dto.title || dto.code || 'Discount',
      nameEn: dto.nameEn || dto.titleEn || dto.name || dto.title || dto.code || 'Discount',
      dateFrom: dto.dateFrom || dto.startsAt || dto.startDate || new Date().toISOString(),
      dateTo: dto.dateTo || dto.expiresAt || dto.expiryDate || null,
      discountType: typeof dto.discountType === 'number' ? dto.discountType : (dto.type === 'Fixed' || dto.type === 'fixed' ? 2 : 1),
      value: dto.value ?? 0,
      facultyId: dto.facultyId || null,
      applicableTo: dto.applicableTo !== undefined ? dto.applicableTo : 0,
      isActive: dto.isActive !== false
    };

    return this.post<ApiResponse<DiscountDto>>(API_ENDPOINTS.DISCOUNTS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update discount — PUT /api/Discounts/{id} */
  updateDiscount(id: string, dto: UpdateDiscountDto | any): Observable<DiscountDto> {
    const payload: Record<string, any> = {
      name: dto.name || dto.title || dto.code,
      nameEn: dto.nameEn || dto.titleEn || dto.name || dto.title || dto.code,
      dateFrom: dto.dateFrom || dto.startsAt || dto.startDate || null,
      dateTo: dto.dateTo || dto.expiresAt || dto.expiryDate || null,
      discountType: typeof dto.discountType === 'number' ? dto.discountType : (dto.type === 'Fixed' || dto.type === 'fixed' ? 2 : (dto.type === 'percentage' || dto.type === 'Percentage' ? 1 : 1)),
      value: dto.value ?? 0,
      facultyId: dto.facultyId || null,
      applicableTo: dto.applicableTo !== undefined ? dto.applicableTo : 0,
      isActive: dto.isActive !== undefined ? dto.isActive : (dto.status ? dto.status === 'active' : true)
    };

    return this.put<ApiResponse<DiscountDto>>(API_ENDPOINTS.DISCOUNTS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete discount — DELETE /api/Discounts/{id} */
  deleteDiscount(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.DISCOUNTS.BY_ID(id)).pipe(
      map(res => {
        if (!res) return true;
        return (res as any).data !== undefined ? !!(res as any).data : ((res as any).success ?? (res as any).isSuccess ?? true);
      })
    );
  }

  // ---- Automatic discount rules ----

  /** GET /api/Discounts/rules */
  getDiscountRules(): Observable<DiscountRuleDto[]> {
    return this.get<ApiResponse<DiscountRuleDto[]>>(API_ENDPOINTS.DISCOUNT_RULES.LIST).pipe(map(res => extractData(res) || []));
  }

  /** POST /api/Discounts/rules */
  createDiscountRule(dto: SaveDiscountRuleDto): Observable<DiscountRuleDto> {
    return this.post<ApiResponse<DiscountRuleDto>>(API_ENDPOINTS.DISCOUNT_RULES.LIST, dto).pipe(map(extractData));
  }

  /** PUT /api/Discounts/rules/{id} */
  updateDiscountRule(id: string, dto: SaveDiscountRuleDto): Observable<DiscountRuleDto> {
    return this.put<ApiResponse<DiscountRuleDto>>(API_ENDPOINTS.DISCOUNT_RULES.BY_ID(id), dto).pipe(map(extractData));
  }

  /** DELETE /api/Discounts/rules/{id} */
  deleteDiscountRule(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.DISCOUNT_RULES.BY_ID(id)).pipe(map(extractData));
  }
}
