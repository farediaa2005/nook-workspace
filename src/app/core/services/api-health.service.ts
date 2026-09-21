import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { API_BASE_URL } from '../constants/api-endpoints';

@Injectable({
  providedIn: 'root'
})
export class ApiHealthService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  /** Live connection status: true = healthy & operational, false = disconnected / error */
  readonly isApiOnline = signal<boolean>(true);
  readonly isChecking = signal<boolean>(false);
  readonly lastChecked = signal<Date>(new Date());

  private checkInterval: any = null;

  constructor() {
    // Run initial health check
    this.checkHealth();

    // Periodic check every 25 seconds
    this.checkInterval = setInterval(() => {
      this.checkHealth();
    }, 25000);

    this.destroyRef.onDestroy(() => {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
    });

    // Browser network events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkHealth());
      window.addEventListener('offline', () => this.isApiOnline.set(false));
    }
  }

  /**
   * Report successful HTTP communication from interceptor or services
   */
  reportSuccess(): void {
    if (!this.isApiOnline()) {
      this.isApiOnline.set(true);
    }
    this.lastChecked.set(new Date());
  }

  /**
   * Report HTTP network/server failure (status 0 or 5xx)
   */
  reportFailure(): void {
    if (this.isApiOnline()) {
      this.isApiOnline.set(false);
    }
    this.lastChecked.set(new Date());
  }

  /**
   * Actively ping the backend to verify API reachability
   */
  checkHealth(): void {
    this.isChecking.set(true);

    // Ping an endpoint that responds quickly. Even if 401 Unauthorized is returned,
    // it proves the backend server is alive, reachable, and responding!
    this.http.get(`${API_BASE_URL}/api/Accounts/unlinked-students`, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    }).pipe(
      timeout(4000),
      catchError((error: HttpErrorResponse | any) => {
        // Any HTTP response with status > 0 and < 500 (e.g. 200, 401, 403, 404)
        // means the API server is up, functioning, and responding to requests!
        if (error instanceof HttpErrorResponse) {
          if (error.status > 0 && error.status < 500) {
            return of({ serverAlive: true });
          }
        }
        return of({ serverAlive: false });
      })
    ).subscribe({
      next: (res: any) => {
        const isHealthy = res?.serverAlive !== false;
        this.isApiOnline.set(isHealthy);
        this.isChecking.set(false);
        this.lastChecked.set(new Date());
      },
      error: () => {
        this.isApiOnline.set(false);
        this.isChecking.set(false);
        this.lastChecked.set(new Date());
      }
    });
  }
}
