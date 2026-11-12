/**
 * Numeric enums of the backend (NookWorkspace.DAL.Enums). The OpenAPI spec only says "integer",
 * so the values are kept here in one place.
 */

/** ZoneType — workspace seating zone */
export const ZoneType = {
  Shared: 1,
  Silent: 2
} as const;

/** WorkspaceType — how a workspace session is billed */
export const WorkspaceType = {
  New: 1,
  Coupon: 2,
  Package: 3
} as const;

export const isSilentZone = (zone: unknown): boolean => Number(zone) === ZoneType.Silent;

export function zoneFor(category: 'shared' | 'silent' | string | undefined | null): number {
  return String(category || '').toLowerCase().includes('silent') ? ZoneType.Silent : ZoneType.Shared;
}

export function workspaceTypeFor(billing: string | undefined | null): number {
  switch (billing) {
    case 'package': return WorkspaceType.Package;
    case 'coupon': return WorkspaceType.Coupon;
    default: return WorkspaceType.New;
  }
}

export function billingFromWorkspaceType(type: unknown): 'package' | 'coupon' | 'new-session' {
  const t = Number(type);
  if (t === WorkspaceType.Package) return 'package';
  if (t === WorkspaceType.Coupon) return 'coupon';
  return 'new-session';
}

/** PayWay — payment channel (verified against the shift fields: 3 → InstaPay, 4 → Fawry) */
export const PayWay = {
  Cash: 1,
  VodafoneCash: 2,
  InstaPay: 3,
  Fawry: 4
} as const;

export function payWayFor(method: string | undefined | null): number {
  switch (String(method || '').toLowerCase()) {
    case 'vodafone':
    case 'vfcash':
    case 'vodafonecash':
      return PayWay.VodafoneCash;
    case 'instapay':
      return PayWay.InstaPay;
    case 'fawry':
      return PayWay.Fawry;
    default:
      return PayWay.Cash;
  }
}
