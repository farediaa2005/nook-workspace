/**
 * Application-wide constants.
 * Centralized values that are used across multiple features.
 */

/** User role types used throughout the application */
export type UserRole = 'admin' | 'cashier' | 'reception';

/** Auth-level role types (simplified for login/guard checks) */
export type AuthRole = 'admin' | 'user';

/** Status values for entities */
export type EntityStatus = 'active' | 'inactive';
export type StudentStatus = 'active' | 'completed';
export type ClassroomStatus = 'available' | 'occupied';

/** Billing options for check-in flow */
export type BillingOption = 'new-session' | 'package' | 'coupon';

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100] as readonly number[],
} as const;

/** Theme values */
export type ThemeMode = 'dark' | 'light';

/** Currency used in the application */
export const CURRENCY = 'EGP' as const;
