import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  WorkspaceDto,
  WorkspaceDetailDto,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  CheckoutWorkspaceDto
} from '../../models/workspace-session.model';
import { CateringItemDto, AddCateringItemDto, UpdateCateringItemDto } from '../../models/classroom-session.model';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceApiService extends BaseApiService {
  /** Get paginated or filtered list of workspace sessions — GET /api/Workspaces */
  getSessions(params?: {
    StudentId?: string;
    Status?: number;
    Type?: number;
    Zone?: number;
    SeatElementId?: string;
    DateFrom?: string;
    DateTo?: string;
    Page?: number;
    PageSize?: number;
    status?: string | number;
    page?: number;
    pageSize?: number;
  }): Observable<WorkspaceDto[]> {
    return this.get<ApiResponse<WorkspaceDto[] | { items: WorkspaceDto[] }>>(
      API_ENDPOINTS.WORKSPACES.LIST,
      params as Record<string, string | number>
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: WorkspaceDto[] })?.items ?? [];
      })
    );
  }

  /** Get a single workspace session detail by ID — GET /api/Workspaces/{id} */
  getSessionById(id: string): Observable<WorkspaceDetailDto> {
    return this.get<ApiResponse<WorkspaceDetailDto>>(API_ENDPOINTS.WORKSPACES.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /**
   * Check in / create a new student workspace session — POST /api/Workspaces
   * API expects: CreateWorkspaceDto
   */
  checkIn(dto: CreateWorkspaceDto | any): Observable<WorkspaceDto> {
    const payload: Record<string, any> = {
      zone: dto.zone ?? 0,
      timeFrom: dto.timeFrom || new Date().toISOString(),
      date: dto.date || new Date().toISOString(),
      wiFi: dto.wiFi ?? 0,
      printing: dto.printing ?? 0,
      discount: dto.discount ?? 0,
      registration: dto.registration ? (typeof dto.registration === 'boolean' ? (dto.registration ? 1 : 0) : Number(dto.registration)) : 0,
      wallet: dto.wallet ?? 0,
      type: dto.type ?? 1,
      payWay: dto.payWay ?? 1,
      discountType: dto.discountType ?? null,
      note: dto.note || null,
      studentId: dto.studentId || null,
      seatElementId: dto.seatElementId || null,
      roomId: dto.roomId || null
    };

    return this.post<ApiResponse<WorkspaceDto>>(API_ENDPOINTS.WORKSPACES.LIST, payload).pipe(
      map(extractData)
    );
  }

  /**
   * Fast check-in / walk-in student workspace session — POST /api/Workspaces/walk-in
   * Finds existing student by phone or creates a new student on the spot and immediately starts a workspace session.
   */
  walkIn(dto: {
    studentName: string;
    phoneNumber: string;
    whatsapp?: string;
    facultyId?: string;
    roomId: string;
    seatElementId?: string;
    timeFrom?: string;
    notes?: string;
  }): Observable<WorkspaceDto> {
    const payload = {
      studentName: dto.studentName,
      phoneNumber: dto.phoneNumber,
      whatsapp: dto.whatsapp || dto.phoneNumber,
      facultyId: dto.facultyId || null,
      roomId: dto.roomId,
      seatElementId: dto.seatElementId || null,
      timeFrom: dto.timeFrom || new Date().toISOString(),
      notes: dto.notes || null
    };

    return this.post<ApiResponse<WorkspaceDto>>(API_ENDPOINTS.WORKSPACES.WALK_IN, payload).pipe(
      map(extractData)
    );
  }

  /** Update workspace session — PUT /api/Workspaces/{id} */
  updateSession(id: string, dto: UpdateWorkspaceDto): Observable<WorkspaceDto> {
    return this.put<ApiResponse<WorkspaceDto>>(API_ENDPOINTS.WORKSPACES.BY_ID(id), dto).pipe(
      map(extractData)
    );
  }

  /**
   * Check out a student session — PUT /api/Workspaces/{id}/checkout
   * API expects: CheckoutWorkspaceDto (supports paymentMethod: Cash/Visa/Wallet/Free, package, discounts)
   */
  checkOut(id: string, dto: CheckoutWorkspaceDto | any): Observable<WorkspaceDetailDto> {
    const payload: Record<string, any> = {
      timeTo: dto.timeTo || new Date().toISOString(),
      wiFi: dto.wiFi ?? 0,
      printing: dto.printing ?? 0,
      registration: dto.registration ?? 0,
      discount: dto.discount ?? 0,
      discountType: dto.discountType ?? null,
      wallet: dto.wallet ?? 0,
      payWay: dto.payWay ?? 1,
      paymentMethod: dto.paymentMethod || (dto.payWay === 3 ? 'Wallet' : (dto.payWay === 2 ? 'Visa' : 'Cash')),
      usePackageHours: dto.usePackageHours != null ? dto.usePackageHours : null,
      packageId: dto.packageId || null,
      discountId: dto.discountId || null,
      couponCode: dto.couponCode || null,
      note: dto.note || null
    };

    return this.put<ApiResponse<WorkspaceDetailDto>>(API_ENDPOINTS.WORKSPACES.CHECKOUT(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete / cancel a workspace session — DELETE /api/Workspaces/{id} */
  deleteSession(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.WORKSPACES.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Get catering items for a workspace session — GET /api/workspaces/{workspaceId}/catering */
  getCateringItems(workspaceId: string): Observable<CateringItemDto[]> {
    return this.get<ApiResponse<CateringItemDto[]>>(API_ENDPOINTS.WORKSPACES.CATERING(workspaceId)).pipe(
      map(extractData)
    );
  }

  /** Add catering item to a workspace session — POST /api/workspaces/{workspaceId}/catering */
  addCateringItem(workspaceId: string, item: AddCateringItemDto): Observable<any> {
    return this.post<ApiResponse<any>>(API_ENDPOINTS.WORKSPACES.CATERING(workspaceId), item).pipe(
      map(extractData)
    );
  }

  /** Update catering item in a workspace session — PUT /api/workspaces/{workspaceId}/catering/{id} */
  updateCateringItem(workspaceId: string, itemId: string, item: UpdateCateringItemDto): Observable<any> {
    return this.put<ApiResponse<any>>(API_ENDPOINTS.WORKSPACES.CATERING_ITEM(workspaceId, itemId), item).pipe(
      map(extractData)
    );
  }

  /** Remove catering item from a workspace session — DELETE /api/workspaces/{workspaceId}/catering/{id} */
  removeCateringItem(workspaceId: string, itemId: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.WORKSPACES.CATERING_ITEM(workspaceId, itemId)).pipe(
      map(extractData)
    );
  }
}


