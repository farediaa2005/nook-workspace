import { Component, input, output, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/services/language.service';
import { StudentAnalyticsService } from '../../../core/services/student-analytics.service';
import { StudentAnalytics } from '../../../core/models/student-analytics.model';
import { getUserInitials } from '../../../core/utils/avatar.util';

@Component({
  selector: 'app-student-analytics-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-analytics-modal.component.html',
  styleUrl: './student-analytics-modal.component.css'
})
export class StudentAnalyticsModalComponent {
  private langService = inject(LanguageService);
  private analyticsService = inject(StudentAnalyticsService);

  studentId = input.required<string>();
  studentName = input<string>();
  close = output<void>();

  t = this.langService.t;
  isArabic = this.langService.isArabic;
  readonly Math = Math;

  isLoading = signal<boolean>(true);
  analytics = signal<StudentAnalytics | null>(null);

  activeTab = signal<'overview' | 'spaces' | 'packages' | 'discounts'>('overview');

  constructor() {
    effect(() => {
      const id = this.studentId();
      if (id) {
        this.loadAnalytics(id);
      }
    });
  }

  loadAnalytics(id: string): void {
    this.isLoading.set(true);
    this.analyticsService.getStudentAnalytics(id, this.studentName()).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  getInitials(): string {
    return getUserInitials(this.analytics()?.studentName || this.studentName() || 'Student');
  }

  getSpacePercentage(hours: number): number {
    const total = this.analytics()?.hours.totalHours || 1;
    return Math.min(100, Math.round((hours / total) * 100));
  }
}
