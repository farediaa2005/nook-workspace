import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/services/language.service';
import { getUserInitials } from '../../../core/utils/avatar.util';

@Component({
  selector: 'app-student-snapshot-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-snapshot-card.component.html',
  styleUrl: './student-snapshot-card.component.css'
})
export class StudentSnapshotCardComponent {
  private langService = inject(LanguageService);

  student = input.required<{
    id: string;
    name: string;
    college?: string;
    phone?: string;
    walletBalance?: number;
    isBlacklisted?: boolean;
    duration?: string;
    visits?: number;
    hours?: number;
  }>();

  viewFullProfile = output<string>();
  close = output<void>();

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  getInitials(): string {
    return getUserInitials(this.student().name);
  }
}
