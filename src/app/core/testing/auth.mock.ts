import { AuthResponseDto, LoginRequestDto } from '../models/user.model';

export const ENABLE_DEMO_AUTH_FALLBACK = true;

/**
 * Provides demo account credentials when backend database is not yet seeded.
 */
export function getDemoAuthFallback(dto: LoginRequestDto): AuthResponseDto | null {
  if (!ENABLE_DEMO_AUTH_FALLBACK) return null;

  const id = (dto.identifier || dto.email || '').toLowerCase().trim();
  const pwd = dto.password;

  if (
    (id === 'admin@nook.io' || id === 'admin' || id === 'nook@io' || id === 'nook') &&
    (pwd === 'nook123' || pwd === 'Admin@123')
  ) {
    const token = 'demo_admin_jwt_token_' + Date.now();
    return {
      accessToken: token,
      token: token,
      refreshToken: 'demo_admin_refresh_token',
      account: {
        id: 'admin-001',
        email: 'admin@nook.io',
        username: 'Admin User',
        roles: [1],
        isActive: true
      },
      accountId: 'admin-001',
      email: 'admin@nook.io',
      username: 'Admin User',
      role: 1,
      roles: [1]
    };
  }

  if (
    (id === 'user@nook.io' || id === 'user') &&
    pwd === 'nook123'
  ) {
    const token = 'demo_user_jwt_token_' + Date.now();
    return {
      accessToken: token,
      token: token,
      refreshToken: 'demo_user_refresh_token',
      account: {
        id: 'user-001',
        email: 'user@nook.io',
        username: 'Regular User',
        roles: [2],
        isActive: true
      },
      accountId: 'user-001',
      email: 'user@nook.io',
      username: 'Regular User',
      role: 2,
      roles: [2]
    };
  }

  return null;
}

