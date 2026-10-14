import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RoomPricingService } from './room-pricing.service';

describe('RoomPricingService (NOOK-DEV-04, O-3)', () => {
  let service: RoomPricingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RoomPricingService]
    });
    service = TestBed.inject(RoomPricingService);
  });

<<<<<<< HEAD
  it('should resolve active plan for room and derive hourly display rate', () => {
    const plans = [
      { id: 'p-1', roomId: 'room-1', scope: 2, baseHours: 3, baseCost: 90, overageHourlyRate: 30, isActive: true }
    ];
    service.syncPlans(plans as any);

    expect(service.hasActivePlanForScope('room-1')).toBe(true);
    expect(service.isRoomPriceConfigured('room-1')).toBe(true);
    expect(service.getRoomHourlyRate('room-1')).toBe(30);
    expect(service.getDerivedHourlyRateDisplay('room-1', true)).toBe('30 ج.م/ساعة');
  });

  it('should return 0 and false for rooms without an active pricing plan', () => {
    service.syncPlans([]);

    expect(service.hasActivePlanForScope('room-unpriced')).toBe(false);
    expect(service.isRoomPriceConfigured('room-unpriced')).toBe(false);
    expect(service.getRoomHourlyRate('room-unpriced')).toBe(0);
    expect(service.getDerivedHourlyRateDisplay('room-unpriced', true)).toContain('يرجى ضبط خطة التسعير');
  });

  it('should calculate local fallback correctly when server is unreachable', () => {
    const plans = [
      { id: 'p-1', roomId: 'room-2', scope: 2, baseHours: 2, baseCost: 50, overageHourlyRate: 20, isActive: true }
    ];
    service.syncPlans(plans as any);

    // 2 hours <= baseHours 2 -> 50
    // 3 hours -> 50 + (1 * 20) = 70
    const plan = service.getPlanForRoom('room-2');
    expect(plan).toBeDefined();
    expect(plan?.baseCost).toBe(50);
=======
  it('should resolve hourly price directly from Room DTO when available', () => {
    const rooms = [{ id: 'room-1', name: 'Workhive', hourlyPrice: 120 }];
    service.syncPrices(rooms, []);

    expect(service.getRoomHourlyRate('room-1')).toBe(120);
    expect(service.getRoomHourlyRate({ id: 'room-1', name: 'Workhive' })).toBe(120);
    expect(service.isRoomPriceConfigured('room-1')).toBe(true);
  });

  it('should resolve hourly price from matching PricingPlan when Room DTO lacks price', () => {
    const rooms = [{ id: 'room-2', name: 'Nook 1' }];
    const plans = [{ roomId: 'room-2', scope: 2, baseCost: 75 }];
    service.syncPrices(rooms, plans);

    expect(service.getRoomHourlyRate('room-2')).toBe(75);
    expect(service.getRoomHourlyRate({ id: 'room-2', name: 'Nook 1' })).toBe(75);
    expect(service.isRoomPriceConfigured('room-2')).toBe(true);
  });

  it('should return 0 and false for unconfigured room price without falling back to 40 EGP', () => {
    const rooms = [{ id: 'room-3', name: 'Unpriced Hall' }];
    service.syncPrices(rooms, []);

    expect(service.getRoomHourlyRate('room-3')).toBe(0);
    expect(service.isRoomPriceConfigured('room-3')).toBe(false);
  });

  it('should support manual price override that persists across switching', () => {
    service.setRoomHourlyRate('room-4', 'Studio', 150);

    expect(service.getRoomHourlyRate('room-4')).toBe(150);
    expect(service.getRoomHourlyRate({ id: 'room-4', name: 'Studio' })).toBe(150);
>>>>>>> fix/audit-remediation
  });
});
