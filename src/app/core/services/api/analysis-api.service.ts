import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  RevenueAnalysisDto,
  OccupancyAnalysisDto,
  TopStudentDto
} from '../../models/dashboard.model';
import { InstructorActivityDto } from '../../models/instructor.model';

@Injectable({
  providedIn: 'root'
})
export class AnalysisApiService extends BaseApiService {
  /** Get revenue analytics */
  getRevenueAnalysis(params?: { DateFrom?: string; DateTo?: string; Zone?: string }): Observable<RevenueAnalysisDto> {
    return this.get<ApiResponse<RevenueAnalysisDto>>(
      API_ENDPOINTS.ANALYSIS.REVENUE,
      params as Record<string, string | number>
    ).pipe(map(extractData));
  }

  /** Get occupancy analytics */
  getOccupancyAnalysis(params?: { DateFrom?: string; DateTo?: string; Zone?: string }): Observable<OccupancyAnalysisDto> {
    return this.get<ApiResponse<OccupancyAnalysisDto>>(
      API_ENDPOINTS.ANALYSIS.OCCUPANCY,
      params as Record<string, string | number>
    ).pipe(map(extractData));
  }

  /** Get top students */
  getTopStudents(params?: { DateFrom?: string; DateTo?: string; Zone?: string }): Observable<TopStudentDto[]> {
    return this.get<ApiResponse<TopStudentDto[]>>(
      API_ENDPOINTS.ANALYSIS.TOP_STUDENTS,
      params as Record<string, string | number>
    ).pipe(map(extractData));
  }

  /** Get instructor activity analytics */
  getInstructorActivity(params?: { DateFrom?: string; DateTo?: string; Zone?: string }): Observable<InstructorActivityDto[]> {
    return this.get<ApiResponse<InstructorActivityDto[]>>(
      API_ENDPOINTS.ANALYSIS.INSTRUCTOR_ACTIVITY,
      params as Record<string, string | number>
    ).pipe(map(extractData));
  }
}
