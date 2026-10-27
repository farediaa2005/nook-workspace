/**
 * API Enum Definitions for NOOK Workspace API v1.
 *
 * NOTE: The backend OpenAPI spec (openapi/v1.json) emits all enums as bare integers (int32).
 * All enum values below were empirically discovered and verified against live backend responses
 * on 2026-10-11 from https://nook.runasp.net.
 */

/**
 * Scope of pricing plan application.
 * Verified against live data on 2026-10-11:
 * - Room "Individual": scope 0 (Workspace / General)
 * - Room "Workhive": scope 2 (Classroom rental)
 * - Scope 1: Shared Space zone
 * - Scope 3: returns 400 "The value '3' is invalid."
 */
export enum PricingScope {
  Workspace = 0,
  SharedSpace = 1,
  Classroom = 2
}

/**
 * Workspace physical noise zone classification.
 * Verified against live data on 2026-10-11:
 * - "Share room 1", "Share room 2": zone 1 (Shared Space)
 * - "Individual", "Focus nook": zone 2 (Silent Zone)
 * - Classrooms: zone null
 */
export enum ZoneType {
  SharedSpace = 1,
  SilentZone = 2
}

/**
 * Lifecycle status of operational sessions (Workspaces, Classrooms, Shifts).
 * Verified against live data on 2026-10-11:
 * - Live open shift: status 1
 * - Closed shift: status 2
 */
export enum SessionStatus {
  Active = 1,
  Completed = 2,
  Cancelled = 3
}

/**
 * Reservation record status.
 * Verified against live data on 2026-10-11:
 * - Upcoming / Active confirmed reservation: status 1
 * - Checked out / Completed reservation: status 2
 * - Cancelled reservation: status 3
 */
export enum ReservationStatus {
  Active = 1,
  Completed = 2,
  Cancelled = 3
}

/**
 * Recurrence frequency for recurring reservations.
 * Verified against live data on 2026-10-11:
 * - Daily: 1
 * - Weekly: 2
 * - Biweekly: 3
 * - Monthly: 4
 */
export enum RecurrenceFrequency {
  Daily = 1,
  Weekly = 2,
  Biweekly = 3,
  Monthly = 4
}

/**
 * Discount calculation type.
 * Verified against live coupon NOOK63 on 2026-10-11:
 * - Percentage: 1 (e.g. value=20 means 20%)
 * - FixedAmount: 2 (fixed monetary deduction in EGP)
 */
export enum DiscountType {
  Percentage = 1,
  FixedAmount = 2
}

/**
 * Package catalog target type.
 * Verified against live PackagePricingPlans on 2026-10-11:
 * - Workspace hours: 1
 * - Classroom hours: 2
 */
export enum PackageType {
  Workspace = 1,
  Classroom = 2
}

/**
 * Payment method enumeration.
 */
export enum PayWay {
  Cash = 1,
  VodafoneCash = 2,
  Instapay = 3,
  Fawry = 4,
  CreditCard = 5,
  Wallet = 6
}
