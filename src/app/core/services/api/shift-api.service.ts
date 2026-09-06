import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  ShiftDto,
  CreateShiftDto,
  UpdateShiftDto,
  CloseShiftDto,
  CreateShiftItemDto,
  ShiftFilterParams
} from '../../models/shift-api.model';

@Injectable({
  providedIn: 'root'
})
export class ShiftApiService extends BaseApiService {
  /** Get all shifts with optional filtering */
  getShifts(params?: ShiftFilterParams): Observable<ShiftDto[]> {
    return this.get<ApiResponse<ShiftDto[] | { items: ShiftDto[] }>>(
      API_ENDPOINTS.SHIFTS.LIST,
      params as unknown as Record<string, string | number>
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: ShiftDto[] })?.items ?? [];
      })
    );
  }

  /** Check if there is an active open shift for a user */
  getOpenShift(userId: string): Observable<ShiftDto | null> {
    return this.get<ApiResponse<ShiftDto>>(API_ENDPOINTS.SHIFTS.OPEN(userId)).pipe(
      map(res => res?.data ?? null),
      catchError(() => of(null))
    );
  }

  /** Get shift by ID */
  getShiftById(id: string): Observable<ShiftDto> {
    return this.get<ApiResponse<ShiftDto>>(API_ENDPOINTS.SHIFTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /**
   * Start a new shift — POST /api/Shifts
   * OpenAPI CreateShiftDto: { date, timeFrom, previousTotal, userId }
   */
  startShift(dto: CreateShiftDto): Observable<ShiftDto> {
    const now = new Date().toISOString();
    const payload: any = {
      date: dto.date || now,
      timeFrom: dto.timeFrom || now,
      previousTotal: dto.previousTotal ?? dto.startCash ?? 0
    };
    if (dto.userId && typeof dto.userId === 'string' && dto.userId.length > 10) {
      payload.userId = dto.userId;
    }
    return this.post<ApiResponse<ShiftDto>>(API_ENDPOINTS.SHIFTS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /**
   * Close active shift — PUT /api/Shifts/{id}/close
   * OpenAPI UpdateShiftDto: { timeTo, administrative, vfCashInside, vfCashOutside, increase, loss, totalCost, note, status }
   */
  closeShift(id: string, dto: CloseShiftDto): Observable<ShiftDto> {
    const now = new Date().toISOString();
    const payload: UpdateShiftDto = {
      timeTo: dto.timeTo || now,
      administrative: dto.administrative ?? 0,
      vfCashInside: dto.vfCashInside ?? 0,
      vfCashOutside: dto.vfCashOutside ?? 0,
      increase: dto.increase ?? 0,
      loss: dto.loss ?? 0,
      totalCost: dto.totalCost ?? dto.endCash ?? 0,
      note: dto.note || dto.notes || '',
      status: dto.status ?? 2
    };
    return this.put<ApiResponse<ShiftDto>>(API_ENDPOINTS.SHIFTS.CLOSE(id), payload).pipe(
      map(extractData)
    );
  }

  /**
   * Add transaction item to shift — POST /api/Shifts/{id}/items
   * OpenAPI CreateShiftItemDto: { cost, type, payWay, item }
   */
  addShiftItem(shiftId: string, item: CreateShiftItemDto): Observable<any> {
    const payload: CreateShiftItemDto = {
      cost: item.cost ?? item.amount ?? 0,
      type: typeof item.type === 'string' ? item.type : (item.type === 2 ? 'Expense' : 'Revenue'),
      payWay: item.payWay ?? 1,
      item: item.item || item.description || 'Transaction'
    };
    return this.post<ApiResponse<any>>(API_ENDPOINTS.SHIFTS.ITEMS(shiftId), payload).pipe(
      map(extractData)
    );
  }

  /** Delete transaction or expense item from shift */
  deleteShiftItem(shiftId: string, itemId: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.SHIFTS.ITEM_BY_ID(shiftId, itemId)).pipe(
      map(extractData)
    );
  }
}
