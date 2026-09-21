export type StaffNotificationType =
  | 'Workspace'
  | 'Classroom'
  | 'Package'
  | 'SharedRoom'
  | 'SilentRoom'
  | 'Catering'
  | 'LongStay'
  | 'Shift';

export type StaffNotificationSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface StaffNotification {
  id: string;
  type: StaffNotificationType;
  title: string;
  message: string;
  severity: StaffNotificationSeverity;
  createdAt: string; // ISO Date
  relatedEntityType?: 'WorkspaceSession' | 'Classroom' | 'Reservation' | 'Package' | 'Product' | 'Shift' | 'Student';
  relatedEntityId?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string | null;
  dismissed?: boolean;
}

export interface NotificationFilterOptions {
  unreadOnly?: boolean;
  type?: StaffNotificationType | 'All';
  severity?: StaffNotificationSeverity | 'All';
}
