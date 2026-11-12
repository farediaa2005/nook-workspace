import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { LanguageService } from '../../../core/services/language.service';
import { StaffNotification } from '../../../core/models/notification.model';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [EmptyStateComponent, CommonModule],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.css'
})
export class NotificationCenterComponent {
  private notificationService = inject(NotificationService);
  private langService = inject(LanguageService);
  private router = inject(Router);

  closed = output<void>();

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  readonly notifications = this.notificationService.staffNotifications;
  readonly unreadCount = this.notificationService.unreadCount;

  activeFilter = signal<'all' | 'unread' | 'critical'>('all');

  filteredNotifications = computed(() => {
    const list = this.notifications();
    const filter = this.activeFilter();
    if (filter === 'unread') {
      return list.filter(n => !n.isRead);
    }
    if (filter === 'critical') {
      return list.filter(n => n.severity === 'critical' || n.severity === 'warning');
    }
    return list;
  });

  setFilter(filter: 'all' | 'unread' | 'critical'): void {
    this.activeFilter.set(filter);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearAll(): void {
    this.notificationService.clearAllNotifications();
  }

  onItemClick(item: StaffNotification): void {
    this.notificationService.markAsRead(item.id);
    if (item.actionUrl) {
      this.router.navigateByUrl(item.actionUrl);
      this.closed.emit();
    }
  }

  dismiss(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.notificationService.dismissStaffNotification(id);
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      const isAr = this.isArabic();
      if (diffMins < 1) return this.t().locJustNow;
      if (diffMins < 60) return this.langService.tf('loctMAgo', { diffMins });
      if (diffHours < 24) return this.langService.tf('loctHAgo', { diffHours });
      return date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }
}
