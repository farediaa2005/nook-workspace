import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin, of, catchError } from 'rxjs';
import { AnalysisApiService, InstructorActivityDto, TopStudentDto } from '../../../core/services/api/analysis-api.service';
import { LanguageService } from '../../../core/services/language.service';

/** Dashboard lists from GET /api/Analysis/top-students and /api/Analysis/instructor-activity. */
@Component({
  selector: 'app-top-activity',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './top-activity.component.html',
  styleUrl: './top-activity.component.css'
})
export class TopActivityComponent implements OnInit {
  private api = inject(AnalysisApiService);
  private lang = inject(LanguageService);

  isArabic = this.lang.isArabic;
  t = this.lang.t;
  readonly students = signal<TopStudentDto[] | null>(null);
  readonly instructors = signal<InstructorActivityDto[] | null>(null);
  readonly failed = signal({ students: false, instructors: false });

  ngOnInit(): void {
    forkJoin({
      students: this.api.getTopStudents().pipe(catchError(() => of(null))),
      instructors: this.api.getInstructorActivity().pipe(catchError(() => of(null)))
    }).subscribe(({ students, instructors }) => {
      this.failed.set({ students: students === null, instructors: instructors === null });
      this.students.set((students || []).slice().sort((a, b) => b.totalVisits - a.totalVisits).slice(0, 5));
      this.instructors.set((instructors || []).slice().sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5));
    });
  }
}
