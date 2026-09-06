import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  PricingPlanDto,
  CreatePricingPlanDto,
  UpdatePricingPlanDto
} from '../../models/pricing-plan.model';

@Injectable({
  providedIn: 'root'
})
export class PricingPlanApiService extends BaseApiService {
  /** Get all pricing plans, optionally filtered by roomId */
  getPricingPlans(roomId?: string): Observable<PricingPlanDto[]> {
    const params = roomId ? { roomId } : undefined;
    return this.get<ApiResponse<PricingPlanDto[] | { items: PricingPlanDto[] }>>(
      API_ENDPOINTS.PRICING_PLANS.LIST,
      params
    ).pipe(
      map(res => {
        if (!res || !res.data) return [];
        if (Array.isArray(res.data)) return res.data;
        return (res.data as { items: PricingPlanDto[] })?.items ?? [];
      })
    );
  }

  /** Get pricing plan by ID */
  getPricingPlanById(id: string): Observable<PricingPlanDto> {
    return this.get<ApiResponse<PricingPlanDto>>(API_ENDPOINTS.PRICING_PLANS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Create pricing plan */
  createPricingPlan(dto: CreatePricingPlanDto): Observable<PricingPlanDto> {
    return this.post<ApiResponse<PricingPlanDto>>(API_ENDPOINTS.PRICING_PLANS.LIST, dto).pipe(
      map(extractData)
    );
  }

  /** Update pricing plan */
  updatePricingPlan(id: string, dto: UpdatePricingPlanDto): Observable<PricingPlanDto> {
    return this.put<ApiResponse<PricingPlanDto>>(API_ENDPOINTS.PRICING_PLANS.BY_ID(id), dto).pipe(
      map(extractData)
    );
  }

  /** Delete pricing plan */
  deletePricingPlan(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.PRICING_PLANS.BY_ID(id)).pipe(
      map(res => res?.isSuccess ?? res?.success ?? true)
    );
  }
}
