import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import { BookingDto, UpdateBookingStatusDto } from '../../models/classroom-session.model';

@Injectable({
  providedIn: 'root'
})
export class BookingApiService extends BaseApiService {
  /** Get all bookings (admin calendar reservations) */
  getBookings(status?: string): Observable<BookingDto[]> {
    const params = status ? { status } : undefined;
    return this.get<ApiResponse<BookingDto[] | { items: BookingDto[] }>>(
      API_ENDPOINTS.BOOKINGS.LIST,
      params
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: BookingDto[] })?.items ?? [];
      })
    );
  }

  /** Get single booking by ID */
  getBookingById(id: string): Observable<BookingDto> {
    return this.get<ApiResponse<BookingDto>>(API_ENDPOINTS.BOOKINGS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Update booking status */
  updateBookingStatus(id: string, dto: UpdateBookingStatusDto): Observable<BookingDto> {
    return this.put<ApiResponse<BookingDto>>(API_ENDPOINTS.BOOKINGS.STATUS(id), dto).pipe(
      map(extractData)
    );
  }

  /** Delete / cancel booking */
  deleteBooking(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.BOOKINGS.BY_ID(id)).pipe(
      map(extractData)
    );
  }
}
