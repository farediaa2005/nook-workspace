import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { WorkspaceService } from './workspace.service';
import { ClassroomService } from './classroom.service';
import { ShiftService } from './shift.service';

/**
 * Keeps the visible lists current when other people at the desk change data (no push channel exists).
 * Every 45 s — and right after the tab becomes visible again — the data behind the current page is
 * re-fetched silently (no loading spinner). It skips a cycle while the tab is hidden, while a modal or
 * menu is open, or while the user is typing, so nothing changes under an open form.
 */
@Injectable({ providedIn: 'root' })
export class LiveRefreshService {
  static readonly INTERVAL_MS = 45_000;

  private router = inject(Router);
  private authService = inject(AuthService);
  private workspaceService = inject(WorkspaceService);
  private classroomService = inject(ClassroomService);
  private shiftService = inject(ShiftService);

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRun = Date.now();
  private readonly onVisibility = () => {
    if (document.visibilityState === 'visible' && Date.now() - this.lastRun > 10_000) this.refresh();
  };

  start(): void {
    if (this.timer || typeof window === 'undefined') return;
    this.timer = setInterval(() => this.refresh(), LiveRefreshService.INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
  }

  /** True while something the user is working in is open: a modal, drawer, menu, or a focused field. */
  private userIsBusy(): boolean {
    const overlay = document.querySelector(
      '.modal-overlay, .modal-backdrop, .modal-backdrop-custom, [role="dialog"], .drawer, .add-item-overlay, .menu-backdrop, .action-dropdown-card'
    );
    if (overlay && (overlay as HTMLElement).getClientRects().length) return true;
    const active = document.activeElement as HTMLElement | null;
    return !!active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
  }

  refresh(): void {
    if (!this.authService.isAuthenticated() || document.visibilityState !== 'visible' || this.userIsBusy()) return;
    this.lastRun = Date.now();
    const url = this.router.url;
    if (url.startsWith('/workspace') || url.startsWith('/dashboard') || url.startsWith('/details/show-students')) {
      this.workspaceService.loadFromBackend(true);
    }
    if (url.startsWith('/classroom') || url.startsWith('/dashboard')) {
      this.classroomService.refreshSilently();
    }
    if (url.startsWith('/shift/active') || url.startsWith('/dashboard')) {
      this.shiftService.fetchCurrentShiftFromApi(true);
    }
  }
}
