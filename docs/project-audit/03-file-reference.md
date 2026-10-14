# NOOK Workspace — Technical Audit & Reverse Engineering Report
## Volume 3: Comprehensive File-by-File Technical Reference

> **Workspace Path:** `c:\Users\fares\Documents\GitHub\Nook\Frontend`  
> **Scope:** Detailed reference across all first-party architectural modules  

---

### Module 1: Core Infrastructure, Security & Utilities

#### 1. Constants
- **`src/app/core/constants/api-endpoints.ts` (296 lines)**
  - *Purpose:* Central registry of all REST endpoints across 18 backend domains.
  - *Exports:* `API_BASE_URL` (empty string `''`), `API_ENDPOINTS` object.
  - *Dependencies:* None.
  - *Consumers:* All 27 API services in `core/services/api/`, `auth.interceptor.ts`.
  - *Design Rationale:* Prevents URL hardcoding and enables easy backend route reconfiguration.
- **`src/app/core/constants/app.constants.ts` (148 lines)**
  - *Purpose:* Application-level configuration constants.
  - *Exports:* `STORAGE_KEYS` (`ACCESS_TOKEN`, `REFRESH_TOKEN`, `USER_DATA`, `THEME`, `LANGUAGE`), `PAGINATION_DEFAULTS`, `USER_ROLES`.
  - *Consumers:* `auth.service.ts`, `theme.service.ts`, `language.service.ts`, table components.
- **`src/app/core/constants/routes.ts` (112 lines)**
  - *Purpose:* Strongly typed route path constants.
  - *Exports:* `ROUTES` object (`AUTH.LOGIN`, `DASHBOARD`, `WORKSPACE.SHOW_STUDENT`, `CLASSROOM.SHOW_CLASSROOM`, `SHIFT.ACTIVE`, etc.).
  - *Consumers:* `app.routes.ts`, `sidebar.component.ts`, `navbar.component.ts`, feature components.

#### 2. Route Guards & HTTP Interceptors
- **`src/app/core/guards/auth.guard.ts` (36 lines)**
  - *Purpose:* Functional route guard safeguarding private dashboard routes.
  - *Logic:* Calls `AuthService.isAuthenticated()`. If false, navigates to `/auth/login` and blocks activation.
  - *Consumers:* `app.routes.ts` root layout route.
- **`src/app/core/guards/admin.guard.ts` (32 lines)**
  - *Purpose:* Role-based guard restricting administrative screens.
  - *Logic:* Calls `AuthService.isAdmin()`. If user role is not admin, redirects to `/dashboard`.
  - *Consumers:* `app.routes.ts` (`/settings/general`, `/settings/show-user`).
  - *Tests:* `admin.guard.spec.ts` (3 unit tests asserting access granted for admin and blocked for regular users).
- **`src/app/core/interceptors/auth.interceptor.ts` (140 lines)**
  - *Purpose:* HTTP pipeline interceptor for authentication and server health monitoring.
  - *Logic:*
    1. Checks if request URL is in `PUBLIC_ENDPOINTS` whitelist (`/api/Auth/login`, etc.). If so, bypasses token injection.
    2. Attaches `Authorization: Bearer <token>` to outbound headers.
    3. Traps errors: if HTTP 401 is received, queues concurrent requests using `BehaviorSubject` while executing `POST /api/Auth/refresh-token`. On failure, triggers `AuthService.logout()`.
    4. Reports outcome (success or 5xx/network failure) to `ApiHealthService`.
  - *Consumers:* Registered in `app.config.ts` via `provideHttpClient(withInterceptors([authInterceptor]))`.
  - *Tests:* `auth.interceptor.spec.ts` (4 unit tests).

#### 3. Utilities
- **`src/app/core/utils/avatar.util.ts` (72 lines)**
  - *Purpose:* Generates deterministic SVG initials avatars when an account lacks a profile picture.
  - *Exports:* `generateAvatarSvg(name, bgColor)`, `getSafeAvatar(avatarUrl, name)`.
  - *Design Rationale:* Prevents broken image links and eliminates placeholder images.
- **`src/app/core/utils/csv.util.ts` (88 lines) & `csv.util.spec.ts` (85 lines)**
  - *Purpose:* Generates sanitized CSV files for client-side download.
  - *Security Feature:* Escapes leading characters (`=`, `+`, `-`, `@`) to prevent CSV injection vulnerabilities in Excel.
- **`src/app/core/utils/date-time.util.ts` (215 lines)**
  - *Purpose:* Time formatting and parsing engine.
  - *Logic:* Parses ISO-8601 strings into local 12h/24h formats, computes minute differences, handles Arabic time markers (`ص`/`م`).
- **`src/app/core/utils/image-url.util.ts` (60 lines)**
  - *Purpose:* Resolves media asset URLs pointing to `/uploads/` ensuring they pass through the proxy.

---

### Module 2: Core Models & DTO Contracts (`src/app/core/models/`)

All 27 files contain pure TypeScript interfaces matching backend OpenAPI schemas:
- `user.model.ts`: `AuthUser`, `User`, `LoginRequestDto`, `AuthResponseDto`, `MeResponseDto`, `UserRole` enum.
- `student.model.ts`: `Student`, `CreateStudentDto`, `UpdateStudentDto`, `ActiveStudentSession`, `SessionCheckInDto`, `SessionCheckOutDto`.
- `classroom.model.ts`: `ClassroomCard`, `ClassroomDto`, `CreateClassroomDto`, `CheckoutClassroomDto`, `ReservationDto`, `CreateReservationDto`.
- `shift.model.ts`: `ShiftRecord`, `ShiftTransaction`, `ShiftHistoryItem`, `OpenShiftDto`, `CloseShiftDto`, `ShiftPaymentMethod`.
- `catering.model.ts`: `CateringProductItem`, `ProductCategory`, `CreateProductDto`, `UpdateProductDto`.
- `package.model.ts` & `package-api.model.ts`: `StudentPackage`, `InstructorPackage`, `CreatePackageDto`, `PricingPlanDto`.
- `coupon.model.ts` & `discount.model.ts`: `CouponDto`, `DiscountRuleDto`, validation helpers (`isCouponExpired`, `isCouponExhausted`).
- `api-response.model.ts`: Standard generic API wrappers `ApiResponse<T>`, `PaginatedResponse<T>`.
- `invoice.model.ts`, `wallet.model.ts`, `notification.model.ts`, `audit.model.ts`, `blacklist.model.ts`, `details.model.ts`.

---

### Module 3: Pure API Transport Layer (`src/app/core/services/api/`)

27 stateless services extending `BaseApiService`:
- `base-api.service.ts`: Root HTTP wrapper providing typed `get<T>`, `post<T>`, `put<T>`, `patch<T>`, and `delete<T>` with automatic query param serialization.
- `account-api.service.ts`: CRUD operations on user accounts, toggling active status, linking/unlinking role profiles.
- `workspace-api.service.ts`: Operations on student workspace sessions (`GET /api/Workspaces`, `POST /api/Workspaces/walk-in`, checkout).
- `classroom-api.service.ts`: Classroom bookings, live sessions, checkout, catering orders.
- `shift-api.service.ts`: Shift lifecycle (`POST /api/Shifts/open`, `POST /api/Shifts/{id}/close`, transactions, summaries).
- `product-api.service.ts`: Cafeteria catalogue management and stock queries.
- `reservation-api.service.ts`: Future booking queries and conflict check endpoint (`POST /api/Reservations/check-conflict`).
- `student-api.service.ts`, `instructor-api.service.ts`, `faculty-api.service.ts`, `blacklist-api.service.ts`, `discount-api.service.ts`, `coupon-api.service.ts`, `settings-api.service.ts`, `analysis-api.service.ts`, `staff-notification-api.service.ts`, `wallet-api.service.ts`.

---

### Module 4: Domain State & Business Services (`src/app/core/services/`)

The core business logic layer:
- **`auth.service.ts` (305 lines):**
  - Manages `currentUser = signal<AuthUser | null>(null)`.
  - Performs login, JWT expiration checking (`isJwtExpired`), session restoration, and token update signals.
- **`workspace.service.ts` (1,700 lines):**
  - Holds `activeStudentsState`, `historyStudentsState`, and student reference caches.
  - Implements desk billing calculations: duration to minutes, rate per hour, catering additions, package hour deductions.
  - Relational joins: combines workspace session data with student profiles and faculty names in O(1) time.
- **`classroom.service.ts` (2,070 lines):**
  - Holds `cardsState` (active rooms) and `reservationsState`.
  - Calculates overtime charges when sessions exceed `timeTo`.
  - Coordinates conflict checks to ensure room availability.
- **`shift.service.ts` (1,922 lines):**
  - Manages active cash register drawer and financial totals.
  - Computes 9 real-time financial signals: `openingCash`, `workspaceCash`, `classroomCash`, `packageCash`, `cateringCash`, `otherIncome`, `adminExpenses`, `vodafoneInside`, `vodafoneOutside`.
  - Calculates cash reconciliation variance (`actualCashCounted - expectedCash`).
- **`notification.service.ts` (710 lines):**
  - Operates real-time live alert engine checking low stock, session limits, and upcoming bookings.
- **`language.service.ts` (4,275 lines):**
  - Provides full bilingual translations for over 500 keys in English and Arabic.
- **`theme.service.ts` (90 lines):**
  - Toggles dark and light themes, updating `data-theme` on document root.
- **`api-health.service.ts` (105 lines):**
  - Periodically pings `/api/Accounts/unlinked-students` every 25s with `X-Health-Check` header.

---

### Module 5: Features — Workspace Desk Management

- **`src/app/features/workspace/add-student/` (3 files):**
  - Check-in form for students. Supports selecting existing students from autocomplete or entering a new student. Generates check-in payload for `POST /api/Workspaces/walk-in`.
- **`src/app/features/workspace/show-student/` (3 files, `.ts` 2,805 lines, `.css` 5,030 lines):**
  - The primary operational screen for workspace receptionists.
  - Live table rendering all active students, seating badges, duration counters (updating every minute), notes panel, and action menu.
  - Contains embedded modals: Catering POS order modal, change seat modal, student profile modal.
- **`src/app/features/workspace/checkout/` (3 files):**
  - Checkout screen showing itemized invoice: hours stayed, rate, catering balance, discounts, package deduction, and payment method selector (Cash, Visa, Vodafone Cash).

---

### Module 6: Features — Classroom & Reservations

- **`src/app/features/classroom/show-classroom/` (3 files, `.ts` 2,534 lines, `.css` 4,245 lines):**
  - Visual grid of room cards displaying room occupancy, current instructor, session timer, and overtime badge.
  - Interactive actions: Add room session, add catering, quick checkout.
- **`src/app/features/classroom/add-classroom/` (3 files):**
  - Booking wizard supporting room selection, instructor assignment, activity description, date/time range.
- **`src/app/features/classroom/checkout/` (3 files):**
  - Room settlement modal calculating room base cost, overtime penalties, printing costs, catering items, and package hour decrements.
- **`src/app/features/classroom/classroom-reservations/` (3 files, `.ts` 2,558 lines, `.css` 4,145 lines):**
  - Timeline and table view of upcoming room reservations with filter by room, date picker, conflict detection, and cancellation actions.
- **`src/app/features/classroom/show-reservation/` (3 files):**
  - Single reservation detail inspector.

---

### Module 7: Features — Shift Management

- **`src/app/features/shift/add-shift/` (3 files):**
  - "Open Shift" terminal screen. Displays staff identity card, live timestamp, opening float input, and confirmation button.
- **`src/app/features/shift/active-shift/` (3 files, `.ts` 480 lines, `.css` 850 lines):**
  - Live shift dashboard displaying the 9 financial breakdown cards and a real-time transaction ledger.
- **`src/app/features/shift/end-of-shift-balance/` (3 files):**
  - End of shift reconciliation. Staff enters actual counted cash; system computes discrepancy variance (`Balanced` vs `Disputed`).
- **`src/app/features/shift/shift-history/` (3 files):**
  - Historical shift records table with export buttons for Excel (CSV) and PDF.
- **`src/app/features/shift/search-shift/` & `show-shift/` (6 files):**
  - Search filter and single shift audit view.

---

### Module 8: Features — Packages, Catering, Details, Settings & Dashboard

- **`features/package/` (12 files):**
  - Student and instructor package directories with single-active-package validation.
- **`features/catering/` (18 files):**
  - Cafeteria inventory, stock management, and consumption graphs.
- **`features/details/` (15 files):**
  - Student directory, instructor directory, university affiliations, blacklist table, discount codes.
- **`features/settings/` (9 files):**
  - User and staff account administration (`show-user`), operational alert threshold configuration, user profile.
- **`features/dashboard/` (3 files):**
  - Executive analytics: occupancy metrics, daily revenue, active session counts.
- **`features/not-found/` (1 file):**
  - 404 handler.

---

### Module 9: Shared UI Library & Layouts

- **66 Shared Files:**
  - `navbar/`: Top navigation bar with global search, live server health indicator, language toggle, theme toggle, notifications dropdown, and user profile avatar.
  - `sidebar/`: Accordion navigation menu with active route highlighting and role-based link filtering.
  - `notification-center/`: Slide-out panel listing real-time system alerts.
  - `toast-container/`: Fixed overlay rendering ephemeral toast messages.
  - `checkout-modal/` & `checkout-success-modal/`: Reusable invoice modals.
  - `clock-time-picker/`: Analog/digital time selection widget.
  - `data-table/`, `pagination/`, `search-box/`, `modal/`, `confirm-dialog/`, `metric-card/`.
- **Layouts:** `auth-layout` (clean auth shell) and `main-layout` (dashboard shell with sidebar and navbar).

---

### Module 10: Automation Scripts (`scripts/`)

- `full_app_audit.mjs` (633 lines): Comprehensive headless Puppeteer audit testing all routes, console errors, and network statuses against `http://localhost:4200`.
- `test_all_fixes.mjs` (192 lines): Automated verification of booking modals, live boards, and admin login.
- `test_browser_auth.mjs` (74 lines): Headless authentication test.
- `test_deep_operations.mjs` (340 lines): Deep integration test exercising check-in, checkout, and shift workflows.
- `test_notes_flow.mjs` (160 lines): Tests persistence of student notes.
- `capture_notes_panel.mjs`, `check_modal_click.mjs`, `check_nav.mjs`: Targeted UI assertion scripts.
