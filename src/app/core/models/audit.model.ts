export type AuditEntityType =
  | 'Classroom'
  | 'Workspace'
  | 'Student'
  | 'Package'
  | 'Discount'
  | 'Catering'
  | 'Shift'
  | 'Payment';

export type AuditAction =
  | 'Created'
  | 'Modified'
  | 'Deleted'
  | 'CheckedIn'
  | 'CheckedOut'
  | 'DiscountApplied'
  | 'PaymentReceived'
  | 'StatusChanged'
  | 'Blacklisted'
  | 'Unblacklisted'
  | 'ShiftOpened'
  | 'ShiftClosed';

export interface AuditLogEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorId?: string;
  actorName: string;
  actorRole: string;
  timestamp: string; // ISO string
  summary: string;
  ipAddress?: string;
  oldValues?: Record<string, any> | string;
  newValues?: Record<string, any> | string;
  metadata?: Record<string, any>;
}

export interface AuditFilterOptions {
  entityType?: AuditEntityType | 'All';
  entityId?: string;
  action?: AuditAction | 'All';
  actorId?: string;
  startDate?: string;
  endDate?: string;
}
