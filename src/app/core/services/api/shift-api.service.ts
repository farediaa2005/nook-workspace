import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  ShiftDto,
  ShiftDetailDto,
  CreateShiftDto,
  CloseShiftDto,
  CreateShiftItemDto,
  ShiftItemDto,
  ShiftFilterParams,
  VerifyShiftPasswordDto
} from '../../models/shift-api.model';

@Injectable({
  providedIn: 'root'
})
export class ShiftApiService extends BaseApiService {
  /**
   * GET /api/shifts — List Shifts
   * Query: ?userId=guid&status=Open
   * Response: ApiResponse<IEnumerable<ShiftDto>>
   */
  getShifts(params?: ShiftFilterParams): Observable<ShiftDto[]> {
    const queryParams: Record<string, string | number> = {};
    if (params?.userId) queryParams['userId'] = params.userId;
    if (params?.status !== undefined && params?.status !== null) queryParams['status'] = String(params.status);
    if (params?.dateFrom) queryParams['dateFrom'] = params.dateFrom;
    if (params?.dateTo) queryParams['dateTo'] = params.dateTo;
    if (params?.page) queryParams['page'] = params.page;
    if (params?.pageSize) queryParams['pageSize'] = params.pageSize;

    return this.get<any>(
      API_ENDPOINTS.SHIFTS.LIST,
      queryParams
    ).pipe(
      map(res => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.items)) return res.items;
        if (res.data && Array.isArray(res.data.items)) return res.data.items;
        return [];
      }),
      catchError(() => of([] as ShiftDto[]))
    );
  }

  /**
   * GET /api/shifts/{id} — Get Shift Detail
   * Response: ApiResponse<ShiftDetailDto> — includes all shift items and totals.
   */
  getShiftById(id: string): Observable<ShiftDetailDto> {
    return this.get<ApiResponse<ShiftDetailDto>>(API_ENDPOINTS.SHIFTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /**
   * GET /api/shifts/open/{userId} — Get Open Shift for User
   * Response: ApiResponse<ShiftDto> or 404 if none open.
   */
  getOpenShift(userId: string): Observable<ShiftDto | null> {
    return this.get<any>(API_ENDPOINTS.SHIFTS.OPEN(userId)).pipe(
      map(res => {
        if (!res) return null;
        if (res.data) return res.data;
        if (res.id) return res;
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * GET /api/shifts/current — Get Current Active Shift (System-Wide)
   * Response: ApiResponse<ShiftDetailDto> or 404.
   */
  getCurrentShift(): Observable<ShiftDetailDto | null> {
    return this.get<any>(API_ENDPOINTS.SHIFTS.CURRENT).pipe(
      map(res => {
        if (!res) return null;
        if (res.data) return res.data;
        if (res.id) return res;
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * POST /api/shifts — Open Shift
   * Request Body:
   * {
   *   "userId": "guid",
   *   "openingBalance": 500.0,
   *   "notes": "string"
   * }
   * Response: ApiResponse<ShiftDto> (201)
   * Logic: Validates no open shift exists for this user, creates Shift with SessionStatus.Open.
   */
  startShift(dto: CreateShiftDto): Observable<ShiftDto> {
    const now = new Date().toISOString();
    const balance = dto.openingBalance ?? dto.previousTotal ?? dto.startCash ?? 0;
    const payload: any = {
      openingBalance: balance,
      notes: dto.notes || '',
      // Backward compatibility aliases for server binders
      previousTotal: balance,
      date: dto.date || now,
      timeFrom: dto.timeFrom || now
    };
    if (dto.userId && typeof dto.userId === 'string' && dto.userId.trim().length > 0) {
      payload.userId = dto.userId;
    }
    return this.post<ApiResponse<ShiftDto>>(API_ENDPOINTS.SHIFTS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /**
   * PUT /api/shifts/{id}/close — Close Shift
   * Request Body:
   * {
   *   "closingBalance": 750.0,
   *   "notes": "string"
   * }
   * Response: ApiResponse<ShiftDto>
   * Logic: Calculates expected closing balance from opening balance + items, records variance.
   */
  closeShift(id: string, dto: CloseShiftDto): Observable<ShiftDto> {
    const now = new Date().toISOString();
    const balance = dto.closingBalance ?? dto.totalCost ?? dto.endCash ?? 0;
    const payload: any = {
      closingBalance: balance,
      notes: dto.notes ?? dto.note ?? '',
      // Backward compatibility aliases for server binders
      totalCost: balance,
      note: dto.notes ?? dto.note ?? '',
      timeTo: dto.timeTo || now,
      administrative: dto.administrative ?? 0,
      vfCashInside: dto.vfCashInside ?? 0,
      vfCashOutside: dto.vfCashOutside ?? 0,
      increase: dto.increase ?? 0,
      loss: dto.loss ?? 0,
      status: dto.status ?? 2
    };
    return this.put<ApiResponse<ShiftDto>>(API_ENDPOINTS.SHIFTS.CLOSE(id), payload).pipe(
      map(extractData)
    );
  }

  /**
   * POST /api/shifts/{id}/items — Add Shift Item
   * Request Body:
   * {
   *   "description": "string",
   *   "amount": 50.0,
   *   "category": "Income"
   * }
   * Response: ApiResponse<ShiftItemDto>
   * Logic: Only allowed while shift is open.
   */
  addShiftItem(shiftId: string, item: CreateShiftItemDto): Observable<ShiftItemDto> {
    const rawAmount = item.amount ?? item.cost ?? 0;
    const desc = item.description || item.item || 'Item';
    const rawCat = String(item.category || item.type || 'Income');
    const categoryVal = (rawCat.toLowerCase() === 'expense' || rawCat === '2') ? 'Expense' : 'Income';

    const payload: any = {
      description: desc,
      amount: Math.abs(rawAmount),
      category: categoryVal,
      // Backward compatibility aliases
      cost: Math.abs(rawAmount),
      item: desc,
      type: categoryVal,
      payWay: item.payWay ?? 1
    };
    return this.post<ApiResponse<ShiftItemDto>>(API_ENDPOINTS.SHIFTS.ITEMS(shiftId), payload).pipe(
      map(extractData)
    );
  }

  /**
   * DELETE /api/shifts/{id}/items/{itemId} — Remove Shift Item
   * Response: ApiResponse<bool>
   */
  deleteShiftItem(shiftId: string, itemId: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.SHIFTS.ITEM_BY_ID(shiftId, itemId)).pipe(
      map(extractData)
    );
  }

  /**
   * POST /api/shifts/{id}/verify-password — Verify Shift Password (with route ID)
   * Request Body: VerifyShiftPasswordDto { "password": "string" }
   * Response: { "verified": true, "message": "..." } — 401 if wrong password.
   *
   * POST /api/shifts/verify-password — Verify Shift Password (body ID)
   * Request Body: { "shiftId": "guid", "password": "string" }
   * Response: same as above.
   */
  verifyShiftPassword(dto: VerifyShiftPasswordDto): Observable<{ success: boolean; verified: boolean; message?: string }> {
    const hasRouteId = !!dto.shiftId && /^[0-9a-fA-F-]{36}$/.test(dto.shiftId);
    const url = API_ENDPOINTS.SHIFTS.VERIFY_PASSWORD(hasRouteId ? dto.shiftId : undefined);
    const payload = hasRouteId
      ? { password: dto.password }
      : { shiftId: dto.shiftId, password: dto.password, staffIdentifier: dto.staffIdentifier };

    return this.post<any>(url, payload).pipe(
      map(res => {
        const verified = res?.data?.verified ?? res?.verified ?? res?.success ?? false;
        return {
          success: res?.success ?? verified,
          verified: !!verified,
          message: res?.message || res?.data?.message || (res as any)?.messageAr || (res as any)?.messageEn
        };
      })
    );
  }

  /**
   * POST /api/shifts/{id}/recalculate — Recalculate Shift
   * Response: ApiResponse<ShiftDetailDto>
   * Logic: Re-aggregates all shift items and updates total figures (useful after corrections).
   */
  recalculateShift(id: string): Observable<ShiftDetailDto> {
    return this.post<ApiResponse<ShiftDetailDto>>(API_ENDPOINTS.SHIFTS.RECALCULATE(id), {}).pipe(
      map(extractData)
    );
  }
}
