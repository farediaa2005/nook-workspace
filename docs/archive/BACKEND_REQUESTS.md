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
