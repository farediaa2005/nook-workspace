import { Injectable } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import {
  WorkspacePackageDto,
  CreateWorkspacePackageDto,
  UpdateWorkspacePackageDto,
  UsePackageHoursDto
} from '../../models/package-api.model';

@Injectable({
  providedIn: 'root'
})
export class WorkspacePackageApiService extends BaseApiService {
  /** Get all student workspace packages — GET /api/WorkspacePackages */
  getPackages(): Observable<WorkspacePackageDto[]> {
    return this.get<ApiResponse<WorkspacePackageDto[] | { items: WorkspacePackageDto[] }>>(
      API_ENDPOINTS.WORKSPACE_PACKAGES.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: WorkspacePackageDto[] })?.items ?? [];
      })
    );
  }

  /** Get single package by ID — GET /api/WorkspacePackages/{id} */
  getPackageById(id: string): Observable<WorkspacePackageDto> {
    return this.get<ApiResponse<WorkspacePackageDto>>(API_ENDPOINTS.WORKSPACE_PACKAGES.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Get packages by student ID — GET /api/WorkspacePackages/student/{studentId} */
  getPackagesByStudent(studentId: string): Observable<WorkspacePackageDto[]> {
    return this.get<ApiResponse<WorkspacePackageDto[] | { items: WorkspacePackageDto[] }>>(
      API_ENDPOINTS.WORKSPACE_PACKAGES.BY_STUDENT(studentId)
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: WorkspacePackageDto[] })?.items ?? [];
      })
    );
  }

  /** Create a new student package — POST /api/WorkspacePackages */
  createPackage(dto: CreateWorkspacePackageDto | any): Observable<WorkspacePackageDto> {
    const payload: Record<string, any> = {
      purchasedAt: dto.purchasedAt || new Date().toISOString(),
      dateFrom: dto.dateFrom || new Date().toISOString(),
      dateTo: dto.dateTo || dto.expiryDate || null,
      hours: dto.hours ?? dto.totalHours ?? 10,
      cost: dto.cost ?? dto.price ?? dto.paidAmount ?? 0,
      payWay: dto.payWay ?? 1,
      studentId: dto.studentId || null
    };

    return this.post<ApiResponse<WorkspacePackageDto>>(API_ENDPOINTS.WORKSPACE_PACKAGES.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update an existing package — PUT /api/WorkspacePackages/{id} */
  updatePackage(id: string, dto: UpdateWorkspacePackageDto | Partial<CreateWorkspacePackageDto> | any): Observable<WorkspacePackageDto> {
    const payload: Record<string, any> = {
      purchasedAt: dto.purchasedAt || dto.dateFrom || dto.createdAt || null,
      dateFrom: dto.dateFrom || dto.purchasedAt || dto.createdAt || null,
      dateTo: dto.dateTo || dto.expiryDate || null,
      hours: dto.hours ?? dto.totalHours ?? 10,
      remainingHours: dto.remainingHours ?? dto.hours ?? dto.totalHours ?? 10,
      cost: dto.cost ?? dto.price ?? dto.paidAmount ?? 0,
      payWay: dto.payWay ?? 1,
      studentId: dto.studentId || null
    };

    return this.put<ApiResponse<WorkspacePackageDto>>(API_ENDPOINTS.WORKSPACE_PACKAGES.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Deduct hours from package (updates package via PUT /api/WorkspacePackages/{id}) */
  useHours(id: string, dto: UsePackageHoursDto): Observable<WorkspacePackageDto> {
    return this.getPackageById(id).pipe(
      switchMap(pkg => {
        const remainingHours = Math.max(0, (pkg.remainingHours != null ? pkg.remainingHours : pkg.hours) - dto.hours);
        return this.updatePackage(id, {
          ...pkg,
          remainingHours
        });
      })
    );
  }

  /** Delete a package — DELETE /api/WorkspacePackages/{id} */
  deletePackage(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.WORKSPACE_PACKAGES.BY_ID(id)).pipe(
      map(extractData)
    );
  }
}

