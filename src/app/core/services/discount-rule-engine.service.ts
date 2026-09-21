import { Injectable, signal } from '@angular/core';
import { DiscountRule, StudentMilestoneProgress } from '../models/discount-rule.model';

@Injectable({
  providedIn: 'root'
})
export class DiscountRuleEngineService {
  private redeemedMilestonesMem = new Map<string, number[]>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('nook_student_discount_redemptions_') || key.startsWith('nook_discount_redemptions_')) {
            localStorage.removeItem(key);
          }
        });
      } catch {}
    }
  }

  // Dynamic In-Memory Rule Builder State (Item 16)
  readonly rules = signal<DiscountRule[]>([
    {
      id: 'rule-visits-20',
      nameAr: 'مكافأة 20 زيارة (خصم 15%)',
      nameEn: '20 Visits Milestone (15% Off)',
      ruleType: 'VisitCountBased',
      thresholdValue: 20,
      discountPercentage: 15,
      maxDiscountAmount: 100,
      isRecurringMilestone: true,
      applicableTo: 'All',
      isActive: true
    },
    {
      id: 'rule-hours-100',
      nameAr: 'مكافأة 100 ساعة دراسة (خصم 10%)',
      nameEn: '100 Study Hours Milestone (10% Off)',
      ruleType: 'HoursBased',
      thresholdValue: 100,
      discountPercentage: 10,
      maxDiscountAmount: 150,
      isRecurringMilestone: true,
      applicableTo: 'All',
      isActive: true
    },
    {
      id: 'rule-hours-200',
      nameAr: 'مكافأة 200 ساعة دراسة (خصم 20%)',
      nameEn: '200 Study Hours Milestone (20% Off)',
      ruleType: 'HoursBased',
      thresholdValue: 200,
      discountPercentage: 20,
      maxDiscountAmount: 200,
      isRecurringMilestone: true,
      applicableTo: 'All',
      isActive: true
    }
  ]);

  get defaultRules(): DiscountRule[] {
    return this.rules();
  }

  addRule(rule: Omit<DiscountRule, 'id'>): DiscountRule {
    const newId = `rule-${rule.ruleType.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const created: DiscountRule = { ...rule, id: newId };
    this.rules.update(list => [created, ...list]);
    return created;
  }

  updateRule(id: string, updates: Partial<DiscountRule>): void {
    this.rules.update(list => list.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  deleteRule(id: string): void {
    this.rules.update(list => list.filter(r => r.id !== id));
  }

  toggleRule(id: string): void {
    this.rules.update(list => list.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  }

  /** Evaluates student automatic discount based on active rules */
  evaluateAutomaticDiscount(totalVisits: number, totalHours: number): { rule: DiscountRule; discountPercentage: number } | null {
    const active = this.rules().filter(r => r.isActive);
    let bestMatch: DiscountRule | null = null;
    let maxPct = 0;

    for (const r of active) {
      let qualified = false;
      if (r.ruleType === 'VisitCountBased' && totalVisits >= r.thresholdValue) {
        qualified = true;
      } else if (r.ruleType === 'HoursBased' && totalHours >= r.thresholdValue) {
        qualified = true;
      }

      if (qualified && r.discountPercentage > maxPct) {
        maxPct = r.discountPercentage;
        bestMatch = r;
      }
    }

    return bestMatch ? { rule: bestMatch, discountPercentage: maxPct } : null;
  }

  /**
   * Loads list of milestone thresholds that student has already redeemed.
   */
  getRedeemedMilestones(studentId: string): number[] {
    if (!studentId) return [];
    return this.redeemedMilestonesMem.get(studentId) || [];
  }

  /**
   * Evaluates student's current hours against milestones and determines if a discount is available.
   * Enforces single-use protection: once redeemed, student must reach the NEXT milestone.
   */
  evaluateStudentProgress(studentId: string, totalHours: number): StudentMilestoneProgress {
    const redeemed = this.getRedeemedMilestones(studentId);

    // Calculate current milestone bracket (100, 200, 300, ...)
    const milestones = [100, 200, 300, 400, 500];
    let currentAchievedMilestone = 0;
    let nextMilestone = 100;

    for (const m of milestones) {
      if (totalHours >= m) {
        currentAchievedMilestone = m;
      } else {
        nextMilestone = m;
        break;
      }
    }

    if (currentAchievedMilestone === 0) {
      nextMilestone = 100;
    } else if (currentAchievedMilestone >= 500) {
      nextMilestone = currentAchievedMilestone + 100;
    }

    // Has student redeemed this current milestone already?
    const hasRedeemedCurrent = currentAchievedMilestone > 0 && redeemed.includes(currentAchievedMilestone);

    // If achieved a milestone and not yet redeemed, they are eligible!
    const isEligible = currentAchievedMilestone > 0 && !hasRedeemedCurrent;

    let matchedRule: DiscountRule | undefined = undefined;
    if (isEligible) {
      matchedRule = this.defaultRules.find(r => r.thresholdValue === currentAchievedMilestone) || {
        id: `rule-hours-${currentAchievedMilestone}`,
        nameAr: `مكافأة ${currentAchievedMilestone} ساعة دراسة (خصم 25%)`,
        nameEn: `${currentAchievedMilestone} Study Hours Milestone (25% Off)`,
        ruleType: 'HoursBased',
        thresholdValue: currentAchievedMilestone,
        discountPercentage: 25,
        maxDiscountAmount: 200,
        isRecurringMilestone: true,
        applicableTo: 'All',
        isActive: true
      };
    }

    return {
      studentId,
      qualifyingHours: totalHours,
      currentMilestone: currentAchievedMilestone,
      nextMilestone,
      isEligibleForMilestoneDiscount: isEligible,
      activeEligibleRule: matchedRule,
      redeemedMilestones: redeemed
    };
  }

  /**
   * Marks a milestone discount as redeemed by the student.
   * Prevents reuse until the student reaches the next threshold.
   */
  redeemMilestoneDiscount(studentId: string, milestone: number, sessionId?: string): boolean {
    if (!studentId || milestone <= 0) return false;

    const redeemed = [...this.getRedeemedMilestones(studentId)];
    if (!redeemed.includes(milestone)) {
      redeemed.push(milestone);
      this.redeemedMilestonesMem.set(studentId, redeemed);
      return true;
    }
    return false;
  }
}
