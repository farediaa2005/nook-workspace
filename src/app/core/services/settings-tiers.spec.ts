import { isStudentTierPlan, mapPlansToStudentTiers } from './settings.service';
import { PricingPlanDto } from '../models/pricing-plan.model';

// Shape of the real GET /api/PricingPlans response (2026-11-10): student hour tiers
// mixed with per-room hourly rates.
const plans: PricingPlanDto[] = [
  { id: 't9', roomId: 'r-ind', roomName: 'Individual', scope: 0, baseHours: 9, baseCost: 50, overageHourlyRate: 15, isActive: true, note: '6 - 9 ساعة' },
  { id: 'meet', roomId: 'r-meet', roomName: 'Meeting room', scope: 2, baseHours: 1, baseCost: 80, overageHourlyRate: 80, isActive: true, note: 'Meeting room' },
  { id: 'nook2', roomId: 'r-n2', roomName: 'Nook 2', scope: 2, baseHours: 1, baseCost: 80, overageHourlyRate: 80, isActive: true, note: 'Nook 2' },
  { id: 't24', roomId: 'r-ind', roomName: 'Individual', scope: 0, baseHours: 24, baseCost: 70, overageHourlyRate: 15, isActive: true, note: '12 - 24 ساعة' },
  { id: 't12', roomId: 'r-n1', roomName: 'Nook 1', scope: 0, baseHours: 12, baseCost: 60, overageHourlyRate: 15, isActive: true, note: '9 - 12 ساعة' },
  { id: 'share', roomId: 'r-sh', roomName: 'Share', scope: 2, baseHours: 1, baseCost: 60, overageHourlyRate: 60, isActive: true, note: 'Share | capacity: 25' },
  { id: 'hive', roomId: 'r-hv', roomName: 'Workhive', scope: 2, baseHours: 1, baseCost: 120, overageHourlyRate: 120, isActive: true, note: 'Workhive' },
  // Legacy room rate saved with scope 0 — its note is the room name
  { id: 'nook1-rate', roomId: 'r-n1', roomName: 'Nook 1', scope: 0, baseHours: 1, baseCost: 80, overageHourlyRate: 80, isActive: true, note: 'Nook 1' }
] as PricingPlanDto[];

describe('student pricing tiers from /api/PricingPlans', () => {
  it('keeps only student hour tiers (drops room hourly rates)', () => {
    expect(plans.filter(isStudentTierPlan).map(p => p.id)).toEqual(['t9', 't24', 't12']);
  });

  it('builds contiguous, non-overlapping ranges sorted by hours', () => {
    const tiers = mapPlansToStudentTiers(plans);
    expect(tiers.map(t => [t.fromHours, t.toHours, t.priceEgp])).toEqual([
      [0, 9, 50],
      [9, 12, 60],
      [12, 24, 70]
    ]);
    expect(tiers[2].overageRate).toBe(15);
  });
});
