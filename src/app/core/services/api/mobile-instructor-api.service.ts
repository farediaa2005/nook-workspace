import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  MobileInstructorProfileDto,
  UpdateMobileInstructorProfileDto,
  MobileRoomDto,
  MobileRoomAvailabilityDto,
  MobilePricingPlanDto,
  MobilePackagePricingPlanDto,
  MobileReservationDto,
  NotificationDto
} from '../../models/mobile.model';
import { ClassroomDto, CreateClassroomDto } from '../../models/classroom-session.model';
import { ClassroomPackageDto } from '../../models/package.model';

@Injectable({
  providedIn: 'root'
})
export class MobileInstructorApiService extends BaseApiService {
  /** Get instructor profile — GET /api/mobile/instructor/profile */
  getProfile(): Observable<MobileInstructorProfileDto> {
    return this.get<ApiResponse<MobileInstructorProfileDto>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.PROFILE
    ).pipe(map(extractData));
  }

  /** Update instructor profile — PUT /api/mobile/instructor/profile */
  updateProfile(dto: UpdateMobileInstructorProfileDto): Observable<MobileInstructorProfileDto> {
    return this.put<ApiResponse<MobileInstructorProfileDto>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.PROFILE,
      dto
    ).pipe(map(extractData));
  }

  /** Get rooms — GET /api/mobile/instructor/rooms */
  getRooms(): Observable<MobileRoomDto[]> {
    return this.get<ApiResponse<MobileRoomDto[] | { items: MobileRoomDto[] }>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.ROOMS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: MobileRoomDto[] })?.items ?? [];
      })
    );
  }

  /** Check room availability — GET /api/mobile/instructor/rooms/{roomId}/availability */
  checkRoomAvailability(roomId: string, params?: { date?: string; timeFrom?: string; timeTo?: string }): Observable<MobileRoomAvailabilityDto> {
    return this.get<ApiResponse<MobileRoomAvailabilityDto>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.ROOM_AVAILABILITY(roomId),
      params as Record<string, string | number>
    ).pipe(map(extractData));
  }

  /** Get instructor classrooms — GET /api/mobile/instructor/classrooms */
  getClassrooms(): Observable<ClassroomDto[]> {
    return this.get<ApiResponse<ClassroomDto[] | { items: ClassroomDto[] }>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.CLASSROOMS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: ClassroomDto[] })?.items ?? [];
      })
    );
  }

  /** Create classroom session — POST /api/mobile/instructor/classrooms */
  createClassroom(dto: CreateClassroomDto): Observable<ClassroomDto> {
    return this.post<ApiResponse<ClassroomDto>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.CLASSROOMS,
      dto
    ).pipe(map(extractData));
  }

  /** Get classroom by ID — GET /api/mobile/instructor/classrooms/{id} */
  getClassroomById(id: string): Observable<ClassroomDto> {
    return this.get<ApiResponse<ClassroomDto>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.CLASSROOM_BY_ID(id)
    ).pipe(map(extractData));
  }

  /** Get reservations — GET /api/mobile/instructor/reservations */
  getReservations(): Observable<MobileReservationDto[]> {
    return this.get<ApiResponse<MobileReservationDto[] | { items: MobileReservationDto[] }>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.RESERVATIONS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: MobileReservationDto[] })?.items ?? [];
      })
    );
  }

  /** Get reservation by ID — GET /api/mobile/instructor/reservations/{id} */
  getReservationById(id: string): Observable<MobileReservationDto> {
    return this.get<ApiResponse<MobileReservationDto>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.RESERVATION_BY_ID(id)
    ).pipe(map(extractData));
  }

  /** Get instructor packages — GET /api/mobile/instructor/packages */
  getPackages(): Observable<ClassroomPackageDto[]> {
    return this.get<ApiResponse<ClassroomPackageDto[] | { items: ClassroomPackageDto[] }>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.PACKAGES
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: ClassroomPackageDto[] })?.items ?? [];
      })
    );
  }

  /** Get pricing plans — GET /api/mobile/instructor/pricing-plans */
  getPricingPlans(): Observable<MobilePricingPlanDto[]> {
    return this.get<ApiResponse<MobilePricingPlanDto[] | { items: MobilePricingPlanDto[] }>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.PRICING_PLANS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: MobilePricingPlanDto[] })?.items ?? [];
      })
    );
  }

  /** Get package pricing plans — GET /api/mobile/instructor/package-pricing-plans */
  getPackagePricingPlans(): Observable<MobilePackagePricingPlanDto[]> {
    return this.get<ApiResponse<MobilePackagePricingPlanDto[] | { items: MobilePackagePricingPlanDto[] }>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.PACKAGE_PRICING_PLANS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: MobilePackagePricingPlanDto[] })?.items ?? [];
      })
    );
  }

  /** Get notifications — GET /api/mobile/instructor/notifications */
  getNotifications(): Observable<NotificationDto[]> {
    return this.get<ApiResponse<NotificationDto[] | { items: NotificationDto[] }>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.NOTIFICATIONS
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: NotificationDto[] })?.items ?? [];
      })
    );
  }

  /** Mark notification as read — PUT /api/mobile/instructor/notifications/{id}/read */
  markNotificationRead(id: string): Observable<boolean> {
    return this.put<ApiResponse<boolean>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.READ_NOTIFICATION(id),
      {}
    ).pipe(map(extractData));
  }

  /** Mark all notifications as read — PUT /api/mobile/instructor/notifications/read-all */
  markAllNotificationsRead(): Observable<boolean> {
    return this.put<ApiResponse<boolean>>(
      API_ENDPOINTS.MOBILE_INSTRUCTOR.READ_ALL_NOTIFICATIONS,
      {}
    ).pipe(map(extractData));
  }
}
