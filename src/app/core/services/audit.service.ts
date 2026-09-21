import { Injectable, signal, inject } from '@angular/core';
import { AuditLogEntry, AuditAction, AuditEntityType, AuditFilterOptions } from '../models/audit.model';
import { AuthService } from './auth.service';
import { AuditApiService } from './api/audit-api.service';

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private authService = inject(AuthService);
  private auditApi = inject(AuditApiService);

  private _logs = signal<AuditLogEntry[]>([]);
  readonly logs = this._logs.asReadonly();

  constructor() {
    // Clear any legacy local mock database storage
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('nook_audit_logs'); } catch {}
    }
    if (this.authService.isAuthenticated()) {
      this.syncWithBackend();
    }
  }

  public syncWithBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.auditApi.getAuditLogs({ pageSize: 100 }).subscribe({
      next: (res) => {
        if (res.items && res.items.length > 0) {
          this._logs.set(res.items);
        }
      },
      error: () => {}
    });
  }

  log(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    summary: string,
    metadata?: {
      oldValues?: Record<string, any> | string;
      newValues?: Record<string, any> | string;
      extra?: Record<string, any>;
    }
  ): AuditLogEntry {
    const user = this.authService.user();
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      entityType,
      entityId,
      action,
      actorId: user?.id,
      actorName: user?.name || 'System Operator',
      actorRole: user?.role === 'admin' ? 'Admin' : 'Staff',
      timestamp: new Date().toISOString(),
      summary,
      oldValues: metadata?.oldValues,
      newValues: metadata?.newValues,
      metadata: metadata?.extra
    };

    this._logs.update(prev => [entry, ...prev]);

    // Send to backend API if authenticated
    if (this.authService.isAuthenticated()) {
      const validEntityId = /^[0-9a-fA-F-]{36}$/.test(entityId) ? entityId : null;
      this.auditApi.createAuditLog({
        entityType,
        entityId: validEntityId,
        action,
        summary,
        metadata: metadata ? JSON.stringify(metadata) : undefined
      }).subscribe({
        next: (saved) => {
          if (saved && saved.id) {
            this._logs.update(list => list.map(l => l.id === entry.id ? { ...l, id: saved.id } : l));
          }
        },
        error: () => {}
      });
    }

    return entry;
  }

  getFilteredLogs(filter: AuditFilterOptions): AuditLogEntry[] {
    return this._logs().filter(log => {
      if (filter.entityType && filter.entityType !== 'All' && log.entityType !== filter.entityType) {
        return false;
      }
      if (filter.action && filter.action !== 'All' && log.action !== filter.action) {
        return false;
      }
      if (filter.entityId && log.entityId !== filter.entityId) {
        return false;
      }
      if (filter.actorId && log.actorId !== filter.actorId) {
        return false;
      }
      if (filter.startDate && new Date(log.timestamp) < new Date(filter.startDate)) {
        return false;
      }
      if (filter.endDate && new Date(log.timestamp) > new Date(filter.endDate)) {
        return false;
      }
      return true;
    });
  }
}
