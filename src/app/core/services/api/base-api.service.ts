import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../constants/api-endpoints';

/**
 * Base API service providing shared HTTP helpers.
 * All domain-specific API services should extend or inject this service.
 *
 * Centralizes:
 * - Base URL construction
 * - Common HTTP methods with typed responses
 * - Query parameter building
 */
@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  protected http = inject(HttpClient);
  protected baseUrl = API_BASE_URL;

  /** Build full URL from an endpoint path */
  protected url(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  /** GET request with typed response */
  protected get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    const options = httpParams.keys().length > 0 ? { params: httpParams } : {};
    return this.http.get<T>(this.url(endpoint), options);
  }

  /** POST request with typed response */
  protected post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(endpoint), body);
  }

  /** PUT request with typed response */
  protected put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(endpoint), body);
  }

  /** PATCH request with typed response */
  protected patch<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(endpoint), body);
  }

  /** DELETE request with typed response */
  protected delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.url(endpoint));
  }
}
