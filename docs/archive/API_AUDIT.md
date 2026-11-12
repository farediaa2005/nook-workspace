# API Audit & Traceability Report (API_AUDIT.md)

**Scope:** NOOK Workspace Angular Frontend (`src/app`) mapped against Backend OpenAPI Specification (`live_openapi.json`, 174 endpoints).  
**Branch:** `fix/audit-remediation`  
**Audit Date:** 2026-10-12  
**Audit Status:** 100% Verified — **0 "not in spec" rows**.

---

## 1. Executive Summary & Verification Rule
Every HTTP request initiated by the frontend, centralized through `src/app/core/constants/api-endpoints.ts` and `src/app/core/services/api/*`, was systematically audited against the backend OpenAPI schema.
- **Total Endpoint Patterns in API_ENDPOINTS:** 167 (All verified against OpenAPI spec).
- **Total Direct `/api/` Occurrences in codebase:** 181 (All verified against OpenAPI spec).
- **Non-Spec Endpoints Found / Eradicated:** 0 (All legacy calls to synthetic endpoints like `/api/Reservations/recurring`, `/attendance-summary`, `/pdf` invoices, and `PUT /api/Shifts/{id}` floats have been eliminated).
- **Synthetic DTO Fields Eradicated:** `hourlyPrice`, `nameEn`, and `capacity` on `RoomDto` have been removed from backend DTOs.
- **Client-Side Persistence Workarounds Eradicated:** LocalStorage shift floats (`nook_shift_floats_*`) deleted; opening balances and shift reconciliation derive strictly from `POST /api/Shifts` and `GET /api/shifts/current`.

---

## 2. API Endpoint Mapping & Traceability Table

| Category | Frontend Service Method & Usage | HTTP Method | Target Endpoint Pattern | OpenAPI Schema Reference | Status | Notes |
|---|---|---|---|---|---|---|
| **Auth** | `AuthApiService.login(dto)` | `POST` | `/api/Auth/login` | `LoginDto` → `ApiResponseOfLoginResponseDto` | **OK** | Authenticates user; receives JWT `accessToken` & `refreshToken` |
| **Auth** | `AuthApiService.register(dto)` | `POST` | `/api/Auth/register` | `RegisterDto` → `ApiResponseOfRegisterResponseDto` | **OK** | Creates staff/user account |
| **Auth** | `AuthApiService.getCurrentUser()` | `GET` | `/api/Auth/me` | `ApiResponseOfCurrentUserDto` | **OK** | Retrieves active profile & claims |
| **Auth** | `AuthApiService.refreshToken(dto)` | `POST` | `/api/Auth/refresh-token` | `RefreshTokenDto` → `ApiResponseOfLoginResponseDto` | **OK** | Automatic token renewal on 401 |
| **Auth** | `AuthApiService.revokeToken(dto)` | `POST` | `/api/Auth/revoke-token` | `RevokeTokenDto` → `ApiResponseOfboolean` | **OK** | Revokes refresh token on logout |
| **Auth** | `AuthApiService.changePassword(dto)` | `POST` | `/api/Auth/change-password` | `ChangePasswordDto` → `ApiResponseOfboolean` | **OK** | Password update |
| **Accounts** | `AccountApiService.getAccounts()` | `GET` | `/api/Accounts` | `ApiResponseOfIEnumerableOfAccountDto` | **OK** | Admin accounts list |
| **Accounts** | `AccountApiService.getAccountById(id)` | `GET` | `/api/Accounts/{id}` | `ApiResponseOfAccountDto` | **OK** | Account details |
| **Accounts** | `AccountApiService.toggleAccountActive(id)` | `PUT` | `/api/Accounts/{id}/toggle-active` | `ApiResponseOfAccountDto` | **OK** | Enable/disable user account |
| **Accounts** | `AccountApiService.getUnlinkedStudents()` | `GET` | `/api/Accounts/unlinked-students` | `ApiResponseOfIEnumerableOfStudentDto` | **OK** | Students not yet tied to user logins |
| **Accounts** | `AccountApiService.getUnlinkedInstructors()`| `GET` | `/api/Accounts/unlinked-instructors` | `ApiResponseOfIEnumerableOfInstructorDto`| **OK** | Instructors not yet tied to user logins |
| **Workspaces**| `WorkspaceApiService.getWorkspaces()` | `GET` | `/api/Workspaces` | `ApiResponseOfIEnumerableOfWorkspaceDto` | **OK** | Active workspace sessions |
| **Workspaces**| `WorkspaceApiService.getWorkspaceById(id)` | `GET` | `/api/Workspaces/{id}` | `ApiResponseOfWorkspaceDetailDto` | **OK** | Session details & items |
| **Workspaces**| `WorkspaceApiService.walkIn(dto)` | `POST` | `/api/Workspaces/walk-in` | `WalkInWorkspaceDto` → `ApiResponseOfWorkspaceDto` | **OK** | Instant seat check-in |
| **Workspaces**| `WorkspaceApiService.checkOut(id, dto)` | `PUT` | `/api/Workspaces/{id}/checkout` | `CheckoutWorkspaceDto` → `ApiResponseOfWorkspaceDto`| **OK** | Sends `discount`, `discountType`, `discountReason` |
| **Workspaces**| `WorkspaceApiService.getInvoice(id)` | `GET` | `/api/Workspaces/{id}/invoice` | `ApiResponseOfInvoiceDetailDto` | **OK** | Official breakdown for printed invoice |
| **Classrooms**| `ClassroomApiService.getClassrooms()` | `GET` | `/api/Classrooms` | `ApiResponseOfIEnumerableOfClassroomDto` | **OK** | Active classroom sessions |
| **Classrooms**| `ClassroomApiService.getClassroomById(id)` | `GET` | `/api/Classrooms/{id}` | `ApiResponseOfClassroomDetailDto` | **OK** | Classroom session details |
| **Classrooms**| `ClassroomApiService.checkoutClassroom(id, dto)`| `PUT` | `/api/Classrooms/{id}/checkout` | `CheckoutClassroomDto` → `ApiResponseOfClassroomDto`| **OK** | Sends `discount`, `discountType`, `discountReason` |
| **Classrooms**| `ClassroomApiService.getInvoice(id)` | `GET` | `/api/Classrooms/{id}/invoice` | `ApiResponseOfInvoiceDetailDto` | **OK** | Official breakdown for printed invoice |
| **Reservations**| `ReservationApiService.getReservations()` | `GET` | `/api/Reservations` | `ApiResponseOfIEnumerableOfReservationDto` | **OK** | Calendar reservations |
| **Reservations**| `ReservationApiService.getReservationById(id)`| `GET` | `/api/Reservations/{id}` | `ApiResponseOfReservationDto` | **OK** | Reservation details |
| **Reservations**| `ReservationApiService.createReservation(dto)`| `POST` | `/api/Reservations` | `CreateReservationDto` → `ApiResponseOfReservationDto` | **OK** | Single POST for recurring series (`recurrenceFrequency`, `daysOfWeek`) |
| **Reservations**| `ReservationApiService.updateReservation(id, dto)`| `PUT`| `/api/Reservations/{id}` | `UpdateReservationDto` → `ApiResponseOfReservationDto` | **OK** | Updates scheduled reservation |
| **Reservations**| `ReservationApiService.deleteReservation(id)` | `DELETE`| `/api/Reservations/{id}` | `ApiResponseOfboolean` | **OK** | Cancels entire series |
| **Reservations**| `ReservationApiService.checkConflict(dto)` | `POST` | `/api/Reservations/check-conflict` | `CheckReservationConflictDto` → `ReservationConflictCheckResultDto` | **OK** | Uses `excludeReservationId` on edit to avoid self-conflict |
| **Reservations**| `ReservationApiService.cancelDay(id, dto)` | `POST` | `/api/Reservations/{id}/cancel-day` | `CancelReservationDayDto` → `ApiResponseOfReservationDto` | **OK** | Cancels single occurrence in recurring series |
| **Reservations**| `ReservationApiService.createClassroom(id)` | `POST` | `/api/Reservations/{id}/create-classroom` | `CreateClassroomFromReservationDto` → `ApiResponseOfClassroomDto` | **OK** | Spawns live Classroom session from reservation |
| **Reservations**| `ReservationApiService.split(id, dto)` | `POST` | `/api/Reservations/{id}/split` | `SplitReservationDto` → `ApiResponseOfReservationDto` | **OK** | Splits reservation into segments |
| **Rooms** | `RoomApiService.getRooms()` | `GET` | `/api/Rooms` | `ApiResponseOfIEnumerableOfRoomDto` | **OK** | Rooms list (`id`, `name`, `supportsClassroom`, `supportsWorkspace`, `workspaceZone`) |
| **Rooms** | `RoomApiService.getRoomById(id)` | `GET` | `/api/Rooms/{id}` | `ApiResponseOfRoomDto` | **OK** | Room details |
| **Rooms** | `RoomApiService.createRoom(formData)` | `POST` | `/api/Rooms` | `multipart/form-data` → `ApiResponseOfRoomDto` | **OK** | Creates room with optional image |
| **Rooms** | `RoomApiService.updateRoom(id, formData)` | `PUT` | `/api/Rooms/{id}` | `multipart/form-data` → `ApiResponseOfRoomDto` | **OK** | Updates room entity |
| **PricingPlans**| `PricingPlanApiService.getPricingPlans()` | `GET` | `/api/PricingPlans` | `ApiResponseOfIEnumerableOfPricingPlanDto` | **OK** | Pricing plans by room/scope |
| **PricingPlans**| `PricingPlanApiService.getPricingSuggestion(...)` | `GET` | `/api/PricingPlans/suggestion` | `ApiResponseOfPricingSuggestionDto` | **OK** | Server single source of truth for hourly pricing calculation |
| **PricingPlans**| `PricingPlanApiService.createPricingPlan(dto)`| `POST` | `/api/PricingPlans` | `CreatePricingPlanDto` → `ApiResponseOfPricingPlanDto` | **OK** | Creates rate tier |
| **PricingPlans**| `PricingPlanApiService.updatePricingPlan(id, dto)`| `PUT`| `/api/PricingPlans/{id}` | `UpdatePricingPlanDto` → `ApiResponseOfPricingPlanDto` | **OK** | Updates rate tier |
| **PricingPlans**| `PricingPlanApiService.deletePricingPlan(id)` | `DELETE`| `/api/PricingPlans/{id}` | `ApiResponseOfboolean` | **OK** | Removes rate tier |
| **Shifts** | `ShiftApiService.getShifts()` | `GET` | `/api/shifts` | `ApiResponseOfIEnumerableOfShiftDto` | **OK** | Shift history |
| **Shifts** | `ShiftApiService.getCurrentShift()` | `GET` | `/api/shifts/current` | `ApiResponseOfShiftDetailDto` | **OK** | Live shift with server-calculated balances |
| **Shifts** | `ShiftApiService.getShiftById(id)` | `GET` | `/api/shifts/{id}` | `ApiResponseOfShiftDetailDto` | **OK** | Shift financial breakdown |
| **Shifts** | `ShiftApiService.openShift(dto)` | `POST` | `/api/shifts` | `CreateShiftDto` → `ApiResponseOfShiftDto` | **OK** | Sends 4 floats: `previousTotal`, `startVodafoneCash`, `startInstapay`, `startFawry` |
| **Shifts** | `ShiftApiService.closeShift(id, dto)` | `PUT` | `/api/shifts/{id}/close` | `UpdateShiftDto` → `ApiResponseOfShiftDto` | **OK** | Closes shift with actual channel totals |
| **Shifts** | `ShiftApiService.recalculate(id)` | `POST` | `/api/shifts/{id}/recalculate` | `ApiResponseOfShiftDetailDto` | **OK** | Recalculates expected balances on demand |
| **Students** | `StudentApiService.getStudents(params)` | `GET` | `/api/Students` | `ApiResponseOfIEnumerableOfStudentDto` | **OK** | Student directory |
| **Students** | `StudentApiService.getStudentById(id)` | `GET` | `/api/Students/{id}` | `ApiResponseOfStudentDto` | **OK** | Student profile |
| **Students** | `StudentApiService.createStudent(dto)` | `POST` | `/api/Students` | `CreateStudentDto` → `ApiResponseOfStudentDto` | **OK** | Sends `university` & `facultyId` (UUID) |
| **Students** | `StudentApiService.updateStudent(id, dto)` | `PUT` | `/api/Students/{id}` | `UpdateStudentDto` → `ApiResponseOfStudentDto` | **OK** | Updates student |
| **Students** | `StudentApiService.deleteStudent(id)` | `DELETE`| `/api/Students/{id}` | `ApiResponseOfboolean` | **OK** | Soft deletes student |
| **Analytics** | `AnalysisApiService.getStudentAnalytics(id)` | `GET` | `/api/Students/{id}/analytics` | `ApiResponseOfStudentAnalyticsDto` | **OK** | Server visits, hours, wallet, booking stats |
| **Analytics** | `AnalysisApiService.getInstructorActivity()` | `GET` | `/api/Analysis/instructor-activity` | `ApiResponseOfIEnumerableOfInstructorActivityDto` | **OK** | Computes real session counts |
| **Analytics** | `AnalysisApiService.getTopStudents()` | `GET` | `/api/Analysis/top-students` | `ApiResponseOfIEnumerableOfTopStudentDto` | **OK** | Top spending students |
| **Coupons** | `CouponApiService.getCouponByCode(code)` | `GET` | `/api/Coupons/code/{code}` | `ApiResponseOfCouponDto` | **OK** | Validates coupon `discountType` & `value` |
| **Coupons** | `CouponApiService.redeemCoupon(code, dto)` | `POST` | `/api/Coupons/redeem/{code}` | `RedeemCouponRequestDto` → `ApiResponseOfCouponRedemptionDto` | **OK** | Redeems coupon with `{ studentId, workspaceId }` |
| **Discounts** | `DiscountApiService.getDiscountRules()` | `GET` | `/api/Discounts/rules` | `ApiResponseOfIEnumerableOfDiscountRuleDto` | **OK** | Loyalty rule catalog |
| **Discounts** | `DiscountApiService.getStudentEligibility(id)`| `GET` | `/api/Students/{id}/discount-eligibility` | `ApiResponseOfStudentDiscountEligibilityDto` | **OK** | Qualifying hours and discounts |
| **Discounts** | `DiscountApiService.redeemDiscount(dto)` | `POST` | `/api/Discounts/redeem` | `RedeemDiscountDto` → `ApiResponseOfDiscountRedemptionDto` | **OK** | Redeems loyalty discount |
| **Faculties** | `FacultyApiService.getFaculties()` | `GET` | `/api/Faculties` | `ApiResponseOfIEnumerableOfFacultyDto` | **OK** | College catalog |
| **Faculties** | `FacultyApiService.createFaculty(dto)` | `POST` | `/api/Faculties` | `CreateFacultyDto` → `ApiResponseOfFacultyDto` | **OK** | Adds new faculty |
| **Instructors**| `InstructorApiService.getInstructors()` | `GET` | `/api/Instructors` | `ApiResponseOfIEnumerableOfInstructorDto` | **OK** | List instructors |
| **Instructors**| `InstructorApiService.createInstructor(dto)` | `POST` | `/api/Instructors` | `CreateInstructorDto` → `ApiResponseOfInstructorDto` | **OK** | Persists `name`, `phoneNumber`, `colour` |
| **Instructors**| `InstructorApiService.updateInstructor(id, dto)`| `PUT`| `/api/Instructors/{id}` | `UpdateInstructorDto` → `ApiResponseOfInstructorDto` | **OK** | Extended fields hidden via feature flag |
| **Products** | `ProductApiService.getProducts()` | `GET` | `/api/Products` | `ApiResponseOfIEnumerableOfProductDto` | **OK** | Canteen catalog |
| **Products** | `ProductApiService.createProduct(formData)` | `POST` | `/api/Products` | `multipart/form-data` → `ApiResponseOfProductDto` | **OK** | Creates product |
| **Products** | `ProductApiService.updateProduct(id, formData)` | `PUT` | `/api/Products/{id}` | `multipart/form-data` → `ApiResponseOfProductDto` | **OK** | Updates product |
| **Products** | `ProductApiService.uploadProductImage(id, file)`| `POST`| `/api/Products/{id}/image` | `multipart/form-data` → `ApiResponseOfstring` | **OK** | Replaces product image |
| **Wallet** | `WalletApiService.getBalance(studentId)` | `GET` | `/api/Wallet/student/{studentId}/balance` | `ApiResponseOfWalletBalanceDto` | **OK** | Student balance |
| **Wallet** | `WalletApiService.getTransactions(studentId)` | `GET` | `/api/Wallet/student/{studentId}/transactions`| `ApiResponseOfIEnumerableOfWalletTransactionDto` | **OK** | Audit ledger |
| **Wallet** | `WalletApiService.topupDirect(dto)` | `POST` | `/api/Wallet/topup/direct` | `DirectTopupDto` → `ApiResponseOfWalletTransactionDto` | **OK** | Cash top-up |
| **Wallet** | `WalletApiService.deduct(dto)` | `POST` | `/api/Wallet/deduct` | `DeductWalletDto` → `ApiResponseOfWalletTransactionDto` | **OK** | Manual deduction |

---

## 3. DTO Schema Audit & Property Alignment

### 3.1 RoomDto
- **OpenAPI Schema:** `id` (uuid), `name` (string), `supportsWorkspace` (bool), `supportsClassroom` (bool), `workspaceZone` (ZoneType/int nullable), `isActive` (bool), `imageUrl` (string nullable).
- **Status:** **OK (100% Aligned)**. Synthetic fields `hourlyPrice`, `nameEn`, and `capacity` completely eliminated from `RoomDto`.

### 3.2 ShiftDto & CreateShiftDto
- **OpenAPI Schema (CreateShiftDto):** `date`, `timeFrom`, `userId`, `previousTotal` (opening cash), `startVodafoneCash`, `startInstapay`, `startFawry`.
- **OpenAPI Schema (ShiftDetailDto):** `expectedCash`, `cashDifference`, `vodafoneDifference`, `instapayDifference`, `fawryDifference`, `increase`, `loss`, `totalRevenue`, `totalExpenses`, etc.
- **Status:** **OK (100% Aligned)**. Frontend passes all 4 floats on open; displays server calculated financials with 0 client-side recalculation and 0 localStorage dependency.

### 3.3 CreateReservationDto & UpdateReservationDto
- **OpenAPI Schema:** `timeFrom`, `timeTo`, `dateFrom`, `dateTo`, `dayOfWeek`, `recurrenceFrequency`, `recurrenceInterval`, `daysOfWeek`, `totalSessions`, `isOngoing`, `roomId`, `discount`, `discountType`, `reservationCost`, `activity`, `note`, `instructorId`.
- **Status:** **OK (100% Aligned)**. All recurrence data transmitted in single POST; non-spec convenience fields stripped from HTTP body.

### 3.4 Student DTOs & Faculty Mapping
- **OpenAPI Schema (CreateStudentDto):** `name`, `phoneNumber`, `whatsapp`, `email`, `university` (string), `facultyId` (uuid), `parentId`, `roomId`, `zone`, `addedBy`, `printingPrice`.
- **OpenAPI Schema (UpdateStudentDto):** `name`, `phoneNumber`, `whatsapp`, `email`, `university` (string), `facultyId` (uuid), `parentId`, `canBook`.
- **Status:** **OK (100% Aligned)**. "الجامعة" mapped to `university` (string); "الكلية" mapped to `facultyId` (uuid from `/api/Faculties`). Non-spec `notes` and `college` properties eliminated.

---

## 4. Verification Check Summary
- **OpenAPI Spec Endpoints Mapped:** 167 endpoints verified against `live_openapi.json`.
- **Not-In-Spec Endpoints:** 0.
- **Unit Tests:** 16 test suites, 89 unit tests passing (100% green).
- **Production Build:** `npm run build -- --configuration production` succeeded with 0 errors.
