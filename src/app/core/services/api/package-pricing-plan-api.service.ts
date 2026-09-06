import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  PackagePricingPlanDto,
  CreatePackagePricingPlanDto,
  UpdatePackagePricingPlanDto
} from '../../models/pricing-plan.model';

@Injectable({
  providedIn: 'root'
})
export class PackagePricingPlanApiService extends BaseApiService {
  /** Get all package pricing plans */
  getPackagePricingPlans(params?: { packageType?: number; roomId?: string; isActive?: boolean }): Observable<PackagePricingPlanDto[]> {
    const queryParams: Record<string, string | number> = {};
    if (params?.packageType !== undefined) queryParams['PackageType'] = params.packageType;
    if (params?.roomId) queryParams['RoomId'] = params.roomId;
    if (params?.isActive !== undefined) queryParams['IsActive'] = String(params.isActive);

    return this.get<ApiResponse<PackagePricingPlanDto[] | { items: PackagePricingPlanDto[] }>>(
      API_ENDPOINTS.PACKAGE_PRICING_PLANS.LIST,
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    ).pipe(
      map(res => {
        if (!res || !res.data) return [];
        if (Array.isArray(res.data)) return res.data;
        return (res.data as { items: PackagePricingPlanDto[] })?.items ?? [];
      })
    );
  }

  /** Get package pricing plan by ID */
  getPackagePricingPlanById(id: string): Observable<PackagePricingPlanDto> {
    return this.get<ApiResponse<PackagePricingPlanDto>>(
      API_ENDPOINTS.PACKAGE_PRICING_PLANS.BY_ID(id)
    ).pipe(map(extractData));
  }

  /** Create package pricing plan */
  createPackagePricingPlan(dto: CreatePackagePricingPlanDto): Observable<PackagePricingPlanDto> {
    return this.post<ApiResponse<PackagePricingPlanDto>>(
      API_ENDPOINTS.PACKAGE_PRICING_PLANS.LIST,
      dto
    ).pipe(map(extractData));
  }

  /** Update package pricing plan */
  updatePackagePricingPlan(id: string, dto: UpdatePackagePricingPlanDto): Observable<PackagePricingPlanDto> {
    return this.put<ApiResponse<PackagePricingPlanDto>>(
      API_ENDPOINTS.PACKAGE_PRICING_PLANS.BY_ID(id),
      dto
    ).pipe(map(extractData));
  }

  /** Delete package pricing plan */
  deletePackagePricingPlan(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.PACKAGE_PRICING_PLANS.BY_ID(id)
    ).pipe(map(res => res?.isSuccess ?? res?.success ?? true));
  }
}
