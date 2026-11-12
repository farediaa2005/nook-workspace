# NOOK Workspace — Manual QA Verification Checklist

This document provides a comprehensive, step-by-step manual testing protocol for verifying all audit remediation fixes, security patches, and feature additions across the NOOK Workspace Angular frontend.

---

## 1. Technical Audit Defects (NOOK-DEV-01 to NOOK-DEV-09, NOOK-SEC-01)

### [NOOK-DEV-01] Room Session Lifecycle Synchronization
- **Description:** Room session cards must transition accurately through the full lifecycle: `Reserved` -> `Active` (In-Progress) -> `Completed` (Checked Out).
- **Preconditions:** Logged in as Staff/Admin. At least one classroom exists.
- **Steps:**
  1. Navigate to `/classroom/reservations`.
  2. Create a reservation for the current day starting in 10 minutes.
  3. Observe the card status pill: verify it displays **محجوزة (Reserved)** in amber.
  4. When the session start time arrives (or click "بدء الجلسة"): verify card transitions to **جارية (Active)** with live timer counting.
  5. Click "إنهاء الجلسة والدفع" (Check out): complete checkout.
  6. Verify card transitions to **مكتملة (Completed)** with final cost and receipt button.
- **Pass Criteria:** Session states reflect exact database status without UI desync or phantom active cards.

---

### [NOOK-DEV-02] Reservation Self-Conflict Prevention on Edit
- **Description:** Editing an existing reservation's time or room must not flag a conflict against itself.
- **Preconditions:** An existing reservation exists (e.g., 14:00 - 16:00 in Room A).
- **Steps:**
  1. Open the reservation edit modal for that reservation.
  2. Adjust the time by 30 minutes (e.g., 14:30 - 16:30) in the same room.
  3. Click "حفظ التعديلات".
- **Pass Criteria:** The modal saves without triggering a false conflict warning against its own reservation ID.

---

### [NOOK-DEV-03] Room Transfer Without Duplicate Session Artifacts
- **Description:** Moving a session from one room to another must cleanly update the target room and remove the session card from the source room.
- **Preconditions:** Two rooms configured. An active session in Room 1.
- **Steps:**
  1. In Classroom view, click the transfer room action on the active session.
  2. Select Room 2 as destination and confirm.
  3. Inspect Room 1: session card is completely removed.
  4. Inspect Room 2: session card is present with identical session duration and accumulated charges.
- **Pass Criteria:** Zero ghost/duplicate cards across rooms; table assignment reflects target room ID.

---

### [NOOK-DEV-04 & O-3] Single Source of Truth for Room Pricing
- **Description:** Eradicate hardcoded 40 EGP fallback; fetch dynamic rate from `RoomPricingService` or display warning banner if unconfigured.
- **Preconditions:** Classroom "Workhive" configured at 30 EGP/hour.
- **Steps:**
  1. Navigate to Classroom Reservations.
  2. Select "Workhive" and select a 2-hour slot.
  3. Verify financial preview calculates: `2 hrs × 30 EGP = 60 EGP` (not 80 EGP).
  4. Verify Arabic rate badge reads: `30 ج.م/ساعة` (not `40 ج.م/ساعة`).
- **Pass Criteria:** Rate calculations accurately reflect configured backend pricing tier; zero 40 EGP fallbacks.

---

### [NOOK-DEV-05] Offline Resilience & Local Storage Fallback
- **Description:** Network drops or transient 500 errors must not wipe active student lists or workspace state into empty arrays.
- **Preconditions:** Active students checked into workspace.
- **Steps:**
  1. Navigate to `/workspace/active`. Observe active students list.
  2. Simulate network disconnect (DevTools Network -> Offline) or simulate 500 error on `/api/Students/active`.
  3. Refresh the page or trigger a poll interval.
- **Pass Criteria:** The previous student state is retained from cache; an informative banner warns of connection loss without blanking out the UI.

---

### [NOOK-DEV-06] Separate Printing Page Count from Monetary Fee
- **Description:** Printing dialog must distinguish physical page count from the total monetary fee charged.
- **Preconditions:** Active classroom session.
- **Steps:**
  1. Open the add service / printing modal on the session card.
  2. Enter `10` pages at `2 EGP` per page.
  3. Save service.
  4. View session summary and breakdown modal.
- **Pass Criteria:** Financial summary displays `10 ورقات` and monetary charge `20 ج.م` as separate distinct metrics.

---

### [NOOK-DEV-07] Dedicated Reservation Deletion with Confirmation
- **Description:** Deleting a reservation must call the dedicated `DELETE /api/Reservations/{id}` endpoint after explicit user confirmation.
- **Preconditions:** Reservation exists on calendar.
- **Steps:**
  1. Click delete icon on a future reservation.
  2. Confirmation modal appears warning: "هل أنت متأكد من رغبتك في حذف هذا الحجز نهائياً؟".
  3. Confirm deletion.
  4. Inspect Network tab: `DELETE /api/Reservations/{id}` is executed.
  5. Reservation immediately disappears from calendar.
- **Pass Criteria:** Deletion requires confirmation and triggers HTTP DELETE; calendar refreshes immediately.

---

### [NOOK-DEV-08] Decouple College from University Selection
- **Description:** College dropdown in student creation and student edit forms must function independently or auto-populate logically without locking out unlisted colleges.
- **Preconditions:** Navigate to `/workspace/students` -> "إضافة طالب جديد".
- **Steps:**
  1. Open add student modal.
  2. Leave university empty, or select custom university.
  3. Click college dropdown: verify user can select or type any college without forced rigid dependency blocking submission.
  4. Repeat on student edit modal.
- **Pass Criteria:** College selection is never blocked or disabled due to university field state.

---

### [NOOK-DEV-09 & NOOK-FEAT-04] Zone-Derived Seat Types & Occupancy Breakdown
- **Description:** Workspace dashboard occupancy must differentiate between Shared Space and Silent Zone seats derived from room configuration.
- **Preconditions:** Active students in both Silent Zone and Shared Space.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. View the Live Occupancy breakdown card.
  3. Verify separate metric counters:
     - إجمالي الطلاب المتواجدين (Total Present)
     - طلاب المساحة المشتركة (Shared Space Seats)
     - طلاب منطقة الهدوء (Silent Zone Seats)
- **Pass Criteria:** Seat counts sum correctly to total active sessions and match physical room zone assignments.

---

### [NOOK-SEC-01 & O-10] Standardized Destructive Confirmations Without Password Lock
- **Description:** Destructive actions (delete student, delete room, delete product, delete pricing tier) must present clear, high-contrast modal confirmations without requiring shift-opener password.
- **Preconditions:** Logged in as Staff/Admin.
- **Steps:**
  1. In Student Directory, click delete student profile.
  2. Verify confirmation dialog opens with red confirmation button, clear entity name, and zero password input prompt.
  3. Click "إلغاء": action is cancelled cleanly.
  4. Re-open and confirm: record is deleted directly.
  5. Repeat across Room Settings, Cafeteria Products, and Packages.
- **Pass Criteria:** All destructive actions use standardized modal dialogs without legacy password block.

---

## 2. Owner Testing Defects (O-1 to O-13)

### [O-1] Explicit Promo Code Line in Financial Breakdown
- **Steps:**
  1. In student checkout modal, enter promo code `NOOK63` (20% discount).
  2. Verify financial breakdown table shows:
     - المجموع الفرعي (Subtotal): e.g. 50.00 ج.م
     - كود الخصم (NOOK63 - 20%): -10.00 ج.م (displayed in green)
     - الإجمالي النهائي (Final Total): 40.00 ج.م
- **Pass Criteria:** Promo code code name and exact deducted value are explicitly itemized.

---

### [O-2] Validation on Submit with Smooth Scroll to First Invalid Field
- **Steps:**
  1. Open "تسجيل دخول طالب جديد" (New Student Check-in).
  2. Leave required name and phone blank.
  3. Click submit button.
  4. Observe behavior: form does not submit; viewport smoothly scrolls to first invalid field; field border highlights in red with clear error message.
- **Pass Criteria:** Zero silent submission failures; immediate visual focus on first invalid input.

---

### [O-4] WCAG AA Contrast Fix in Recurring Reservation Cancel Dialog
- **Steps:**
  1. Open recurring reservation series options.
  2. Click "إلغاء السلسلة" (Cancel Recurring Series).
  3. Inspect warning text color against dark modal background (`#17181c`).
- **Pass Criteria:** Text color provides at least 4.5:1 contrast ratio (verified with `#f2f2f4` / `#f5b921`).

---

### [O-5] Persist Shift Opening Float Across Reloads
- **Steps:**
  1. Open an active shift with opening float: Cash: 500 EGP, InstaPay: 200 EGP.
  2. Refresh browser (F5) or close and reopen tab.
  3. Navigate to Active Shift page (`/shift/active`).
- **Pass Criteria:** Opening balances persist intact from local storage cache; discrepancy calculation matches exact initial float.

---

### [O-6] Input Normalization with Arabic-Indic Digits
- **Steps:**
  1. In student phone number input, type Arabic numerals: `٠١٠١٢٣٤٥٦٧٨`.
  2. Verify input normalizes in real-time to standard digits: `01012345678`.
  3. In monetary input (e.g., custom package price), enter `٥٠٠`.
  4. Verify value normalizes to `500`.
- **Pass Criteria:** All numerical inputs accept Arabic-Indic digits and normalize transparently before submission.

---

### [O-7 & O-8] Instructors Directory Visual Alignment & Dynamic Metrics
- **Steps:**
  1. Navigate to `/classroom/instructors`.
  2. Compare visual layout against `/workspace/students`.
  3. Verify cards share identical border radius (`14px`), padding, hover effects, search bar, and badge styles.
  4. Verify total session count displayed on each instructor card derives dynamically from actual reservations.
- **Pass Criteria:** Complete aesthetic parity with student directory; accurate session statistics.

---

### [O-9] Product Edit Modal Polish & Expiry Handling
- **Steps:**
  1. Navigate to `/cafeteria/products`.
  2. Click edit product on an item expiring today.
  3. Verify expiry date field displays clean formatted date (`DD/MM/YYYY`).
  4. Verify item is not flagged expired until today has ended.
  5. Verify image action buttons (upload, remove) conform to shared design tokens.
- **Pass Criteria:** Correct expiry date evaluation and polished modal inputs.

---

### [O-11 & NOOK-FEAT-01] Package Validity Layout & 7-Day Preset
- **Steps:**
  1. Navigate to `/settings` -> "باقات الساعات" (Packages).
  2. Click "إضافة باقة جديدة".
  3. Inspect validity days options: verify `7 أيام (أسبوع واحد)` preset is available and selected cleanly without text truncation.
  4. Select custom validity: enter `21`.
- **Pass Criteria:** 7-day preset exists; validity labels do not overlap adjoining inputs.

---

### [O-12] Classroom Reservation Edit Modal Arabic-First RTL Localization
- **Steps:**
  1. In Classroom view, open edit modal for an instructor reservation.
  2. Inspect layout: Arabic labels right-aligned; phone, email, notes, attendees labels fully translated to Arabic.
  3. Input values align correctly with appropriate RTL reading flow.
- **Pass Criteria:** 100% Arabic-first RTL localization with zero untranslated English placeholders.

---

### [O-13] Classroom Timeline Header Label Collision Resolution
- **Steps:**
  1. In Classroom Schedule / Calendar view, inspect the hourly header row across zoom levels (8:00 AM to 11:00 PM).
  2. Verify hour markers (e.g., `09:00 ص`, `10:00 ص`) do not collide, wrap awkwardly, or overlap borders.
- **Pass Criteria:** Hour markers spaced cleanly with distinct column dividers and responsive scrolling.

---

## 3. Tier B Features (NOOK-FEAT-02, NOOK-FEAT-03, NOOK-FEAT-05)

### [NOOK-FEAT-02] Reservation Contact Phone Persistence & Keyboard Time Entry
- **Steps:**
  1. Create a reservation entering instructor phone number.
  2. Verify phone number saves and displays on reservation card.
  3. In reservation time entry, type time directly via keyboard (e.g. `14:00` to `16:30`) without relying exclusively on dropdown clicks.
- **Pass Criteria:** Phone persisted and accessible; keyboard time inputs functional.

---

### [NOOK-FEAT-03] Session Time Boundary Validation & Permission Check
- **Steps:**
  1. As Receptionist/Admin, open edit session time for an active student.
  2. Enter check-in time in the future: verify error prevents saving (`Check-in time cannot be in the future`).
  3. Enter check-in time older than shift start without admin override: verify permission check enforces boundary.
- **Pass Criteria:** Robust boundary validation prevents illogical session duration corrupting billing.

---

### [NOOK-FEAT-05] Attendance Visits Computation from Persisted History
- **Steps:**
  1. Open student profile who has checked in 3 times across past shifts.
  2. Verify visit count badge displays `3 زيارات` derived from cached history records.
  3. Check student in today and check out: verify visit count increments to `4 زيارات`.
- **Pass Criteria:** Visit count remains stable across page refreshes and server reloads.

---

## 4. Test Suite & Build Verification

- [x] **Vitest Unit Test Suite:** `npm test -- --watch=false` -> **16/16 test files passed, 91/91 tests passed (100% green)**.
- [x] **Production Bundle Build:** `npm run build -- --configuration production` -> **Generated successfully in ~19s with 0 errors**.
