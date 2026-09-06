import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LanguageService } from '../../../core/services/language.service';
import { UserService } from '../../../core/services/user.service';
import { CustomSelectComponent, SelectOption } from '../../../shared/components/custom-select/custom-select.component';
import { PrimaryButtonComponent } from '../../../shared/components/primary-button/primary-button.component';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent, PrimaryButtonComponent],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.css'
})
export class AddUserComponent {
  private router = inject(Router);
  private langService = inject(LanguageService);
  private userService = inject(UserService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  fullName = signal<string>('');
  username = signal<string>('');
  email = signal<string>('');
  phone = signal<string>('');
  password = signal<string>('');
  selectedRole = signal<string>('admin');
  formError = signal<string | null>(null);

  // Role Options (2 Roles: Admin & Receptionist)
  roleOptions = computed<SelectOption[]>(() => [
    { value: 'admin', label: this.t().adminManagerRole },
    { value: 'reception', label: this.t().receptionCashierRole }
  ]);

  onSubmit(): void {
    const name = this.fullName().trim();
    const usernameVal = this.username().trim() || (this.email().trim().split('@')[0] || 'user');
    const emailVal = this.email().trim();
    const phoneVal = this.phone().trim() || '-';
    const roleKey = this.selectedRole();

    const nameParts = name.split(/\s+/).filter(Boolean);
    if (!name || nameParts.length < 3) {
      this.formError.set(this.t().threeWordsNameRequired);
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      this.formError.set(this.t().validEmailFormatRequired);
      return;
    }

    let roleStr = 'Receptionist';
    let roleArStr = 'موظف استقبال';
    if (roleKey === 'admin') { 
      roleStr = 'Admin / Manager'; 
      roleArStr = 'مسؤول / مدير'; 
    }

    this.userService.addUser({
      id: `USR-${Date.now().toString().slice(-4)}`,
      name: name,
      nameAr: name,
      username: usernameVal,
      phone: phoneVal,
      email: emailVal,
      role: roleStr,
      roleAr: roleArStr,
      status: 'active',
      password: this.password() || 'Nook@123456',
      createdAt: new Date().toISOString().split('T')[0]
    });

    this.router.navigate(['/settings/show-user']);
  }

  onCancel(): void {
    this.router.navigate(['/settings/show-user']);
  }
}
