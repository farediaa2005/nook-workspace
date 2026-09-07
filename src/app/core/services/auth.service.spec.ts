import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  describe('JWT Expiration Checking (isJwtExpired)', () => {
    it('should return true for null or empty tokens', () => {
      expect(service.isJwtExpired(null)).toBe(true);
      expect(service.isJwtExpired('')).toBe(true);
    });

    it('should return true for expired JWT', () => {
      // payload with exp in the past (1000s after epoch = 1970)
      const pastPayload = btoa(JSON.stringify({ exp: 1000 }));
      const expiredToken = `header.${pastPayload}.signature`;

      expect(service.isJwtExpired(expiredToken)).toBe(true);
    });

    it('should return false for valid future JWT', () => {
      // payload with exp 1 hour in the future
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const futurePayload = btoa(JSON.stringify({ exp: futureExp }));
      const validToken = `header.${futurePayload}.signature`;

      expect(service.isJwtExpired(validToken)).toBe(false);
    });

    it('should return true for malformed non-JWT tokens (BUG-020)', () => {
      expect(service.isJwtExpired('not-a-jwt')).toBe(true);
    });
  });

  describe('Token Management (updateTokens, getToken, getRefreshToken)', () => {
    it('should store and retrieve in-memory tokens', () => {
      service.updateTokens('test-access-token', 'test-refresh-token');

      expect(service.getToken()).toBe('test-access-token');
      expect(service.getRefreshToken()).toBe('test-refresh-token');
    });
  });

  describe('Authentication & Role State', () => {
    it('should return isAuthenticated = false when no user or token is set', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getRole()).toBeNull();
      expect(service.getUser()).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should clear stored state and navigate to /auth/login', () => {
      service.updateTokens('acc-123', 'ref-123');

      service.logout();

      // Should attempt revoke HTTP call for refreshToken
      const req = httpTesting.expectOne((r) => r.url.includes('/api/Auth/revoke-token'));
      expect(req.request.method).toBe('POST');
      req.flush({});

      expect(service.getToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });
});
