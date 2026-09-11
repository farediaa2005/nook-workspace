import { Injectable, signal, computed, inject } from '@angular/core';
import { catchError, of, finalize, forkJoin } from 'rxjs';
import { AccountApiService } from './api/account-api.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { LanguageService } from './language.service';
import { AccountDto, StaffUser } from '../models/user.model';
import { parseIsoToLocalDate, getTodayDateISO } from '../utils/date-time.util';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private accountApi = inject(AccountApiService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private langService = inject(LanguageService);

  // Pure in-memory reactive state (Clean Architecture - NO localStorage database)
  private usersState = signal<StaffUser[]>([]);
  readonly users = this.usersState.asReadonly();

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly activeCount = computed(() => this.usersState().filter(u => u.status === 'active').length);
  readonly totalCount = computed(() => this.usersState().length);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.syncUsersFromBackend();
    }
  }

  /**
   * Fetch all system accounts from Backend API
   * GET /api/Accounts
   * Concurrently enriched with createdAt from GET /api/Accounts/{id}/profile
   */
  syncUsersFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.isLoading.set(true);
    this.error.set(null);

    this.accountApi.getAccounts().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[UserService] Accounts API requires elevated role (403 Forbidden).');
          this.error.set('Accounts API requires elevated role (403 Forbidden)');
        } else {
          console.warn('[UserService] Could not sync accounts from API:', err?.message || err);
          this.error.set(err?.message || 'Failed to load accounts');
        }
        return of([] as AccountDto[]);
      }),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (accounts) => {
        if (accounts && accounts.length > 0) {
          const mapped: StaffUser[] = accounts.map(a => this.mapAccountDtoToUser(a));
          this.usersState.set(mapped);

          // Concurrently enrich accounts with details from GET /api/Accounts/{id}/profile
          const profileCalls = accounts.map(a =>
            this.accountApi.getAccountProfile(a.id).pipe(catchError(() => of(null)))
          );

          forkJoin(profileCalls).subscribe({
            next: (profiles) => {
              const enriched = mapped.map((u, idx) => {
                const p = profiles[idx];
                const rawCreated = p?.createdAt || (p as any)?.createdDate;
                const staffProfile = (p as any)?.profiles?.find((pr: any) => pr.role === 2 || pr.role === 1);
                const profileName = staffProfile?.profileName || ((p as any)?.profiles?.[0] as any)?.profileName;
                const resolvedName = profileName || u.name;
                const resolvedPhone = (p?.phoneNumber && p.phoneNumber !== '-' ? p.phoneNumber : (u.phone && u.phone !== '-' ? u.phone : '-'));
                const resolvedEmail = (p?.email && p.email !== '-' ? p.email : u.email);

                return {
                  ...u,
                  name: resolvedName,
                  nameAr: resolvedName,
                  phone: resolvedPhone,
                  email: resolvedEmail,
                  createdAt: rawCreated ? parseIsoToLocalDate(rawCreated) : u.createdAt
                };
              });
              this.usersState.set(enriched);
            }
          });
        } else {
          this.usersState.set([]);
        }
      }
    });
  }

  private mapAccountDtoToUser(dto: AccountDto | any): StaffUser {
    const rawUsername = dto.username || dto.userName || '-';
    const roles = Array.isArray(dto.roles) ? dto.roles : (dto.role ? [dto.role] : []);
    const isAdmin = roles.some((r: any) =>
      typeof r === 'string' ? r.toLowerCase().includes('admin') : (r === 1 || r === 0)
    ) || (typeof dto.role === 'string' && dto.role.toLowerCase().includes('admin'));

    const roleDisplay = isAdmin ? 'Admin / Manager' : 'Receptionist';
    const roleAr = isAdmin ? 'مسؤول / مدير' : 'موظف استقبال';

    return {
      id: dto.id,
      name: rawUsername,
      nameAr: rawUsername,
      username: rawUsername,
      phone: dto.phoneNumber || dto.phone || '-',
      email: dto.email || '-',
      role: roleDisplay,
      roleAr: roleAr,
      status: dto.isActive ? 'active' : 'inactive',
      createdAt: dto.createdAt ? parseIsoToLocalDate(dto.createdAt) : (dto.lastLoginAt ? parseIsoToLocalDate(dto.lastLoginAt) : '-')
    };
  }

  /**
   * Create account in Backend API
   * POST /api/Accounts
   * Followed optionally by POST /api/Accounts/{id}/link-staff
   */
  addUser(user: StaffUser): void {
    const apiRole = user.role.includes('Admin') ? 1 : 2;
    this.isLoading.set(true);

    this.accountApi.createAccount({
      username: (user.username || user.name || '').replace(/\s+/g, '_').toLowerCase(),
      password: user.password || '',
      email: user.email || undefined,
      phoneNumber: user.phone && user.phone !== '-' ? user.phone : undefined
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (created) => {
        if (created && created.id) {
          const mappedUser: StaffUser = {
            ...user,
            id: created.id,
            status: created.isActive ? 'active' : 'inactive',
            createdAt: user.createdAt || getTodayDateISO()
          };
          this.usersState.update(list => [mappedUser, ...list]);

          // Link Staff Profile
          this.accountApi.linkStaffProfile(created.id, {
            name: user.name,
            staffRole: apiRole
          }).subscribe({
            next: () => this.syncUsersFromBackend(),
            error: () => this.syncUsersFromBackend()
          });

          this.notification.success(
            this.langService.isArabic()
              ? `تم إنشاء حساب المستخدم "${user.name}" بنجاح!`
              : `User "${user.name}" created successfully!`
          );
        } else {
          this.syncUsersFromBackend();
          this.notification.success(
            this.langService.isArabic()
              ? `تم إنشاء حساب المستخدم "${user.name}" بنجاح!`
              : `User "${user.name}" created successfully!`
          );
        }
      },
      error: (err) => {
        console.error('[UserService] Failed to create account:', err);
        const errorMsg = err?.error?.message || err?.message || (
          this.langService.isArabic()
            ? 'فشل إنشاء حساب المستخدم. يرجى المحاولة مرة أخرى.'
            : 'Failed to create user account. Please try again.'
        );
        this.notification.error(errorMsg);
      }
    });
  }

  /**
   * Update account in Backend API
   * PUT /api/Accounts/{id}
   */
  updateUser(user: StaffUser): void {
    const apiRole = user.role.includes('Admin') ? 1 : 2;
    this.isLoading.set(true);

    const cleanPhone = user.phone && user.phone !== '-' ? user.phone.trim() : undefined;
    const cleanEmail = user.email && user.email !== '-' ? user.email.trim() : undefined;
    const cleanUsername = (user.username || user.name || '').trim();

    this.accountApi.updateAccount(user.id, {
      username: cleanUsername,
      userName: cleanUsername,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      isActive: user.status === 'active',
      role: apiRole
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: () => {
        // Concurrently link/update staff profile so profileName reflects user.name
        this.accountApi.linkStaffProfile(user.id, {
          name: user.name || user.username,
          staffRole: apiRole
        }).subscribe({
          next: () => this.syncUsersFromBackend(),
          error: (err) => {
            console.warn('[UserService] Staff profile update notice:', err?.message);
            this.syncUsersFromBackend();
          }
        });

        this.usersState.update(list => list.map(u => (u.id === user.id ? { ...u, ...user } : u)));
        this.notification.success(
          this.langService.isArabic()
            ? `تم تحديث بيانات المستخدم "${user.name}" بنجاح!`
            : `User "${user.name}" updated successfully!`
        );
      },
      error: (err) => {
        console.error('[UserService] Failed to update account:', err);
        const errorMsg = err?.error?.message || err?.message || (
          this.langService.isArabic()
            ? 'فشل تحديث بيانات المستخدم.'
            : 'Failed to update user account.'
        );
        this.notification.error(errorMsg);
      }
    });
  }

  /**
   * Delete account in Backend API
   * DELETE /api/Accounts/{id}
   */
  deleteUser(id: string): void {
    this.isLoading.set(true);

    this.accountApi.deleteAccount(id).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: () => {
        this.usersState.update(list => list.filter(u => u.id !== id));
        this.syncUsersFromBackend();
        this.notification.info(
          this.langService.isArabic()
            ? 'تم حذف الحساب بنجاح.'
            : 'User account deleted successfully.'
        );
      },
      error: (err) => {
        console.error('[UserService] Failed to delete account:', err);
        const errorMsg = err?.error?.message || err?.message || (
          this.langService.isArabic()
            ? 'فشل حذف الحساب. يرجى المحاولة لاحقاً.'
            : 'Failed to delete user account.'
        );
        this.notification.error(errorMsg);
      }
    });
  }

  /**
   * Toggle account active status in Backend API
   * PUT /api/Accounts/{id}/toggle-active
   */
  toggleStatus(id: string): void {
    this.isLoading.set(true);

    this.accountApi.toggleActive(id).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: () => {
        this.usersState.update(list =>
          list.map(u => (u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u))
        );
        this.syncUsersFromBackend();
        this.notification.success(
          this.langService.isArabic()
            ? 'تم تحديث حالة الحساب بنجاح.'
            : 'Account status updated successfully.'
        );
      },
      error: (err) => {
        console.error('[UserService] Failed to toggle account status:', err);
        const errorMsg = err?.error?.message || err?.message || (
          this.langService.isArabic()
            ? 'فشل تغيير حالة الحساب.'
            : 'Failed to update account status.'
        );
        this.notification.error(errorMsg);
      }
    });
  }
}