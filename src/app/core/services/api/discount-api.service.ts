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
      dateFrom: dto.dateFrom || dto.startsAt || new Date().toISOString(),
      dateTo: dto.dateTo || dto.expiresAt || null,
      discountType: typeof dto.discountType === 'number' ? dto.discountType : (dto.type === 'Fixed' ? 2 : 1),
      value: dto.value ?? 0,
      facultyId: dto.facultyId || null
    };

    return this.post<ApiResponse<DiscountDto>>(API_ENDPOINTS.DISCOUNTS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update discount — PUT /api/Discounts/{id} */
  updateDiscount(id: string, dto: UpdateDiscountDto | any): Observable<DiscountDto> {
    const payload: Record<string, any> = {
      dateFrom: dto.dateFrom || dto.startsAt || null,
      dateTo: dto.dateTo || dto.expiresAt || null,
      discountType: typeof dto.discountType === 'number' ? dto.discountType : (dto.type === 'Fixed' ? 2 : 1),
      value: dto.value ?? 0,
      facultyId: dto.facultyId || null
    };

    return this.put<ApiResponse<DiscountDto>>(API_ENDPOINTS.DISCOUNTS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete discount — DELETE /api/Discounts/{id} */
  deleteDiscount(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.DISCOUNTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }
}

