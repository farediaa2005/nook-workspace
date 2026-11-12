import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import { AccountDto, CreateAccountDto, UpdateAccountDto } from '../../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AccountApiService extends BaseApiService {
  /** Get all user accounts */
  getAccounts(params?: { SearchTerm?: string; Role?: string; IsActive?: boolean }): Observable<AccountDto[]> {
    return this.get<ApiResponse<AccountDto[] | { items: AccountDto[] }>>(
      API_ENDPOINTS.ACCOUNTS.LIST,
      params as Record<string, string | number>
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: AccountDto[] })?.items ?? [];
      })
    );
  }

  /** Create new user account */
  createAccount(dto: CreateAccountDto): Observable<AccountDto> {
    return this.post<ApiResponse<AccountDto>>(API_ENDPOINTS.ACCOUNTS.LIST, dto).pipe(
      map(extractData)
    );
  }

  /** Update account */
  updateAccount(id: string, dto: UpdateAccountDto): Observable<AccountDto> {
    return this.put<ApiResponse<AccountDto>>(API_ENDPOINTS.ACCOUNTS.BY_ID(id), dto).pipe(
      map(extractData)
    );
  }

  /** Toggle active status */
  toggleActive(id: string): Observable<boolean> {
    return this.put<ApiResponse<boolean>>(API_ENDPOINTS.ACCOUNTS.TOGGLE_ACTIVE(id), {}).pipe(
      map(extractData)
    );
  }

  /** Delete account */
  deleteAccount(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.ACCOUNTS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /** Get account profile with linked role profiles */
  getAccountProfile(id: string): Observable<AccountDto> {
    return this.get<ApiResponse<AccountDto>>(API_ENDPOINTS.ACCOUNTS.PROFILE(id)).pipe(
      map(extractData)
    );
  }

  /** Link staff profile to account */
  linkStaffProfile(id: string, dto: { name: string; staffRole?: number; colour?: string }): Observable<any> {
    return this.post<ApiResponse<any>>(API_ENDPOINTS.ACCOUNTS.LINK_STAFF(id), dto).pipe(
      map(extractData)
    );
  }

  /** Unlink role from account */
  unlinkRole(id: string, role: string | number): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.ACCOUNTS.UNLINK_ROLE(id, role)).pipe(
      map(extractData)
    );
  }
}

