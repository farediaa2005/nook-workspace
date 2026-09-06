import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { CateringService } from '../../core/services/catering.service';
import { ClassroomService } from '../../core/services/classroom.service';
import { SettingsService } from '../../core/services/settings.service';
import { DashboardApiService } from '../../core/services/api/dashboard-api.service';
import { AnalysisApiService } from '../../core/services/api/analysis-api.service';
import { OccupancyAnalysisDto } from '../../core/models/dashboard.model';
import { AuthService } from '../../core/services/auth.service';
export interface UpcomingRoomBooking {
  id: string;
  roomName: string;
  roomNameAr: string;
  title: string;
  titleAr: string;
  instructor: string;
  instructorAr: string;
  timeSlot: string;
  attendees: number;
  status: 'in_progress' | 'upcoming' | 'confirmed';
}

export interface ActiveStudentPreviewItem {
  id: string;
  name: string;
  spaceOrFaculty: string;
  checkInTime: string;
  duration: string;
}

export interface ActivityFlowPoint {
  label: string;
  labelAr: string;
  count: number;
  occupancy: number;
  x: number;
  y: number;
}

function parseTimeToHour(timeStr?: string): number | null {
  if (!timeStr) return null;
  const str = String(timeStr).trim();
  const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|ص|م)?/i);
  if (m) {
    let hour = parseInt(m[1], 10);
    const marker = (m[3] || '').toUpperCase();
    if (marker === 'PM' || marker === 'م') {
      if (hour < 12) hour += 12;
    } else if (marker === 'AM' || marker === 'ص') {
      if (hour === 12) hour = 0;
    }
    return hour;
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private langService = inject(LanguageService);
  private workspaceService = inject(WorkspaceService);
  private cateringService = inject(CateringService);
  private classroomService = inject(ClassroomService);
  private settingsService = inject(SettingsService);
  private dashboardApi = inject(DashboardApiService);
  private analysisApi = inject(AnalysisApiService);
  private authService = inject(AuthService);

  t = this.langService.t;
  isArabic = this.langService.isArabic;

  currentUser = this.authService.user;
  userName = computed(() => this.currentUser()?.name || '');

  // Backend Live Stats Signal
  backendSummary = signal<any | null>(null);
  backendOccupancy = signal<OccupancyAnalysisDto | null>(null);

  ngOnInit(): void {
    // Ensure services load live data immediately
    this.workspaceService.loadFromBackend();
    this.classroomService.syncWithBackend();

    // Connect to Backend Dashboard API
    this.dashboardApi.getSummary().subscribe({
      next: (summary) => {
        if (summary) {
          this.backendSummary.set(summary);
        }
      },
      error: () => {
        // Graceful fallback to real-time service signals
      }
    });

    this.analysisApi.getOccupancyAnalysis().subscribe({
      next: (occ) => {
        if (occ) {
          this.backendOccupancy.set(occ);
        }
      },
      error: () => {}
    });
  }

  // Real Total Space Capacity from Settings
  totalCapacity = computed(() => {
    const rooms = this.settingsService.rooms().filter(r => r.isActive);
    const sum = rooms.reduce((acc, r) => acc + (r.capacity || 10), 0);
    return sum > 0 ? sum : 30;
  });

  // Live Metric Signals (Bound to backend summary or real-time workspace signals)
  totalBookingsCount = computed(() => {
    const backend = this.backendSummary();
    if (backend) {
      const activeTotal = (backend.activeWorkspacesCount ?? backend.activeWorkspaceSessions ?? 0) +
                          (backend.activeClassroomsCount ?? backend.activeClassroomSessions ?? 0);
      const pendingTotal = (backend.pendingBookingsCount ?? 0);
      const val = Math.max(activeTotal + pendingTotal, activeTotal);
      if (val > 0) return String(val);
    }
    const todayCheckins = this.workspaceService.todayCheckins();
    const activeRooms = this.classroomService.cards().filter(c => c.status === 'active' || c.status === 'scheduled').length;
    return String(Math.max(1, todayCheckins + activeRooms));
  });

  availableDesksCount = computed(() => {
    const backend = this.backendSummary();
    if (backend && backend.availableRoomsCount !== undefined) {
      return String(backend.availableRoomsCount);
    }
    const totalCap = this.totalCapacity();
    const active = Number(this.activeMembersCount()) || 0;
    return String(Math.max(0, totalCap - active));
  });

  activeMembersCount = computed(() => {
    const backend = this.backendSummary();
    if (backend) {
      const active = (backend.activeWorkspacesCount ?? backend.activeWorkspaceSessions ?? 0) +
                     (backend.activeClassroomsCount ?? backend.activeClassroomSessions ?? 0);
      if (active > 0) return String(active);
    }
    const realInside = this.workspaceService.insideCount();
    const realActive = this.workspaceService.activeStudents().length;
    return String(Math.max(realInside, realActive));
  });

  occupancyRateValue = computed(() => {
    const active = Number(this.activeMembersCount()) || 0;
    const totalCap = this.totalCapacity();
    if (totalCap === 0) return '0%';
    const pct = Math.min(100, Math.round((active / totalCap) * 100));
    return `${pct}%`;
  });

  // Dynamic Space Distribution (Donut Chart Data)
  spaceDistribution = computed(() => {
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

  // Dynamic Activity Flow Summary Metrics
  peakOccupancyRate = computed(() => {
    const backend = this.backendSummary();
    if (backend && backend.occupancyRatePercentage !== undefined) {
      return backend.occupancyRatePercentage;
    }
    const points = this.currentChartPoints();
    if (points.length > 0) {
      const maxOcc = Math.max(...points.map(p => p.occupancy));
      return maxOcc > 0 ? maxOcc : 0;
    }
    return 0;
  });

  peakTimeRange = computed(() => {
    // 1. Check if backend occupancy API returned a peakHour
    const backendPeak = this.backendOccupancy()?.peakHour;
    if (backendPeak !== undefined && backendPeak !== null && String(backendPeak).trim() !== '') {
      const h = Number(backendPeak);
      if (!isNaN(h)) {
        const period = h >= 12 ? (this.isArabic() ? 'م' : 'PM') : (this.isArabic() ? 'ص' : 'AM');
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:00 ${period}`;
      }
      return String(backendPeak);
    }

    // 2. Find slot with maximum count from real calculated points
    const points = this.currentChartPoints();
    let maxPt: ActivityFlowPoint | null = null;
    for (const pt of points) {
      if (pt.count > 0 && (!maxPt || pt.count > maxPt.count)) {
        maxPt = pt;
      }
    }

    if (!maxPt || maxPt.count === 0) {
      return this.isArabic() ? 'مفيش زحمة لسه' : 'No peak yet';
    }

    if (this.isArabic()) {
      return `${maxPt.labelAr} (${maxPt.count} أفراد)`;
    } else {
      return `${maxPt.label} (${maxPt.count} people)`;
    }
  });

  avgSessionDuration = computed(() => {
    // Average session duration from Workspace students and Classroom sessions ONLY
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
      return this.isArabic() ? '--' : '--';
    }

    const avg = Math.round(totalMinutes / totalCount);
    const raw = formatMinutesToDuration(avg);
    return this.isArabic() ? this.langService.formatDurationLocale(raw) : raw;
  });

  totalFootfallCount = computed(() => {
    // 1. If backend summary provided, use activeStudentsCount + activeClassroomsCount
    const backend = this.backendSummary();
    if (backend && backend.activeStudentsCount !== undefined) {
      return backend.activeStudentsCount + (backend.activeClassroomsCount || 0);
    }

    // 2. Real Workspace Students ONLY (students checked in / present today)
    const workspaceStudents = Math.max(
      this.workspaceService.todayCheckins(),
      this.workspaceService.insideCount()
    );

    // 3. Real Classroom Students ONLY (students in active/scheduled classroom sessions)
    const classroomCards = this.classroomService.cards()
      .filter(c => c.status === 'active' || c.status === 'scheduled');

    const classroomStudents = classroomCards.reduce((sum, c) => {
      const count = (c as any).studentsCount || (c as any).attendees;
      return sum + (typeof count === 'number' && count > 0 ? count : 1);
    }, 0);

    return workspaceStudents + classroomStudents;
  });

  // Chart Timeframe Switcher
  chartTimeframe = signal<'today' | 'week'>('today');
  hoveredPoint = signal<ActivityFlowPoint | null>(null);

  // Hourly & Weekly Activity Data Points - Computed dynamically from live state
  currentChartPoints = computed<ActivityFlowPoint[]>(() => {
    const isAr = this.isArabic();
    const timeframe = this.chartTimeframe();
    const capacity = this.totalCapacity();

    const activeStudents = this.workspaceService.activeStudents();
    const historyStudents = this.workspaceService.historyStudents();
    const allSessions = [...activeStudents, ...historyStudents];
    const classroomCards = this.classroomService.cards().filter(c => c.status === 'active' || c.status === 'scheduled');

    const todayISO = new Date().toISOString().slice(0, 10);
    const todayLocale = new Date().toLocaleDateString('en-US');
    const isToday = (d?: string) => !d || d.includes(todayISO) || d === todayLocale;

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
        // Count real students active or checked in during this 2-hour window
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

        // Count real classroom attendees active during this slot
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
            const dateObj = new Date(s.date);
            if (!isNaN(dateObj.getTime()) && dateObj.getDay() === d.dayIndex) {
              count++;
            }
          }
        }
        for (const c of classroomCards) {
          if (c.bookingDate) {
            const dateObj = new Date(c.bookingDate);
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

  // Calculate smooth SVG curve Path string
  curvePath = computed(() => {
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

  // Calculate smooth SVG Area Fill Path string
  areaPath = computed(() => {
    const points = this.currentChartPoints();
    if (points.length === 0) return '';
    const lineD = this.curvePath();
    const lastP = points[points.length - 1];
    const firstP = points[0];
    return `${lineD} L ${lastP.x} 160 L ${firstP.x} 160 Z`;
  });

  // Active Sessions
  activeStudents = this.workspaceService.activeStudents;
  activeCount = computed(() => {
    return this.activeStudents().length;
  });

  // Top Catering Products from Catering Service
  topProducts = this.cateringService.topProducts;

  // Live Room Bookings for Today (from ClassroomService)
  upcomingReservations = computed<UpcomingRoomBooking[]>(() => {
    const isAr = this.isArabic();
    const cards = this.classroomService.cards();
    const active = cards.filter(c => c.status === 'active' || c.status === 'scheduled');
    if (active.length > 0) {
      return active.slice(0, 3).map((c, idx) => ({
        id: c.id,
        roomName: c.name,
        roomNameAr: c.name,
        title: c.activity || this.t().workshopSession,
        titleAr: c.activity || this.t().workshopSession,
        instructor: c.instructor || this.t().instructor,
        instructorAr: this.langService.formatNameLocale(c.instructor || ''),
        timeSlot: `${this.langService.formatTimeLocale(c.startTime || '10:00 AM')} - ${this.langService.formatTimeLocale(c.endTime || '01:00 PM')}`,
        attendees: (c as any).studentsCount || (c as any).capacity || (c as any).attendees || 0,
        status: c.status === 'active' ? 'in_progress' : 'upcoming'
      }));
    }
    return [];
  });

  // Today's Live Active Students Preview (Full Localization)
  activeStudentsPreview = computed<ActiveStudentPreviewItem[]>(() => {
    const real = this.activeStudents();
    if (real.length > 0) {
      return real.map(st => {
        return {
          id: st.id,
          name: this.langService.formatNameLocale(st.name),
          spaceOrFaculty: st.faculty || st.college || this.t().sharedSpace,
          checkInTime: this.langService.formatTimeLocale(st.checkInTime || '01:30 PM'),
          duration: this.langService.formatDurationLocale(st.duration || '1h 00m')
        };
      });
    }
    return [];
  });

  navigateToAddStudent(): void {
    this.router.navigate(['/workspace/add-student']);
  }
}
