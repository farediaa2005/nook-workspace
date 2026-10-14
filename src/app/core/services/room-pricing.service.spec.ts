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
  });
});
