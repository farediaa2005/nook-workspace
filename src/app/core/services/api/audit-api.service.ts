import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ApiResponse, extractData } from '../../models/api-response.model';
import { AuditLogEntry, AuditAction, AuditEntityType } from '../../models/audit.model';

export interface AuditLogDto {
  id: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  createdAt: string;
  ipAddress?: string | null;
  summary?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  metadata?: string | null;
}

export interface AuditLogsPagedResultDto {
  items: AuditLogDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateAuditLogDto {
  entityType: string;
  entityId?: string | null;
  action: string;
  summary?: string | null;
  metadata?: string | null;
}

export function mapAuditLogDto(dto: AuditLogDto): AuditLogEntry {
  let oldParsed: any = dto.oldValues;
  let newParsed: any = dto.newValues;
  let metaParsed: any = dto.metadata;

  try { if (typeof dto.oldValues === 'string') oldParsed = JSON.parse(dto.oldValues); } catch {}
  try { if (typeof dto.newValues === 'string') newParsed = JSON.parse(dto.newValues); } catch {}
  try { if (typeof dto.metadata === 'string') metaParsed = JSON.parse(dto.metadata); } catch {}

  return {
    id: dto.id,
    entityType: dto.entityType as AuditEntityType,
    entityId: dto.entityId || '',
    action: dto.action as AuditAction,
    actorId: dto.actorId || undefined,
    actorName: dto.actorName || 'System',
    actorRole: dto.actorRole || 'Staff',
    timestamp: dto.createdAt,
    summary: dto.summary || `${dto.action} ${dto.entityType}`,
    oldValues: oldParsed,
    newValues: newParsed,
    metadata: metaParsed
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuditApiService extends BaseApiService {
  /** Get all audit logs with optional filtering — GET /api/AuditLogs */
  getAuditLogs(params?: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
    from?: string;
    to?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<{ items: AuditLogEntry[]; totalCount: number }> {
    return this.get<ApiResponse<AuditLogsPagedResultDto>>(
      API_ENDPOINTS.AUDIT_LOGS.LIST,
      params
    ).pipe(
      map(extractData),
      map(res => ({
        items: (res?.items || []).map(mapAuditLogDto),
        totalCount: res?.totalCount || 0
      }))
    );
  }

  /** Get audit logs for a specific entity — GET /api/AuditLogs/entity/{entityType}/{entityId} */
  getEntityAuditLogs(
    entityType: string,
    entityId: string,
    params?: { pageNumber?: number; pageSize?: number }
  ): Observable<{ items: AuditLogEntry[]; totalCount: number }> {
    return this.get<ApiResponse<AuditLogsPagedResultDto>>(
      API_ENDPOINTS.AUDIT_LOGS.BY_ENTITY(entityType, entityId),
      params
    ).pipe(
      map(extractData),
      map(res => ({
        items: (res?.items || []).map(mapAuditLogDto),
        totalCount: res?.totalCount || 0
      }))
    );
  }

  /** Create an audit log record directly — POST /api/AuditLogs */
  createAuditLog(dto: CreateAuditLogDto): Observable<AuditLogEntry> {
    return this.post<ApiResponse<AuditLogDto>>(
      API_ENDPOINTS.AUDIT_LOGS.CREATE,
      dto
    ).pipe(
      map(extractData),
      map(mapAuditLogDto)
    );
  }
}
