import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  DiscountDto,
  CreateDiscountDto,
  UpdateDiscountDto
} from '../../models/discount.model';

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

  /** Get active discounts only — GET /api/Discounts/active */
  getActiveDiscounts(): Observable<DiscountDto[]> {
    return this.get<ApiResponse<DiscountDto[]>>(API_ENDPOINTS.DISCOUNTS.ACTIVE).pipe(
      map(extractData)
    );
  }

  /** Get discount by ID — GET /api/Discounts/{id} */
  getDiscountById(id: string): Observable<DiscountDto> {
    return this.get<ApiResponse<DiscountDto>>(API_ENDPOINTS.DISCOUNTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Get discounts by faculty ID — GET /api/Discounts/faculty/{facultyId} */
  getDiscountsByFaculty(facultyId: string): Observable<DiscountDto[]> {
    return this.get<ApiResponse<DiscountDto[] | { items: DiscountDto[] }>>(
      API_ENDPOINTS.DISCOUNTS.BY_FACULTY(facultyId)
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
      }),
      catchError(() => of(true))
    );
  }
}

