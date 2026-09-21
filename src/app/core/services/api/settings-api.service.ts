import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';

export interface OperationalAlertSettingsDto {
  cateringWarningThreshold: number;
  cateringCriticalThreshold: number;
  longStayThresholdHours: number;
  roomCapacityAlertSeats: number;
  sessionWarningLeadMinutes: number;
  sessionUrgentLeadMinutes: number;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsApiService extends BaseApiService {
  /** Get operational alert thresholds — GET /api/Settings/operational-alerts */
  getOperationalAlertSettings(): Observable<OperationalAlertSettingsDto> {
    return this.get<ApiResponse<OperationalAlertSettingsDto>>(
      API_ENDPOINTS.OPERATIONAL_SETTINGS.ALERTS
    ).pipe(
      map(extractData)
    );
  }

  /** Update operational alert thresholds — PUT /api/Settings/operational-alerts */
  updateOperationalAlertSettings(dto: OperationalAlertSettingsDto): Observable<OperationalAlertSettingsDto> {
    return this.put<ApiResponse<OperationalAlertSettingsDto>>(
      API_ENDPOINTS.OPERATIONAL_SETTINGS.ALERTS,
      dto
    ).pipe(
      map(extractData)
    );
  }
}
