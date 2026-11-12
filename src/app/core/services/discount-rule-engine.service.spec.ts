import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { DiscountRuleEngineService } from './discount-rule-engine.service';
import { DiscountApiService } from './api/discount-api.service';
import { DiscountRuleDto } from '../models/discount-rule.model';

describe('DiscountRuleEngineService (backend rules)', () => {
  const saved: DiscountRuleDto = {
    id: 'r1', name: 'خصم بعد 20 زيارة (15%)', ruleType: 2, thresholdValue: 20, discountPercentage: 15,
    maxDiscountAmount: 100, isRecurringMilestone: true, applicableTo: 3, facultyId: null, facultyName: null, isActive: true
  };
  const api = {
    getDiscountRules: vi.fn(() => of([saved])),
    createDiscountRule: vi.fn(() => of(saved)),
    updateDiscountRule: vi.fn(() => of({ ...saved, isActive: false })),
    deleteDiscountRule: vi.fn(() => of(true))
  };

  let service: DiscountRuleEngineService;
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: DiscountApiService, useValue: api }] });
    service = TestBed.inject(DiscountRuleEngineService);
  });

  it('loads rules from the server and maps the numeric enums', () => {
    service.loadRules().subscribe();
    expect(service.rules()).toEqual([expect.objectContaining({ id: 'r1', ruleType: 'VisitCountBased', applicableTo: 'All', isActive: true })]);
  });

  it('sends the backend enum numbers when creating a rule', () => {
    service.addRule({
      nameAr: 'خصم بعد 20 زيارة (15%)', nameEn: 'Milestone: 20 Visits (15%)', ruleType: 'VisitCountBased',
      thresholdValue: 20, discountPercentage: 15, maxDiscountAmount: 100, isRecurringMilestone: true, applicableTo: 'All', isActive: true
    }).subscribe();
    expect(api.createDiscountRule).toHaveBeenCalledWith(expect.objectContaining({ ruleType: 2, applicableTo: 3, name: 'خصم بعد 20 زيارة (15%)' }));
    expect(service.rules().length).toBe(1);
  });

  it('toggles through PUT and deletes through DELETE', () => {
    service.loadRules().subscribe();
    service.toggleRule('r1').subscribe();
    expect(api.updateDiscountRule).toHaveBeenCalledWith('r1', expect.objectContaining({ isActive: false }));
    expect(service.rules()[0].isActive).toBe(false);
    service.deleteRule('r1').subscribe();
    expect(api.deleteDiscountRule).toHaveBeenCalledWith('r1');
    expect(service.rules()).toEqual([]);
  });
});
