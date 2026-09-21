export interface SpaceUsageStats {
  spaceType: 'Workspace' | 'Classroom' | 'SharedRoom' | 'SilentRoom';
  visits: number;
  hours: number;
  lastVisit?: string;
}

export interface BookingHistorySummary {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  frequentRoomName?: string;
  lastBookingDate?: string;
}

export interface StudentPackageSummary {
  hasActivePackage: boolean;
  packageName?: string;
  remainingHours: number;
  totalHours: number;
  expiresAt?: string;
}

export interface StudentDiscountUsage {
  id: string;
  ruleName: string;
  discountPercentage: number;
  redeemedAt: string;
  sessionId?: string;
  sessionType?: string;
}

export interface StudentAnalytics {
  studentId: string;
  studentName: string;
  college?: string;
  phone?: string;
  isBlacklisted: boolean;
  walletBalance: number;
  visits: {
    totalVisits: number;
    lastMonthVisits: number;
    currentMonthVisits: number;
  };
  hours: {
    totalHours: number;
    lastMonthHours: number;
    currentMonthHours: number;
  };
  spaceUsage: SpaceUsageStats[];
  bookingHistory: BookingHistorySummary;
  packageSummary: StudentPackageSummary;
  discountsHistory: StudentDiscountUsage[];
  qualifyingHoursForDiscount: number;
  nextDiscountMilestone: number;
  hoursToNextDiscount: number;
}
