import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  FloorPlanDto,
  CreateFloorPlanDto,
  UpdateFloorPlanDto,
  SeatElementDto,
  CreateSeatElementDto,
  UpdateSeatElementDto,
  SyncSeatElementsDto,
  SeatElementTypeDto,
  CreateSeatElementTypeDto,
  UpdateSeatElementTypeDto
} from '../../models/floor-plan.model';

@Injectable({
  providedIn: 'root'
})
export class FloorPlanApiService extends BaseApiService {
  // ==========================================
  // FLOOR PLANS (5 Endpoints)
  // ==========================================

  getFloorPlans(): Observable<FloorPlanDto[]> {
    return this.get<ApiResponse<FloorPlanDto[] | { items: FloorPlanDto[] }>>(
      API_ENDPOINTS.FLOOR_PLANS.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: FloorPlanDto[] })?.items ?? [];
      })
    );
  }

  getFloorPlanById(id: string): Observable<FloorPlanDto> {
    return this.get<ApiResponse<FloorPlanDto>>(
      API_ENDPOINTS.FLOOR_PLANS.BY_ID(id)
    ).pipe(map(extractData));
  }

  createFloorPlan(dto: CreateFloorPlanDto): Observable<FloorPlanDto> {
    return this.post<ApiResponse<FloorPlanDto>>(
      API_ENDPOINTS.FLOOR_PLANS.LIST,
      dto
    ).pipe(map(extractData));
  }

  updateFloorPlan(id: string, dto: UpdateFloorPlanDto): Observable<FloorPlanDto> {
    return this.put<ApiResponse<FloorPlanDto>>(
      API_ENDPOINTS.FLOOR_PLANS.BY_ID(id),
      dto
    ).pipe(map(extractData));
  }

  deleteFloorPlan(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.FLOOR_PLANS.BY_ID(id)
    ).pipe(map(extractData));
  }

  // ==========================================
  // SEAT ELEMENTS (6 Endpoints)
  // ==========================================

  getSeatElementsByFloorPlan(floorPlanId: string): Observable<SeatElementDto[]> {
    return this.get<ApiResponse<SeatElementDto[] | { items: SeatElementDto[] }>>(
      API_ENDPOINTS.SEAT_ELEMENTS.LIST_BY_FLOOR_PLAN(floorPlanId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: SeatElementDto[] })?.items ?? [];
      })
    );
  }

  getSeatElementById(id: string): Observable<SeatElementDto> {
    return this.get<ApiResponse<SeatElementDto>>(
      API_ENDPOINTS.SEAT_ELEMENTS.BY_ID(id)
    ).pipe(map(extractData));
  }

  createSeatElement(dto: CreateSeatElementDto): Observable<SeatElementDto> {
    return this.post<ApiResponse<SeatElementDto>>(
      API_ENDPOINTS.SEAT_ELEMENTS.CREATE,
      dto
    ).pipe(map(extractData));
  }

  updateSeatElement(id: string, dto: UpdateSeatElementDto): Observable<SeatElementDto> {
    return this.put<ApiResponse<SeatElementDto>>(
      API_ENDPOINTS.SEAT_ELEMENTS.BY_ID(id),
      dto
    ).pipe(map(extractData));
  }

  deleteSeatElement(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.SEAT_ELEMENTS.BY_ID(id)
    ).pipe(map(extractData));
  }

  syncSeatElements(floorPlanId: string, dto: SyncSeatElementsDto): Observable<SeatElementDto[]> {
    return this.post<ApiResponse<SeatElementDto[]>>(
      API_ENDPOINTS.SEAT_ELEMENTS.SYNC(floorPlanId),
      dto
    ).pipe(map(extractData));
  }

  // ==========================================
  // SEAT ELEMENT TYPES (6 Endpoints)
  // ==========================================

  getSeatElementTypes(): Observable<SeatElementTypeDto[]> {
    return this.get<ApiResponse<SeatElementTypeDto[] | { items: SeatElementTypeDto[] }>>(
      API_ENDPOINTS.SEAT_ELEMENT_TYPES.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: SeatElementTypesDto[] })?.items ?? [];
      })
    );
  }

  getSeatElementTypeById(id: string): Observable<SeatElementTypeDto> {
    return this.get<ApiResponse<SeatElementTypeDto>>(
      API_ENDPOINTS.SEAT_ELEMENT_TYPES.BY_ID(id)
    ).pipe(map(extractData));
  }

  createSeatElementType(dto: CreateSeatElementTypeDto): Observable<SeatElementTypeDto> {
    return this.post<ApiResponse<SeatElementTypeDto>>(
      API_ENDPOINTS.SEAT_ELEMENT_TYPES.LIST,
      dto
    ).pipe(map(extractData));
  }

  updateSeatElementType(id: string, dto: UpdateSeatElementTypeDto): Observable<SeatElementTypeDto> {
    return this.put<ApiResponse<SeatElementTypeDto>>(
      API_ENDPOINTS.SEAT_ELEMENT_TYPES.BY_ID(id),
      dto
    ).pipe(map(extractData));
  }

  deleteSeatElementType(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(
      API_ENDPOINTS.SEAT_ELEMENT_TYPES.BY_ID(id)
    ).pipe(map(extractData));
  }

  uploadSeatElementTypeImage(id: string, file: File): Observable<SeatElementTypeDto> {
    const formData = new FormData();
    formData.append('imageFile', file);
    return this.post<ApiResponse<SeatElementTypeDto>>(
      API_ENDPOINTS.SEAT_ELEMENT_TYPES.IMAGE(id),
      formData
    ).pipe(map(extractData));
  }
}
type SeatElementTypesDto = SeatElementTypeDto;
