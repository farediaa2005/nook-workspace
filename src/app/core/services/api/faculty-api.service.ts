import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  FacultyDto,
  CreateFacultyDto,
  UpdateFacultyDto
} from '../../models/faculty.model';

@Injectable({
  providedIn: 'root'
})
export class FacultyApiService extends BaseApiService {
  /** Get all faculties / colleges — GET /api/Faculties */
  getFaculties(): Observable<FacultyDto[]> {
    return this.get<ApiResponse<FacultyDto[] | { items: FacultyDto[] }>>(
      API_ENDPOINTS.FACULTIES.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: FacultyDto[] })?.items ?? [];
      })
    );
  }

  /** Get faculty by ID — GET /api/Faculties/{id} */
  getFacultyById(id: string): Observable<FacultyDto> {
    return this.get<ApiResponse<FacultyDto>>(API_ENDPOINTS.FACULTIES.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Create faculty — POST /api/Faculties */
  createFaculty(dto: CreateFacultyDto): Observable<FacultyDto> {
    const payload = {
      name: dto.name
    };
    return this.post<ApiResponse<FacultyDto>>(API_ENDPOINTS.FACULTIES.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update faculty — PUT /api/Faculties/{id} */
  updateFaculty(id: string, dto: UpdateFacultyDto): Observable<FacultyDto> {
    const payload = {
      name: dto.name
    };
    return this.put<ApiResponse<FacultyDto>>(API_ENDPOINTS.FACULTIES.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete faculty — DELETE /api/Faculties/{id} */
  deleteFaculty(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.FACULTIES.BY_ID(id)).pipe(
      map(res => {
        if (!res) return true;
        return (res as any).data !== undefined ? !!(res as any).data : ((res as any).success ?? (res as any).isSuccess ?? true);
      }),
      catchError(() => of(true))
    );
  }
}

