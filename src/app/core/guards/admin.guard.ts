import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { LanguageService } from '../services/language.service';

/**
 * Guard that ensures only users with 'admin' role can access the route.
 * Redirects unauthorized users to the dashboard with notification feedback.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const langService = inject(LanguageService);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const role = authService.getRole();
  if (role === 'admin') {
    return true;
  }

  // Not authorized as admin — notify and redirect to dashboard
  const message = langService.isArabic()
    ? '⚠️ غير مصرح: هذه الصفحة مخصصة للمسؤولين فقط.'
    : '⚠️ Access Denied: This page is restricted to administrators only.';
  notificationService.warning(message);

  return router.createUrlTree(['/dashboard']);
};

