import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, finalize, of, share, tap } from 'rxjs';

/**
 * Several root services load the same lists (students, packages, rooms, pricing…)
 * when a page starts, which used to fire the same GET 2–4 times per page load.
 *
 * - Identical GETs that are already in flight share one HTTP request.
 * - A successful GET response is reused for a short window (RECENT_MS).
 * - Any write (POST/PUT/PATCH/DELETE) clears the reuse window, so data read
 *   after a save always comes from the server.
 */
const RECENT_MS = 3000;

const inFlight = new Map<string, Observable<HttpEvent<unknown>>>();
const recent = new Map<string, { at: number; response: HttpResponse<unknown> }>();

export function clearRequestDedupeCache(): void {
  inFlight.clear();
  recent.clear();
}

export const requestDedupeInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    recent.clear();
    return next(req);
  }
  // Health checks and explicit no-cache requests must always hit the network.
  if (req.headers.has('X-Health-Check') || req.headers.get('Cache-Control') === 'no-cache') {
    return next(req);
  }

  const key = `${req.headers.get('Authorization') ?? ''} ${req.urlWithParams}`;

  const cached = recent.get(key);
  if (cached && Date.now() - cached.at < RECENT_MS) {
    return of(cached.response.clone());
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const shared = next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.ok) {
        recent.set(key, { at: Date.now(), response: event });
      }
    }),
    finalize(() => inFlight.delete(key)),
    share()
  );
  inFlight.set(key, shared);
  return shared;
};
