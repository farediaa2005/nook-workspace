import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
 import { BaseApiService } from './base-api.service';
 import { API_ENDPOINTS } from '../../constants/api-endpoints';
 import { ApiResponse, extractData } from '../../models/api-response.model';
 import {
   BlacklistDto,
   CreateBlacklistDto,
   UpdateBlacklistDto
 } from '../../models/blacklist.model';

@Injectable({
  providedIn: 'root'
})
export class BlacklistApiService extends BaseApiService {
  /** Get all blacklisted students — GET /api/Blacklists */
  getBlacklists(): Observable<BlacklistDto[]> {
    return this.get<ApiResponse<BlacklistDto[] | { items: BlacklistDto[] }>>(
      API_ENDPOINTS.BLACKLISTS.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: BlacklistDto[] })?.items ?? [];
      })
    );
  }

  /** Get blacklist record by ID — GET /api/Blacklists/{id} */
  getBlacklistById(id: string): Observable<BlacklistDto> {
    return this.get<ApiResponse<BlacklistDto>>(API_ENDPOINTS.BLACKLISTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Add student to blacklist — POST /api/Blacklists */
  addToBlacklist(dto: CreateBlacklistDto | any): Observable<BlacklistDto> {
    const payload = {
      name: dto.name || dto.studentName,
      reason: dto.reason || dto.reasonDetails || null,
      blacklistedAt: dto.blacklistedAt || dto.blockedAt || new Date().toISOString(),
      studentId: dto.studentId || null
    };

    return this.post<ApiResponse<BlacklistDto>>(API_ENDPOINTS.BLACKLISTS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /** Update blacklist record — PUT /api/Blacklists/{id} */
  updateBlacklist(id: string, dto: UpdateBlacklistDto | any): Observable<BlacklistDto> {
    const payload = {
      name: dto.name || dto.studentName,
      reason: dto.reason || dto.reasonDetails || null,
      blacklistedAt: dto.blacklistedAt || dto.blockedAt || new Date().toISOString(),
      studentId: dto.studentId || null
    };

    return this.put<ApiResponse<BlacklistDto>>(API_ENDPOINTS.BLACKLISTS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Remove student from blacklist (unblock) — DELETE /api/Blacklists/{id} */
  removeFromBlacklist(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.BLACKLISTS.BY_ID(id)).pipe(
      map(res => {
        if (!res) return true;
        return (res as any).data !== undefined ? !!(res as any).data : ((res as any).success ?? (res as any).isSuccess ?? true);
      }),
      catchError(() => of(true))
    );
  }
}

