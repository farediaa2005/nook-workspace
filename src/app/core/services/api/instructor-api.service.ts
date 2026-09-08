import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  InstructorDto,
  CreateInstructorDto,
  UpdateInstructorDto
} from '../../models/instructor.model';

@Injectable({
  providedIn: 'root'
})
export class InstructorApiService extends BaseApiService {
  /** Get all instructors — GET /api/Instructors */
  getInstructors(): Observable<InstructorDto[]> {
    return this.get<ApiResponse<InstructorDto[] | { items: InstructorDto[] }>>(
      API_ENDPOINTS.INSTRUCTORS.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: InstructorDto[] })?.items ?? [];
      })
    );
  }

  /** Get instructor by ID — GET /api/Instructors/{id} */
  getInstructorById(id: string): Observable<InstructorDto> {
    return this.get<ApiResponse<InstructorDto>>(API_ENDPOINTS.INSTRUCTORS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Create instructor — POST /api/Instructors */
  createInstructor(dto: CreateInstructorDto | any): Observable<InstructorDto> {
    const payload = {
      name: dto.name,
      phoneNumber: dto.phoneNumber || dto.phone || null,
      email: dto.email || null,
      specialty: dto.specialty || dto.specialization || null,
      affiliation: dto.affiliation || dto.workplace || null,
      colour: dto.colour || '#f5b921'
    };
    return this.post<ApiResponse<InstructorDto>>(API_ENDPOINTS.INSTRUCTORS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update instructor — PUT /api/Instructors/{id} */
  updateInstructor(id: string, dto: UpdateInstructorDto | any): Observable<InstructorDto> {
    const payload = {
      name: dto.name,
      phoneNumber: dto.phoneNumber || dto.phone || null,
      email: dto.email || null,
      specialty: dto.specialty || dto.specialization || null,
      affiliation: dto.affiliation || dto.workplace || null,
      colour: dto.colour || '#f5b921'
    };
    return this.put<ApiResponse<InstructorDto>>(API_ENDPOINTS.INSTRUCTORS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete instructor — DELETE /api/Instructors/{id} */
  deleteInstructor(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.INSTRUCTORS.BY_ID(id)).pipe(
      map(res => {
        if (!res) return true;
        return res.data !== undefined ? !!res.data : (res.success ?? res.isSuccess ?? true);
      }),
      catchError(err => {
        console.warn('[InstructorApiService] deleteInstructor error/fallback:', err);
        return of(true);
      })
    );
  }
}

