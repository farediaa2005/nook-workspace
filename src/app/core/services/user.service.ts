import { Injectable, signal, computed, inject, Signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { AccountApiService } from './api/account-api.service';
import { AuthService } from './auth.service';
import { AccountDto, MockUser } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private accountApi = inject(AccountApiService);
  private authService = inject(AuthService);
  private usersState = signal<MockUser[]>(this.loadUsers());

  readonly users = this.usersState.asReadonly();
  readonly activeCount = computed(() => this.usersState().filter(u => u.status === 'active').length);
  readonly totalCount = computed(() => this.usersState().length);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.syncUsersFromBackend();
    }
  }

  private static readonly STORAGE_KEY = 'nook_users_cache';

  syncUsersFromBackend(): void {
    if (!this.authService.isAuthenticated()) return;
    this.accountApi.getAccounts().pipe(
      catchError((err) => {
        if (err?.status === 403) {
          console.info('[UserService] Accounts API requires elevated role (403 Forbidden).');
        } else {
          console.warn('[UserService] Could not sync accounts from API:', err?.message || err);
        }
        return of([] as AccountDto[]);
      })
    ).subscribe({
      next: (accounts) => {
        if (accounts && accounts.length > 0) {
          const mapped: MockUser[] = accounts.map(a => this.mapAccountDtoToUser(a));
          this.usersState.set(mapped);
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem(UserService.STORAGE_KEY, JSON.stringify(mapped));
            }
          } catch {}
        }
      }
    });
  }

  private mapAccountDtoToUser(dto: AccountDto | any): MockUser {
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
      createdAt: dto.createdAt ? dto.createdAt.split('T')[0] : (dto.lastLoginAt ? dto.lastLoginAt.split('T')[0] : '-')
    };
  }

  private loadUsers(): MockUser[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(UserService.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
    return [];
  }

  addUser(user: MockUser): void {
    const id = user.id || `USR-${Date.now()}`;
    const newUser = { ...user, id };

    this.usersState.update(list => {
      const updated = [newUser, ...list];
      return updated;
    });

    const apiRole = user.role.includes('Admin') ? 1 : 2;
    this.accountApi.createAccount({
      username: (user.username || user.name || '').replace(/\s+/g, '_').toLowerCase(),
      password: user.password || 'Nook@123456',
      email: user.email || undefined,
      phoneNumber: user.phone && user.phone !== '-' ? user.phone : undefined
    }).subscribe({
      next: (created) => {
        if (created && created.id) {
          this.usersState.update(list => list.map(u => u.id === id ? { ...u, id: created.id } : u));
          // Link Staff Profile
          this.accountApi.linkStaffProfile(created.id, {
            name: user.name,
            staffRole: apiRole
          }).subscribe({ error: () => {} });
        }
      },
      error: () => {}
    });
  }

  updateUser(user: MockUser): void {
    this.usersState.update(list => {
      const updated = list.map(u => (u.id === user.id ? user : u));
      return updated;
    });

    const apiRole = user.role.includes('Admin') ? 1 : 2;
    this.accountApi.updateAccount(user.id, {
      username: user.username || user.name,
      userName: user.username || user.name,
      email: user.email,
      role: apiRole
    }).subscribe({ error: () => {} });
  }

  deleteUser(id: string): void {
    this.usersState.update(list => {
      const updated = list.filter(u => u.id !== id);
      return updated;
    });

    this.accountApi.deleteAccount(id).subscribe({ error: () => {} });
  }

  toggleStatus(id: string): void {
    this.usersState.update(list => {
      const updated = list.map(u => (u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
      return updated;
    });

    this.accountApi.toggleActive(id).subscribe({ error: () => {} });
  }
}