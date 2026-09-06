import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';

export interface BackendStudentDto {
  id: string;
  name: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
  canBook: boolean;
  facultyName?: string | null;
  parentName?: string | null;
}

export interface CreateStudentPayload {
  name: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
  facultyId?: string | null;
  parentId?: string | null;
}

export interface UpdateStudentPayload {
  name?: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
  facultyId?: string | null;
  parentId?: string | null;
  canBook?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StudentApiService extends BaseApiService {
  /** Get list of students */
  getStudents(params?: { FacultyId?: string; SearchTerm?: string; Page?: number; PageSize?: number }): Observable<BackendStudentDto[]> {
    return this.get<ApiResponse<BackendStudentDto[] | { items: BackendStudentDto[] }>>(
      API_ENDPOINTS.STUDENTS.LIST,
      params as Record<string, string | number>
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: BackendStudentDto[] })?.items ?? [];
      })
    );
  }

  /** Get student by ID */
  getStudentById(id: string): Observable<BackendStudentDto> {
    return this.get<ApiResponse<BackendStudentDto>>(API_ENDPOINTS.STUDENTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Create a new student */
  createStudent(payload: CreateStudentPayload): Observable<BackendStudentDto> {
    return this.post<ApiResponse<BackendStudentDto>>(API_ENDPOINTS.STUDENTS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update an existing student */
  updateStudent(id: string, payload: UpdateStudentPayload): Observable<BackendStudentDto> {
    return this.put<ApiResponse<BackendStudentDto>>(API_ENDPOINTS.STUDENTS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete a student */
  deleteStudent(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.STUDENTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }
}
