import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  ReservationDto,
  CreateReservationDto,
  UpdateReservationDto
} from '../../models/classroom.model';

export type BackendReservationDto = ReservationDto;
export type CreateReservationPayload = CreateReservationDto;

@Injectable({
  providedIn: 'root'
})
export class ReservationApiService extends BaseApiService {
  /** Get all reservations */
  getReservations(params?: {
    InstructorId?: string;
    RoomId?: string;
    DateFrom?: string;
    DateTo?: string;
    Page?: number;
    PageSize?: number;
  }): Observable<ReservationDto[]> {
    return this.get<ApiResponse<ReservationDto[] | { items: ReservationDto[] }>>(
      API_ENDPOINTS.RESERVATIONS.LIST,
      params as Record<string, string | number>
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: ReservationDto[] })?.items ?? [];
      })
    );
  }

  /** Get reservation by ID */
  getReservationById(id: string): Observable<ReservationDto> {
    return this.get<ApiResponse<ReservationDto>>(API_ENDPOINTS.RESERVATIONS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Get reservations by instructor ID */
  getReservationsByInstructor(instructorId: string): Observable<ReservationDto[]> {
    return this.get<ApiResponse<ReservationDto[]>>(API_ENDPOINTS.RESERVATIONS.BY_INSTRUCTOR(instructorId)).pipe(
      map(extractData)
    );
  }

  /** Create new scheduled reservation */
  createReservation(payload: CreateReservationDto): Observable<ReservationDto> {
    return this.post<ApiResponse<ReservationDto>>(API_ENDPOINTS.RESERVATIONS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update reservation */
  updateReservation(id: string, payload: UpdateReservationDto): Observable<ReservationDto> {
    return this.put<ApiResponse<ReservationDto>>(API_ENDPOINTS.RESERVATIONS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete reservation */
  deleteReservation(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.RESERVATIONS.BY_ID(id)).pipe(
      map(extractData)
    );
  }
}
