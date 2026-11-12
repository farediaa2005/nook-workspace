import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AuthSessionDto, AuthSessionsApiService } from '../../../../core/services/api/auth-sessions-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguageService } from '../../../../core/services/language.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractApiErrorMessage } from '../../../../core/utils/api-error.util';

/** Signed-in devices of the current account — GET/DELETE /api/Auth/sessions, POST /api/Auth/revoke-all. */
@Component({
  selector: 'app-active-sessions',
  standalone: true,
  templateUrl: './active-sessions.component.html',
  styleUrl: './active-sessions.component.css'
})
export class ActiveSessionsComponent implements OnInit {
  private api = inject(AuthSessionsApiService);
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);
  private lang = inject(LanguageService);

  isArabic = this.lang.isArabic;
  t = this.lang.t;
  /** translations with {placeholders} */
  tf = this.lang.tf;
  readonly sessions = signal<AuthSessionDto[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly confirmAll = signal(false);
  readonly showInactive = signal(false);

  readonly activeSessions = computed(() => this.sessions().filter(s => s.isActive));
  readonly visibleSessions = computed(() =>
    (this.showInactive() ? this.sessions() : this.activeSessions())
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.api.getSessions().subscribe({
      next: list => {
        this.sessions.set(list);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(extractApiErrorMessage(err, this.t().set2CouldNotLoadDevices));
      }
    });
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(this.isArabic() ? 'ar-u-nu-latn' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  revoke(session: AuthSessionDto): void {
    this.busyId.set(session.sessionId);
    this.api.revokeSession(session.sessionId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.sessions.update(list => list.map(s => (s.sessionId === session.sessionId ? { ...s, isActive: false } : s)));
        this.notifications.success(this.t().set2SignedOutOfThatDevice);
      },
      error: err => {
        this.busyId.set(null);
        this.notifications.error((this.t().set2CouldNotSignOutThat) + extractApiErrorMessage(err, this.t().resServerError));
      }
    });
  }

  revokeAll(): void {
    this.busyId.set('all');
    this.api.revokeAll().subscribe({
      next: () => {
        this.busyId.set(null);
        this.confirmAll.set(false);
        this.notifications.success(this.t().set2SignedOutOfAllDevices);
        // This device's session was revoked too.
        this.auth.logout();
      },
      error: err => {
        this.busyId.set(null);
        this.notifications.error((this.t().set2CouldNotSignOutOf) + extractApiErrorMessage(err, this.t().resServerError));
      }
    });
  }
}
