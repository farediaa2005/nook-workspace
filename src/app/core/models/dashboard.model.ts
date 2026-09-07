/**
 * Dashboard and Analytics domain models matching OpenAPI specifications.
 * Maps to backend /api/Dashboard/summary and /api/Analysis/* endpoints.
 */

import { WorkspaceDto } from './workspace-session.model';
import { ClassroomDto } from './classroom-session.model';

/** Dashboard summary from GET /api/Dashboard/summary */
export interface DashboardSummaryDto {
  todayWorkspaceSessions: number;
  activeWorkspaceSessions: number;
  todayClassroomSessions: number;
  activeClassroomSessions: number;
  todayRevenue: number;
  totalStudents: number;
  activeShifts: number;
  pendingBookings: number;
  recentWorkspaceSessions?: WorkspaceDto[];
  recentClassroomSessions?: ClassroomDto[];
  // Compatibility fallback getters / aliases
  activeWorkspacesCount?: number;
  activeClassroomsCount?: number;
  availableRoomsCount?: number;
  availableDesksCount?: number;
  occupancyRatePercentage?: number;
  activeStudentsCount?: number;
  todayTotalRevenue?: number;
  pendingTopUpRequestsCount?: number;
  pendingBookingsCount?: number;
  openShiftsCount?: number;
}

/** Daily revenue breakdown item within RevenueAnalysisDto */
export interface DailyRevenueDto {
  date?: string;
  revenue: number;
  workspaceRevenue: number;
  classroomRevenue: number;
  packagesRevenue: number;
  productsRevenue: number;
  sessionsCount?: number;
}

/** Revenue analysis DTO from GET /api/Analysis/revenue */
export interface RevenueAnalysisDto {
  totalRevenue: number;
  workspaceRevenue: number;
  classroomRevenue: number;
  packagesRevenue: number;
  productsRevenue: number;
  dailyBreakdown?: DailyRevenueDto[];
  // Compatibility aliases
  cateringRevenue?: number;
  dateFrom?: string;
  dateTo?: string;
}

/** Occupancy analysis DTO from GET /api/Analysis/occupancy */
export interface OccupancyAnalysisDto {
  totalWorkspaceSessions: number;
  totalClassroomSessions: number;
  averageSessionHours: number;
  peakHour: number | string;
  // Compatibility aliases
  averageOccupancyPercentage?: number;
  totalHoursBooked?: number;
  roomOccupancy?: Array<{
    roomId: string;
    roomName: string;
    occupancyPercentage: number;
    hoursBooked: number;
  }>;
}

/** Top student DTO from GET /api/Analysis/top-students */
export interface TopStudentDto {
  studentId: string;
  name?: string;
  totalSessions: number;
  totalHours: number;
  totalSpend: number;
  // Compatibility aliases
  studentName?: string;
  studentPhone?: string;
  totalVisits?: number;
  totalSpent?: number;
}

// ==========================================
// Frontend UI Models (Presentation Layer Models)
// ==========================================

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

export interface SpaceDistributionMetrics {
  privatePct: number;
  sharedPct: number;
  meetingPct: number;
  privateDash: string;
  sharedDash: string;
  meetingDash: string;
  privateOffset: number;
  sharedOffset: number;
  meetingOffset: number;
}

export interface DashboardMetrics {
  totalBookings: string;
  availableDesks: string;
  activeMembers: string;
  occupancyRate: string;
  peakOccupancyRate: number;
  peakTimeRange: string;
  avgSessionDuration: string;
  totalFootfall: number;
}

