import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, catchError, of, finalize } from 'rxjs';
import { LanguageService } from './language.service';
import { WorkspaceService } from './workspace.service';
import { CateringService } from './catering.service';
import { ClassroomService } from './classroom.service';
import { SettingsService } from './settings.service';
import { DashboardApiService } from './api/dashboard-api.service';
import { AnalysisApiService } from './api/analysis-api.service';
import {
  DashboardSummaryDto,
  OccupancyAnalysisDto,
  RevenueAnalysisDto,
  UpcomingRoomBooking,
  ActiveStudentPreviewItem,
  ActivityFlowPoint,
  SpaceDistributionMetrics
} from '../models/dashboard.model';
import { getTodayDateISO, parseIsoToLocalDate, parseIsoToLocalDateObj, parseIsoToLocal24h } from '../utils/date-time.util';

function parseTimeToHour(timeStr?: string): number | null {
  if (!timeStr) return null;
  const time24 = parseIsoToLocal24h(timeStr);
  if (!time24) return null;
  const parts = time24.split(':');
  if (parts.length >= 1) {
    const h = parseInt(parts[0], 10);
    return isNaN(h) ? null : h;
  }
  return null;
}

function parseDurationHours(durStr?: string): number {
  if (!durStr) return 1;
  const hMatch = durStr.match(/(\d+)\s*h/i);
  const mMatch = durStr.match(/(\d+)\s*m/i);
  let totalMinutes = 0;
  if (hMatch) totalMinutes += parseInt(hMatch[1], 10) * 60;
  if (mMatch) totalMinutes += parseInt(mMatch[1], 10);
  return totalMinutes > 0 ? Math.max(1, Math.ceil(totalMinutes / 60)) : 1;
}

function parseDurationMinutes(durStr?: string): number {
  if (!durStr) return 0;
  let total = 0;
  const hMatch = durStr.match(/(\d+)\s*h/i);
  const mMatch = durStr.match(/(\d+)\s*m/i);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  return total;
}

function formatMinutesToDuration(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0h 00m';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Feature Service for Dashboard & Analytics (Layer 4).
 * Single Source of Truth for Dashboard state, business calculations,
 * data mapping, and live API synchronization.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private langService = inject(LanguageService);
  private workspaceService = inject(WorkspaceService);
  private cateringService = inject(CateringService);
  private classroomService = inject(ClassroomService);
  private settingsService = inject(SettingsService);
  private dashboardApi = inject(DashboardApiService);
  private analysisApi = inject(AnalysisApiService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // State Signals (Clean Architecture Layer 4)
  readonly summary = signal<DashboardSummaryDto | null>(null);
  readonly occupancy = signal<OccupancyAnalysisDto | null>(null);
  readonly revenue = signal<RevenueAnalysisDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly chartTimeframe = signal<'today' | 'week'>('today');
  readonly hoveredPoint = signal<ActivityFlowPoint | null>(null);

  /**
   * Load dashboard metrics and occupancy analytics in parallel directly from backend.
   * Completely bypasses any local database.
   */
  loadDashboardData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Refresh core domain entities from backend
    this.workspaceService.loadFromBackend();
    this.classroomService.syncWithBackend();

    forkJoin({
      summary: this.dashboardApi.getSummary().pipe(catchError(() => of(null))),
      occupancy: this.analysisApi.getOccupancyAnalysis().pipe(catchError(() => of(null))),
      revenue: this.analysisApi.getRevenueAnalysis().pipe(catchError(() => of(null)))
    })
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: ({ summary, occupancy, revenue }) => {
          if (summary) this.summary.set(summary);
          if (occupancy) this.occupancy.set(occupancy);
          if (revenue) this.revenue.set(revenue);
        },
        error: (err) => {
          this.error.set('Failed to load dashboard data from server');
        }
      });
  }

  setTimeframe(timeframe: 'today' | 'week'): void {
    this.chartTimeframe.set(timeframe);
  }

  setHoveredPoint(pt: ActivityFlowPoint | null): void {
    this.hoveredPoint.set(pt);
  }

  // ==========================================
  // Computed Business Metrics
  // ==========================================

  /** Real Total Space Capacity from Settings */
  readonly totalCapacity = computed(() => {
    const rooms = this.settingsService.rooms().filter(r => r.isActive);
    const sum = rooms.reduce((acc, r) => acc + (r.capacity || 10), 0);
    return sum > 0 ? sum : 30;
  });

  /** Live Total Bookings Count (Today) */
  readonly totalBookingsCount = computed(() => {
    const backend = this.summary();
    if (backend) {
      const activeTotal = (backend.activeWorkspacesCount ?? backend.activeWorkspaceSessions ?? 0) +
                          (backend.activeClassroomsCount ?? backend.activeClassroomSessions ?? 0);
      const pendingTotal = (backend.pendingBookingsCount ?? backend.pendingBookings ?? 0);
      const val = activeTotal + pendingTotal;
      return String(val);
    }
    const todayCheckins = this.workspaceService.todayCheckins();
    const activeRooms = this.classroomService.cards().filter(c => c.status === 'active' || c.status === 'scheduled').length;
    return String(todayCheckins + activeRooms);
  });

  /** Available Desks / Space Count */
  readonly availableDesksCount = computed(() => {
    const backend = this.summary();
    if (backend && backend.availableRoomsCount !== undefined) {
      return String(backend.availableRoomsCount);
    }
    const totalCap = this.totalCapacity();
    const active = Number(this.activeMembersCount()) || 0;
    return String(Math.max(0, totalCap - active));
  });

  /** Active Members currently inside the workspace */
  readonly activeMembersCount = computed(() => {
    const backend = this.summary();
    if (backend) {
      const active = (backend.activeWorkspacesCount ?? backend.activeWorkspaceSessions ?? 0) +
                     (backend.activeClassroomsCount ?? backend.activeClassroomSessions ?? 0);
      return String(active);
    }
    const realInside = this.workspaceService.insideCount();
    const realActive = this.workspaceService.activeStudents().length;
    return String(Math.max(realInside, realActive));
  });

  /** Occupancy Percentage Rate */
  readonly occupancyRateValue = computed(() => {
    const active = Number(this.activeMembersCount()) || 0;
    const totalCap = this.totalCapacity();
    if (totalCap === 0) return '0%';
    const pct = Math.min(100, Math.round((active / totalCap) * 100));
    return `${pct}%`;
  });

  /** Dynamic Space Distribution (Donut Chart Data) */
  readonly spaceDistribution = computed<SpaceDistributionMetrics>(() => {
    const students = this.workspaceService.activeStudents();
    const classrooms = this.classroomService.cards().filter(c => c.status === 'active' || c.status === 'scheduled');

    let privateCount = 0;
    let sharedCount = 0;
    let meetingCount = 0;

    for (const s of students) {
      const name = (s.faculty || s.college || '').toLowerCase();
      if (name.includes('خاص') || name.includes('private') || name.includes('silent') || name.includes('lab')) {
        privateCount++;
      } else {
        sharedCount++;
      }
    }

    for (const c of classrooms) {
      meetingCount += ((c as any).capacity || 12);
    }

    const basePrivate = privateCount;
    const baseShared = sharedCount;
    const baseMeeting = meetingCount;
    const baseTotal = basePrivate + baseShared + baseMeeting;

    if (baseTotal === 0) {
      return {
        privatePct: 0,
        sharedPct: 0,
        meetingPct: 0,
        privateDash: '0 251.3',
        sharedDash: '0 251.3',
        meetingDash: '0 251.3',
        privateOffset: 0,
        sharedOffset: 0,
        meetingOffset: 0
      };
    }

    const privatePct = Math.round((basePrivate / baseTotal) * 100);
    const sharedPct = Math.round((baseShared / baseTotal) * 100);
    const meetingPct = Math.max(0, 100 - (privatePct + sharedPct));

    const circum = 251.33; // 2 * PI * 40
    const privateDash = +((privatePct / 100) * circum).toFixed(1);
    const sharedDash = +((sharedPct / 100) * circum).toFixed(1);
    const meetingDash = +((meetingPct / 100) * circum).toFixed(1);

    const privateOffset = 0;
    const sharedOffset = -privateDash;
    const meetingOffset = -(privateDash + sharedDash);

    return {
      privatePct,
      sharedPct,
      meetingPct,
      privateDash: `${privateDash} ${+(circum - privateDash).toFixed(1)}`,
      sharedDash: `${sharedDash} ${+(circum - sharedDash).toFixed(1)}`,
      meetingDash: `${meetingDash} ${+(circum - meetingDash).toFixed(1)}`,
      privateOffset,
      sharedOffset,
      meetingOffset
    };
  });

  /** Peak Occupancy Rate Percentage */
  readonly peakOccupancyRate = computed(() => {
    const backend = this.summary();
    if (backend && (backend as any).occupancyRatePercentage !== undefined) {
      return (backend as any).occupancyRatePercentage;
    }
    const points = this.currentChartPoints();
    if (points.length > 0) {
      const maxOcc = Math.max(...points.map(p => p.occupancy));
      return maxOcc > 0 ? maxOcc : 0;
    }
    return 0;
  });

  /** Peak Time Range Display String */
  readonly peakTimeRange = computed(() => {
    const backendPeak = this.occupancy()?.peakHour;
    if (backendPeak !== undefined && backendPeak !== null && String(backendPeak).trim() !== '') {
      const h = Number(backendPeak);
      if (!isNaN(h)) {
        const period = h >= 12 ? (this.isArabic() ? 'م' : 'PM') : (this.isArabic() ? 'ص' : 'AM');
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:00 ${period}`;
      }
      return String(backendPeak);
    }

    const points = this.currentChartPoints();
    let maxPt: ActivityFlowPoint | null = null;
    for (const pt of points) {
      if (pt.count > 0 && (!maxPt || pt.count > maxPt.count)) {
        maxPt = pt;
      }
    }

    if (!maxPt || maxPt.count === 0) {
      return this.t().noPeakYet;
    }

    if (this.isArabic()) {
      return `${maxPt.labelAr} (${maxPt.count} ${this.t().peopleUnit})`;
    } else {
      return `${maxPt.label} (${maxPt.count} ${this.t().peopleUnit})`;
    }
  });

  /** Average Session Duration */
  readonly avgSessionDuration = computed(() => {
    const backendAvg = this.occupancy()?.averageSessionHours;
    if (backendAvg && backendAvg > 0) {
      const raw = formatMinutesToDuration(Math.round(backendAvg * 60));
      return this.isArabic() ? this.langService.formatDurationLocale(raw) : raw;
    }

    const workspaceSessions = [
      ...this.workspaceService.activeStudents(),
      ...this.workspaceService.historyStudents()
    ];
    const classroomSessions = this.classroomService.cards()
      .filter(c => c.status === 'active' || c.status === 'scheduled');

    let totalMinutes = 0;
    let totalCount = 0;

    for (const s of workspaceSessions) {
      const mins = parseDurationMinutes(s.duration);
      if (mins > 0) {
        totalMinutes += mins;
        totalCount++;
      }
    }

    for (const c of classroomSessions) {
      const mins = (c.durationHours || 2) * 60;
      totalMinutes += mins;
      totalCount++;
    }

    if (totalCount === 0) {
      return '--';
    }

    const avg = Math.round(totalMinutes / totalCount);
    const raw = formatMinutesToDuration(avg);
    return this.isArabic() ? this.langService.formatDurationLocale(raw) : raw;
  });

  /** Total Footfall Count for Today */
  readonly totalFootfallCount = computed(() => {
    const backend = this.summary();
    if (backend && (backend as any).activeStudentsCount !== undefined) {
      return (backend as any).activeStudentsCount + (backend.activeClassroomSessions || 0);
    }

    const workspaceStudents = Math.max(
      this.workspaceService.todayCheckins(),
      this.workspaceService.insideCount()
    );

    const classroomCards = this.classroomService.cards()
      .filter(c => c.status === 'active' || c.status === 'scheduled');

    const classroomStudents = classroomCards.reduce((sum, c) => {
      const count = (c as any).studentsCount || (c as any).attendees;
      return sum + (typeof count === 'number' && count > 0 ? count : 1);
    }, 0);

    return workspaceStudents + classroomStudents;
  });

  /** Hourly & Weekly Activity Data Points computed dynamically */
  readonly currentChartPoints = computed<ActivityFlowPoint[]>(() => {
    const isAr = this.isArabic();
    const timeframe = this.chartTimeframe();
    const capacity = this.totalCapacity();

    const activeStudents = this.workspaceService.activeStudents();
    const historyStudents = this.workspaceService.historyStudents();
    const allSessions = [...activeStudents, ...historyStudents];
    const classroomCards = this.classroomService.cards().filter(c => c.status === 'active' || c.status === 'scheduled');

    const todayISO = getTodayDateISO();
    const isToday = (d?: string) => !d || parseIsoToLocalDate(d) === todayISO;

    if (timeframe === 'today') {
      const todaySessions = allSessions.filter(s => isToday(s.date));

      const timeSlots = [
        { h: 9, en: '09 AM', ar: '09 ص', rawX: 25 },
        { h: 11, en: '11 AM', ar: '11 ص', rawX: 100 },
        { h: 13, en: '01 PM', ar: '01 م', rawX: 180 },
        { h: 15, en: '03 PM', ar: '03 م', rawX: 260 },
        { h: 17, en: '05 PM', ar: '05 م', rawX: 340 },
        { h: 19, en: '07 PM', ar: '07 م', rawX: 420 },
        { h: 21, en: '09 PM', ar: '09 م', rawX: 495 }
      ];

      return timeSlots.map(slot => {
        let count = 0;
        for (const s of todaySessions) {
          const startH = parseTimeToHour(s.checkInTime);
          if (startH !== null) {
            const dur = parseDurationHours(s.duration);
            const endH = startH + dur;
            if (slot.h < endH && (slot.h + 2) > startH) {
              count++;
            }
          }
        }

        for (const c of classroomCards) {
          const startH = parseTimeToHour(c.startTime);
          if (startH !== null) {
            const dur = c.durationHours || 2;
            const endH = startH + dur;
            if (slot.h < endH && (slot.h + 2) > startH) {
              count += ((c as any).studentsCount || (c as any).capacity || 1);
            }
          }
        }

        const occupancy = Math.min(100, Math.round((count / capacity) * 100));
        const y = count === 0 ? 155 : Math.max(25, 160 - Math.round((occupancy / 100) * 135));
        const x = isAr ? (520 - slot.rawX) : slot.rawX;

        return {
          label: slot.en,
          labelAr: slot.ar,
          count,
          occupancy,
          x,
          y
        };
      }).sort((a, b) => a.x - b.x);
    } else {
      const days = [
        { dayIndex: 6, en: 'Sat', ar: 'السبت', rawX: 25 },
        { dayIndex: 0, en: 'Sun', ar: 'الأحد', rawX: 100 },
        { dayIndex: 1, en: 'Mon', ar: 'الإثنين', rawX: 180 },
        { dayIndex: 2, en: 'Tue', ar: 'الثلاثاء', rawX: 260 },
        { dayIndex: 3, en: 'Wed', ar: 'الأربعاء', rawX: 340 },
        { dayIndex: 4, en: 'Thu', ar: 'الخميس', rawX: 420 },
        { dayIndex: 5, en: 'Fri', ar: 'الجمعة', rawX: 495 }
      ];

      return days.map(d => {
        let count = 0;
        for (const s of allSessions) {
          if (s.date) {
            const dateObj = parseIsoToLocalDateObj(s.date);
            if (!isNaN(dateObj.getTime()) && dateObj.getDay() === d.dayIndex) {
              count++;
            }
          }
        }
        for (const c of classroomCards) {
          if (c.bookingDate) {
            const dateObj = parseIsoToLocalDateObj(c.bookingDate);
            if (!isNaN(dateObj.getTime()) && dateObj.getDay() === d.dayIndex) {
              count += ((c as any).studentsCount || (c as any).capacity || 1);
            }
          }
        }

        const occupancy = Math.min(100, Math.round((count / capacity) * 100));
        const y = count === 0 ? 155 : Math.max(25, 160 - Math.round((occupancy / 100) * 135));
        const x = isAr ? (520 - d.rawX) : d.rawX;

        return {
          label: d.en,
          labelAr: d.ar,
          count,
          occupancy,
          x,
          y
        };
      }).sort((a, b) => a.x - b.x);
    }
  });

  /** Calculate smooth SVG curve Path string */
  readonly curvePath = computed(() => {
    const points = this.currentChartPoints();
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  });

  /** Calculate smooth SVG Area Fill Path string */
  readonly areaPath = computed(() => {
    const points = this.currentChartPoints();
    if (points.length === 0) return '';
    const lineD = this.curvePath();
    const lastP = points[points.length - 1];
    const firstP = points[0];
    return `${lineD} L ${lastP.x} 160 L ${firstP.x} 160 Z`;
  });

  /** Top Catering Products from Catering Service */
  readonly topProducts = this.cateringService.topProducts;

  /** Live Room Bookings for Today (Clean DTO to UI Model mapping) */
  readonly upcomingReservations = computed<UpcomingRoomBooking[]>(() => {
    const cards = this.classroomService.cards();
    const active = cards.filter(c => c.status === 'active' || c.status === 'scheduled');
    if (active.length > 0) {
      return active.slice(0, 3).map(c => ({
        id: c.id,
        roomName: c.name || '-',
        roomNameAr: c.name || '-',
        title: c.activity || this.t().workshopSession,
        titleAr: c.activity || this.t().workshopSession,
        instructor: c.instructor || '-',
        instructorAr: this.langService.formatNameLocale(c.instructor || '-'),
        timeSlot: `${this.langService.formatTimeLocale(c.startTime || '')} - ${this.langService.formatTimeLocale(c.endTime || '')}`,
        attendees: (c as any).studentsCount || (c as any).capacity || (c as any).attendees || 0,
        status: c.status === 'active' ? 'in_progress' : 'upcoming'
      }));
    }
    return [];
  });

  /** Today's Live Active Students Preview (Clean DTO to UI Model mapping) */
  readonly activeStudentsPreview = computed<ActiveStudentPreviewItem[]>(() => {
    const real = this.workspaceService.activeStudents();
    if (real.length > 0) {
      return real.map(st => ({
        id: st.id,
        name: this.langService.formatNameLocale(st.name),
        spaceOrFaculty: st.faculty || st.college || this.t().sharedSpace,
        checkInTime: this.langService.formatTimeLocale(st.checkInTime || '-'),
        duration: this.langService.formatDurationLocale(st.duration || '-')
      }));
    }
    return [];
  });
}
