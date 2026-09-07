import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);

  show(message: string, type: NotificationType = 'info', duration: number = 4000): void {
    if (!message) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const notification: AppNotification = { id, message, type, duration };

    this.notifications.update(list => [...list, notification]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(message: string, duration: number = 4000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 5000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration: number = 4500): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration: number = 4000): void {
    this.show(message, 'info', duration);
  }

  dismiss(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }
}
