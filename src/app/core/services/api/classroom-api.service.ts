import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  ClassroomDto,
  ClassroomDetailDto,
  CreateClassroomDto,
  UpdateClassroomDto,
  CheckoutClassroomDto,
  CateringItemDto,
  AddCateringItemDto,
  UpdateCateringItemDto
} from '../../models/classroom.model';

@Injectable({
  providedIn: 'root'
})
export class ClassroomApiService extends BaseApiService {
  /** Get all active or historical classroom sessions — GET /api/Classrooms */
  getClassrooms(params?: {
    InstructorId?: string;
    Status?: number;
    Type?: number;
    RoomId?: string;
    DateFrom?: string;
    DateTo?: string;
    Page?: number;
    PageSize?: number;
  }): Observable<ClassroomDto[]> {
    return this.get<ApiResponse<ClassroomDto[] | { items: ClassroomDto[] }>>(
      API_ENDPOINTS.CLASSROOMS.LIST,
      params as Record<string, string | number>
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: ClassroomDto[] })?.items ?? [];
      })
    );
  }

  /** Get single classroom session detail by ID — GET /api/Classrooms/{id} */
  getClassroomById(id: string): Observable<ClassroomDetailDto> {
    return this.get<ApiResponse<ClassroomDetailDto>>(API_ENDPOINTS.CLASSROOMS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Create a new classroom booking/session — POST /api/Classrooms */
  createClassroom(dto: CreateClassroomDto): Observable<ClassroomDto> {
    const titleVal = dto.title || dto.activity || null;
    const payload: Record<string, any> = {
      date: dto.date || dto.bookingDate || new Date().toISOString(),
      timeFrom: dto.timeFrom || new Date().toISOString(),
      timeTo: dto.timeTo || null,
      roomId: dto.roomId || null,
      title: titleVal,
      activity: titleVal,
      expectedAttendees: dto.expectedAttendees ?? null,
      printing: dto.printing ?? dto.printingCharges ?? 0,
      discount: dto.discount ?? dto.discountPercent ?? 0,
      reservationCost: dto.reservationCost ?? dto.hourlyRate ?? 0,
      hourlyRate: dto.hourlyRate ?? dto.reservationCost ?? 0,
      payWay: dto.payWay ?? 1,
      discountType: dto.discountType ?? null,
      type: dto.type ?? 1,
      note: dto.note || dto.instructorName || null,
      instructorId: dto.instructorId || null,
      instructorName: dto.instructorName || dto.note || null,
      shiftId: dto.shiftId || null,
      staffId: dto.staffId || null
    };

    return this.post<ApiResponse<ClassroomDto>>(API_ENDPOINTS.CLASSROOMS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update classroom session — PUT /api/Classrooms/{id} */
  updateClassroom(id: string, dto: UpdateClassroomDto): Observable<ClassroomDto> {
    const titleVal = dto.title || dto.activity || null;
    const payload: Record<string, any> = {
      date: dto.date || null,
      timeFrom: dto.timeFrom || null,
      timeTo: dto.timeTo || null,
      roomId: dto.roomId || null,
      title: titleVal,
      activity: titleVal,
      printing: dto.printing ?? 0,
      discount: dto.discount ?? 0,
      reservationCost: dto.reservationCost ?? 0,
      payWay: dto.payWay ?? 1,
      status: dto.status ?? 1,
      discountType: dto.discountType ?? null,
      type: dto.type ?? 1,
      note: dto.note || (dto as any).instructorName || null,
      instructorId: dto.instructorId || null,
      instructorName: (dto as any).instructorName || dto.note || null,
      shiftId: dto.shiftId || null,
      staffId: dto.staffId || null
    };

    return this.put<ApiResponse<ClassroomDto>>(API_ENDPOINTS.CLASSROOMS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Checkout a classroom session — PUT /api/Classrooms/{id}/checkout */
  checkoutClassroom(id: string, dto: CheckoutClassroomDto): Observable<ClassroomDetailDto> {
    const payMethodStr = typeof dto.paymentMethod === 'string'
      ? dto.paymentMethod
      : (dto.payWay === 2 ? 'Vodafone' : (dto.payWay === 3 ? 'Instapay' : (dto.payWay === 4 ? 'Fawry' : 'Cash')));

    const payWayVal = dto.payWay ?? (
      payMethodStr.toLowerCase().includes('vodafone') ? 2 :
      payMethodStr.toLowerCase().includes('instapay') ? 3 :
      payMethodStr.toLowerCase().includes('fawry') ? 4 : 1
    );

    const paidAmt = dto.paidAmount ?? dto.finalAmount ?? dto.reservationCost ?? 0;

    const payload: Record<string, any> = {
      timeTo: dto.timeTo || new Date().toISOString(),
      actualAttendees: dto.actualAttendees ?? null,
      paymentMethod: payMethodStr,
      usePackageHours: dto.usePackageHours ?? 0,
      packageId: dto.packageId ?? null,
      paidAmount: paidAmt,
      reservationCost: dto.reservationCost ?? dto.finalAmount ?? dto.roomRate ?? 0,
      printing: dto.printing ?? 0,
      discount: dto.discount ?? 0,
      discountType: dto.discountType ?? null,
      payWay: payWayVal,
      note: dto.note || null,
      shiftId: dto.shiftId || null,
      staffId: dto.staffId || null
    };

    return this.put<ApiResponse<ClassroomDetailDto>>(API_ENDPOINTS.CLASSROOMS.CHECKOUT(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete / cancel a classroom session — DELETE /api/Classrooms/{id} */
  deleteClassroom(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.CLASSROOMS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Get catering items for a classroom session — GET /api/classrooms/{classroomId}/catering */
  getCateringItems(classroomId: string): Observable<CateringItemDto[]> {
    return this.get<ApiResponse<CateringItemDto[]>>(API_ENDPOINTS.CLASSROOMS.CATERING(classroomId)).pipe(
      map(extractData)
    );
  }

  /** Add catering item to classroom session — POST /api/classrooms/{classroomId}/catering */
  addCateringItem(classroomId: string, item: AddCateringItemDto): Observable<any> {
    return this.post<ApiResponse<any>>(API_ENDPOINTS.CLASSROOMS.CATERING(classroomId), item).pipe(
      map(extractData)
    );
  }

  /** Update catering item in a classroom session — PUT /api/classrooms/{classroomId}/catering/{id} */
  updateCateringItem(classroomId: string, itemId: string, item: UpdateCateringItemDto): Observable<any> {
    return this.put<ApiResponse<any>>(API_ENDPOINTS.CLASSROOMS.CATERING_ITEM(classroomId, itemId), item).pipe(
      map(extractData)
    );
  }

  /** Remove catering item from classroom session — DELETE /api/classrooms/{classroomId}/catering/{id} */
  removeCateringItem(classroomId: string, itemId: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.CLASSROOMS.CATERING_ITEM(classroomId, itemId)).pipe(
      map(extractData)
    );
  }
}

