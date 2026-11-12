import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import { RevenueAnalysisDto, OccupancyAnalysisDto } from '../../models/dashboard.model';

export interface TopStudentDto {
  studentId: string;
  studentName: string;
  phoneNumber?: string | null;
  totalVisits: number;
  totalSpend: number;
}

export interface InstructorActivityDto {
  instructorId: string;
  instructorName: string;
  totalClassroomSessions: number;
  totalSpend: number;
}

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

  /** Most frequent students — GET /api/Analysis/top-students */
  getTopStudents(): Observable<TopStudentDto[]> {
    return this.get<ApiResponse<TopStudentDto[]>>(API_ENDPOINTS.ANALYSIS.TOP_STUDENTS).pipe(map(res => extractData(res) || []));
  }

  /** Classroom sessions and spend per instructor — GET /api/Analysis/instructor-activity */
  getInstructorActivity(): Observable<InstructorActivityDto[]> {
    return this.get<ApiResponse<InstructorActivityDto[]>>(API_ENDPOINTS.ANALYSIS.INSTRUCTOR_ACTIVITY).pipe(map(res => extractData(res) || []));
  }
}
