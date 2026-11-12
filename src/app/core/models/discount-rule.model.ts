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

// ---- Backend contract (/api/Discounts/rules, /api/Students/{id}/discount-eligibility) ----

/** Backend enum DiscountRuleType (sent as numbers). */
export const DISCOUNT_RULE_TYPE_CODES: Record<string, number> = {
  HoursBased: 1,
  VisitCountBased: 2,
  CollegeBased: 3,
  SpendingBased: 4
};

/** Backend enum DiscountRuleApplicability (sent as numbers). */
export const DISCOUNT_RULE_APPLICABILITY_CODES: Record<DiscountRule['applicableTo'], number> = {
  Workspace: 1,
  Classroom: 2,
  All: 3
};

export interface DiscountRuleDto {
  id: string;
  name: string;
  ruleType: number;
  thresholdValue: number;
  discountPercentage: number;
  maxDiscountAmount?: number | null;
  isRecurringMilestone: boolean;
  applicableTo: number;
  facultyId?: string | null;
  facultyName?: string | null;
  isActive: boolean;
}

export type SaveDiscountRuleDto = Omit<DiscountRuleDto, 'id' | 'facultyName'>;

interface AvailableDiscountDto {
  id: string;
  name: string;
  discountPercentage: number;
  isRedeemed: boolean;
  redeemedAt?: string | null;
}

export interface StudentDiscountEligibilityDto {
  studentId: string;
  qualifyingHours: number;
  nextMilestoneHours?: number | null;
  hoursToNextDiscount?: number | null;
  availableDiscounts: AvailableDiscountDto[];
}
