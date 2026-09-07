import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';

import {
  ProfileDto,
  UpdateProfileDto,
  UpdateAccountDto,
  ChangePasswordDto
} from '../../models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileApiService extends BaseApiService {

  // Get Profile
  getProfile(id: string): Observable<ProfileDto> {
    return this.get<ApiResponse<ProfileDto>>(
      API_ENDPOINTS.ACCOUNTS.PROFILE(id)
    ).pipe(
      map(extractData)
    );
  }

  // Update Profile / Account
  updateProfile(
    id: string,
    payload: UpdateAccountDto | UpdateProfileDto
  ): Observable<ProfileDto> {
    return this.put<ApiResponse<ProfileDto>>(
      API_ENDPOINTS.ACCOUNTS.BY_ID(id),
      payload
    ).pipe(
      map(extractData)
    );
  }

  // Change Password
  changePassword(
    payload: ChangePasswordDto
  ): Observable<void> {
    return this.put<ApiResponse<void>>(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      payload
    ).pipe(
      map(extractData)
    );
  }
}
