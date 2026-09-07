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
   * Always sends multipart/form-data to satisfy ASP.NET Core [FromForm] binding.
   */
  createRoom(dto: CreateRoomDto | any): Observable<RoomDto> {
    if (dto instanceof FormData) {
      return this.post<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.LIST, dto).pipe(
        map(extractData)
      );
    }

    const formData = new FormData();
    const name = dto.name || dto.Name || '';
    formData.append('Name', name);

    const supportsWorkspace = dto.supportsWorkspace ?? (dto.type !== 'Classroom');
    const supportsClassroom = dto.supportsClassroom ?? (dto.type === 'Classroom');

    formData.append('SupportsWorkspace', String(supportsWorkspace));
    formData.append('SupportsClassroom', String(supportsClassroom));

    // In ASP.NET Core: ZoneType has Shared = 1, Silent = 2. 0 is invalid.
    // For Classrooms, WorkspaceZone must be omitted.
    if (supportsWorkspace) {
      let zone = 1;
      if (dto.workspaceZone != null && Number(dto.workspaceZone) > 0) {
        zone = Number(dto.workspaceZone);
      } else if (dto.type === 'Silent Zone') {
        zone = 2;
      }
      formData.append('WorkspaceZone', String(zone));
    }

    formData.append('IsActive', String(dto.isActive !== false));

    if (dto.imageFile instanceof File) {
      formData.append('imageFile', dto.imageFile, dto.imageFile.name);
    } else if (dto.imageUrl && typeof dto.imageUrl === 'string' && (dto.imageUrl.startsWith('http://') || dto.imageUrl.startsWith('https://'))) {
      formData.append('ImageUrl', dto.imageUrl);
    }

    return this.post<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.LIST, formData).pipe(
      map(extractData)
    );
  }

  /**
   * Update room — PUT /api/Rooms/{id} (supports application/json or multipart/form-data)
   * Always sends multipart/form-data to satisfy ASP.NET Core [FromForm] binding.
   */
  updateRoom(id: string, dto: Partial<CreateRoomDto> | any): Observable<RoomDto> {
    if (dto instanceof FormData) {
      return this.put<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.BY_ID(id), dto).pipe(
        map(extractData)
      );
    }

    const formData = new FormData();
    if (dto.name || dto.Name) formData.append('Name', dto.name || dto.Name);

    const supportsWorkspace = dto.supportsWorkspace ?? (dto.type ? dto.type !== 'Classroom' : undefined);
    const supportsClassroom = dto.supportsClassroom ?? (dto.type ? dto.type === 'Classroom' : undefined);

    if (supportsWorkspace != null) formData.append('SupportsWorkspace', String(supportsWorkspace));
    if (supportsClassroom != null) formData.append('SupportsClassroom', String(supportsClassroom));

    if (supportsWorkspace) {
      let zone = 1;
      if (dto.workspaceZone != null && Number(dto.workspaceZone) > 0) {
        zone = Number(dto.workspaceZone);
      } else if (dto.type === 'Silent Zone') {
        zone = 2;
      }
      formData.append('WorkspaceZone', String(zone));
    }

    if (dto.isActive != null) formData.append('IsActive', String(dto.isActive));

    if (dto.imageFile instanceof File) {
      formData.append('imageFile', dto.imageFile, dto.imageFile.name);
    } else if (dto.imageUrl && typeof dto.imageUrl === 'string' && (dto.imageUrl.startsWith('http://') || dto.imageUrl.startsWith('https://'))) {
      formData.append('ImageUrl', dto.imageUrl);
    }

    return this.put<ApiResponse<RoomDto>>(API_ENDPOINTS.ROOMS.BY_ID(id), formData).pipe(
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

