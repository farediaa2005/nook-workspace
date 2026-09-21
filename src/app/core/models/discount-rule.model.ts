export type DiscountRuleType =
  | 'HoursBased'
  | 'VisitCountBased'
  | 'CollegeBased'
  | 'PackageBased'
  | 'FrequencyBased'
  | 'SpendingBased';

export interface DiscountRule {
  id: string;
  nameAr: string;
  nameEn: string;
  ruleType: DiscountRuleType;
  thresholdValue: number; // e.g. 100 for 100 hours
  discountPercentage: number;
  maxDiscountAmount?: number;
  isRecurringMilestone: boolean; // triggers again at 200, 300, etc.
  applicableTo: 'Workspace' | 'Classroom' | 'All';
  targetCollege?: string;
  isActive: boolean;
}

export interface StudentMilestoneProgress {
  studentId: string;
  qualifyingHours: number;
  currentMilestone: number; // e.g. 100
  nextMilestone: number;    // e.g. 200
  isEligibleForMilestoneDiscount: boolean;
  activeEligibleRule?: DiscountRule;
  redeemedMilestones: number[]; // e.g. [100]
}
