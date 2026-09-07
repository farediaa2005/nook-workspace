import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  MobileStudentProfileDto,
  UpdateMobileStudentProfileDto,
  MobileRoomDto,
  MobileFloorPlanDto,
  MobileBookingDto,
  CreateMobileStudentBookingDto,
  MobilePricingPlanDto,
  MobilePackagePricingPlanDto,
  NotificationDto
} from '../../models/mobile.model';
import { WalletBalanceDto, WalletTransactionDto, WalletTopUpRequestDto } from '../../models/wallet.model';
import { WorkspacePackageDto } from '../../models/package.model';

@Injectable({
  providedIn: 'root'
})
export class MobileStudentApiService extends BaseApiService {
  /** Get logged-in student profile — GET /api/mobile/student/profile */
  getProfile(): Observable<MobileStudentProfileDto> {
    return this.get<ApiResponse<MobileStudentProfileDto>>(
      API_ENDPOINTS.MOBILE_STUDENT.PROFILE
    ).pipe(map(extractData));
  }

  /** Update logged-in student profile — PUT /api/mobile/student/profile */
  updateProfile(dto: UpdateMobileStudentProfileDto): Observable<MobileStudentProfileDto> {
    return this.put<ApiResponse<MobileStudentProfileDto>>(
      API_ENDPOINTS.MOBILE_STUDENT.PROFILE,
      dto
    ).pipe(map(extractData));
  }

  /** Get available rooms — GET /api/mobile/student/rooms */
  getRooms(): Observable<MobileRoomDto[]> {
    return this.get<ApiResponse<MobileRoomDto[] | { items: MobileRoomDto[] }>>(
      API_ENDPOINTS.MOBILE_STUDENT.ROOMS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: MobileRoomDto[] })?.items ?? [];
      })
    );
  }

  /** Get floor plan for a room — GET /api/mobile/student/rooms/{roomId}/floor-plan */
  getRoomFloorPlan(roomId: string): Observable<MobileFloorPlanDto> {
    return this.get<ApiResponse<MobileFloorPlanDto>>(
      API_ENDPOINTS.MOBILE_STUDENT.ROOM_FLOOR_PLAN(roomId)
    ).pipe(map(extractData));
  }

  /** Create student booking — POST /api/mobile/student/bookings */
  createBooking(dto: CreateMobileStudentBookingDto): Observable<MobileBookingDto> {
    return this.post<ApiResponse<MobileBookingDto>>(
      API_ENDPOINTS.MOBILE_STUDENT.BOOKINGS,
      dto
    ).pipe(map(extractData));
  }

  /** Get student bookings — GET /api/mobile/student/bookings */
  getBookings(status?: string): Observable<MobileBookingDto[]> {
    const params = status ? { status } : undefined;
    return this.get<ApiResponse<MobileBookingDto[] | { items: MobileBookingDto[] }>>(
      API_ENDPOINTS.MOBILE_STUDENT.BOOKINGS,
      params
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: MobileBookingDto[] })?.items ?? [];
      })
    );
  }

  /** Get booking by ID — GET /api/mobile/student/bookings/{id} */
  getBookingById(id: string): Observable<MobileBookingDto> {
    return this.get<ApiResponse<MobileBookingDto>>(
      API_ENDPOINTS.MOBILE_STUDENT.BOOKING_BY_ID(id)
    ).pipe(map(extractData));
  }

  /** Cancel booking — DELETE /api/mobile/student/bookings/{id}/cancel */
  cancelBooking(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.MOBILE_STUDENT.CANCEL_BOOKING(id)
    ).pipe(map(extractData));
  }

  /** Get wallet balance — GET /api/mobile/student/wallet/balance */
  getWalletBalance(): Observable<WalletBalanceDto> {
    return this.get<ApiResponse<WalletBalanceDto>>(
      API_ENDPOINTS.MOBILE_STUDENT.WALLET_BALANCE
    ).pipe(map(extractData));
  }

  /** Get wallet transactions — GET /api/mobile/student/wallet/transactions */
  getWalletTransactions(): Observable<WalletTransactionDto[]> {
    return this.get<ApiResponse<WalletTransactionDto[] | { items: WalletTransactionDto[] }>>(
      API_ENDPOINTS.MOBILE_STUDENT.WALLET_TRANSACTIONS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: WalletTransactionDto[] })?.items ?? [];
      })
    );
  }

  /** Submit wallet top-up request — POST /api/mobile/student/wallet/topup */
  submitWalletTopUp(dto: { amount: number; proofImageUrl?: string; note?: string }): Observable<WalletTopUpRequestDto> {
    return this.post<ApiResponse<WalletTopUpRequestDto>>(
      API_ENDPOINTS.MOBILE_STUDENT.WALLET_TOPUP,
      dto
    ).pipe(map(extractData));
  }

  /** Get student wallet topup requests — GET /api/mobile/student/wallet/topup-requests */
  getWalletTopUpRequests(): Observable<WalletTopUpRequestDto[]> {
    return this.get<ApiResponse<WalletTopUpRequestDto[] | { items: WalletTopUpRequestDto[] }>>(
      API_ENDPOINTS.MOBILE_STUDENT.WALLET_TOPUP_REQUESTS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: WalletTopUpRequestDto[] })?.items ?? [];
      })
    );
  }

  /** Get student packages — GET /api/mobile/student/packages */
  getPackages(): Observable<WorkspacePackageDto[]> {
    return this.get<ApiResponse<WorkspacePackageDto[] | { items: WorkspacePackageDto[] }>>(
      API_ENDPOINTS.MOBILE_STUDENT.PACKAGES
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: WorkspacePackageDto[] })?.items ?? [];
      })
    );
  }

  /** Get pricing plans — GET /api/mobile/student/pricing-plans */
  getPricingPlans(): Observable<MobilePricingPlanDto[]> {
    return this.get<ApiResponse<MobilePricingPlanDto[] | { items: MobilePricingPlanDto[] }>>(
      API_ENDPOINTS.MOBILE_STUDENT.PRICING_PLANS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: MobilePricingPlanDto[] })?.items ?? [];
      })
    );
  }

  /** Get package pricing plans — GET /api/mobile/student/package-pricing-plans */
  getPackagePricingPlans(): Observable<MobilePackagePricingPlanDto[]> {
    return this.get<ApiResponse<MobilePackagePricingPlanDto[] | { items: MobilePackagePricingPlanDto[] }>>(
      API_ENDPOINTS.MOBILE_STUDENT.PACKAGE_PRICING_PLANS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: MobilePackagePricingPlanDto[] })?.items ?? [];
      })
    );
  }

  /** Get notifications — GET /api/mobile/student/notifications */
  getNotifications(): Observable<NotificationDto[]> {
    return this.get<ApiResponse<NotificationDto[] | { items: NotificationDto[] }>>(
      API_ENDPOINTS.MOBILE_STUDENT.NOTIFICATIONS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: NotificationDto[] })?.items ?? [];
      })
    );
  }

  /** Mark notification as read — PUT /api/mobile/student/notifications/{id}/read */
  markNotificationRead(id: string): Observable<boolean> {
    return this.put<ApiResponse<boolean>>(
      API_ENDPOINTS.MOBILE_STUDENT.READ_NOTIFICATION(id),
      {}
    ).pipe(map(extractData));
  }

  /** Mark all notifications as read — PUT /api/mobile/student/notifications/read-all */
  markAllNotificationsRead(): Observable<boolean> {
    return this.put<ApiResponse<boolean>>(
      API_ENDPOINTS.MOBILE_STUDENT.READ_ALL_NOTIFICATIONS,
      {}
    ).pipe(map(extractData));
  }
}
