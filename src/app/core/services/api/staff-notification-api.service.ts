import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import { StaffNotification, StaffNotificationType, StaffNotificationSeverity } from '../../models/notification.model';

export interface StaffNotificationDto {
  id: string;
  type: number | string;
  title: string;
  message: string;
  severity: number | string;
  createdAt: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
}

export interface StaffNotificationsPagedResultDto {
  items: StaffNotificationDto[];
  totalCount: number;
  unreadCount: number;
  pageNumber: number;
  pageSize: number;
}

const TYPE_MAP: Record<number, StaffNotificationType> = {
  1: 'Workspace',
  2: 'Classroom',
  3: 'Package',
  4: 'SharedRoom',
  5: 'SilentRoom',
  6: 'Catering',
  7: 'LongStay',
  8: 'Shift'
};

const SEVERITY_MAP: Record<number, StaffNotificationSeverity> = {
  1: 'info',
  2: 'warning',
  3: 'critical',
  4: 'success'
};

export function mapStaffNotificationDto(dto: StaffNotificationDto): StaffNotification {
  const typeStr: StaffNotificationType = typeof dto.type === 'number'
    ? (TYPE_MAP[dto.type] || 'Workspace')
    : (dto.type as StaffNotificationType);

  const severityStr: StaffNotificationSeverity = typeof dto.severity === 'number'
    ? (SEVERITY_MAP[dto.severity] || 'info')
    : (dto.severity as StaffNotificationSeverity);

  return {
    id: dto.id,
    type: typeStr,
    title: dto.title,
    message: dto.message,
    severity: severityStr,
    createdAt: dto.createdAt,
    relatedEntityType: dto.relatedEntityType as any,
    relatedEntityId: dto.relatedEntityId || undefined,
    actionUrl: dto.actionUrl || undefined,
    isRead: dto.isRead,
    readAt: dto.readAt
  };
}

@Injectable({
  providedIn: 'root'
})
export class StaffNotificationApiService extends BaseApiService {
  /** Get paginated staff notifications — GET /api/Notifications */
  getNotifications(params?: {
    unreadOnly?: boolean;
    type?: number;
    severity?: number;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<{ items: StaffNotification[]; totalCount: number; unreadCount: number }> {
    return this.get<ApiResponse<StaffNotificationsPagedResultDto>>(
      API_ENDPOINTS.STAFF_NOTIFICATIONS.LIST,
      params
    ).pipe(
      map(extractData),
      map(res => ({
        items: (res?.items || []).map(mapStaffNotificationDto),
        totalCount: res?.totalCount || 0,
        unreadCount: res?.unreadCount || 0
      }))
    );
  }

  /** Mark single notification as read — PUT /api/Notifications/{id}/read */
  markAsRead(id: string): Observable<boolean> {
    return this.put<ApiResponse<boolean>>(
      API_ENDPOINTS.STAFF_NOTIFICATIONS.READ(id),
      {}
    ).pipe(
      map(extractData)
    );
  }

  /** Mark all notifications as read — PUT /api/Notifications/read-all */
  markAllAsRead(): Observable<boolean> {
    return this.put<ApiResponse<boolean>>(
      API_ENDPOINTS.STAFF_NOTIFICATIONS.READ_ALL,
      {}
    ).pipe(
      map(extractData)
    );
  }

  /** Delete notification — DELETE /api/Notifications/{id} */
  deleteNotification(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.STAFF_NOTIFICATIONS.DELETE(id)
    ).pipe(
      map(extractData)
    );
  }
}
