import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import { RoomDto, CreateRoomDto } from '../../models/classroom-session.model';

@Injectable({
  providedIn: 'root'
})
export class RoomApiService extends BaseApiService {
  /** Get all rooms — GET /api/Rooms */
  getRooms(): Observable<RoomDto[]> {
    return this.get<ApiResponse<RoomDto[] | { items: RoomDto[] }>>(
      API_ENDPOINTS.ROOMS.LIST
    ).pipe(
      map(res => {
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return (res.data as { items: RoomDto[] })?.items ?? [];
      })
    );
  }

  /** Get room by ID — GET /api/Rooms/{id} */
  getRoomById(id: string): Observable<RoomDto> {
    return this.get<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.BY_ID(id)).pipe(
      map(extractData)
    );
  }

  /**
   * Create room — POST /api/Rooms (supports application/json or multipart/form-data)
   */
  createRoom(dto: CreateRoomDto | any): Observable<RoomDto> {
    if (dto instanceof FormData) {
      return this.post<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.LIST, dto).pipe(
        map(extractData)
      );
    }

    if (dto.imageFile instanceof File) {
      const formData = new FormData();
      formData.append('Name', dto.name || dto.Name || '');
      if (dto.supportsWorkspace != null) formData.append('SupportsWorkspace', String(dto.supportsWorkspace));
      if (dto.supportsClassroom != null) formData.append('SupportsClassroom', String(dto.supportsClassroom));
      if (dto.workspaceZone != null) formData.append('WorkspaceZone', String(dto.workspaceZone));
      if (dto.isActive != null) formData.append('IsActive', String(dto.isActive));
      if (dto.imageUrl || dto.ImageUrl) formData.append('ImageUrl', dto.imageUrl || dto.ImageUrl);
      formData.append('imageFile', dto.imageFile);
      return this.post<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.LIST, formData).pipe(
        map(extractData)
      );
    }

    const payload = {
      Name: dto.name || dto.Name,
      SupportsWorkspace: dto.supportsWorkspace ?? true,
      SupportsClassroom: dto.supportsClassroom ?? false,
      WorkspaceZone: dto.workspaceZone ?? 0,
      IsActive: dto.isActive !== false,
      ImageUrl: dto.imageUrl || dto.ImageUrl || null
    };

    return this.post<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.LIST, payload).pipe(
      map(extractData)
    );
  }

  /**
   * Update room — PUT /api/Rooms/{id} (supports application/json or multipart/form-data)
   */
  updateRoom(id: string, dto: Partial<CreateRoomDto> | any): Observable<RoomDto> {
    if (dto instanceof FormData) {
      return this.put<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.BY_ID(id), dto).pipe(
        map(extractData)
      );
    }

    if (dto.imageFile instanceof File) {
      const formData = new FormData();
      if (dto.name || dto.Name) formData.append('Name', dto.name || dto.Name);
      if (dto.supportsWorkspace != null) formData.append('SupportsWorkspace', String(dto.supportsWorkspace));
      if (dto.supportsClassroom != null) formData.append('SupportsClassroom', String(dto.supportsClassroom));
      if (dto.workspaceZone != null) formData.append('WorkspaceZone', String(dto.workspaceZone));
      if (dto.isActive != null) formData.append('IsActive', String(dto.isActive));
      if (dto.imageUrl || dto.ImageUrl) formData.append('ImageUrl', dto.imageUrl || dto.ImageUrl);
      formData.append('imageFile', dto.imageFile);
      return this.put<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.BY_ID(id), formData).pipe(
        map(extractData)
      );
    }

    const payload: Record<string, any> = {};
    if (dto.name || dto.Name) payload['Name'] = dto.name || dto.Name;
    if (dto.supportsWorkspace != null) payload['SupportsWorkspace'] = dto.supportsWorkspace;
    if (dto.supportsClassroom != null) payload['SupportsClassroom'] = dto.supportsClassroom;
    if (dto.workspaceZone != null) payload['WorkspaceZone'] = dto.workspaceZone;
    if (dto.isActive != null) payload['IsActive'] = dto.isActive;
    if (dto.imageUrl || dto.ImageUrl) payload['ImageUrl'] = dto.imageUrl || dto.ImageUrl;

    return this.put<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.BY_ID(id), payload).pipe(
      map(extractData)
    );
  }

  /** Upload room image — POST /api/Rooms/{id}/image */
  uploadRoomImage(id: string, file: File): Observable<RoomDto> {
    const formData = new FormData();
    formData.append('imageFile', file);
    return this.post<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.IMAGE(id), formData).pipe(
      map(extractData)
    );
  }

  /** Delete room — DELETE /api/Rooms/{id} */
  deleteRoom(id: string): Observable<boolean> {
    return this.delete<ApiResponse<boolean>>(API_ENDPOINTS.ROOMS.BY_ID(id)).pipe(
      map(extractData)
    );
  }
}

