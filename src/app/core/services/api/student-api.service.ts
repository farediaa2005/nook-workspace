import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';

export interface BackendStudentDto {
  id: string;
  name: string;
  phoneNumber?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  college?: string | null;
  university?: string | null;
  canBook: boolean;
  walletBalance?: number;
  walletAmount?: number;
  roomId?: string | null;
  roomName?: string | null;
  zone?: number;
  addedBy?: string | null;
  status?: string | null;
  isBlocked?: boolean;
  blockReason?: string | null;
  facultyName?: string | null;
  parentName?: string | null;
}

export interface CreateStudentPayload {
  name: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  college?: string | null;
  university?: string | null;
  roomId?: string | null;
  zone?: number;
  addedBy?: string | null;
  printingPrice?: number;
  facultyId?: string | null;
  parentId?: string | null;
}

export interface UpdateStudentPayload {
  name?: string;
  phoneNumber?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  college?: string | null;
  university?: string | null;
  facultyId?: string | null;
  parentId?: string | null;
  canBook?: boolean;
}

export interface StudentCheckoutPayload {
  studentId: string;
  checkOutTime?: string;
  durationHours?: number;
  totalCost?: number;
  amountReceived?: number;
  walletAmount?: number;
  paymentMethod?: string;
  shiftId?: string;
}

export interface StudentCheckoutResponse {
  id: string;
  status: string;
  walletAmount: number;
  totalCost: number;
  amountReceived: number;
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

  /** Search students by term with autocomplete and blacklist cross-referencing — GET /api/Students?search={term} */
  searchStudents(term: string): Observable<BackendStudentDto[]> {
    return this.get<ApiResponse<BackendStudentDto[] | { items: BackendStudentDto[] }>>(
      API_ENDPOINTS.STUDENTS.SEARCH(term)
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

  /** Create a new student or start active room session — POST /api/Students */
  createStudent(payload: CreateStudentPayload): Observable<BackendStudentDto> {
    return this.post<ApiResponse<BackendStudentDto>>(API_ENDPOINTS.STUDENTS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Student checkout with wallet balance & debt persistence — POST /api/Students/{id}/checkout */
  checkoutStudent(id: string, payload: StudentCheckoutPayload): Observable<StudentCheckoutResponse> {
    return this.post<ApiResponse<StudentCheckoutResponse>>(
      API_ENDPOINTS.STUDENTS.CHECKOUT(id),
      payload
    ).pipe(
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
