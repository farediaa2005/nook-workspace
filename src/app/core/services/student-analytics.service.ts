import { Injectable, inject } from '@angular/core';
import { StudentDiscountEligibilityDto } from '../models/discount-rule.model';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { StudentAnalytics, SpaceUsageStats } from '../models/student-analytics.model';
import { StudentApiService } from './api/student-api.service';
import { WalletApiService } from './api/wallet-api.service';
import { WorkspacePackageApiService } from './api/workspace-package-api.service';
import { ClassroomService } from './classroom.service';
import { WorkspaceService } from './workspace.service';
import { parseDurationMinutes, getTodayDateISO } from '../utils/date-time.util';
import { isSilentZone } from '../constants/backend-enums';

@Injectable({
  providedIn: 'root'
})
export class StudentAnalyticsService {
  private studentApi = inject(StudentApiService);
  private walletApi = inject(WalletApiService);
  private workspacePackageApi = inject(WorkspacePackageApiService);
  private classroomService = inject(ClassroomService);
  private workspaceService = inject(WorkspaceService);

  getStudentAnalytics(studentId: string, studentName?: string): Observable<StudentAnalytics> {
    const studentReq$ = this.studentApi.getStudentById(studentId).pipe(
      catchError(() => of(null))
    );
    const walletReq$ = this.walletApi.getBalance(studentId).pipe(
      catchError(() => of({ balance: 0 } as any))
    );
    const packagesReq$ = this.workspacePackageApi.getPackagesByStudent(studentId).pipe(
      catchError(() => of([]))
    );
    // Milestone progress and automatic discounts are evaluated by the backend.
    const eligibilityReq$ = this.studentApi.getDiscountEligibility(studentId).pipe(
      catchError(() => of(null as StudentDiscountEligibilityDto | null))
    );

    // The backend computes visits, hours, space usage, bookings and package summary
    // from all sessions; the local calculation below is only a fallback.
    const backendAnalyticsReq$ = this.studentApi.getStudentAnalytics(studentId).pipe(
      catchError(() => of(null))
    );

    return forkJoin({
      student: studentReq$,
      wallet: walletReq$,
      packages: packagesReq$,
      eligibility: eligibilityReq$,
      backend: backendAnalyticsReq$
    }).pipe(
      map(({ student, wallet, packages, eligibility, backend }) => {
        const studentObj = student as any;
        const name = studentObj?.name || studentName || 'Student';
        const college = studentObj?.faculty || studentObj?.college || '';
        const phone = studentObj?.phone || '';
        const isBlacklisted = !!studentObj?.isBlacklisted;
        const walletBalance = typeof wallet?.balance === 'number' ? wallet.balance : (studentObj?.balance || 0);

        // 1. Gather all real workspace & silent sessions for this student
        const allWorkspaceSessions = [
          ...(this.workspaceService.activeStudents() || []),
          ...(this.workspaceService.historyStudents() || [])
        ];
        const studentSessions = allWorkspaceSessions.filter(
          (s: any) => (s.id && s.id === studentId) || (s.studentId && s.studentId === studentId) || (phone && s.phone === phone) || (name && s.name === name)
        );

        // Date markers for current month & last month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let currentMonthVisits = 0;
        let lastMonthVisits = 0;
        let currentMonthMinutes = 0;
        let lastMonthMinutes = 0;
        let totalMinutes = 0;

        let workspaceVisits = 0;
        let workspaceMinutes = 0;
        let silentVisits = 0;
        let silentMinutes = 0;
        let classroomVisits = 0;
        let classroomMinutes = 0;

        // Process real workspace/silent sessions
        studentSessions.forEach((s: any) => {
          const sessDateStr = s.date || s.checkInTime || getTodayDateISO();
          const sessDate = new Date(sessDateStr);
          const isCurrentMonth = !isNaN(sessDate.getTime()) && sessDate.getFullYear() === currentYear && sessDate.getMonth() === currentMonth;
          const isLastMonth = !isNaN(sessDate.getTime()) && sessDate.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear) && sessDate.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1);

          const durMins = parseDurationMinutes(s.duration) || 60;
          totalMinutes += durMins;

          if (isCurrentMonth) {
            currentMonthVisits += 1;
            currentMonthMinutes += durMins;
          } else if (isLastMonth) {
            lastMonthVisits += 1;
            lastMonthMinutes += durMins;
          }

          // Check room/zone for Silent vs Workspace
          const isSilent = isSilentZone(s.zone) || (s.roomName && s.roomName.toLowerCase().includes('silent'));
          if (isSilent) {
            silentVisits += 1;
            silentMinutes += durMins;
          } else {
            workspaceVisits += 1;
            workspaceMinutes += durMins;
          }
        });

        // 2. Process real classroom reservations for this student
        const classroomReservations = [
          ...(this.classroomService.reservations() || []),
          ...(this.classroomService.cards() || [])
        ];
        const studentReservations = classroomReservations.filter((r: any) => {
          const rName = r.instructor || r.instructorName || '';
          const rPhone = r.phone || r.phoneNumber || r.instructorPhone || '';
          return (phone && rPhone === phone) || (name && rName.toLowerCase().includes(name.toLowerCase()));
        });

        const roomFrequencyMap = new Map<string, number>();
        let completedBookings = 0;
        let cancelledBookings = 0;

        studentReservations.forEach((r: any) => {
          classroomVisits += 1;
          const durHours = r.durationHours || 2;
          const durMins = Math.round(durHours * 60);
          classroomMinutes += durMins;
          totalMinutes += durMins;

          const roomName = r.classroom || r.roomName || 'Classroom';
          roomFrequencyMap.set(roomName, (roomFrequencyMap.get(roomName) || 0) + 1);

          if (r.status === 'completed' || r.status === '2') {
            completedBookings += 1;
          } else if (r.status === 'cancelled' || r.status === '4') {
            cancelledBookings += 1;
          } else {
            completedBookings += 1;
          }
        });

        // Determine most frequent classroom
        let frequentRoomName = '';
        let maxFreq = 0;
        roomFrequencyMap.forEach((freq, rName) => {
          if (freq > maxFreq) {
            maxFreq = freq;
            frequentRoomName = rName;
          }
        });

        // 3. Process active packages
        const activePackages = Array.isArray(packages) ? packages : [];
        const packageTotalHours = activePackages.reduce((sum: number, p: any) => sum + (p.totalHours || 0), 0);
        const packageUsedHours = activePackages.reduce((sum: number, p: any) => sum + (p.usedHours || 0), 0);

        const totalVisits = studentSessions.length + studentReservations.length;
        const totalHours = +(totalMinutes / 60 + packageUsedHours).toFixed(1);
        const currentMonthHours = +(currentMonthMinutes / 60).toFixed(1);
        const lastMonthHours = +(lastMonthMinutes / 60).toFixed(1);

        const spaceUsage: SpaceUsageStats[] = [
          {
            spaceType: 'Workspace',
            visits: workspaceVisits,
            hours: +(workspaceMinutes / 60).toFixed(1),
            lastVisit: studentSessions[0]?.date || studentSessions[0]?.checkInTime || new Date().toISOString()
          },
          {
            spaceType: 'Classroom',
            visits: classroomVisits,
            hours: +(classroomMinutes / 60).toFixed(1),
            lastVisit: (studentReservations[0] as any)?.date || (studentReservations[0] as any)?.bookingDate || (studentReservations[0] as any)?.fullDate || new Date().toISOString()
          },
          {
            spaceType: 'SilentRoom',
            visits: silentVisits,
            hours: +(silentMinutes / 60).toFixed(1),
            lastVisit: studentSessions[0]?.date || studentSessions[0]?.checkInTime || new Date().toISOString()
          }
        ];

        // 4. Discount eligibility from the backend (null when the request failed)
        const nextMilestone = eligibility?.nextMilestoneHours ?? 0;
        const hoursToNext = Math.max(0, +(eligibility?.hoursToNextDiscount ?? 0).toFixed(1));

        const activePkg = activePackages.find((p: any) => p.status === 1 || p.remainingHours > 0) || activePackages[0];

        const analytics: StudentAnalytics = {
          studentId,
          studentName: name,
          college,
          phone,
          isBlacklisted,
          walletBalance,
          visits: {
            totalVisits,
            lastMonthVisits,
            currentMonthVisits
          },
          hours: {
            totalHours,
            lastMonthHours,
            currentMonthHours
          },
          spaceUsage,
          bookingHistory: {
            totalBookings: studentReservations.length,
            completedBookings,
            cancelledBookings,
            frequentRoomName: frequentRoomName || ''
          },
          packageSummary: {
            hasActivePackage: !!activePkg,
            packageName: (activePkg as any)?.name || (activePkg as any)?.packageName || (packageTotalHours > 0 ? 'باقة ساعات' : undefined),
            remainingHours: activePkg?.remainingHours || (packageTotalHours - packageUsedHours),
            totalHours: activePkg?.totalHours || packageTotalHours,
            expiresAt: activePkg?.expireDate || (activePkg as any)?.expiresAt
          },
          discountsHistory: (eligibility?.availableDiscounts || [])
            .filter(d => d.isRedeemed)
            .map(d => ({
              id: d.id,
              ruleName: d.name,
              discountPercentage: d.discountPercentage,
              redeemedAt: d.redeemedAt || '',
              sessionType: 'Workspace'
            })),
          qualifyingHoursForDiscount: eligibility?.qualifyingHours ?? totalHours,
          nextDiscountMilestone: nextMilestone,
          hoursToNextDiscount: hoursToNext
        };

        if (!backend) return analytics;
        return {
          ...analytics,
          visits: backend.visits ?? analytics.visits,
          hours: backend.hours ?? analytics.hours,
          spaceUsage: Array.isArray(backend.spaceUsage) && backend.spaceUsage.length ? backend.spaceUsage : analytics.spaceUsage,
          bookingHistory: backend.bookingHistorySummary ?? analytics.bookingHistory,
          packageSummary: backend.packageSummary ?? analytics.packageSummary,
          walletBalance: typeof backend.walletBalance === 'number' ? backend.walletBalance : analytics.walletBalance,
          isBlacklisted: backend.isBlacklisted ?? analytics.isBlacklisted
        } as StudentAnalytics;
      })
    );
  }
}
