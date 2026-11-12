import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import {
  DISCOUNT_RULE_APPLICABILITY_CODES,
  DISCOUNT_RULE_TYPE_CODES,
  DiscountRule,
  DiscountRuleDto,
  DiscountRuleType,
  SaveDiscountRuleDto
} from '../models/discount-rule.model';
import { DiscountApiService } from './api/discount-api.service';

/**
 * Automatic (milestone) discount rules, stored on the backend at /api/Discounts/rules.
 * Eligibility per student comes from GET /api/Students/{id}/discount-eligibility
 * (see StudentAnalyticsService) — the backend is the only place that evaluates rules.
 */
@Injectable({
  providedIn: 'root'
})
export class DiscountRuleEngineService {
  private api = inject(DiscountApiService);

  readonly rules = signal<DiscountRule[]>([]);
  readonly isLoading = signal(false);

  constructor() {
    // Remove leftovers of the old browser-only redemption tracking.
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

  /** Loads the rules from the server. */
  loadRules(): Observable<DiscountRule[]> {
    this.isLoading.set(true);
    return this.api.getDiscountRules().pipe(
      map(list => list.map(dto => this.fromDto(dto))),
      tap({
        next: rules => {
          this.rules.set(rules);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  addRule(rule: Omit<DiscountRule, 'id'>): Observable<DiscountRule> {
    return this.api.createDiscountRule(this.toDto(rule)).pipe(
      map(dto => this.fromDto(dto)),
      tap(created => this.rules.update(list => [created, ...list]))
    );
  }

  deleteRule(id: string): Observable<boolean> {
    return this.api.deleteDiscountRule(id).pipe(
      tap(() => this.rules.update(list => list.filter(r => r.id !== id)))
    );
  }

  toggleRule(id: string): Observable<DiscountRule> {
    const rule = this.rules().find(r => r.id === id);
    if (!rule) throw new Error(`Unknown discount rule ${id}`);
    return this.api.updateDiscountRule(id, this.toDto({ ...rule, isActive: !rule.isActive })).pipe(
      map(dto => this.fromDto(dto)),
      tap(updated => this.rules.update(list => list.map(r => (r.id === id ? updated : r))))
    );
  }

  private toDto(rule: Omit<DiscountRule, 'id'>): SaveDiscountRuleDto {
    return {
      // The backend stores one name; keep the Arabic one (the UI language) when both exist.
      name: rule.nameAr || rule.nameEn,
      ruleType: DISCOUNT_RULE_TYPE_CODES[rule.ruleType] ?? DISCOUNT_RULE_TYPE_CODES['HoursBased'],
      thresholdValue: rule.thresholdValue,
      discountPercentage: rule.discountPercentage,
      maxDiscountAmount: rule.maxDiscountAmount ?? null,
      isRecurringMilestone: rule.isRecurringMilestone,
      applicableTo: DISCOUNT_RULE_APPLICABILITY_CODES[rule.applicableTo] ?? DISCOUNT_RULE_APPLICABILITY_CODES.All,
      facultyId: null,
      isActive: rule.isActive
    };
  }

  private fromDto(dto: DiscountRuleDto): DiscountRule {
    const typeName = (Object.keys(DISCOUNT_RULE_TYPE_CODES).find(k => DISCOUNT_RULE_TYPE_CODES[k] === dto.ruleType) || 'HoursBased') as DiscountRuleType;
    const applicable = (Object.keys(DISCOUNT_RULE_APPLICABILITY_CODES) as DiscountRule['applicableTo'][])
      .find(k => DISCOUNT_RULE_APPLICABILITY_CODES[k] === dto.applicableTo) || 'All';
    return {
      id: dto.id,
      nameAr: dto.name,
      nameEn: dto.name,
      ruleType: typeName,
      thresholdValue: Number(dto.thresholdValue) || 0,
      discountPercentage: Number(dto.discountPercentage) || 0,
      maxDiscountAmount: dto.maxDiscountAmount ?? undefined,
      isRecurringMilestone: !!dto.isRecurringMilestone,
      applicableTo: applicable,
      targetCollege: dto.facultyName ?? undefined,
      isActive: !!dto.isActive
    };
  }
}
