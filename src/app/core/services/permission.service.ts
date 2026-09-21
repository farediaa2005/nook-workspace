import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private authService = inject(AuthService);

  readonly currentUser = this.authService.user;

  readonly isAdmin = computed(() => {
    return this.currentUser()?.role === 'admin';
  });

  readonly isStaff = computed(() => {
    const user = this.currentUser();
    return this.isAdmin() || user?.role === 'user';
  });

  readonly isManagerOrAbove = computed(() => {
    return this.isAdmin();
  });

  // Action Permissions
  canManageShifts(): boolean {
    return this.isStaff();
  }

  canCloseShift(): boolean {
    return this.isStaff();
  }

  canApplyDiscounts(): boolean {
    return this.isStaff();
  }

  canApplySpecialDiscount(): boolean {
    return this.isManagerOrAbove();
  }

  canBlacklistStudent(): boolean {
    return this.isManagerOrAbove();
  }

  canDeleteRecords(): boolean {
    return this.isAdmin();
  }

  canViewAuditLogs(): boolean {
    return this.isManagerOrAbove();
  }

  canManageCateringInventory(): boolean {
    return this.isStaff();
  }
}
