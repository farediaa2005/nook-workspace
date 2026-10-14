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
});
