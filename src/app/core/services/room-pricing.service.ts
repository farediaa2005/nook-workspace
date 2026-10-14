import { Injectable, signal, computed } from '@angular/core';

export interface RoomPriceEntity {
  id?: string;
  name?: string;
  hourlyRate?: number;
  hourlyPrice?: number;
}

/**
 * Unified Room Pricing Service (NOOK-DEV-04, O-3).
 * Single Source of Truth for resolving and enforcing room hourly prices.
 * Eradicates inconsistent price sources and eliminates hardcoded fallbacks (40 EGP).
 */
@Injectable({
  providedIn: 'root'
})
export class RoomPricingService {
  private roomPricesState = signal<Map<string, number>>(new Map());
  private roomNamePricesState = signal<Map<string, number>>(new Map());

  readonly configuredPricesCount = computed(() => this.roomPricesState().size);

  /**
   * Synchronize room prices from backend Rooms and PricingPlans.
   */
  public syncPrices(rooms: any[], plans: any[]): void {
    const mapById = new Map<string, number>();
    const mapByName = new Map<string, number>();

    for (const r of rooms || []) {
      const id = (r.id || '').trim().toLowerCase();
      const name = (r.name || '').trim().toLowerCase();

      // 1. Direct DTO property
      let rate = Number(r.hourlyPrice || r.hourlyRate) || 0;

      // 2. Matching PricingPlan
      if (rate <= 0 && plans && plans.length > 0) {
        const matchedPlan = plans.find(p =>
          (p.roomId && p.roomId.trim().toLowerCase() === id) ||
          (p.scope === 2 && p.roomId === r.id)
        );
        if (matchedPlan) {
          rate = Number(matchedPlan.baseCost || matchedPlan.overageHourlyRate) || 0;
        }
      }

      if (id && rate > 0) {
        mapById.set(id, rate);
      }
      if (name && rate > 0) {
        mapByName.set(name, rate);
      }
    }

    this.roomPricesState.set(mapById);
    this.roomNamePricesState.set(mapByName);
  }

  /**
   * Resolve effective hourly rate for a room. Never falls back to hardcoded 40 EGP.
   */
  public getRoomHourlyRate(roomOrId?: string | RoomPriceEntity | null): number {
    if (!roomOrId) return 0;

    if (typeof roomOrId === 'object') {
      if (roomOrId.hourlyRate && roomOrId.hourlyRate > 0) return roomOrId.hourlyRate;
      if (roomOrId.hourlyPrice && roomOrId.hourlyPrice > 0) return roomOrId.hourlyPrice;
      const byId = roomOrId.id ? this.getRoomHourlyRate(roomOrId.id) : 0;
      if (byId > 0) return byId;
      if (roomOrId.name) {
        const byName = this.roomNamePricesState().get(roomOrId.name.trim().toLowerCase());
        if (byName && byName > 0) return byName;
      }
      return 0;
    }

    const clean = roomOrId.trim().toLowerCase();
    const byId = this.roomPricesState().get(clean);
    if (byId !== undefined && byId > 0) return byId;

    const byName = this.roomNamePricesState().get(clean);
    if (byName !== undefined && byName > 0) return byName;

    return 0;
  }

  /**
   * Check if a room has a valid configured price (> 0).
   */
  public isRoomPriceConfigured(roomOrId?: string | RoomPriceEntity | null): boolean {
    return this.getRoomHourlyRate(roomOrId) > 0;
  }

  /**
   * Explicitly set/override an hourly price for a room (persists across room switching).
   */
  public setRoomHourlyRate(roomId: string, roomName: string, rate: number): void {
    if (rate <= 0) return;
    const id = (roomId || '').trim().toLowerCase();
    const name = (roomName || '').trim().toLowerCase();

    this.roomPricesState.update(m => {
      const next = new Map(m);
      if (id) next.set(id, rate);
      return next;
    });

    this.roomNamePricesState.update(m => {
      const next = new Map(m);
      if (name) next.set(name, rate);
      return next;
    });
  }
}
