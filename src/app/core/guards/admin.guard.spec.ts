import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('Admin Guard (adminGuard)', () => {
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    getRole: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn(),
      getRole: vi.fn(),
    };

    routerMock = {
      createUrlTree: vi.fn((commands: string[]) => ({
        toString: () => commands.join('/'),
      } as unknown as UrlTree)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should redirect unauthenticated user to /auth/login', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));

    expect(authServiceMock.isAuthenticated).toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
    expect(result).toBeDefined();
  });

  it('should redirect non-admin authenticated user to /dashboard', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.getRole.mockReturnValue('staff');

    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));

    expect(authServiceMock.isAuthenticated).toHaveBeenCalled();
    expect(authServiceMock.getRole).toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should allow access when authenticated user has admin role', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.getRole.mockReturnValue('admin');

    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, dummyState));

    expect(authServiceMock.isAuthenticated).toHaveBeenCalled();
    expect(authServiceMock.getRole).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
