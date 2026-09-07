import { Component, computed, inject, signal, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/services/language.service';
import { UserService } from '../../../core/services/user.service';
import { StaffUser } from '../../../core/models/user.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { getTodayDateISO } from '../../../core/utils/date-time.util';

@Component({
  selector: 'app-show-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    SearchBoxComponent,
    PrimaryButtonComponent,
    MetricCardComponent,
    PaginationComponent,
    ModalComponent,
    CustomSelectComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './show-user.component.html',
  styleUrl: './show-user.component.css'
})
export class ShowUserComponent implements OnInit {
  private langService = inject(LanguageService);
  protected userService = inject(UserService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  ngOnInit(): void {
    this.userService.syncUsersFromBackend();
  }

  // Search & Pagination State
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(5);

  onSearch(val: any): void {
    const q = typeof val === 'string' ? val : (val?.target?.value || '');
    this.searchQuery.set(q);
  }

  // Users Signal from Service
  users = this.userService.users;

  // Active Admin Count (BUG-02)
  activeAdminCount = computed(() =>
    this.users().filter(u => this.isAdminUser(u) && u.status === 'active').length
  );

  // Check if target user is the currently logged-in account (BUG-03)
  isCurrentLoggedUser(u: StaffUser): boolean {
    const current = this.authService.getUser();
    if (!current) return false;
    return (!!current.id && current.id === u.id) ||
           (!!current.email && current.email.toLowerCase() === u.email.toLowerCase()) ||
           (!!current.name && current.name.toLowerCase() === (u.username || u.name).toLowerCase());
  }

  // Modal State
  isModalOpen = signal<boolean>(false);
  modalMode = signal<'add' | 'edit'>('add');
  editingUserId = signal<string | null>(null);

  // Form Signals
  formName = signal<string>('');
  formNameAr = signal<string>('');
  formUsername = signal<string>('');
  formPhone = signal<string>('');
  formEmail = signal<string>('');
  formPassword = signal<string>('');
  formRole = signal<'Admin / Manager' | 'Receptionist'>('Admin / Manager');
  formStatus = signal<'active' | 'inactive'>('active');
  formError = signal<string | null>(null);

  // In-app Delete Confirmation (BUG-019)
  userToDelete = signal<StaffUser | null>(null);
  deleteConfirmMessage = computed<string>(() => {
    const u = this.userToDelete();
    if (!u) return '';
    if (this.isAdminUser(u)) {
      return this.isArabic()
        ? `⚠️ تحذير: هذا الحساب مسؤول (Admin). هل أنت متأكد من رغبتك في حذف "${u.name}"؟`
        : `⚠️ Warning: This is an Administrator account. Are you sure you want to delete "${u.name}"?`;
    }
    return this.isArabic()
      ? `هل أنت متأكد من رغبتك في حذف حساب "${u.name}"؟`
      : `Are you sure you want to delete user "${u.name}"?`;
  });

  roleOptions = computed<SelectOption[]>(() => [
    { label: this.t().adminManagerRole, value: 'Admin / Manager' },
    { label: this.t().receptionCashierRole, value: 'Receptionist' }
  ]);

  statusOptions = computed<SelectOption[]>(() => [
    { label: this.t().statusActiveText, value: 'active' },
    { label: this.t().statusDisabledText, value: 'inactive' }
  ]);

  onRoleChange(val: string): void {
    this.formRole.set(val as 'Admin / Manager' | 'Receptionist');
  }

  onStatusChange(val: string): void {
    this.formStatus.set(val as 'active' | 'inactive');
  }

  // Computed KPI Metrics (2 Roles: Admin & Receptionist)
  totalUsersCount = computed(() => this.users().length);

  adminSupervisorCount = computed(() =>
    this.users().filter(u => this.isAdminUser(u)).length
  );

  receptionCashierCount = computed(() =>
    this.users().filter(u => !this.isAdminUser(u)).length
  );

  // Filtered Users List
  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.users();
    if (!q) return list;

    return list.filter(u => {
      const nameMatch = u.name.toLowerCase().includes(q) || (u.nameAr && u.nameAr.toLowerCase().includes(q));
      const usernameMatch = u.username && u.username.toLowerCase().includes(q);
      const emailMatch = u.email.toLowerCase().includes(q);
      const phoneMatch = u.phone && u.phone.includes(q);
      const roleMatch = u.role.toLowerCase().includes(q) || (u.roleAr && u.roleAr.toLowerCase().includes(q));
      return nameMatch || usernameMatch || emailMatch || phoneMatch || roleMatch;
    });
  });

  // Pagination Computations
  totalPages = computed(() => Math.ceil(this.filteredUsers().length / this.pageSize()) || 1);

  paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  startIndex = computed(() => (this.filteredUsers().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1));
  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredUsers().length));

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.cdr.markForCheck();
    }
  }

  // Add / Edit Modal Handlers
  openAddModal(): void {
    this.modalMode.set('add');
    this.editingUserId.set(null);
    this.formName.set('');
    this.formNameAr.set('');
    this.formUsername.set('');
    this.formPhone.set('');
    this.formEmail.set('');
    this.formPassword.set('');
    this.formRole.set('Admin / Manager');
    this.formStatus.set('active');
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(u: StaffUser): void {
    this.modalMode.set('edit');
    this.editingUserId.set(u.id);
    this.formName.set(u.name);
    this.formNameAr.set(u.nameAr || u.name);
    this.formUsername.set(u.username || '');
    this.formPhone.set(u.phone || '');
    this.formEmail.set(u.email);
    this.formPassword.set('');
    this.formRole.set(this.isAdminUser(u) ? 'Admin / Manager' : 'Receptionist');
    this.formStatus.set(u.status === 'inactive' ? 'inactive' : 'active');
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveUser(): void {
    const name = this.formName().trim();
    const username = this.formUsername().trim();
    const phone = this.formPhone().trim();
    const email = this.formEmail().trim();
    const role = this.formRole();
    const status = this.formStatus();

    const nameParts = name.split(/\s+/).filter(Boolean);
    if (!name || nameParts.length < 3) {
      this.formError.set(this.t().threeWordsNameRequired);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.formError.set(this.isArabic()
        ? 'يرجى إدخال عنوان بريد إلكتروني صحيح'
        : 'Please enter a valid email address');
      return;
    }

    // BUG-007: Password required and min length 8 for new users
    const pwd = this.formPassword().trim();
    if (this.modalMode() === 'add') {
      if (!pwd || pwd.length < 8) {
        this.formError.set(this.isArabic()
          ? 'كلمة المرور مطلوبة للمستخدم الجديد ويجب أن تكون من 8 أحرف على الأقل.'
          : 'Password is required for new users and must be at least 8 characters long.');
        return;
      }
    } else if (pwd && pwd.length < 8) {
      this.formError.set(this.isArabic()
        ? 'كلمة المرور الجديدة يجب أن تكون من 8 أحرف على الأقل.'
        : 'New password must be at least 8 characters long.');
      return;
    }

    if (!username || username.length < 2) {
      this.formError.set(this.isArabic()
        ? 'يرجى إدخال اسم مستخدم صالح (حرفين على الأقل)'
        : 'Username must be at least 2 characters');
      return;
    }

    // BUG-02: Protect last active Admin from demotion or deactivation
    if (this.modalMode() === 'edit') {
      const id = this.editingUserId();
      if (id) {
        const target = this.users().find(u => u.id === id);
        if (target && this.isAdminUser(target)) {
          const isDemotingRole = !role.toLowerCase().includes('admin') && !role.toLowerCase().includes('manager');
          const isDeactivating = status !== 'active';
          if ((isDemotingRole || isDeactivating) && this.activeAdminCount() <= 1) {
            this.formError.set(this.isArabic()
              ? 'لا يمكن تغيير دور أو تعطيل المسؤول الوحيد النشط في النظام!'
              : 'Cannot demote or deactivate the last remaining active Administrator!');
            return;
          }
        }
      }
    }

    let roleAr = 'موظف استقبال';
    if (role === 'Admin / Manager' || role.includes('Admin')) {
      roleAr = 'مسؤول / مدير';
    }

    const todayStr = getTodayDateISO();
    const nameAr = this.formNameAr().trim() || name;

    if (this.modalMode() === 'add') {
      const newUser: StaffUser = {
        id: `USR-${Date.now().toString().slice(-4)}`,
        name,
        nameAr,
        username,
        phone: phone || '-',
        email,
        role,
        roleAr,
        status,
        createdAt: todayStr,
        password: this.formPassword()
      };
      this.userService.addUser(newUser);
    } else {
      const id = this.editingUserId();
      if (id) {
        const existing = this.users().find(u => u.id === id);
        const updatedUser: StaffUser = {
          id,
          name,
          nameAr,
          username,
          phone: phone || existing?.phone || '-',
          email,
          role,
          roleAr,
          status,
          createdAt: existing?.createdAt || todayStr,
          password: this.formPassword() || existing?.password
        };
        this.userService.updateUser(updatedUser);
      }
    }

    this.closeModal();
  }

  isAdminUser(u: StaffUser): boolean {
    const roleLower = (u.role || '').toLowerCase();
    const roleAr = u.roleAr || '';
    return roleLower.includes('admin') || roleLower.includes('manager') || roleAr.includes('مدير') || roleAr.includes('مسؤول');
  }

  toggleUserStatus(u: StaffUser): void {
    // BUG-01: Strict RBAC check to forbid deactivating Admin accounts
    if (this.isAdminUser(u)) {
      this.notification.warning(this.isArabic()
        ? '⚠️ تنبيه أمني: لا يمكن تعطيل أو حظر حسابات المسؤولين (Admin).'
        : '⚠️ Security Alert: Cannot deactivate or suspend Admin accounts.');
      return;
    }
    this.userService.toggleStatus(u.id);
  }

  deleteUser(u: StaffUser): void {
    // BUG-03: Protect logged-in user from deleting own account
    if (this.isCurrentLoggedUser(u)) {
      this.notification.warning(this.isArabic()
        ? '⚠️ تنبيه أمني: لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول به.'
        : '⚠️ Security Alert: You cannot delete your own active account while logged in.');
      return;
    }

    // BUG-02: Protect last active Admin account from deletion
    if (this.isAdminUser(u) && this.activeAdminCount() <= 1) {
      this.notification.warning(this.isArabic()
        ? '⚠️ تنبيه أمني: لا يمكن حذف آخر مسؤول (Admin) نشط متبقٍ في النظام.'
        : '⚠️ Security Alert: Cannot delete the last remaining active Admin in the system.');
      return;
    }

    // Open in-app confirm dialog (BUG-019)
    this.userToDelete.set(u);
  }

  confirmDelete(): void {
    const u = this.userToDelete();
    if (u) {
      this.userService.deleteUser(u.id);
      this.userToDelete.set(null);
    }
  }

  cancelDelete(): void {
    this.userToDelete.set(null);
  }
}
