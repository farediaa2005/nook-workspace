import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  UpcomingRoomBooking,
  ActiveStudentPreviewItem,
  ActivityFlowPoint,
  SpaceDistributionMetrics,
  DashboardMetrics
} from '../../core/models/dashboard.model';

export type {
  UpcomingRoomBooking,
  ActiveStudentPreviewItem,
  ActivityFlowPoint,
  SpaceDistributionMetrics,
  DashboardMetrics
};

/**
 * Dashboard Component (Layer 5 - Presentation).
 * Lean presentation component driven by signals from DashboardService (Layer 4).
 * Strictly communicates with backend API and contains NO local database or mock data.
 */
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
  private authService = inject(AuthService);
  dashboardService = inject(DashboardService);

  // Localization
  t = this.langService.t;
  isArabic = this.langService.isArabic;

  // User Profile
  currentUser = this.authService.user;
  userName = computed(() => this.currentUser()?.name || '');

  // Loading & State Signals (Bound to Feature Service)
  isLoading = this.dashboardService.isLoading;
  error = this.dashboardService.error;
  chartTimeframe = this.dashboardService.chartTimeframe;
  hoveredPoint = this.dashboardService.hoveredPoint;

  // Live Metric Signals (Driven by API via DashboardService)
  totalBookingsCount = this.dashboardService.totalBookingsCount;
  availableDesksCount = this.dashboardService.availableDesksCount;
  activeMembersCount = this.dashboardService.activeMembersCount;
  occupancyRateValue = this.dashboardService.occupancyRateValue;

  // Dynamic Chart & Space Distribution
  spaceDistribution = this.dashboardService.spaceDistribution;
  peakOccupancyRate = this.dashboardService.peakOccupancyRate;
  peakTimeRange = this.dashboardService.peakTimeRange;
  avgSessionDuration = this.dashboardService.avgSessionDuration;
  totalFootfallCount = this.dashboardService.totalFootfallCount;
  currentChartPoints = this.dashboardService.currentChartPoints;
  curvePath = this.dashboardService.curvePath;
  areaPath = this.dashboardService.areaPath;

  // Operational Boards (Real-time mapped from live sessions)
  upcomingReservations = this.dashboardService.upcomingReservations;
  activeStudentsPreview = this.dashboardService.activeStudentsPreview;

  ngOnInit(): void {
    // Initiate live server data fetch through Clean Architecture Layer 4
    this.dashboardService.loadDashboardData();
  }

  setTimeframe(timeframe: 'today' | 'week'): void {
    this.dashboardService.setTimeframe(timeframe);
  }

  setHoveredPoint(pt: ActivityFlowPoint | null): void {
    this.dashboardService.setHoveredPoint(pt);
  }

  navigateToAddStudent(): void {
    this.router.navigate(['/workspace/add-student']);
  }
}
