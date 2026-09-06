import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';

export interface BackendReservationDto {
  id: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  dayOfWeek?: number | null;
  roomId?: string | null;
  roomName?: string | null;
  discount?: number;
  discountType?: number | null;
  reservationCost?: number;
  activity?: string | null;
  note?: string | null;
  instructorId?: string | null;
  instructorName?: string | null;
}

export interface CreateReservationPayload {
  timeFrom?: string | null;
  timeTo?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  dayOfWeek?: number | null;
  roomId?: string | null;
  discount?: number;
  discountType?: number | null;
  reservationCost?: number;
  activity?: string | null;
  note?: string | null;
  instructorId?: string | null;
}

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
  }): Observable<BackendReservationDto[]> {
    return this.get<ApiResponse<BackendReservationDto[] | { items: BackendReservationDto[] }>>(
      API_ENDPOINTS.RESERVATIONS.LIST,
      params as Record<string, string | number>
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: BackendReservationDto[] })?.items ?? [];
      })
    );
  }

  /** Get reservation by ID */
  getReservationById(id: string): Observable<BackendReservationDto> {
    return this.get<ApiResponse<BackendReservationDto>>(API_ENDPOINTS.RESERVATIONS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Get reservations by instructor ID */
  getReservationsByInstructor(instructorId: string): Observable<BackendReservationDto[]> {
    return this.get<ApiResponse<BackendReservationDto[]>>(API_ENDPOINTS.RESERVATIONS.BY_INSTRUCTOR(instructorId)).pipe(
      map(extractData)
    );
  }

  /** Create new scheduled reservation */
  createReservation(payload: CreateReservationPayload): Observable<BackendReservationDto> {
    return this.post<ApiResponse<BackendReservationDto>>(API_ENDPOINTS.RESERVATIONS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update reservation */
  updateReservation(id: string, payload: Partial<CreateReservationPayload>): Observable<BackendReservationDto> {
    return this.put<ApiResponse<BackendReservationDto>>(API_ENDPOINTS.RESERVATIONS.BY_ID(id), payload).pipe(
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
