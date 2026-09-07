# Backend Required Endpoints and Enhancements (BACKEND_REQUIRED.md)

> This document tracks all backend requirements, missing endpoints, and payload gaps identified while integrating the Angular Frontend with the Live Backend API (`https://nook.runasp.net`).
> Format: Feature, Frontend Page, Required Endpoint, HTTP Method, Why it is needed, Suggested Request, Suggested Response, Priority, Current blocker.

---

## Consolidated Summary Table

| Feature | Frontend Page | Required Endpoint | HTTP Method | Priority | Current Blocker |
|---|---|---|---|---|---|
| **Workspace Live Sessions** | `src/app/features/workspace/show-student` | `/api/Workspaces` | `GET` | **Critical (P0)** | Response contains only `studentId: Guid`, forcing client to fetch all students and perform in-memory joins. |
| **Walk-in Student Check-in** | `src/app/features/workspace/add-student` | `/api/Workspaces` | `POST` | **Critical (P0)** | Requires existing `studentId`; cannot check in walk-in student in a single atomic request. |
| **Student Packages Directory** | `src/app/features/package/show-student-package` | `/api/WorkspacePackages` | `GET` | **Critical (P0)** | Response lacks `studentName`, `phoneNumber`, `facultyName`, `packageName`. |
| **Instructor Packages Directory** | `src/app/features/package/show-instructor-package` | `/api/ClassroomPackages` | `GET` | **Critical (P0)** | Response lacks `instructorName`, `phoneNumber`, `specialty`, `packageName`. |
| **Classroom Sessions Listing** | `src/app/features/classroom/show-classroom` | `/api/Classrooms` | `GET` | **Critical (P0)** | Response lacks joined `roomName`, `instructorName`, `cateringTotal`. |
| **Classroom Reservations** | `src/app/features/classroom/classroom-reservations` | `/api/Reservations` | `GET` | **Critical (P0)** | Response lacks `roomName`, `instructorName`, `instructorPhoneNumber`. |
| **Auth Login Direct Profile** | `src/app/auth/login` | `/api/Auth/login` | `POST` | **High (P1)** | Response returns only tokens and role numbers; missing `fullName`, `username`, `email`, `staffRole`. |
| **Split Payment Checkout** | `src/app/features/workspace/checkout` | `/api/Workspaces/{id}/checkout` | `PUT` | **High (P1)** | Accepts only single `paidAmount` and `payWay`; missing `amountReceived`, `changeDue`, `remainingAmount`. |
| **Opening Shift Multi-channel** | `src/app/features/shift/add-shift` | `/api/Shifts` | `POST` | **High (P1)** | Only accepts cash `previousTotal`; lacks `startVodafoneCash`, `startInstapay`, `startFawry`. |
| **Closing Shift Multi-channel** | `src/app/features/shift/end-of-shift-balance` | `/api/Shifts/{id}/close` | `PUT` | **High (P1)** | Missing reconciliation fields for InstaPay and Fawry (`instapayInside`, `fawryInside`, actual balances). |
| **Atomic Package Hours Deduction**| `src/app/features/package` | `/api/WorkspacePackages/{id}/use-hours` | `POST` | **High (P1)** | Client currently does full `PUT` to update `remainingHours`, risking race conditions without audit history. |
| **Atomic Staff Account Creation**| `src/app/features/settings/add-user` | `/api/Accounts` | `POST` | **High (P1)** | Requires two separate HTTP calls (`POST /api/Accounts` then `POST /api/Accounts/{id}/profiles/staff`). |
| **Dashboard Footfall & Desks** | `src/app/features/dashboard` | `/api/Dashboard/summary` | `GET` | **High (P1)** | Missing `availableDesksCount`, `occupancyRatePercentage`, `totalFootfallToday`. |
| **Faculty Metadata** | `src/app/features/details/show-colleges` | `/api/Faculties` | `GET` / `POST` | **Medium (P2)** | Missing `university`, `campus`, `studentCount`, `notes`. |
| **Instructor Metadata** | `src/app/features/details/show-instructors` | `/api/Instructors` | `GET` / `POST` | **Medium (P2)** | Missing `email`, `specialty`, `affiliation`, `bio`. |
| **Multi-device Session Revocation**| `src/app/core/services/auth` | `/api/Auth/revoke-all` | `POST` | **Medium (P2)** | No endpoint to invalidate all active tokens for a compromised or changed account. |
| **Explicit Hourly Pricing Bounds**| `src/app/features/settings/general` | `/api/PricingPlans` | `GET` / `POST` | **Medium (P2)** | DTO has only `baseHours`; lacks explicit `fromHours` and `toHours` tiers. |
| **Room Metadata & Enums** | `src/app/features/settings/general` | `/api/Rooms` | `GET` / `POST` | **Medium (P2)** | Missing `nameEn`, explicit `type` enum, and uploaded `imageUrl` persistence. |

---

## Detailed Requirement Specifications

### 1. Workspace Sessions - Embedded Student Profile
* **Feature:** Workspace Active Sessions
* **Frontend Page:** `src/app/features/workspace/show-student`
* **Required Endpoint:** `/api/Workspaces`
* **HTTP Method:** `GET`
* **Why it is needed:** The endpoint currently returns only `studentId: Guid`, `seatElementId`, and `timeFrom`. To show the active students table, the client is forced to request all students from `/api/Students` and join in memory, which degrades performance (N+1 query problem).
* **Suggested Response:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "studentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "studentName": "أحمد محمود",
  "studentPhoneNumber": "01012345678",
  "studentWhatsapp": "01012345678",
  "facultyName": "هندسة",
  "college": "جامعة القاهرة",
  "timeFrom": "2026-09-06T10:00:00Z",
  "timeTo": null,
  "status": 1,
  "calculatedCost": 45.00,
  "cateringTotal": 30.00,
  "calculatedDuration": "1h 30m"
}
```
* **Priority:** Critical (P0)
* **Current Blocker:** Forces memory-join workaround and limits real-time search responsiveness.

---

### 2. Walk-in Student Check-in
* **Feature:** Walk-in Student Registration and Session Start
* **Frontend Page:** `src/app/features/workspace/add-student`
* **Required Endpoint:** `/api/Workspaces` (or `/api/Workspaces/walk-in`)
* **HTTP Method:** `POST`
* **Why it is needed:** Currently `POST /api/Workspaces` requires an existing `studentId`. Walk-in students who arrive at the workspace for the first time require two HTTP round-trips (`POST /api/Students` followed by `POST /api/Workspaces`).
* **Suggested Request:**
```json
{
  "studentName": "زياد أحمد طارق",
  "phoneNumber": "01098765432",
  "whatsappNumber": "01098765432",
  "facultyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "zoneType": 1,
  "seatElementId": null,
  "notes": "Walk-in"
}
```
* **Priority:** Critical (P0)
* **Current Blocker:** Receptionists experience latency creating student and checking in sequentially.

---

### 3. Student Packages Directory Joined Fields
* **Feature:** Student Package Management
* **Frontend Page:** `src/app/features/package/show-student-package`
* **Required Endpoint:** `/api/WorkspacePackages`
* **HTTP Method:** `GET`
* **Why it is needed:** `WorkspacePackageDto` only returns `id`, `studentId`, `hours`, `remainingHours`, `cost`. Name of student, phone, faculty, and package name are omitted.
* **Suggested Response:**
```json
{
  "id": "uuid",
  "studentId": "uuid",
  "studentName": "زياد أحمد طارق",
  "studentPhoneNumber": "01098765432",
  "facultyName": "كلية حاسبات ومعلومات",
  "packageName": "باكيدج الشهر القياسية",
  "hourlyRate": 20.0,
  "hours": 50,
  "remainingHours": 42,
  "cost": 850.0,
  "status": "active"
}
```
* **Priority:** Critical (P0)
* **Current Blocker:** Package table cannot display student names without client-side mapping.

---

### 4. Instructor Packages Directory Joined Fields
* **Feature:** Instructor Package Management
* **Frontend Page:** `src/app/features/package/show-instructor-package`
* **Required Endpoint:** `/api/ClassroomPackages`
* **HTTP Method:** `GET`
* **Why it is needed:** Returns only `instructorId`, omitting instructor name, phone number, specialty, and package title.
* **Suggested Response:**
```json
{
  "id": "uuid",
  "instructorId": "uuid",
  "instructorName": "د. أحمد حسام",
  "instructorPhoneNumber": "01012345678",
  "specialty": "ذكاء اصطناعي",
  "packageName": "باكيدج المعسكرات الاحترافية",
  "hourlyRate": 90.0,
  "hours": 50,
  "remainingHours": 42,
  "cost": 4500.0,
  "status": "active"
}
```
* **Priority:** Critical (P0)
* **Current Blocker:** Table lacks instructor metadata.

---

### 5. Multi-channel Cash Reconciliation for Shifts
* **Feature:** Shift Handover & Reconciliation
* **Frontend Page:** `src/app/features/shift/active-shift`, `src/app/features/shift/end-of-shift-balance`
* **Required Endpoint:** `/api/Shifts` (`POST`) and `/api/Shifts/{id}/close` (`PUT`)
* **HTTP Method:** `POST` / `PUT`
* **Why it is needed:** Egyptian workspaces rely on Vodafone Cash, InstaPay, and Fawry in addition to cash. Currently the DTO only stores `previousTotal` (cash) and `vfCashInside` / `vfCashOutside`. InstaPay and Fawry are missing entirely.
* **Suggested Request for Close:**
```json
{
  "timeTo": "2026-09-06T22:00:00Z",
  "administrative": 150.0,
  "vfCashInside": 1200.0,
  "vfCashOutside": 300.0,
  "instapayInside": 3400.0,
  "instapayOutside": 500.0,
  "fawryInside": 600.0,
  "fawryOutside": 0.0,
  "actualVodafone": 2100.0,
  "actualInstapay": 5900.0,
  "actualFawry": 1400.0,
  "increase": 0.0,
  "loss": 0.0,
  "totalCost": 4800.0,
  "status": 2
}
```
* **Priority:** High (P1)
* **Current Blocker:** Non-cash reconciliation cannot be finalized in the backend database.

---

### 6. Atomic Package Hours Deduction & History
* **Feature:** Package Hours Consumption
* **Frontend Page:** `src/app/features/package`, `src/app/features/workspace/checkout`
* **Required Endpoint:** `/api/WorkspacePackages/{id}/use-hours` & `/api/ClassroomPackages/{id}/use-hours`
* **HTTP Method:** `POST`
* **Why it is needed:** Currently, hours deduction is performed by issuing a full `PUT` on the package entity with modified `remainingHours`. This creates race condition risks and lacks an audit trail of which session consumed hours.
* **Suggested Request:**
```json
{
  "hours": 2.5,
  "sessionTitle": "جلسة مذاكرة",
  "roomOrDesk": "Desk 14",
  "note": "تم الاقتطاع عند التشيك أوت"
}
```
* **Priority:** High (P1)
* **Current Blocker:** Risk of data inconsistency during concurrent checkouts.

---

### 7. Auth Login Direct Profile Details
* **Feature:** User Authentication
* **Frontend Page:** `src/app/auth/login`
* **Required Endpoint:** `/api/Auth/login`
* **HTTP Method:** `POST`
* **Why it is needed:** Current response contains only `token`, `refreshToken`, `expiresAt`, `userId`, `roles`. Frontend must execute a second request to `GET /api/Auth/me` or decode JWT claims just to get the user's display name and staff role.
* **Suggested Response:**
```json
{
  "token": "eyJhbGci...",
  "refreshToken": "d8f9...",
  "expiresAt": "2026-09-06T19:00:00Z",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "username": "admin_fares",
  "fullName": "فارس محمد",
  "email": "fares@nook.io",
  "roles": ["Admin"],
  "staffRole": "Manager"
}
```
* **Priority:** High (P1)
* **Current Blocker:** Extra roundtrip required on login.
