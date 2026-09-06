import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  ClassroomPackageDto,
  CreateClassroomPackageDto,
  UpdateClassroomPackageDto
} from '../../models/package-api.model';

@Injectable({
  providedIn: 'root'
})
export class ClassroomPackageApiService extends BaseApiService {
  /** Get all instructor classroom packages — GET /api/ClassroomPackages */
  getPackages(): Observable<ClassroomPackageDto[]> {
    return this.get<ApiResponse<ClassroomPackageDto[] | { items: ClassroomPackageDto[] }>>(
      API_ENDPOINTS.CLASSROOM_PACKAGES.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: ClassroomPackageDto[] })?.items ?? [];
      })
    );
  }

  /** Get single package by ID — GET /api/ClassroomPackages/{id} */
  getPackageById(id: string): Observable<ClassroomPackageDto> {
    return this.get<ApiResponse<ClassroomPackageDto>>(API_ENDPOINTS.CLASSROOM_PACKAGES.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Get packages by instructor ID — GET /api/ClassroomPackages/instructor/{instructorId} */
  getPackagesByInstructor(instructorId: string): Observable<ClassroomPackageDto[]> {
    return this.get<ApiResponse<ClassroomPackageDto[] | { items: ClassroomPackageDto[] }>>(
      API_ENDPOINTS.CLASSROOM_PACKAGES.BY_INSTRUCTOR(instructorId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: ClassroomPackageDto[] })?.items ?? [];
      })
    );
  }

  /** Create new instructor package — POST /api/ClassroomPackages */
  createPackage(dto: CreateClassroomPackageDto | any): Observable<ClassroomPackageDto> {
    const payload: Record<string, any> = {
      purchasedAt: dto.purchasedAt || new Date().toISOString(),
      dateFrom: dto.dateFrom || new Date().toISOString(),
      dateTo: dto.dateTo || dto.expiryDate || null,
      hours: dto.hours ?? dto.totalHours ?? 20,
      cost: dto.cost ?? dto.price ?? dto.paidAmount ?? 0,
      payWay: dto.payWay ?? 1,
      instructorId: dto.instructorId || null
    };

    return this.post<ApiResponse<ClassroomPackageDto>>(API_ENDPOINTS.CLASSROOM_PACKAGES.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update package — PUT /api/ClassroomPackages/{id} */
  updatePackage(id: string, dto: UpdateClassroomPackageDto | Partial<CreateClassroomPackageDto> | any): Observable<ClassroomPackageDto> {
    const payload: Record<string, any> = {
      purchasedAt: dto.purchasedAt || new Date().toISOString(),
      dateFrom: dto.dateFrom || new Date().toISOString(),
      dateTo: dto.dateTo || dto.expiryDate || null,
      hours: dto.hours ?? dto.totalHours ?? 20,
      remainingHours: dto.remainingHours ?? dto.hours ?? dto.totalHours ?? 20,
      cost: dto.cost ?? dto.price ?? dto.paidAmount ?? 0,
      payWay: dto.payWay ?? 1,
      instructorId: dto.instructorId || null
    };

    return this.put<ApiResponse<ClassroomPackageDto>>(API_ENDPOINTS.CLASSROOM_PACKAGES.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Delete package — DELETE /api/ClassroomPackages/{id} */
  deletePackage(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.CLASSROOM_PACKAGES.BY_ID(id)).pipe(
      map(extractData)
    );
  }
}

