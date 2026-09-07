import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api-endpoints';
import { AuthService } from '../services/auth.service';

/** Endpoints that should NOT have Authorization header attached */
const PUBLIC_ENDPOINTS = [
  '/api/Auth/login',
  '/api/Auth/register',
  '/api/Auth/google',
  '/api/Auth/forgot-password',
  '/api/Auth/reset-password',
  '/api/Auth/refresh-token',
];

/** State for managing concurrent refresh token requests */
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function isPublicEndpoint(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return PUBLIC_ENDPOINTS.some(endpoint => lowerUrl.includes(endpoint.toLowerCase()));
}

function attachToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  return req.clone({
    setHeaders: { Authorization: authHeader }
  });
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const authService = inject(AuthService);

  // Don't attach token to public auth endpoints
  if (isPublicEndpoint(req.url)) {
    return next(req);
  }

  const token = authService.getToken();
  const authenticatedReq = token ? attachToken(req, token) : req;

  return next(authenticatedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // If the request was already to a public endpoint or user is on login page, do not refresh
        const isLoginUrl = router.url.includes('/login') ||
          (typeof window !== 'undefined' && window.location.pathname.includes('/login'));
        if (isPublicEndpoint(req.url) || isLoginUrl) {
          return throwError(() => error);
        }

        const currentRefreshToken = authService.getRefreshToken();
        const currentAccessToken = authService.getToken();

        if (currentRefreshToken && currentAccessToken) {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshTokenSubject.next(null);

            // Backend API expects { accessToken, refreshToken }
            const refreshPayload = {
              accessToken: currentAccessToken,
              refreshToken: currentRefreshToken
            };

            return http.post<any>(
              `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`,
              refreshPayload
            ).pipe(
              switchMap((res) => {
                isRefreshing = false;
                const resData = res?.data || res;
                const newToken = resData?.accessToken || resData?.token;
                const newRefresh = resData?.refreshToken || currentRefreshToken;
                if (newToken) {
                  authService.updateTokens(newToken, newRefresh);
                  refreshTokenSubject.next(newToken);
                  return next(attachToken(req, newToken));
                }
                authService.clearAuthState();
                router.navigate(['/auth/login']);
                return throwError(() => error);
              }),
              catchError((refreshErr) => {
                isRefreshing = false;
                refreshTokenSubject.next(null);
                authService.clearAuthState();
                router.navigate(['/auth/login']);
                return throwError(() => refreshErr || error);
              })
            );
          } else {
            // Wait until the ongoing refresh completes and replay with new token
            return refreshTokenSubject.pipe(
              filter((token): token is string => token !== null),
              take(1),
              switchMap((newToken) => next(attachToken(req, newToken)))
            );
          }
        } else {
          // No valid tokens — clear and redirect
          authService.clearAuthState();
          router.navigate(['/auth/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
