# Student Page — Backend Requirements Specification

This document details the backend API enhancements and endpoints required to fully support the Student module's advanced business logic, auditing rules, and security policies.

---

## 1. Shift Opener Password Verification Endpoint

- **Issue**:
  Deleting active student records or performing sensitive operations requires verifying the password of the person who opened the active shift (`shift.staffName`). Currently, the frontend attempts a fallback through `POST /api/Auth/login` using the staff identifier, which is intended for session logins and may issue new auth tokens or trigger rate limiting.
- **Required Endpoint**: `POST /api/Shifts/{shiftId}/verify-password` (or `POST /api/Shifts/verify-password`)
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "shiftId": "string (GUID or integer ID)",
    "staffIdentifier": "string (username or email)",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "verified": true,
    "message": "Shift opener credentials verified successfully"
  }
  ```
  *Error Response (401 / 403)*:
  ```json
  {
    "success": false,
    "verified": false,
    "error": "Invalid shift opener password"
  }
  ```
- **Why Needed**:
  Provides a secure, audit-compliant mechanism to verify shift authorization before irreversible administrative actions (e.g. deleting an active student session) without altering the user's active session state.
- **Frontend Impact**:
  Replaces the fallback login invocation in `ShowStudentComponent.confirmDelete()` with a dedicated, secure authorization call.
- **Priority**: High

---

## 2. Active Session Room & Zone Persistence

- **Issue**:
  Students must strictly belong to a designated room (Shared Room, Silent Room, Classroom, etc.) during their stay. The frontend validates and includes `roomId`, `roomName`, and `zone` in the check-in payload, but the backend session record must consistently persist and return this information upon retrieval.
- **Required Endpoint**: `POST /api/Students` (Check-in / Create Active Session)
- **Method**: `POST`
- **Request Body Additions**:
  ```json
  {
    "name": "string",
    "phoneNumber": "string",
    "roomId": "string",
    "zone": 0,
    "addedBy": "string",
    "printingPrice": 2.0
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "name": "string",
    "roomId": "string",
    "roomName": "string",
    "zone": 0,
    "addedBy": "string",
    "status": "active"
  }
  ```
- **Why Needed**:
  Ensures that active room occupancy calculations in the Room Management module and active student sessions in the Student module remain synchronized across refreshes and multiple client devices.
- **Frontend Impact**:
  Guarantees room information is populated when fetching `/api/Students` or active sessions.
- **Priority**: High

---

## 3. Wallet Debt/Credit Persistence on Checkout

- **Issue**:
  When checking out a student, the customer can pay partially or carry forward credit/debt:
  $$W_{new} = W_{prev} + R - C$$
  where $W_{new}$ can be negative (debt) or positive (credit). The backend checkout endpoint must accept and persist `newWalletBalance` and `amountReceived` on the student record.
- **Required Endpoint**: `POST /api/Students/{id}/checkout`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "studentId": "string",
    "checkOutTime": "2026-09-07T12:00:00.000Z",
    "durationHours": 2.5,
    "totalCost": 50.0,
    "amountReceived": 30.0,
    "walletAmount": -20.0,
    "paymentMethod": "cash",
    "shiftId": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "status": "completed",
    "walletAmount": -20.0,
    "totalCost": 50.0,
    "amountReceived": 30.0
  }
  ```
- **Why Needed**:
  Ensures that student balances persist accurately in the database across future visits without data loss or rounding discrepancies.
- **Frontend Impact**:
  Directly mapped and transmitted in `WorkspaceService.checkOutStudent()`.
- **Priority**: High

---

## 4. Blacklist Audit Reason in Autocomplete Search

- **Issue**:
  When searching for a student during check-in, the API should return `isBlocked` (or `canBook: false`) along with the specific `blockReason` so staff understand why the student cannot be checked in.
- **Required Endpoint**: `GET /api/Students?search={term}`
- **Response Item**:
  ```json
  {
    "id": "string",
    "name": "string",
    "phone": "string",
    "canBook": false,
    "isBlocked": true,
    "blockReason": "Disciplinary suspension"
  }
  ```
- **Why Needed**:
  Enables the autocomplete dropdown to render the `⛔ BLOCKED` badge and inform staff of the reason, preventing accidental check-ins.
- **Frontend Impact**:
  Allows seamless rendering of block status badges during search.
- **Priority**: Medium
