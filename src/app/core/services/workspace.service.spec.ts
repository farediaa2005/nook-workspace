import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { WorkspaceService } from './workspace.service';
import { WorkspaceApiService } from './api/workspace-api.service';
import { StudentApiService } from './api/student-api.service';
import { FacultyApiService } from './api/faculty-api.service';
import { BlacklistApiService } from './api/blacklist-api.service';
import { ShiftService } from './shift.service';
import { AuthService } from './auth.service';
import { WalletApiService } from './api/wallet-api.service';
import { CateringService } from './catering.service';
import { PackageService } from './package.service';
import { LanguageService } from './language.service';

describe('WorkspaceService Resilience & Caching (NOOK-DEV-05)', () => {
  let service: WorkspaceService;
  let mockWorkspaceApi: any;
  let mockStudentApi: any;
  let mockFacultyApi: any;
  let mockBlacklistApi: any;
  let mockAuthService: any;

  beforeEach(() => {
    localStorage.clear();

    mockWorkspaceApi = {
      getSessions: vi.fn().mockReturnValue(of([]))
    };
    mockStudentApi = {
      getStudents: vi.fn().mockReturnValue(of([])),
      createStudent: vi.fn().mockReturnValue(of({ id: 's-new', name: 'New Student' }))
    };
    mockFacultyApi = {
      getFaculties: vi.fn().mockReturnValue(of([])),
      createFaculty: vi.fn().mockReturnValue(of({ id: 'f-1', name: 'Engineering' }))
    };
    mockBlacklistApi = {
      getBlacklists: vi.fn().mockReturnValue(of([]))
    };
    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        WorkspaceService,
        { provide: WorkspaceApiService, useValue: mockWorkspaceApi },
        { provide: StudentApiService, useValue: mockStudentApi },
        { provide: FacultyApiService, useValue: mockFacultyApi },
        { provide: BlacklistApiService, useValue: mockBlacklistApi },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ShiftService, useValue: {
          addManualShiftItem: vi.fn().mockReturnValue(of({})),
          currentShift: vi.fn().mockReturnValue(null),
          guardActiveShift: vi.fn().mockReturnValue(true)
        } },
        { provide: WalletApiService, useValue: {} },
        { provide: CateringService, useValue: {} },
        { provide: PackageService, useValue: {} },
        { provide: LanguageService, useValue: { isArabic: () => true, t: () => ({}) } }
      ]
    });

    service = TestBed.inject(WorkspaceService);
  });

  it('should not empty student list when studentApi.getStudents() returns error', () => {
    // 1. Preload a student profile into cache/state
    service.saveStudentProfile({
      id: 'student-1',
      name: 'Ahmed Ali',
      phone: '01012345678'
    });
    expect(service.getAllStudentProfiles().length).toBe(1);

    // 2. Simulate API failure on getStudents
    mockStudentApi.getStudents.mockReturnValue(throwError(() => new Error('Network timeout')));

    service.loadFromBackend();

    // 3. Ensure last-known student profile is preserved
    expect(service.getAllStudentProfiles().length).toBe(1);
    expect(service.getAllStudentProfiles()[0].name).toBe('Ahmed Ali');
    expect(service.error()).toBeTruthy();
  });

  it('should not wipe active sessions when getSessions() fails', () => {
    // Simulate initial successful session load
    mockWorkspaceApi.getSessions.mockReturnValue(of([
      { id: 'sess-1', name: 'Mohamed', status: 'active', checkIn: '10:00 AM' }
    ]));
    service.fetchSessions();

    expect(service.activeStudents().length).toBe(1);

    // Now simulate network failure on subsequent fetch
    mockWorkspaceApi.getSessions.mockReturnValue(throwError(() => new Error('Server 500')));
    service.fetchSessions();

    // Verify last-known active students are NOT wiped to empty array
    expect(service.activeStudents().length).toBe(1);
    expect(service.error()).toContain('Server 500');
  });

  it('should persist saved student profiles to localStorage across page reloads', () => {
    service.saveStudentProfile({
      id: 'local-1',
      name: 'Sarah Ibrahim',
      phone: '01123456789'
    });

    const cachedRaw = localStorage.getItem('nook_cached_students');
    expect(cachedRaw).toBeTruthy();
    const cached = JSON.parse(cachedRaw!);
    expect(cached.some((s: any) => s.name === 'Sarah Ibrahim')).toBe(true);
  });

  it('should map backend session printing pages count cleanly without confounding with monetary price (NOOK-DEV-06)', () => {
    mockWorkspaceApi.getSessions.mockReturnValue(of([
      {
        id: 'sess-print-1',
        studentName: 'Ali Mahmoud',
        printing: 10, // 10 pages
        status: 'Active',
        timeFrom: '10:00 AM'
      }
    ]));

    service.fetchSessions();

    const student = service.activeStudents().find(s => s.id === 'sess-print-1');
    expect(student).toBeTruthy();
    expect(student?.printingPages).toBe(10);
    expect(student?.printingCount).toBe(10);
    expect(student?.printingPrice).toBe(0); // Price must not default to page count (10)
  });

  it('should persist checked-out sessions to localStorage and compute stable visit stats (NOOK-FEAT-05)', () => {
    // Mock an active student
    mockWorkspaceApi.getSessions.mockReturnValue(of([
      {
        id: 'sess-checkout-1',
        studentName: 'Hassan Tarek',
        phone: '01099998888',
        status: 'Active',
        timeFrom: '10:00 AM',
        date: '2026-10-10'
      }
    ]));

    service.fetchSessions();
    expect(service.activeStudents().length).toBe(1);

    // Checkout student
    service.checkOutStudent('sess-checkout-1', {
      totalCost: 50,
      duration: '2h 00m'
    });

    expect(service.activeStudents().length).toBe(0);
    expect(service.historyStudents().length).toBe(1);

    // Verify localStorage has cached history sessions
    const rawHistory = localStorage.getItem('nook_cached_history_sessions');
    expect(rawHistory).toBeTruthy();
    const historyList = JSON.parse(rawHistory!);
    expect(historyList.some((s: any) => s.id === 'sess-checkout-1')).toBe(true);

    // Check visit stats
    const stats = service.getStudentVisitStats('01099998888');
    expect(stats.visits).toBe(1);
    expect(stats.hours).toBe(2);
  });
});
