import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authServiceMock: {
    getToken: ReturnType<typeof vi.fn>;
    getRefreshToken: ReturnType<typeof vi.fn>;
    updateTokens: ReturnType<typeof vi.fn>;
    clearAuthState: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    url: string;
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      getToken: vi.fn(),
      getRefreshToken: vi.fn(),
      updateTokens: vi.fn(),
      clearAuthState: vi.fn(),
    };

    routerMock = {
      url: '/dashboard',
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  it('should attach Bearer token to authenticated API requests', () => {
    authServiceMock.getToken.mockReturnValue('mock-jwt-token');

    http.get('/api/Students/active').subscribe();

    const req = httpTesting.expectOne('/api/Students/active');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
    req.flush([]);
  });

  it('should NOT attach Authorization header to public endpoints like /api/Auth/login', () => {
    authServiceMock.getToken.mockReturnValue('mock-jwt-token');

    http.post('/api/Auth/login', { identifier: 'admin', password: '123' }).subscribe();

    const req = httpTesting.expectOne('/api/Auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should pass request through without Authorization header when no token exists', () => {
    authServiceMock.getToken.mockReturnValue(null);

    http.get('/api/Students/all').subscribe();

    const req = httpTesting.expectOne('/api/Students/all');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('should clear auth state and redirect to login on 401 when no refresh token exists', () => {
    authServiceMock.getToken.mockReturnValue('expired-token');
    authServiceMock.getRefreshToken.mockReturnValue(null);

    http.get('/api/Students/123').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpTesting.expectOne('/api/Students/123');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.clearAuthState).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  describe('token refresh', () => {
    beforeEach(() => {
      authServiceMock.getToken.mockReturnValue('expired-token');
      authServiceMock.getRefreshToken.mockReturnValue('refresh-token');
    });

    it('should refresh the token on 401 and replay the original request with the new token', () => {
      let result: unknown;
      http.get('/api/Students/1').subscribe((r) => (result = r));

      httpTesting.expectOne('/api/Students/1').flush('x', { status: 401, statusText: 'Unauthorized' });
      httpTesting
        .expectOne('/api/Auth/refresh-token')
        .flush({ data: { accessToken: 'new-token', refreshToken: 'new-refresh' } });

      const replay = httpTesting.expectOne('/api/Students/1');
      expect(replay.request.headers.get('Authorization')).toBe('Bearer new-token');
      replay.flush({ ok: true });

      expect(result).toEqual({ ok: true });
      expect(authServiceMock.updateTokens).toHaveBeenCalledWith('new-token', 'new-refresh');
      expect(authServiceMock.clearAuthState).not.toHaveBeenCalled();
    });

    it('should NOT log the user out when the replayed request fails with a non-auth error', () => {
      let status = 0;
      http.get('/api/Students/2').subscribe({ error: (e) => (status = e.status) });

      httpTesting.expectOne('/api/Students/2').flush('x', { status: 401, statusText: 'Unauthorized' });
      httpTesting.expectOne('/api/Auth/refresh-token').flush({ data: { accessToken: 'new-token' } });
      httpTesting.expectOne('/api/Students/2').flush('boom', { status: 500, statusText: 'Server Error' });

      expect(status).toBe(500);
      expect(authServiceMock.clearAuthState).not.toHaveBeenCalled();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should fail every concurrent request (no hanging) when the refresh itself fails', () => {
      const statuses: number[] = [];
      http.get('/api/A').subscribe({ error: (e) => statuses.push(e.status) });
      http.get('/api/B').subscribe({ error: (e) => statuses.push(e.status) });

      httpTesting.expectOne('/api/A').flush('x', { status: 401, statusText: 'Unauthorized' });
      httpTesting.expectOne('/api/B').flush('x', { status: 401, statusText: 'Unauthorized' });
      httpTesting.expectOne('/api/Auth/refresh-token').flush('nope', { status: 401, statusText: 'Unauthorized' });

      expect(statuses.length).toBe(2);
      expect(authServiceMock.clearAuthState).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });
});
