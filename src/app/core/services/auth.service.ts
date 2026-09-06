import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError, throwError, map } from 'rxjs';
import { AuthUser, AuthResponseDto, MeResponseDto, LoginRequestDto } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api-endpoints';
import { generateAvatarSvg, getSafeAvatar } from '../utils/avatar.util';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private currentUser = signal<AuthUser | null>(null);
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  readonly user = this.currentUser.asReadonly();

  public static readonly TOKEN_KEY = 'nook_access_token';
  public static readonly REFRESH_KEY = 'nook_refresh_token';
  public static readonly USER_KEY = 'nook_current_user';

  constructor() {
    this.restoreSession();
  }

  /** Check if a given JWT token is expired */
  isJwtExpired(token: string | null): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(payloadJson);
      if (payload && typeof payload.exp === 'number') {
        // Tolerant expiration check to prevent clock-skew false positives
        return Date.now() >= payload.exp * 1000;
      }
      return false;
    } catch {
      return false;
    }
  }

  private restoreSession(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const savedToken = localStorage.getItem(AuthService.TOKEN_KEY) ||
                         localStorage.getItem('token') ||
                         localStorage.getItem('accessToken');
      const savedRefresh = localStorage.getItem(AuthService.REFRESH_KEY) ||
                           localStorage.getItem('refreshToken');
      const savedUserStr = localStorage.getItem(AuthService.USER_KEY);

      if (savedToken) {
        this.accessToken = savedToken;
      }
      if (savedRefresh) {
        this.refreshToken = savedRefresh;
      }
      if (savedUserStr) {
        const parsed: AuthUser = JSON.parse(savedUserStr);
        if (parsed) {
          parsed.avatar = getSafeAvatar(parsed.avatar, parsed.name);
          this.currentUser.set(parsed);
        }
      }
    } catch (e) {
      console.warn('[AuthService] Error restoring session:', e);
    }
  }

  /** Check if user is currently authenticated */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!(this.currentUser() && token);
  }

  /** Get the current user object */
  getUser(): AuthUser | null {
    return this.currentUser();
  }

  /** Get the role of the current user */
  getRole(): 'admin' | 'user' | null {
    return this.currentUser()?.role ?? null;
  }

  /** Get the stored access token */
  getToken(): string | null {
    if (this.accessToken) return this.accessToken;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(AuthService.TOKEN_KEY) ||
                      localStorage.getItem('token') ||
                      localStorage.getItem('accessToken');
        if (saved) {
          this.accessToken = saved;
          return saved;
        }
      }
    } catch {}
    return null;
  }

  getRefreshToken(): string | null {
    if (this.refreshToken) return this.refreshToken;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(AuthService.REFRESH_KEY) ||
                      localStorage.getItem('refreshToken');
        if (saved) {
          this.refreshToken = saved;
          return saved;
        }
      }
    } catch {}
    return null;
  }

  updateTokens(accessToken: string, refreshToken?: string): void {
    this.accessToken = accessToken;
    try {
      localStorage.setItem(AuthService.TOKEN_KEY, accessToken);
      localStorage.setItem('token', accessToken);
      localStorage.setItem('accessToken', accessToken);
    } catch {}
    if (refreshToken) {
      this.refreshToken = refreshToken;
      try {
        localStorage.setItem(AuthService.REFRESH_KEY, refreshToken);
        localStorage.setItem('refreshToken', refreshToken);
      } catch {}
    }
  }

  /**
   * Login via backend API.
   * POST /api/Auth/login — { identifier, password }
   */
  login(dto: LoginRequestDto): Observable<AuthResponseDto> {
    const payload = {
      identifier: (dto.identifier || dto.email || '').trim(),
      password: (dto.password || '').trim()
    };

    return this.http.post<ApiResponse<AuthResponseDto>>(
      `${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`,
      payload
    ).pipe(
      map(res => {
        const raw = res?.data || (res as any);
        const token = raw?.accessToken || raw?.token;
        if (token) {
          const authDto: AuthResponseDto = {
            ...raw,
            token,
            accessToken: token
          };
          return authDto;
        }
        return raw;
      }),
      tap(authData => {
        if (authData) {
          this.storeAuthData(authData);
        }
      }),
      catchError(err => {
        console.error('[AuthService] Login failed:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Fetch current user from /api/Auth/me using stored token.
   * Response: ApiResponse<MeResponseDto>
   */
  fetchCurrentUser(): Observable<MeResponseDto> {
    return this.http.get<ApiResponse<MeResponseDto>>(
      `${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`
    ).pipe(
      map(res => res.data),
      tap(me => {
        const existing = this.currentUser();
        const isAdmin = (me.roles || []).some(r => r === 1); // UserRole.Admin = 1
        const userName = me.username || existing?.name || 'User';
        this.currentUser.set({
          id: me.id || me.accountId || '',
          email: me.email || '',
          name: userName,
          role: isAdmin ? 'admin' : 'user',
          avatar: getSafeAvatar((me as any)?.avatar || existing?.avatar, userName),
          token: existing?.token
        });
      }),
      catchError(err => {
        console.error('[AuthService] fetchCurrentUser failed:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Logout — revoke token and clear local state.
   */
  logout(): void {
    if (this.refreshToken) {
      this.http.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REVOKE_TOKEN}`, JSON.stringify(this.refreshToken), {
        headers: { 'Content-Type': 'application/json' }
      }).subscribe({ error: () => {} });
    }
    this.clearAuthState();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Compatibility: used by old LoginComponent.
   * @deprecated Use login() instead.
   */
  loginUser(user: AuthUser): void {
    const safeUser: AuthUser = {
      ...user,
      avatar: getSafeAvatar(user.avatar, user.name)
    };
    this.currentUser.set(safeUser);
    this.accessToken = user.token ?? null;
    this.refreshToken = user.refreshToken ?? null;
  }

  /**
   * Store auth data from login/refresh response.
   * Matches OpenAPI AuthResponseDto: { accessToken, refreshToken, account }
   */
  private storeAuthData(authData: AuthResponseDto): void {
    const token = authData.accessToken || authData.token || '';
    const refreshToken = authData.refreshToken;
    this.updateTokens(token, refreshToken);

    const account = authData.account;
    const roles = account?.roles || authData.roles || (authData.role ? [authData.role] : []);
    const isAdmin = roles.some((r: any) => r === 1 || r === 'Admin' || r === 'admin');
    const name = account?.username || authData.username || 'User';

    const user: AuthUser = {
      id: account?.id || authData.accountId || '',
      email: account?.email || authData.email || '',
      name,
      role: isAdmin ? 'admin' : 'user',
      avatar: getSafeAvatar((account as any)?.avatar || authData.avatar, name),
      token,
      refreshToken
    };

    this.currentUser.set(user);
    try {
      localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
    } catch {}
  }

  public clearAuthState(): void {
    this.currentUser.set(null);
    this.accessToken = null;
    this.refreshToken = null;
    try {
      localStorage.removeItem(AuthService.TOKEN_KEY);
      localStorage.removeItem(AuthService.REFRESH_KEY);
      localStorage.removeItem(AuthService.USER_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch {}
  }
}
