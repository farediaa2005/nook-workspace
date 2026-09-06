import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import { DashboardSummaryDto } from '../../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardApiService extends BaseApiService {
  /** Get live dashboard summary KPI stats */
  getSummary(): Observable<DashboardSummaryDto> {
    return this.get<ApiResponse<DashboardSummaryDto>>(API_ENDPOINTS.DASHBOARD.SUMMARY).pipe(
      map(extractData)
    );
  }
}
