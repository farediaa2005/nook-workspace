import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { WorkspaceService } from './workspace.service';
import { ClassroomService } from './classroom.service';
import { CateringService } from './catering.service';
import { SettingsService } from './settings.service';
import { DashboardApiService } from './api/dashboard-api.service';
import { AnalysisApiService } from './api/analysis-api.service';
import { LanguageService } from './language.service';
import { ActiveStudentSession } from '../models/student.model';

describe('DashboardService - Space Distribution (NOOK-DEV-09 & NOOK-FEAT-04)', () => {
  let service: DashboardService;
  let activeStudentsSignal = signal<ActiveStudentSession[]>([]);
  let historyStudentsSignal = signal<ActiveStudentSession[]>([]);
  let classroomCardsSignal = signal<any[]>([]);
  let classroomRoomsSignal = signal<any[]>([]);

  beforeEach(() => {
    activeStudentsSignal.set([]);
    historyStudentsSignal.set([]);
    classroomCardsSignal.set([]);
    classroomRoomsSignal.set([]);

    const mockWorkspaceService = {
      activeStudents: activeStudentsSignal,
      historyStudents: historyStudentsSignal,
      loadFromBackend: vi.fn()
    };

    const mockClassroomService = {
      cards: classroomCardsSignal,
      rooms: classroomRoomsSignal,
      syncWithBackend: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        { provide: WorkspaceService, useValue: mockWorkspaceService },
        { provide: ClassroomService, useValue: mockClassroomService },
        { provide: CateringService, useValue: {} },
        { provide: SettingsService, useValue: {} },
        { provide: DashboardApiService, useValue: { getSummary: vi.fn() } },
        { provide: AnalysisApiService, useValue: { getOccupancyAnalysis: vi.fn(), getRevenueAnalysis: vi.fn() } },
        {
          provide: LanguageService,
          useValue: {
            isArabic: () => true,
            t: () => ({}),
            formatTimeLocale: (x: any) => x,
            formatDurationLocale: (x: any) => x,
            formatNameLocale: (x: any) => x
          }
        }
      ]
    });

    service = TestBed.inject(DashboardService);
  });

  it('does NOT conflate faculty or college name containing "خاص" or "private" with private seating', () => {
    // Student in private college ("جامعة خاصة") but in shared zone (zone 0 / Share)
    activeStudentsSignal.set([
      {
        id: 's-1',
        name: 'Ahmed Private Faculty Student',
        phone: '01012345678',
        faculty: 'جامعة خاصة',
        college: 'كلية خاصة',
        zone: 0,
        seatingType: 'Share',
        billingType: 'new-session',
        status: 'active'
      } as ActiveStudentSession
    ]);

    classroomCardsSignal.set([
      { id: 'c-1', status: 'active', capacity: 3 }
    ]);

    const dist = service.spaceDistribution();

    // أحمد في جامعة خاصة ولكن في شيرد زون: privateCount should be 0, sharedCount should be 1
    expect(dist.privateCount).toBe(0);
    expect(dist.sharedCount).toBe(1);
    expect(dist.meetingCount).toBe(3);
    // Total is 4: private = 0%, shared = 25%, meeting = 75%
    expect(dist.privatePct).toBe(0);
    expect(dist.sharedPct).toBe(25);
    expect(dist.meetingPct).toBe(75);
  });

  it('correctly identifies private/silent seats from zone === 1 or seatingType === "Silent"', () => {
    activeStudentsSignal.set([
      {
        id: 's-1',
        name: 'Silent Student 1',
        phone: '01011111111',
        faculty: 'الهندسة',
        zone: 1, // Silent zone
        seatingType: 'Silent',
        billingType: 'new-session',
        status: 'active'
      } as ActiveStudentSession,
      {
        id: 's-2',
        name: 'Shared Student 2',
        phone: '01022222222',
        faculty: 'التجارة',
        zone: 0,
        seatingType: 'Share',
        billingType: 'new-session',
        status: 'active'
      } as ActiveStudentSession
    ]);

    classroomCardsSignal.set([
      { id: 'c-1', status: 'active', capacity: 2 }
    ]);

    const dist = service.spaceDistribution();

    // 1 private, 1 shared, 2 meeting -> total = 4
    expect(dist.privateCount).toBe(1);
    expect(dist.sharedCount).toBe(1);
    expect(dist.meetingCount).toBe(2);
    expect(dist.privatePct).toBe(25);
    expect(dist.sharedPct).toBe(25);
    expect(dist.meetingPct).toBe(50);
  });
});
