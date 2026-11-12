import { Injectable, signal, inject } from '@angular/core';
import { AuditLogEntry, AuditAction, AuditEntityType } from '../models/audit.model';
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
    // Audit logs are admin-only on the server (403 for staff)
    if (!this.authService.isAuthenticated() || !this.authService.isAdmin()) return;
    this.auditApi.getAuditLogs({ pageSize: 100 }).subscribe({
      next: (res) => {
        if (res.items && res.items.length > 0) {
          this._logs.set(res.items);
        }
      },
      error: () => { /* best effort: a failure here is ignored on purpose */ }
    });
  }

  log(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    summary: string,
    metadata?: {
      oldValues?: Record<string, unknown> | string;
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
        error: () => { /* best effort: a failure here is ignored on purpose */ }
      });
    }

    return entry;
  }
}
