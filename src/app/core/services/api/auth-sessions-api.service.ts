import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';

/** A signed-in device / refresh-token session of the current account. */
export interface AuthSessionDto {
  sessionId: string;
  deviceInfo?: string | null;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthSessionsApiService extends BaseApiService {
  /** GET /api/Auth/sessions */
  getSessions(): Observable<AuthSessionDto[]> {
    return this.get<ApiResponse<AuthSessionDto[]>>(API_ENDPOINTS.AUTH.SESSIONS).pipe(map(res => extractData(res) || []));
  }

  /** DELETE /api/Auth/sessions/{sessionId} */
  revokeSession(sessionId: string): Observable<unknown> {
    return this.delete<ApiResponse<unknown>>(API_ENDPOINTS.AUTH.SESSION_BY_ID(sessionId)).pipe(map(extractData));
  }

  /** POST /api/Auth/revoke-all — signs this account out on every device */
  revokeAll(): Observable<unknown> {
    return this.post<ApiResponse<unknown>>(API_ENDPOINTS.AUTH.REVOKE_ALL, {}).pipe(map(extractData));
  }
}
