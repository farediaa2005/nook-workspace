<<<<<<< HEAD
# Backend Requests & RFCs (BACKEND_REQUESTS.md)

**Scope:** Verified API RFCs and bug reports for the NOOK Workspace ASP.NET Core backend team.  
**Version:** 2.0 (Post-Audit Clean Pass)  
**Date:** 2026-10-12  
**Source of Truth:** Live OpenAPI v1 (`live_openapi.json` from `https://nook.runasp.net`).

> [!NOTE]
> **Items Explicitly Removed from Previous Iteration (Already Supported by Backend):**
> 1. Room `hourlyPrice` column: Eradicated. Frontend now consumes `/api/PricingPlans` and `/api/PricingPlans/suggestion` as the authoritative source of truth.
> 2. `POST /api/Reservations/recurring` and series endpoints: Eradicated. The native `POST /api/Reservations` already supports full recurrence (`recurrenceFrequency`, `recurrenceInterval`, `daysOfWeek`, `totalSessions`, `isOngoing`), `POST /api/Reservations/{id}/cancel-day`, and `DELETE /api/Reservations/{id}`.
> 3. `GET /api/Students/{id}/attendance-summary`: Eradicated. Frontend consumes `/api/Students/{id}/analytics`.
> 4. `GET /api/Invoices/{id}/pdf`: Eradicated. Frontend renders printable invoice client-side directly from `InvoiceDetailDto`.
> 5. Shift opening floats: Eradicated. `CreateShiftDto` and `ShiftDto` already support `previousTotal`, `startVodafoneCash`, `startInstapay`, and `startFawry`.
> 6. Contact format validation (B4): Enforced strictly on the frontend via `validators.util.ts` (`^01[0125]\d{8}$`, Egyptian phone, email regex, and Arabic-Indic digit normalization).
> 7. Enum definitions (B8): Centrally defined and typed in the frontend via `src/app/core/api-enums.ts` (`PricingScope`, `ZoneType`, `SessionStatus`, `RecurrenceFrequency`, `PayWay`, etc.).

---

## Priority Matrix

| Item | Title | Category | Priority | Endpoints Involved |
|---|---|---|---|---|
| **B1** | Reservation Conflict Exemption on Self-Update | Verify / Fix (Bug) | **P0 (Critical)** | `PUT /api/Reservations/{id}`, `POST /api/Reservations/check-conflict` |
| **B2** | Shift Closing Cash Field & Float Integration Verification | Verify / Fix (Bug) | **P0 (Critical)** | `POST /api/shifts`, `PUT /api/shifts/{id}/close`, `GET /api/shifts/current` |
| **B3** | Instructor Extended Fields Schema Support | Missing / Needed | **P1 (High)** | `POST /api/Instructors`, `PUT /api/Instructors/{id}`, `InstructorDto` |
| **B5** | Explicit RBAC Authorization on Destructive DELETE Calls | Verify / Security | **P1 (High)** | `DELETE /api/*` (Students, Reservations, Instructors, Products, Rooms) |
| **B6** | Atomic Coupon Redemption at Checkout | Recommended | **P2 (Medium)** | `PUT /api/Workspaces/{id}/checkout`, `PUT /api/Classrooms/{id}/checkout` |
| **B7** | Product Image Deletion & Categorization Support | Recommended | **P2 (Medium)** | `DELETE /api/Products/{id}/image`, `ProductDto` |
| **B10**| Shift Correction Endpoint for Administrative Errors | Recommended | **P2 (Medium)** | `PUT /api/shifts/{id}` |

---

## 1. Verify / Fix (Probable Bugs)

### B1 (P0): Reservation Conflict Exemption on Update / Extension
- **What:** When editing or extending an existing scheduled reservation via `PUT /api/Reservations/{id}` or checking conflicts via `POST /api/Reservations/check-conflict`, the server must exclude the reservation itself (and its own recurring instances) from collision detection.
- **Why:** In production, extending a 2-hour reservation to 3 hours (e.g. 10:00–12:00 extended to 10:00–13:00) returns an Arabic error `حجز متكرر متداخل` if the backend's overlap algorithm evaluates the proposed time against the existing record in the database.
- **Evidence / Repro:**
  ```http
  POST /api/Reservations/check-conflict HTTP/1.1
  Content-Type: application/json

  {
    "roomId": "74233e5c-c3ae-4525-b645-6ee73337f3f4",
    "dateFrom": "2026-11-20T08:00:00Z",
    "dateTo": "2026-11-20T11:00:00Z",
    "timeFrom": "2026-11-20T08:00:00Z",
    "timeTo": "2026-11-20T11:00:00Z"
  }
  ```
  Returns `hasConflict: true` against the reservation itself unless `excludeReservationId` is provided. If `PUT /api/Reservations/{id}` runs internal conflict validation without passing its own route `{id}` as the exclusion, the update is blocked.
- **Requested Change:** Ensure `PUT /api/Reservations/{id}` automatically excludes `id` during internal conflict validation. Confirm that modifying `roomId` moves the reservation cleanly without duplication.
- **Acceptance Test:** Create reservation for 10:00–12:00; call `PUT /api/Reservations/{id}` with 10:00–13:00; verify HTTP 200 OK without conflict error.

---

### B2 (P0): Shift Calculations & Closing Cash Field Verification
- **What:** Confirm that server-side shift financials (`expectedCash`, `cashDifference`, `vodafoneDifference`, `instapayDifference`, `fawryDifference`, `increase`, `loss`) strictly account for all 4 opening floats (`previousTotal`, `startVodafoneCash`, `startInstapay`, `startFawry`). Furthermore, specify which field in `UpdateShiftDto` represents physical counted cash at shift closing.
- **Why:** `CreateShiftDto` accepts all 4 floats and live experimentation verifies `previousTotal: 250` flows into `expectedCash: 250`. However, `UpdateShiftDto` currently specifies `actualVodafone`, `actualInstapay`, `actualFawry`, and `administrative: double`, but lacks an explicit `actualCash` property.
- **Evidence / Repro (Live Shift `GET /api/shifts/current` on 2026-10-12):**
  ```json
  {
    "previousTotal": 250,
    "startVodafoneCash": 0,
    "startInstapay": 0,
    "startFawry": 0,
    "expectedCash": 250,
    "totalCost": 250,
    "cashDifference": 0
  }
  ```
- **Requested Change:**
  1. Document whether `administrative` is the intended field for counted drawer cash at close, or add `actualCash: double` to `UpdateShiftDto`.
  2. Confirm that closing calculation computes `cashDifference = actualCash - expectedCash`.
- **Acceptance Test:** Open shift with `previousTotal: 250`, record 100 EGP cash session, close with `actualCash: 350`; verify `cashDifference == 0` and `status == 2`.

---

### B5 (P1): Confirm `[Authorize(Roles="Admin")]` on All DELETE Endpoints
- **What:** Verify server-side Role-Based Access Control on all destructive endpoints: `DELETE /api/Students/{id}`, `DELETE /api/Reservations/{id}`, `DELETE /api/Instructors/{id}`, `DELETE /api/Products/{id}`, `DELETE /api/Rooms/{id}`, `DELETE /api/PricingPlans/{id}`.
- **Why:** The OpenAPI specification does not expose ASP.NET Core `[Authorize]` attributes. Destruction of records must be restricted strictly to administrative tokens, and non-admin tokens must return HTTP 403 Forbidden inside the standard `ApiResponse` envelope (`{ success: false, message: "...", data: null }`).
- **Requested Change:** Verify controller attributes on all DELETE routes.
- **Acceptance Test:** Send `DELETE /api/Students/{id}` using a Staff or Receptionist JWT token; verify server responds with HTTP 403 Forbidden and record remains intact.

---

## 2. Missing / Needed

### B3 (P1): Instructor Extended Fields Schema Support
- **What:** Add `email`, `specialty`, `organization`, `isActive` (or `status`), and `bio` to `CreateInstructorDto`, `UpdateInstructorDto`, and `InstructorDto` (plus optional read-only `sessionsCount`).
- **Why:** The admin UI originally included fields for instructor email, bio, and organization. However, OpenAPI `InstructorDto` only persists `id`, `name`, `phoneNumber`, `colour`. Frontend has hidden these fields behind `INSTRUCTOR_EXTENDED_FIELDS = false` to prevent silent data loss until backend support is added.
- **Requested Change:**
  ```json
  // Proposed InstructorDto additions
  {
    "email": "string | null",
    "specialty": "string | null",
    "organization": "string | null",
    "bio": "string | null",
    "isActive": true,
    "sessionsCount": 0
  }
  ```
- **Acceptance Test:** `POST /api/Instructors` accepts and persists email and bio; `GET /api/Instructors/{id}` returns them.

---

## 3. Recommended (P2)

### B6 (P2): Atomic Coupon Redemption at Checkout
- **What:** Add optional `couponCode: string` to `CheckoutWorkspaceDto` and `CheckoutClassroomDto`.
- **Why:** Currently, checkout requires a non-atomic two-step flow:
  1. Frontend validates coupon via `GET /api/Coupons/code/{code}` and computes discount.
  2. Frontend sends `discount` and `discountReason` in `PUT /api/Workspaces/{id}/checkout`.
  3. Frontend calls `POST /api/Coupons/redeem/{code}` with `{ studentId, workspaceId }`.
  If step 3 fails due to a network glitch, the discount was granted on checkout but the coupon's `usageCount` was not incremented.
- **Requested Change:** If `couponCode` is supplied on checkout, backend validates, applies discount, and increments coupon redemption in a single transaction.
- **Acceptance Test:** Single `PUT /api/Workspaces/{id}/checkout` with `couponCode: "NOOK63"` applies 20% discount and marks coupon redeemed.

---

### B7 (P3): Product Image Deletion & Categorization Support
- **What:** Add `DELETE /api/Products/{id}/image` (or allow clearing `imageUrl: null` on `PUT /api/Products/{id}`) and add optional `category: string` on `ProductDto`.
- **Why:** `POST /api/Products/{id}/image` allows uploading and replacing product images, but there is no mechanism to remove an image once uploaded.
- **Requested Change:** Provide DELETE endpoint or accept `null` for `ImageUrl`.
- **Acceptance Test:** Calling delete removes product image from storage and resets `imageUrl` to null.

---

### B10 (P2): Administrative Shift Correction Endpoint (`PUT /api/Shifts/{id}`)
- **What:** Add an Admin-only endpoint `PUT /api/shifts/{id}` to correct opening balances or notes on open shifts (and optionally on closed shifts with audit logging).
- **Why:** Staff members occasionally enter an incorrect opening drawer balance (e.g. typing 25 instead of 250). Currently, there is no way to rectify the mistake without closing the shift and opening a new one.
=======
# Backend API Contract Requests (BACKEND_REQUESTS.md)

This document specifies the exact API contracts, missing endpoints, schema enhancements, and validation rules required from the backend team to permanently resolve technical debt and support frontend features across the NOOK Workspace platform.

---

## Priority Summary Matrix

| ID | Title | HTTP Method & Path | Priority | Frontend Status / Workaround |
|---|---|---|---|---|
| **REQ-01** | Room Hourly Pricing on Room DTO | `GET/POST/PUT /api/Rooms` | **P0 (Critical)** | Frontend queries `/api/PricingPlans` (scope 2) as fallback |
| **REQ-02** | Shift Modification & Multi-Channel Floats | `PUT /api/Shifts/{id}` | **P0 (Critical)** | Persisted in browser `localStorage` (`nook_shift_floats_{shiftId}`) |
| **REQ-03** | Server-Side RBAC Enforcement on Deletions | `DELETE /api/*` | **P0 (Critical)** | Frontend confirmation modals prevent accidental deletes |
| **REQ-04** | Recurring Reservation Series Management | `POST /api/Reservations/recurring` | **P1 (High)** | Iterative single reservation creation loop |
| **REQ-05** | Student Attendance & Visit Count API | `GET /api/Students/{id}/attendance-summary` | **P1 (High)** | Derived in frontend from cached session history |
| **REQ-06** | WhatsApp Notification Dispatch API | `POST /api/Notifications/whatsapp` | **P2 (Medium)** | Documented in `docs/specs/NOOK-FEAT-08.md` |
| **REQ-07** | WiFi Presence Integration Endpoint | `GET /api/Integrations/wifi/presence` | **P2 (Medium)** | Documented in `docs/specs/NOOK-FEAT-09.md` |
| **REQ-08** | PDF Invoice & Receipt Generation | `GET /api/Invoices/{id}/pdf` | **P2 (Medium)** | Documented in `docs/specs/NOOK-FEAT-10.md` |

---

## 1. REQ-01: Hourly Price on Room DTO (NOOK-DEV-04, O-3)

### Background & Problem
Currently, `RoomDto`, `CreateRoomDto`, and `UpdateRoomDto` lack an explicit `hourlyPrice` column. The frontend is forced to perform secondary lookups against `PricingPlan` with `scope: 2`. Newly created rooms often lack associated pricing plans, resulting in ambiguity or 0 EGP billing unless staff manually navigates to Settings.

### Specification
- **Endpoints:**
  - `GET /api/Rooms`
  - `GET /api/Rooms/{id}`
  - `POST /api/Rooms`
  - `PUT /api/Rooms/{id}`
- **DTO Modification:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Workhive",
  "nameEn": "Workhive",
  "capacity": 25,
  "hourlyPrice": 30.0,
  "supportsWorkspace": true,
  "supportsClassroom": true,
  "workspaceZone": 1,
  "imageUrl": "/uploads/rooms/workhive.jpg",
  "isActive": true
}
```
- **Validation Rules:**
  - `hourlyPrice` must be a non-negative decimal (`hourlyPrice >= 0`).
  - If `supportsClassroom == true`, `hourlyPrice` should be > 0.
- **Error Codes:**
  - `400 Bad Request` if `hourlyPrice < 0`.

---

## 2. REQ-02: Shift Modification & Multi-Channel Floats (NOOK-FEAT-07, O-5)

### Background & Problem
Once a shift is opened via `POST /api/Shifts`, the backend provides no endpoint to update the opening balance or modify closing figures if a clerical error occurred. Furthermore, `ShiftDto` currently bundles opening floats into a single number rather than recording per-channel opening balances (Cash, Vodafone Cash, InstaPay, Fawry).

### Specification
- **Endpoint:** `PUT /api/Shifts/{id}`
- **Permissions:** Admin role required (`[Authorize(Roles = "Admin")]`).
- **Request Schema:**
```json
{
  "openingCash": 500.0,
  "openingVodafone": 3450.0,
  "openingInstapay": 202.0,
  "openingFawry": 0.0,
  "actualClosingCash": 620.0,
  "actualClosingVodafone": 3600.0,
  "actualClosingInstapay": 450.0,
  "actualClosingFawry": 0.0,
  "notes": "Adjusted opening cash after drawer count recount"
}
```
- **Response Schema:**
```json
{
  "id": "guid",
  "shiftNumber": 142,
  "status": "Closed",
  "totalExpected": 4670.0,
  "totalActual": 4670.0,
  "discrepancy": 0.0,
  "updatedAt": "2026-10-11T12:00:00Z"
}
```
- **Error Codes:**
  - `401 Unauthorized` / `403 Forbidden` if caller is not an Admin.
  - `404 Not Found` if `id` does not exist.

---

## 3. REQ-03: Server-Side RBAC Enforcement on Deletions (NOOK-SEC-01)

### Background & Problem
Destructive actions on the frontend (deleting student profiles, room configurations, cafeteria items, or reservations) currently enforce authorization primarily via frontend route guards and UI button visibility. If a non-admin sends a direct `DELETE` request, the backend must guarantee strict rejection.

### Specification
- **Target Endpoints:**
  - `DELETE /api/Students/{id}`
  - `DELETE /api/Reservations/{id}`
  - `DELETE /api/Instructors/{id}`
  - `DELETE /api/Products/{id}`
  - `DELETE /api/PricingPlans/{id}`
- **Security Requirement:**
  - Validate JWT bearer token contains claim `Role: Admin`.
  - Return `403 Forbidden` with structured JSON body:
```json
{
  "error": "Forbidden",
  "messageAr": "غير مصرح لك بتنفيذ عملية الحذف. هذه الصلاحية مخصصة لمدير النظام فقط.",
  "messageEn": "You do not have permission to delete this record. Administrator privilege required."
}
```

---

## 4. REQ-04: Recurring Reservation Series Management (NOOK-FEAT-06)

### Background & Problem
When creating a recurring reservation (e.g., an instructor booking Room 1 every Monday and Wednesday for 8 weeks), the frontend currently dispatches individual `POST /api/Reservations` calls. If network fails mid-way or a conflict occurs on week 5, partial reservation series are left orphaned without a shared link.

### Specification
- **Endpoint:** `POST /api/Reservations/recurring`
- **Request Schema:**
```json
{
  "roomId": "guid",
  "instructorId": "guid",
  "title": "Data Structures Workshop",
  "startTime": "14:00",
  "endTime": "16:00",
  "frequency": "Weekly",
  "daysOfWeek": [1, 3],
  "startDate": "2026-10-15",
  "endDate": "2026-12-15",
  "dryRun": false
}
```
- **Response Schema:**
```json
{
  "seriesId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "totalRequested": 18,
  "successfulReservations": 17,
  "conflicts": [
    {
      "date": "2026-11-04",
      "conflictingReservationId": "guid-991",
      "reason": "Room already booked by Python Workshop (13:00 - 15:00)"
    }
  ]
}
```
- **Series Bulk Cancellation Endpoint:**
  - `DELETE /api/Reservations/series/{seriesId}`
  - Cancels all future unpaid reservations in the series in a single atomic transaction.

---

## 5. REQ-05: Student Attendance & Visit Count API (NOOK-FEAT-05)

### Background & Problem
The frontend student directory displays the number of completed visits per student. Currently, this is computed on the client side by parsing closed session history. A dedicated backend aggregate endpoint will ensure consistency and reduce payload size.

### Specification
- **Endpoint:** `GET /api/Students/{id}/attendance-summary`
- **Response Schema:**
```json
{
  "studentId": "guid",
  "totalVisits": 24,
  "totalHoursSpent": 78.5,
  "totalSpendEgp": 1570.0,
  "firstVisitDate": "2026-01-12T10:30:00Z",
  "lastVisitDate": "2026-10-10T18:45:00Z",
  "activePackageHoursRemaining": 12.0
}
```

---

## 6. REQ-06: WhatsApp Notification Dispatch API (NOOK-FEAT-08)

### Background
Reference architectural specification: `docs/specs/NOOK-FEAT-08.md`.

### Specification
- **Endpoint:** `POST /api/Notifications/whatsapp`
- **Request Schema:**
```json
{
  "recipientPhone": "+201012345678",
  "templateType": "SessionCheckoutReceipt",
  "templateParameters": {
    "studentName": "أحمد محمود",
    "durationHours": "3.5",
    "totalEgp": "70",
    "receiptUrl": "https://nook.workspace/receipts/rec-9821"
  }
}
```
- **Status Codes:**
  - `202 Accepted` — queued for dispatch.
  - `422 Unprocessable Entity` — invalid phone format.

---

## 7. REQ-07: WiFi Presence Integration Endpoint (NOOK-FEAT-09)

### Background
Reference architectural specification: `docs/specs/NOOK-FEAT-09.md`.

### Specification
- **Endpoint:** `GET /api/Integrations/wifi/presence`
- **Response Schema:**
```json
{
  "timestamp": "2026-10-11T12:00:00Z",
  "activeDeviceCount": 38,
  "unregisteredMacs": 4,
  "detectedStudents": [
    {
      "studentId": "guid",
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "rssi": -55,
      "zone": "SilentZone"
    }
  ]
}
```

---

## 8. REQ-08: PDF Invoice & Receipt Generation (NOOK-FEAT-10)

### Background
Reference architectural specification: `docs/specs/NOOK-FEAT-10.md`.

### Specification
- **Endpoint:** `GET /api/Invoices/{id}/pdf`
- **Query Parameters:** `?lang=ar` (default) or `?lang=en`
- **Response:** Binary Stream (`application/pdf`) with `Content-Disposition: inline; filename="nook-invoice-INV-2026-0042.pdf"`.
>>>>>>> fix/audit-remediation
