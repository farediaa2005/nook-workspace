# Open Product Questions & Safe Defaults (OPEN_QUESTIONS.md)

This document records ambiguous business requirements, edge-case policies, and pricing rules identified during the technical audit and owner manual testing of the NOOK Workspace platform. For each question, the alternatives evaluated, the applied frontend safe default, and recommendations for stakeholders are documented below.

---

## 1. Classroom Overtime Rounding & Grace Periods (NOOK-DEV-01)
- **Context:** An instructor books a classroom from 14:00 to 16:00 (2 hours), but questions/discussion run late and checkout occurs at 16:18.
- **Alternatives Considered:**
  1. *Minute-by-minute prorated calculation:* `(18 / 60) * hourlyRate = 0.3 * hourlyRate`.
  2. *Grace period with half-hour increments:* 15 minutes free; after 15 minutes, round to nearest 30 minutes.
  3. *Full started hour increment:* Any overtime exceeding 5 minutes rounds up to the next full billing hour.
- **Applied Safe Default:** **Alternative 3 (Full started hour increment after a 5-minute checkout grace period)**.
  - If checkout is at 16:04, no overtime is charged.
  - If checkout is at 16:06 or later, 1 additional full hour is billed at the room's configured hourly rate.
  - A clear breakdown line is displayed on the checkout dialog (`ساعة إضافية لتجاوز وقت الحجز`).
- **Owner Recommendation:** Confirm whether a 15-minute grace period or half-hourly billing is preferred for educational workshops.

---

## 2. Room Pricing Source of Truth & Zero-Rate Handling (NOOK-DEV-04, O-3)
- **Context:** The database schema historically separated room definitions (`/api/Rooms`) from pricing tiers (`/api/PricingPlans` with `scope: 2`). When a new room was added without an explicit pricing tier, prior code defaulted to hardcoded 40 EGP (or 0 EGP in some screens).
- **Alternatives Considered:**
  1. Hardcode a fallback rate (e.g. 40 EGP/hour).
  2. Allow 0 EGP checkout silently.
  3. Strict single source of truth in `RoomPricingService`: look up associated tier; if unconfigured, display an explicit banner, block checkout submission, and guide staff to Settings.
- **Applied Safe Default:** **Alternative 3 (Strict Source of Truth)**. The frontend will never guess or charge 0 EGP silently. If a room has no configured price, staff is warned with: `"سعر الساعة غير محدد لهذه القاعة، يرجى ضبط السعر من الإعدادات"`.
- **Owner Recommendation:** Require `hourlyPrice` directly when creating any classroom room in Settings.

---

## 3. Discount Stacking Rules: Promo Codes vs Manual Discounts (O-1)
- **Context:** A customer enters promo code `NOOK63` (20% discount) and staff also clicks the `10%` loyalty discount button.
- **Alternatives Considered:**
  1. *Compound Stacking:* 20% + 10% = 30% discount off subtotal.
  2. *Sequential Stacking:* Subtotal - 20%, then take 10% off remainder.
  3. *Non-Stacking (Exclusive / Best Offer):* Applying a promo code overrides manual percentage discount; selecting a manual discount button clears the active promo code.
- **Applied Safe Default:** **Alternative 3 (Non-Stacking / Mutually Exclusive)**.
  - Applying a promo code disables manual discount presets and applies the promo rate.
  - Clicking a manual percentage clears the promo code.
  - Maximum allowable discount is capped at 100% (free session).
- **Owner Recommendation:** Establish official policy on whether VIP customers can combine promo codes with student loyalty discounts.

---

## 4. Package Hour Validity Expiration & Rollover (O-11, NOOK-FEAT-01)
- **Context:** A student purchases a 30-hour package valid for 30 days. On day 30, they have 6 remaining hours.
- **Alternatives Considered:**
  1. *Hard Expiration:* Remaining hours become inactive immediately upon expiration.
  2. *Automatic Rollover on Renewal:* If the student buys a new package before or within 7 days of expiry, unused hours roll over into the new balance.
  3. *Grace Extension:* Staff can manually extend validity by N days from the student details screen.
- **Applied Safe Default:** **Alternative 1 (Hard Expiration display with manual admin override)**.
  - Expired packages display as `منتهية الصلاحية` and cannot be selected for automatic hourly deductions.
  - Staff with Admin privileges can adjust validity date from the package edit modal.
- **Owner Recommendation:** Formulate formal commercial terms for package rollovers to display in customer receipts.

---

## 5. Shift Discrepancy Margin & Multi-Channel Reconciliation (O-5, NOOK-FEAT-07)
- **Context:** At shift closing, actual physical cash in drawer is 498 EGP while expected cash is 500 EGP (a 2 EGP deficit).
- **Alternatives Considered:**
  1. *Tolerance Threshold:* Any deficit within ±5 EGP is marked "متوازن" (Balanced).
  2. *Zero Tolerance:* Any non-zero difference triggers a discrepancy status with exact breakdown.
- **Applied Safe Default:** **Alternative 2 (Zero Tolerance)**.
  - Any variance (even ±1 EGP) flags the shift as `"فيه خلاف"` (Discrepancy) with the exact amount highlighted in red.
  - Breakdown displays exact difference per channel: Cash, Vodafone Cash, InstaPay, Fawry.
- **Owner Recommendation:** Confirm whether management wants a standard tolerance threshold before alerting admins.

---

## 6. Auto-Checkout & Midnight Boundary Policy
- **Context:** A student or classroom forgets to check out and remains "Active" when the space closes at midnight.
- **Alternatives Considered:**
  1. *Unbounded Counter:* Session timer continues running indefinitely into subsequent days until staff notices.
  2. *Shift Close Forced Checkout:* Closing the active shift automatically forces checkout on all active sessions at the shift close timestamp.
  3. *Midnight Hard Cap:* Sessions automatically cap billing at 00:00:00 (closing time) with a flag for staff review.
- **Applied Safe Default:** Active sessions are visually flagged in red with a pulse indicator if duration exceeds 8 hours, and checkout modal prompts staff to confirm whether actual exit was at space closing time.
- **Owner Recommendation:** Implement automated backend cron job that marks unclosed sessions at closing time and alerts the morning shift opener.

---

## 7. Instructor Reservation Cancellation & Refund Rules
- **Context:** An instructor cancels a classroom booking 2 hours before the scheduled time.
- **Alternatives Considered:**
  1. Full refund / zero cancellation fee regardless of notice.
  2. Free cancellation up to 24 hours prior; 50% cancellation fee within 24 hours.
  3. Non-refundable deposit if cancelled less than 12 hours prior.
- **Applied Safe Default:**
  - Reservations cancelled prior to start time are moved to `ملغاة` (Cancelled) status.
  - If paid in advance, a credit balance note is generated for the instructor's ledger.
- **Owner Recommendation:** Define official cancellation window and fee structure for instructor booking contracts.
