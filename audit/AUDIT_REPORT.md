# Nook Frontend Audit Report

Branch audited: `mariem` @ `117bd5a` (checked out as local branch `audit/frontend-mariem` in an isolated worktree).
Audit folder ("this folder"): `Frontend/`. Report date: 2026-11-10. Security is out of scope.

## Progress

- [x] 0. Safety commit — working tree was clean, nothing to commit (see Setup)
- [x] 1. Setup — deps installed, dev server running on http://localhost:4300
- [x] 2. Frontend map — routes + API calls
- [x] 3. Checks — type-check, build, unit tests (no linter configured)
- [x] 4. Dead code & unnecessary files
- [x] 5. Browser testing — 32 routes loaded, 2 click passes, 12 forms (empty / invalid / 1 valid), HAR recorded
- [x] 6. Responsive (360/768/1024/1440) — 128 screenshots, overflow measured on every page
- [x] Per-page sections
- [x] Summary table + Top 10
- [ ] Not done: valid submissions of money-moving / live-schedule forms (check-in, checkout, package sale, reservation, room booking, shift expense, discount, pricing tier, user, password) — deliberately not submitted on the live backend; their logic is covered by code reading (marked Suspected).

Pages done (32/32): /auth/login, /dashboard, /workspace/{show-student, add-student, checkout}, /classroom/{show-classroom, add-classroom, checkout, reservation, show-reservation}, /shift/{active, history, add-shift, show-shift, search-shift, end-of-shift-balance}, /package/{student, instructor, add-student-package, add-instructor-package}, /details/{show-students, show-colleges, show-blacklist, show-instructors}, /catering/{show-products, add-products, product-graph}, /settings/{general, discounts, show-user, profile}, 404 page.

Logs: `audit/logs/frontend.log` (dev server), `network.har` (load pass, 14 MB), `network-clicks.har`, `network-forms.har`, `network.md` (readable summary), `crawl-results.json`, `crawl-clicks.json`, `forms-run-main.json`, `forms-run.json` (valid instructor), `api-map.md`, `knip.txt`, `typecheck-*.log`, `build.log`, `test.log`. Scripts: `audit/scripts/` (crawl.mjs, forms.mjs, analyze.mjs, map-api.mjs, gen-pages.mjs). The Playwright profile with the signed-in session is in `audit/.pw-profile/` (git-ignored) — delete it after the audit.

## Fix status (2026-11-10, branch `mariem`)

Fixed in commits `07ac246`…`4b60cee`. Verified with type-check, `npm run lint` (0 errors), 111 unit tests, production build, and a full re-crawl of all 32 routes at 4 widths (`audit/logs/crawl-results.json` vs `crawl-results-before.json`):

| Metric (all routes, page load only) | Before | After |
|---|---|---|
| API responses | 1,380 | 755 |
| Endpoints requested more than once per page | 384 | 0 |
| Console errors | 20 | 1 (product image 404 on the server, [B-01]) |
| Pages with horizontal overflow | 0 | 0 |

| Issue | Status | How |
|---|---|---|
| G-01 swallowed write errors | Fixed | Checkout waits for the API; other writes show the error and reload from the server |
| G-02 delete fake success | Fixed | `catchError(() => of(true))` removed; pages show the failure |
| G-03 vercel.json | Not changed | Owner decision: no deploy for now |
| G-04 hardcoded colours | Deferred | Separate refactor task (owner decision) |
| G-05 duplicated package pages | Deferred | Separate refactor task |
| G-06 huge files | Deferred | Separate refactor task |
| G-07 toasts block buttons | Fixed | Clicks pass through toasts, toasts at the bottom, each alert once per session, none before sign-in |
| G-08 Escape | Fixed | App-level Escape closes the topmost overlay |
| G-09 request storm | Fixed | GET de-duplication interceptor (in-flight sharing + 3 s reuse, cleared by writes) |
| G-10 N+1 catering | Open | Needs a backend endpoint returning catering totals with sessions |
| G-11 validation UX | Fixed (hints) | Disabled submit buttons now say what is missing; rules still differ per form |
| G-12 mixed languages | Mostly fixed | Reservation dates/labels, checkout and average durations localised |
| T-01 no linter | Fixed | angular-eslint, `npm run lint` |
| T-02 untested flows | Partly | New specs: request de-dupe, pricing tiers, name validation; no e2e yet |
| L-01 total 0 → 30 | Fixed | Hardcoded 30 removed; `??` instead of `||` |
| L-02 fake coupons | Fixed | Removed |
| L-03 placeholder check-in data | Fixed | Page removed (it only redirected) |
| L-04 password trimmed | Fixed | Passwords sent as typed |
| L-05 double checkout | Fixed | Only `PUT /api/Workspaces/{id}/checkout`, in the `CheckoutWorkspaceDto` shape (it never sent `amountReceived` before) |
| M-01 shift floats in localStorage | Fixed | Vodafone/InstaPay/Fawry opening balances now sent when opening a shift |
| M-02 instructor meta in localStorage | Partly | Unsaved "sessions" field removed; remaining cache is wiped by `App` on every start anyway |
| D-01 debug logging | Fixed | No `console.log` left |
| P-01 login page when signed in | Fixed | `guestGuard` |
| P-02 dashboard chart 0 % | Fixed | Open sessions from earlier days are counted |
| P-03 truncated titles | Fixed | Two-line titles |
| P-04 average duration differs | Fixed | One source, sessions > 24 h excluded |
| P-05 7,210 EGP forgotten session | Fixed | Warning + explicit confirmation above 24 h |
| P-06 / P-07 add-student & fake checkout page | Fixed | Pages removed (11 pages that duplicated modals) |
| P-08 timeline on phones | Fixed | 64 px hours / 120 px room column below 600 px |
| P-09 English in reservations | Fixed | Localised |
| P-10 remaining hours incl. expired | Fixed | Only active / near-expiry packages counted |
| P-11 instructor sessions field | Fixed | Field removed (count is computed) |
| P-12 name validation message | Fixed | Specific messages |
| P-13 overlapping pricing tiers | Fixed (root cause) | Room hourly plans (scope 2 / room-name notes) were shown and used as student tiers |

Found and fixed while fixing:
- Check-in sent the session price as `discount` to `POST /api/Workspaces`, and estimated price as hours × "hourly rate" although tiers are flat prices per range (now the same tier calculation as checkout).
- Dead code: 18 files, 58 service members, 3 images, `puppeteer-core`, root scripts with the admin password.

Still for the backend / data: [B-01] missing uploaded images; one legacy room price saved with `scope: 0` ("Nook 1", now ignored by the frontend); two sessions open since ~20 Oct 2026; [G-10].

## Backend coverage check (2026-11-10)

Compared the live spec (`https://nook.runasp.net/openapi/v1.json`, 257 operations, saved as `audit/logs/openapi-live.json`) with every HTTP call in `src/app` (`audit/scripts/api-coverage.mjs` → `audit/logs/api-coverage.json`; response fields: `audit/scripts/unused-fields.mjs` → `audit/logs/unused-fields.txt`). Only operations relevant to the web app are listed below.

### Frontend bugs found by the comparison

| ID | Problem | Evidence |
|---|---|---|
| C-01 | Package hour usage does `GET` + `PUT remainingHours` instead of `POST /api/{Workspace,Classroom}Packages/{id}/use-hours`, so the backend usage history is never written; `GET …/usage-history` is never read, so the "usage history" in the package drawer starts empty after every reload | `workspace-package-api.service.ts:88` (`useHours` → `getPackageById` + `updatePackage`); `package.service.ts` sets `history: []` when mapping |
| C-02 | Automatic discount rules ("خصم تلقائي") live only in memory (2 hardcoded rules + whatever is added); saving shows success but nothing is sent. Backend has `GET/POST/PUT/DELETE /api/Discounts/rules`, `POST /api/Discounts/redeem`, `GET /api/Students/{id}/discount-eligibility` | `discount-rule-engine.service.ts:22-70` |
| C-03 | Deleting a catering item or a shift item first calls endpoints that don't exist (`DELETE /api/catering/{workspace,classroom}/{id}`, `DELETE /api/shifts/items/{id}`) and only then the real ones (`/api/workspaces/{id}/catering/{itemId}`, `/api/Shifts/{id}/items/{itemId}`) — one guaranteed 404 per delete | `workspace-api.service.ts:187`, `classroom-api.service.ts:193`, `shift-api.service.ts:213` |
| C-04 | Values the backend calculates are ignored and recomputed differently in the browser: `WorkspaceDto.calculatedCost` (session price), `OccupancyAnalysisDto.hourlyFlow` (dashboard chart), `DashboardSummaryDto.totalFootfallToday` | `audit/logs/unused-fields.txt` |
| C-05 | Data returned but never shown: `WorkspaceDto.expectedEndAt`, `studentWhatsapp`; `ShiftDto.actualInstapay`; `StudentAnalyticsDto.bookingHistorySummary`, `discountEligibility`; `CouponRedemptionDto.redeemedByAccountId` | same |

### Backend features with no screen in the web app

| Area | Endpoints | Why it matters |
|---|---|---|
| Alert settings | `PUT /api/Settings/operational-alerts` | Thresholds (grace period, long stay…) were read-only — now editable (see below) |
| Login sessions | `GET /api/Auth/sessions`, `DELETE …/{sessionId}`, `POST /api/Auth/revoke-all` | No "active devices / sign out everywhere" |
| Analytics | `GET /api/Analysis/top-students`, `/instructor-activity` | Not on the dashboard |
| Other | `GET /api/PricingPlans/suggestion`, `POST /api/Shifts/verify-password`, `GET /api/Reservations/instructor/{id}`, `GET /api/ClassroomPackages/instructor/{id}`, legacy `/api/Packages` | Pricing suggestion is recomputed in the browser; shift hand-over password check unused |

Not checked: endpoints the backend may have that are missing from the spec (`/api/Reservations/{id}/split` was in the saved snapshot but is gone from the live spec, and the frontend no longer calls it).

### Status after fixing (commits `8380faf`, `1d2eadf`, `cb5901a`)

| Item | Status | How |
|---|---|---|
| C-01 package hours | Fixed | `POST …/use-hours` (whole hours, with a note) and `GET …/usage-history` when the package drawer opens. Existing packages show an empty history because past usage was written with `PUT` and never recorded |
| C-02 automatic discount rules | Fixed | `/api/Discounts/rules` CRUD; enums sent as numbers (`HoursBased=1, VisitCountBased=2, CollegeBased=3, SpendingBased=4`; `Workspace=1, Classroom=2, All=3`). Student analytics uses `GET /api/Students/{id}/discount-eligibility`; the hardcoded 100/200… h milestones and invented 20 % redemptions are gone |
| C-03 non-existent delete URLs | Fixed | Only the real catering / shift-item endpoints are called |
| C-04 backend values | Fixed (partly) | `totalFootfallToday`, `hourlyFlow`, `calculatedDuration` (minutes), `expectedEndAt`, `studentWhatsapp` used. `calculatedCost` **not** used — see D-1 |
| C-05 fields not shown | Fixed | Student analytics comes from `GET /api/Students/{id}/analytics` (local calculation only as fallback); shift history shows the per-channel reconciliation from the API |
| Shift close (found while fixing) | Fixed | Counted Vodafone was sent as `vfCashInside`; `actualVodafone/actualInstapay/actualFawry` and InstaPay/Fawry flows were never sent |
| Alert settings | Added | Settings → "تنبيهات التشغيل" tab (`PUT /api/Settings/operational-alerts`) |
| Login sessions | Added | Profile → real device list, sign out one device, sign out everywhere (replaced a card with a fixed fake IP) |
| Analytics | Added | Dashboard → most frequent students, instructor activity |
| Other (pricing suggestion, shift verify-password, legacy `/api/Packages`) | Not done | No web flow needs them today |

### Data / backend follow-ups found while fixing

- **D-1** Sessions created before the check-in fix have the session price saved as `discount` (e.g. `discount: 80`), so the backend returns negative `calculatedCost` (e.g. `-70`) and negative `totalSpend` in `top-students` (`-80`). Those rows need correcting in the database. `calculatedCost` also seems to include catering and discount (catering 20 → calculatedCost 20), so its meaning should be confirmed before the web uses it as the session price.
- **D-2** Past package usage was recorded only by changing `remainingHours`; there is no usage history for it on the server.

## How the frontend was run

| Item | Value |
|---|---|
| Node / npm | v24.20.0 / 12.0.2 |
| Install | `npm ci --no-audit --no-fund` (npm 12 skipped install scripts of esbuild, lmdb, msgpackr-extract; dev server and build still work) |
| Dev server | `npx ng serve --port 4300` → log `audit/logs/frontend.log` (port 4300 to avoid clashing with a dev server on 4200) |
| API URL | `API_BASE_URL = ''` (`src/app/core/constants/api-endpoints.ts:16`); dev proxy `proxy.conf.json` forwards `/api`, `/uploads`, `/Uploads` → `https://nook.runasp.net` |
| API reachability | Reachable. `GET /api/Auth/me` via proxy → 401 (expected unauthenticated) in ~4.3 s |
| .env | None needed — Angular app has no `.env`/`.env.example`; nothing created |
| Safety commit | `git add .` in `Frontend/` staged nothing (tree clean at `117bd5a`), so no "before audit" commit was created |
| Test account | No registration page exists in the UI (only `/auth/login`). The project owner signed in manually in the automated Chrome window; credentials are not recorded here. |
| Browser tool | Playwright 1.56.1 in `audit/scripts/` (own package.json). Bundled Chromium fails to start on this machine (`spawn UNKNOWN`), so the installed Chrome (`channel: 'chrome'`, v156) is used. |
| Test data policy | Owner approved creating clearly-labelled test records (`AUDIT-TEST …`). Nothing is deleted. All created records are listed in "Test records created". |

## Frontend map

### Routes (`src/app/app.routes.ts`)

All routes except `/auth/login` and `**` are children of `MainLayoutComponent` behind `authGuard`.

| Route | Component | Guard | Linked from UI? |
|---|---|---|---|
| `/auth/login` | LoginComponent | – | yes (redirects) |
| `/dashboard` | DashboardComponent | auth | sidebar |
| `/workspace/show-student` | ShowStudentComponent | auth | sidebar |
| `/workspace/add-student` | AddStudentComponent | auth | dashboard.component.ts |
| `/workspace/checkout` | WorkspaceCheckoutComponent | auth | **no link** |
| `/classroom/show-classroom` | ShowClassroomComponent | auth | sidebar |
| `/classroom/add-classroom` (+ `add-reservation` redirect) | AddClassroomComponent | auth | **no link** |
| `/classroom/checkout` | ClassroomCheckoutComponent | auth | **no link** |
| `/classroom/show-reservation`, `/classroom/show-reservation/:id` | ShowReservationComponent | auth | **no link** |
| `/classroom/reservation` (+ `admin-console` redirect) | ClassroomReservationsComponent | auth | yes |
| `/shift/active` (+ `''`, `active-shift`) | ActiveShiftComponent | auth | sidebar |
| `/shift/history` (+ `shift-history`) | ShiftHistoryComponent | auth | sidebar |
| `/shift/end-of-shift-balance` | EndOfShiftBalanceComponent | auth | **no link** |
| `/shift/add-shift` | AddShiftComponent | auth | yes |
| `/shift/show-shift`, `/shift/show-shift/:id` | ShowShiftComponent | auth | yes |
| `/shift/search-shift` | SearchShiftComponent | auth | **no link** |
| `/package/student` (+ 3 redirects, `/packages`) | ShowStudentPackageComponent | auth | sidebar |
| `/package/instructor` (+ 2 redirects) | ShowInstructorPackageComponent | auth | sidebar |
| `/package/add-student-package` | AddStudentPackageComponent | auth | **no link** |
| `/package/add-instructor-package` | AddInstructorPackageComponent | auth | **no link** |
| `/details/show-students` (+ `students`, `show-student`) | ShowStudentsComponent | auth | yes |
| `/details/show-colleges` | ShowCollegesComponent | auth | sidebar |
| `/details/show-blacklist` | ShowBlacklistComponent | auth | sidebar |
| `/details/show-instructors` | ShowInstructorsComponent | auth | yes |
| `/details/{add-discount,show-discount,show-discounts,discounts}` | redirect → `/settings/discounts` | – | – |
| `/catering/show-products` | ShowProductsComponent | auth | sidebar |
| `/catering/add-products` | AddProductsComponent | auth | **no routerLink found** (only a string in show-classroom.component.html — check) |
| `/catering/product-graph` | ProductGraphComponent | auth | yes |
| `/settings/general` (+ `/settings`) | SettingsComponent | auth + admin | sidebar |
| `/settings/discounts` (+ `add-discount`, `/discounts`) | AddDiscountComponent | auth | sidebar |
| `/settings/show-user` (+ `add-user`, `/users`, `/show-users`) | ShowUserComponent | auth + admin | yes |
| `/settings/profile` (+ `/profile`) | ProfileComponent | auth | yes |
| `**` | NotFoundComponent | – | – |

"Linked" = a `routerLink`/`navigate()`/sidebar `route:` string was found in `src/app` (excluding the unused `core/constants/routes.ts`).

### API calls

Full generated table (237 call sites, verb, endpoint, expected response type, file:line, callers): **`audit/logs/api-map.md`** (generator: `audit/scripts/map-api.mjs`).
Calls the generator missed because of multi-line generics (added by hand):

| Service.method | Verb | Endpoint | Expected type | Location |
|---|---|---|---|---|
| AccountApiService.getUnlinkedStudents | GET | `/api/Accounts/unlinked-students` | `ApiResponse<{id,name,phone}[]>` | src/app/core/services/api/account-api.service.ts:114 |
| AccountApiService.getUnlinkedInstructors | GET | `/api/Accounts/unlinked-instructors` | `ApiResponse<{id,name,phone}[]>` | src/app/core/services/api/account-api.service.ts:121 |
| AuditApiService.getAuditLogs | GET | `/api/AuditLogs` | `ApiResponse<AuditLogsPagedResultDto>` | src/app/core/services/api/audit-api.service.ts:79 |
| AuditApiService.getEntityAuditLogs | GET | `/api/AuditLogs/entity/{type}/{id}` | `ApiResponse<AuditLogsPagedResultDto>` | src/app/core/services/api/audit-api.service.ts:97 |
| ClassroomApiService.getClassrooms | GET | `/api/Classrooms` | `ApiResponse<ClassroomDto[] \| {items}>` | src/app/core/services/api/classroom-api.service.ts:32 |
| ReservationApiService.getReservations | GET | `/api/Reservations` | `ApiResponse<ReservationDto[] \| {items}>` | src/app/core/services/api/reservation-api.service.ts:33 |
| StaffNotificationApiService.getNotifications | GET | `/api/Notifications` | `ApiResponse<StaffNotificationsPagedResultDto>` | src/app/core/services/api/staff-notification-api.service.ts:84 |
| WorkspaceApiService.getWorkspaces | GET | `/api/Workspaces` | `ApiResponse<WorkspaceDto[] \| {items}>` | src/app/core/services/api/workspace-api.service.ts:34 |

Direct `HttpClient` calls outside `services/api/`:

| Verb | Endpoint | Location |
|---|---|---|
| POST | `/api/Auth/login` | src/app/core/services/auth.service.ts:152 |
| GET | `/api/Auth/me` | src/app/core/services/auth.service.ts:186 |
| POST | `/api/Auth/revoke-token` | src/app/core/services/auth.service.ts:223 |
| POST | `/api/Auth/forgot-password` | src/app/core/services/auth.service.ts:270 |
| POST | `/api/Auth/reset-password` | src/app/core/services/auth.service.ts:288 |
| POST | `/api/Auth/refresh-token` | src/app/core/interceptors/auth.interceptor.ts:104 |
| GET | `/api/Accounts/unlinked-students` (used as health ping) | src/app/core/services/api-health.service.ts:72 |

Response envelope expected almost everywhere: `ApiResponse<T>` = `{ data, success|isSuccess, message }`, with list endpoints accepting either `T[]` or `{ items: T[] }`.

## Summary

| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| API integration | 1 (G-01) | 2 (G-02, G-03) | 2 (L-05, P-11) | – | 5 |
| Logic | – | 4 (L-01, L-02, P-07, P-13) | 4 (L-04, P-02, P-05, P-10) | 1 (G-06) | 9 |
| Network | – | 1 (G-09) | 1 (G-10) | – | 2 |
| UX | – | 1 (G-07) | – | 3 (G-08, P-01, P-12) | 4 |
| Missing backend | – | – | 2 (M-01, M-02) | – | 2 |
| Consistency | – | – | 2 (G-11, P-04) | 3 (G-05, G-12, P-09) | 5 |
| Colors | – | – | 1 (G-04) | – | 1 |
| Responsive | – | – | 1 (P-08) | – | 1 |
| UI | – | – | – | 1 (P-03) | 1 |
| Testing | – | – | 1 (T-02) | 1 (T-01) | 2 |
| Dead code | – | – | – | 3 (D-01, L-03, P-06) | 3 |
| **Total** | **1** | **8** | **14** | **12** | **35** |

Plus 4 backend observations (B-01…B-04) and the dead-code table. No API call returned 4xx/5xx during the run; all page-level console errors are image 404s.

## Top 10 issues to fix first

1. **[G-01]** Checkout / session / catering API errors are swallowed — UI shows success while the server failed (Critical).
2. **[G-07]** Overdue-session toasts cover and block the main action buttons on every page (High).
3. **[G-09]** Every page load fires 27–51 API calls, many duplicated, including the full student list (`PageSize=1000`) up to 3× (High).
4. **[L-02]** Hard-coded coupon codes (`CORP10`, `NOOK10`, `CORP100`, `WELCOME100`) are applied whenever the coupon API fails (High).
5. **[G-02]** Deleting a blacklist entry, discount or faculty reports success even when the request fails (High).
6. **[L-01]** Workspace checkout sends `totalCost = 30` (or session cost) when the real total is 0 (High).
7. **[P-07]** `/workspace/checkout` without a session shows an invented, payable 20 EGP bill (High).
8. **[P-13]** Pricing tiers overlap (four different prices for "1→1 h"); no overlap validation (High).
9. **[G-03]** `vercel.json` missing while production relies on it for `/api` rewrites (High).
10. **[L-05]** One workspace checkout sends two checkout requests to two different endpoints (Medium).

---

## Checks (step 3)

| Check | Command | Result | Log |
|---|---|---|---|
| Lint | – | **No linter configured** (no ESLint/angular-eslint in package.json or angular.json) → [T-01] | – |
| Type-check (app) | `npx tsc -p tsconfig.app.json --noEmit` | 0 errors (`strict`, `strictTemplates` on) | audit/logs/typecheck-app.log |
| Type-check (spec) | `npx tsc -p tsconfig.spec.json --noEmit` | 0 errors | audit/logs/typecheck-spec.log |
| Build | `npx ng build` | Success, 0 warnings, initial 979 kB raw / 203 kB transfer | audit/logs/build.log |
| Unit tests | `npx ng test --watch=false` (Vitest) | 18 files, 106 tests, all pass | audit/logs/test.log |

Existing tests cover only services/utils/guards/interceptor (`app.spec.ts`, auth/admin guard, auth interceptor, auth, dashboard, language, notification-toast, package, room-pricing, shift-permission, theme, workspace services, and 6 utils). See [T-02] for untested flows.

---

## Pages

Source: `audit/logs/crawl-results.json` (load + 4 widths), `audit/logs/crawl-clicks.json` (button/modal pass), `audit/logs/forms-run-main.json` (forms). Screenshots: `audit/screenshots/crawl/<route>@<width>.png`, modals `…__modal_N.png`, forms `audit/screenshots/forms/`. Every row marked "global bootstrap" is fired on every page load, see [G-09].
Status column: all pages Done. Network "Time" = max observed ms.

### Page: `/auth/login`

Final URL: `/auth/login` · first load 3525 ms · 35 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/PricingPlans` | 200 | 1230 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 684 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/current` | 200 | 416 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 695 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 709 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 962 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 491 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1067 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/ClassroomPackages` | 200 | 589 ms | global bootstrap; x2 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 612 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 284 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 237 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 246 ms | global bootstrap |
| GET | `/api/Products` | 200 | 254 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 268 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 259 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 524 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 591 ms | global bootstrap |
| GET | `/api/shifts/{id}` | 200 | 769 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 500 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 632 ms | global bootstrap |
| GET | `/api/PackagePricingPlans` | 200 | 418 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 302 ms | global bootstrap |

Aborted on navigation: 17 requests (`GET http://localhost:4300/api/Rooms`, `GET http://localhost:4300/api/Instructors`, `GET http://localhost:4300/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z`…)

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 0 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** 

#### [P-01] Signed-in user can open the login page; the full data bootstrap starts and is then aborted
- Page / Area: /auth/login
- Category: UX
- Severity: Low
- Status: Confirmed (reproduced)
- Location: src/app/app.routes.ts:9-20 (no guard on the auth layout); src/app/layouts/auth-layout
- Description: With a valid session, /auth/login shows the login form instead of redirecting to /dashboard. The global data services still start (17 requests aborted when the page settles), and the overdue toasts appear over the login card.
- Steps to reproduce: Sign in → open http://localhost:4300/auth/login.
- Expected vs actual: Redirect to /dashboard vs login form shown.
- Evidence: audit/screenshots/crawl/auth_login@360.png; crawl-results.json "/auth/login" failed list (17 × net::ERR_ABORTED)
- Suggested fix: Add a guest-only guard on the auth layout.

---

### Page: `/dashboard`

Final URL: `/dashboard` · first load 3645 ms · 51 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/workspaces/{id}/catering` | 200 | 315 ms | global bootstrap; x4 duplicate |
| GET | `/api/Instructors` | 200 | 963 ms | global bootstrap; x3 duplicate |
| GET | `/api/Rooms` | 200 | 860 ms | global bootstrap; x3 duplicate |
| GET | `/api/PricingPlans` | 200 | 817 ms | global bootstrap; x3 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1042 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/WorkspacePackages` | 200 | 861 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 899 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 269 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 706 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 713 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 662 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 653 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 695 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 501 ms | global bootstrap; x2 duplicate |
| GET | `/api/Reservations` | 200 | 526 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 661 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 221 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 245 ms | global bootstrap |
| GET | `/api/Products` | 200 | 263 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 266 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 267 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 471 ms | global bootstrap |
| GET | `/api/PackagePricingPlans` | 200 | 305 ms | global bootstrap |
| GET | `/api/Dashboard/summary` | 200 | 382 ms | – |
| GET | `/api/Analysis/revenue` | 200 | 521 ms | – |
| GET | `/api/Analysis/occupancy` | 200 | 535 ms | – |
| GET | `/api/Accounts/unlinked-students` | 200 | 289 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 3 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** 

#### [P-02] Activity chart and "peak today" show 0 % while students are checked in
- Page / Area: /dashboard → "حركة الناس ونسبة الإشغال"
- Category: Logic
- Severity: Medium
- Status: Confirmed (reproduced)
- Location: src/app/features/dashboard/dashboard.component.ts (activity flow computation); dashboard.service.ts
- Description: The card shows "إجمالي الناس اللي شرفت 2" and "أعلى زحمة النهارده 0%" with a flat line at 0 for every hour, and "وقت الزحمة 11:00 م" although nothing peaked. Two sessions are open (show-student "Active 2").
- Steps to reproduce: Open /dashboard with active sessions.
- Expected vs actual: Non-zero occupancy for current hour vs flat 0 %.
- Evidence: audit/screenshots/crawl/dashboard@1440.png
- Suggested fix: Compute hourly occupancy from open sessions (including sessions started on previous days).

#### [P-03] Quick-action card titles are truncated
- Page / Area: /dashboard quick actions
- Category: UI
- Severity: Low
- Status: Confirmed (reproduced)
- Location: src/app/features/dashboard/dashboard.component.html/.css (quick action cards)
- Description: "قفل الشفت والحسـ…" at 1440 px and "تسجيل …", "أكواد ا…", "ضيف رو…", "قفل ا…" at 360 px; the labels are cut with an ellipsis and the full text appears only in the small badge below.
- Steps to reproduce: Open /dashboard at 360 px.
- Expected vs actual: Readable titles vs ellipsis.
- Evidence: audit/screenshots/crawl/dashboard@360.png, dashboard@1440.png
- Suggested fix: Allow 2-line titles or shorter labels.

#### [P-04] Average session duration differs between Dashboard and Workspace
- Page / Area: /dashboard vs /workspace/show-student
- Category: Consistency
- Severity: Medium
- Status: Confirmed (reproduced)
- Location: dashboard.component.ts vs show-student.component.ts (average duration metric)
- Description: At the same moment the dashboard shows "متوسط وقت السيشن 10 س 49 د" while the workspace page shows "متوسط مدة الجلسة 5d 5h 19m" (also mixing English abbreviations into the Arabic UI). The two pages use different formulas / session sets.
- Steps to reproduce: Open both pages one after another.
- Expected vs actual: Same value and format vs 10h49m and 5d5h19m.
- Evidence: dashboard@1440.png, workspace_show_student@360.png
- Suggested fix: One shared metric in a service; one localised duration formatter.

---

### Page: `/workspace/show-student`

Final URL: `/workspace/show-student` · first load 3623 ms · 48 API/asset responses on load

**Console:** 
- `[error] Failed to load resource: the server responded with a status of 404 ()`
(all are image 404s, see [B-01])

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/Students?PageSize=1000` | 200 | 1230 ms | global bootstrap; x4 duplicate; slow >1s |
| GET | `/api/WorkspacePackages` | 200 | 653 ms | global bootstrap; x4 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 743 ms | global bootstrap; x4 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 285 ms | global bootstrap; x4 duplicate |
| GET | `/api/Instructors` | 200 | 1214 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 268 ms | global bootstrap; x2 duplicate |
| GET | `/api/PricingPlans` | 200 | 635 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 641 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 821 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 826 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 619 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 662 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 958 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 503 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 221 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 239 ms | global bootstrap |
| GET | `/api/Products` | 200 | 241 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 245 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 275 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 487 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 592 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 593 ms | global bootstrap |
| GET | `/api/PackagePricingPlans` | 200 | 246 ms | global bootstrap |
| GET | `https://nook.runasp.net/uploads/rooms/{file}.jpg` | 404 | 308 ms | error status |
| GET | `/api/Accounts/unlinked-students` | 200 | 272 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 13 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 1; Escape failed to close: 0; clicks blocked by toasts: 7 (see [G-07]).

**Issues:** 

#### [P-05] Checkout of a long-forgotten session bills 7,210 EGP with no warning or cap
- Page / Area: /workspace/show-student → تشيك أوت modal
- Category: Logic
- Severity: Medium
- Status: Confirmed (reproduced, not submitted)
- Location: src/app/shared/components/checkout-modal/*; workspace.service.ts duration/price calc
- Description: A session open for 20 d 19 h is priced "12 - 24 ساعة + 476 ساعة إضافية" = 7,210 EGP and pre-filled as the amount due. There is no daily cap and no "this session looks abandoned" warning, so a cashier can easily charge or record this. The "يرجى إدخال المبلغ المستلم" error is shown before the user typed anything.
- Steps to reproduce: Open checkout for an active session older than a day.
- Expected vs actual: Warning / cap / adjust option vs 7,210 EGP silently computed.
- Evidence: audit/screenshots/crawl/workspace_show_student__modal_10.png
- Suggested fix: Cap per-day billing or require a manager confirmation for sessions > N hours; show validation only after interaction.

---

### Page: `/workspace/add-student`

Final URL: `/workspace/show-student?openCheckIn=true` · first load 4178 ms · 51 API/asset responses on load

**Console:** 
- `[error] Failed to load resource: the server responded with a status of 404 ()`
(all are image 404s, see [B-01])

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/Students?PageSize=1000` | 200 | 1179 ms | global bootstrap; x4 duplicate; slow >1s |
| GET | `/api/WorkspacePackages` | 200 | 960 ms | global bootstrap; x4 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 960 ms | global bootstrap; x4 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 481 ms | global bootstrap; x4 duplicate |
| GET | `/api/Accounts/unlinked-students` | 200 | 258 ms | global bootstrap; x4 duplicate |
| GET | `/api/Instructors` | 200 | 1018 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 436 ms | global bootstrap; x2 duplicate |
| GET | `/api/PricingPlans` | 200 | 906 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 888 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 798 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 738 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 889 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 861 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 888 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 912 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products/categories` | 200 | 245 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 267 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 283 ms | global bootstrap |
| GET | `/api/Products` | 200 | 287 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 263 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 490 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 539 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 550 ms | global bootstrap |
| GET | `/api/PackagePricingPlans` | 200 | 940 ms | global bootstrap |
| GET | `https://nook.runasp.net/uploads/rooms/{file}.jpg` | 404 | 89 ms | error status |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 21 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 17 (see [G-07]).

**Issues:** 

#### [P-06] /workspace/add-student is only a redirect; its whole form is dead code
- Page / Area: /workspace/add-student
- Category: Dead code
- Severity: Low
- Status: Confirmed (reproduced)
- Location: src/app/features/workspace/add-student/add-student.component.ts:20-22 (constructor navigates away), .html (78 lines of form), .ts:120-150
- Description: The constructor immediately navigates to /workspace/show-student?openCheckIn=true, so the component template and its submit logic (including the "010XXXXXXXX"/"University"/"General" defaults noted as [L-03]) can never run. [L-03] is therefore downgraded to dead code.
- Steps to reproduce: Open /workspace/add-student.
- Expected vs actual: Either a page or a plain route redirect vs a full component that never renders.
- Evidence: Final URL /workspace/show-student?openCheckIn=true (crawl-results.json)
- Suggested fix: Replace with `redirectTo` in the router and delete the component.

---

### Page: `/workspace/checkout`

Final URL: `/workspace/checkout` · first load 3909 ms · 37 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/ClassroomPackages` | 200 | 554 ms | global bootstrap; x3 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 1237 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 277 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 504 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 1060 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/PricingPlans` | 200 | 559 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1081 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 535 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 571 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 769 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 1033 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Notifications?pageSize=50` | 200 | 235 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 260 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 261 ms | global bootstrap |
| GET | `/api/Products` | 200 | 272 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 287 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 509 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 716 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 731 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 551 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 555 ms | global bootstrap |
| GET | `/api/PackagePricingPlans` | 200 | 358 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 463 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 344 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 10 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 2; Escape failed to close: 2; clicks blocked by toasts: 1 (see [G-07]).

**Issues:** 

#### [P-07] Workspace checkout page without a session shows an invented bill that can be paid
- Page / Area: /workspace/checkout (no ?studentId)
- Category: Logic
- Severity: High
- Status: Confirmed (reproduced, not submitted)
- Location: src/app/features/workspace/checkout/checkout.component.ts:50-69 (defaults), 185-210 (only fills when studentId matches)
- Description: With no studentId the page renders an empty client, check-in "AM 09:00", duration "1h 00m", rate 20 EGP/h, printing 1.5 EGP/page and Wi-Fi 10 EGP (all hardcoded, not from settings), total 20 EGP, and enabled payment-method buttons and finalize action. The "تعديل الجلسة" modal opens with empty name/phone.
- Steps to reproduce: Open http://localhost:4300/workspace/checkout.
- Expected vs actual: Redirect or "no session selected" state vs a payable fake invoice.
- Evidence: audit/screenshots/crawl/workspace_checkout@1440.png, workspace_checkout__modal_1.png
- Suggested fix: Guard the route on a valid session id; load rates from SettingsService.

---

### Page: `/classroom/show-classroom`

Final URL: `/classroom/show-classroom` · first load 3646 ms · 49 API/asset responses on load

**Console:** 
- `[error] Failed to load resource: the server responded with a status of 404 ()`
- `[error] Failed to load resource: the server responded with a status of 404 (Not Found)`
(all are image 404s, see [B-01])

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/workspaces/{id}/catering` | 200 | 326 ms | global bootstrap; x4 duplicate |
| GET | `https://nook.runasp.net/uploads/rooms/{file}.jpg` | 404 | 163 ms | x4 duplicate; error status |
| GET | `/api/Instructors` | 200 | 1098 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1164 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/WorkspacePackages` | 200 | 632 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 643 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 282 ms | global bootstrap; x2 duplicate |
| GET | `/api/PricingPlans` | 200 | 558 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 562 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 824 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 832 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 594 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 620 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 801 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 574 ms | global bootstrap; x2 duplicate |
| GET | `/api/Reservations` | 200 | 597 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 467 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 250 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 259 ms | global bootstrap |
| GET | `/api/Products` | 200 | 265 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 275 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 284 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 552 ms | global bootstrap |
| GET | `/uploads/rooms/{file}.jpg` | 404 | 274 ms | error status |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 5 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 4 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/classroom/add-classroom`

Final URL: `/classroom/add-classroom` · first load 3362 ms · 39 API/asset responses on load

**Console:** 
- `[error] Failed to load resource: the server responded with a status of 404 ()`
- `[error] Failed to load resource: the server responded with a status of 404 (Not Found)`
(all are image 404s, see [B-01])

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `https://nook.runasp.net/uploads/rooms/{file}.jpg` | 404 | 117 ms | x4 duplicate; error status |
| GET | `/api/WorkspacePackages` | 200 | 573 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 883 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 454 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1056 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Instructors` | 200 | 1073 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 564 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 603 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 710 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 329 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products` | 200 | 220 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 236 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 256 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 262 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 279 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 506 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 528 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 564 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 705 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 812 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 521 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 541 ms | global bootstrap |
| GET | `/uploads/rooms/{file}.jpg` | 404 | 543 ms | error status |
| GET | `/api/Workspaces` | 200 | 292 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 249 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 4 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/classroom/checkout`

Final URL: `/classroom/checkout` · first load 2899 ms · 34 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 621 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 621 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 271 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 1003 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1012 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 518 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 617 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 700 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 269 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 224 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 249 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 252 ms | global bootstrap |
| GET | `/api/Products` | 200 | 254 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 273 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 514 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 550 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 563 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 699 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 769 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 521 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 528 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 252 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 266 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 1 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/classroom/reservation`

Final URL: `/classroom/reservation` · first load 3576 ms · 49 API/asset responses on load

**Console:** 
- `[error] Failed to load resource: the server responded with a status of 404 ()`
- `[error] Failed to load resource: the server responded with a status of 404 (Not Found)`
(all are image 404s, see [B-01])

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/workspaces/{id}/catering` | 200 | 405 ms | global bootstrap; x4 duplicate |
| GET | `https://nook.runasp.net/uploads/rooms/{file}.jpg` | 404 | 54 ms | x4 duplicate; error status |
| GET | `/api/Students?PageSize=1000` | 200 | 1130 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/Instructors` | 200 | 1174 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/WorkspacePackages` | 200 | 703 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 740 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 301 ms | global bootstrap; x2 duplicate |
| GET | `/api/PricingPlans` | 200 | 627 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 656 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 816 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 837 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 650 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 657 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 825 ms | global bootstrap; x2 duplicate |
| GET | `/api/Reservations` | 200 | 627 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 410 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 259 ms | global bootstrap |
| GET | `/api/Products` | 200 | 275 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 286 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 300 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 285 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 529 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 593 ms | global bootstrap |
| GET | `/uploads/rooms/{file}.jpg` | 404 | 233 ms | error status |
| GET | `/api/Accounts/unlinked-students` | 200 | 247 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 14 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 1; Escape failed to close: 1; clicks blocked by toasts: 6 (see [G-07]).

**Issues:** 

#### [P-08] Reservation timeline is unusable at phone width
- Page / Area: /classroom/reservation
- Category: Responsive
- Severity: Medium
- Status: Confirmed (reproduced)
- Location: classroom-reservations.component.css (timeline grid)
- Description: At 360 px only one hour column ("7 ص") is visible next to the room list; the booked block is a 4 px sliver at the edge. The page does not overflow, but the grid is not readable without horizontal scrolling inside a narrow area.
- Steps to reproduce: Open the page at 360 px.
- Expected vs actual: Agenda/list view on phone-width screens vs a cropped grid.
- Evidence: audit/screenshots/crawl/classroom_reservation@360.png
- Suggested fix: Switch to a vertical day list below 768 px.

#### [P-09] English text inside the Arabic reservation UI
- Page / Area: /classroom/reservation
- Category: Consistency
- Severity: Low
- Status: Confirmed (reproduced)
- Location: classroom-reservations.component.html (today table header, date cells, nav aria-labels)
- Description: Heading "حجوزات اليوم (November 10, 2026)", date column "Today", and buttons labelled "Previous day"/"Next day" next to Arabic duplicates "اليوم السابق"/"اليوم التالي".
- Steps to reproduce: Open the page in Arabic.
- Expected vs actual: Localised dates/labels vs English.
- Evidence: audit/screenshots/crawl/classroom_reservation@1440.png; crawl-clicks.json button labels
- Suggested fix: Use LanguageService + locale date pipe.

---

### Page: `/classroom/show-reservation`

Final URL: `/classroom/show-reservation` · first load 3111 ms · 34 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/ClassroomPackages` | 200 | 561 ms | global bootstrap; x3 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 567 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 543 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 1016 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1186 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 580 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 581 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 663 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 274 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products/categories` | 200 | 273 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 289 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 295 ms | global bootstrap |
| GET | `/api/Products` | 200 | 302 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 301 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 517 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 525 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 557 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 722 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 782 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 573 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 614 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 254 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 229 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 2 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/shift/active`

Final URL: `/shift/active` · first load 3533 ms · 39 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 541 ms | global bootstrap; x4 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 703 ms | global bootstrap; x4 duplicate |
| GET | `/api/shifts/current` | 200 | 577 ms | global bootstrap; x3 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 533 ms | global bootstrap; x3 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 548 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/{id}` | 200 | 805 ms | global bootstrap; x3 duplicate |
| GET | `/api/Instructors` | 200 | 1131 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1132 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/workspaces/{id}/catering` | 200 | 483 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 247 ms | global bootstrap |
| GET | `/api/Products` | 200 | 264 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 268 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 275 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 515 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 534 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 532 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 746 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 778 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 342 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 591 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 691 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 299 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 3 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 1; Escape failed to close: 1; clicks blocked by toasts: 1 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/shift/history`

Final URL: `/shift/history` · first load 3631 ms · 35 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 766 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 1005 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 365 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1443 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Instructors` | 200 | 1469 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 818 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 819 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts` | 200 | 1223 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/shifts/{id}` | 200 | 1010 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/workspaces/{id}/catering` | 200 | 395 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 247 ms | global bootstrap |
| GET | `/api/Products` | 200 | 254 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 338 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 389 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 854 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 889 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 352 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 1131 ms | global bootstrap; slow >1s |
| GET | `/api/PricingPlans` | 200 | 1627 ms | global bootstrap; slow >1s |
| GET | `/api/Workspaces` | 200 | 263 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 363 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 372 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 346 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 7 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 3 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/shift/add-shift`

Final URL: `/shift/add-shift` · first load 3120 ms · 85 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/ClassroomPackages` | 200 | 663 ms | global bootstrap; x9 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 646 ms | global bootstrap; x9 duplicate |
| GET | `/api/shifts/current` | 200 | 829 ms | global bootstrap; x7 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 676 ms | global bootstrap; x7 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 677 ms | global bootstrap; x7 duplicate |
| GET | `/api/shifts/{id}` | 200 | 833 ms | global bootstrap; x7 duplicate |
| GET | `/api/Instructors` | 200 | 1147 ms | global bootstrap; x4 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1241 ms | global bootstrap; x4 duplicate; slow >1s |
| GET | `/api/workspaces/{id}/catering` | 200 | 262 ms | global bootstrap; x4 duplicate |
| GET | `/api/Products` | 200 | 300 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 297 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 300 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products/categories` | 200 | 305 ms | global bootstrap; x2 duplicate |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 306 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts` | 200 | 548 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 670 ms | global bootstrap; x2 duplicate |
| GET | `/api/PricingPlans` | 200 | 670 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 824 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 840 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 617 ms | global bootstrap; x2 duplicate |
| GET | `/api/Reservations` | 200 | 626 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 342 ms | global bootstrap; x2 duplicate |
| GET | `/api/Accounts/unlinked-students` | 200 | 239 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 2 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/shift/show-shift`

Final URL: `/shift/show-shift` · first load 2920 ms · 34 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 609 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 609 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 280 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 989 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1071 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 472 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 608 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 673 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 244 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 249 ms | global bootstrap |
| GET | `/api/Products` | 200 | 257 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 270 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 286 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 285 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 487 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 517 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 558 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 689 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 698 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 434 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 478 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 261 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 288 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 2 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 1 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/shift/search-shift`

Final URL: `/shift/search-shift` · first load 4268 ms · 35 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/ClassroomPackages` | 200 | 595 ms | global bootstrap; x3 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 1487 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 536 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts` | 200 | 637 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 1209 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1506 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 551 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 688 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 726 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 358 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 240 ms | global bootstrap |
| GET | `/api/Products` | 200 | 263 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 276 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 376 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 276 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 618 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 668 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 714 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 1080 ms | global bootstrap; slow >1s |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 569 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 596 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 236 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 250 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 8 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 5 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/shift/end-of-shift-balance`

Final URL: `/shift/end-of-shift-balance` · first load 3009 ms · 72 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 627 ms | global bootstrap; x7 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 648 ms | global bootstrap; x7 duplicate |
| GET | `/api/shifts/current` | 200 | 658 ms | global bootstrap; x5 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 618 ms | global bootstrap; x5 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 653 ms | global bootstrap; x5 duplicate |
| GET | `/api/shifts/{id}` | 200 | 795 ms | global bootstrap; x5 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1175 ms | global bootstrap; x4 duplicate; slow >1s |
| GET | `/api/Instructors` | 200 | 1135 ms | global bootstrap; x4 duplicate; slow >1s |
| GET | `/api/workspaces/{id}/catering` | 200 | 261 ms | global bootstrap; x4 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 239 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products` | 200 | 250 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 269 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products/categories` | 200 | 270 ms | global bootstrap; x2 duplicate |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 269 ms | global bootstrap; x2 duplicate |
| GET | `/api/PricingPlans` | 200 | 504 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 541 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts` | 200 | 591 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 773 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 853 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 633 ms | global bootstrap; x2 duplicate |
| GET | `/api/Reservations` | 200 | 670 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 381 ms | global bootstrap; x2 duplicate |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 3 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 2 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/package/student`

Final URL: `/package/student` · first load 3424 ms · 41 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 555 ms | global bootstrap; x4 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 645 ms | global bootstrap; x4 duplicate |
| GET | `/api/Instructors` | 200 | 1021 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1110 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 271 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 526 ms | global bootstrap; x2 duplicate |
| GET | `/api/PricingPlans` | 200 | 533 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 539 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 547 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 765 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 357 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 259 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 251 ms | global bootstrap |
| GET | `/api/Products` | 200 | 258 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 303 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 290 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 497 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 733 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 740 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 530 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 540 ms | global bootstrap |
| GET | `/api/PackagePricingPlans` | 200 | 379 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 371 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 227 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 5 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 4 (see [G-07]).

**Issues:** 

#### [P-10] "Active packages 0" while package hours are listed as remaining
- Page / Area: /package/student stats
- Category: Logic
- Severity: Medium
- Status: Suspected (seen in UI, cause not verified)
- Location: show-student-package.component.ts (stats computed signals)
- Description: Stats show "الباكيدجات النشطة 0" and "أوشكت على الانتهاء 0", but "إجمالي الساعات المتبقية 62 ساعات" and a row "مريم محمد 50 ساعات". Either the active-status mapping from the API is wrong or remaining hours include expired packages. Also "62 ساعات" (grammar).
- Steps to reproduce: Open /package/student.
- Expected vs actual: Active count consistent with remaining hours vs 0 active / 62 h remaining.
- Evidence: audit/screenshots/crawl/package_student@360.png
- Suggested fix: Derive both numbers from the same filtered list; check status enum mapping.

---

### Page: `/package/instructor`

Final URL: `/package/instructor` · first load 3816 ms · 41 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 980 ms | global bootstrap; x4 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 658 ms | global bootstrap; x4 duplicate |
| GET | `/api/Instructors` | 200 | 1117 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1244 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 252 ms | global bootstrap; x2 duplicate |
| GET | `/api/PricingPlans` | 200 | 525 ms | global bootstrap; x2 duplicate |
| GET | `/api/Rooms` | 200 | 564 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 631 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 655 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 762 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 262 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 225 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 244 ms | global bootstrap |
| GET | `/api/Products` | 200 | 253 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 271 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 269 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 527 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 711 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 876 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 581 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 577 ms | global bootstrap |
| GET | `/api/PackagePricingPlans` | 200 | 395 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 534 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 253 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 5 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 4 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/package/add-student-package`

Final URL: `/package/add-student-package` · first load 3040 ms · 78 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/ClassroomPackages` | 200 | 575 ms | global bootstrap; x7 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 589 ms | global bootstrap; x7 duplicate |
| GET | `/api/Instructors` | 200 | 1025 ms | global bootstrap; x5 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1089 ms | global bootstrap; x5 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 274 ms | global bootstrap; x4 duplicate |
| GET | `/api/Rooms` | 200 | 551 ms | global bootstrap; x4 duplicate |
| GET | `/api/PricingPlans` | 200 | 552 ms | global bootstrap; x4 duplicate |
| GET | `/api/Faculties` | 200 | 690 ms | global bootstrap; x4 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 554 ms | global bootstrap; x4 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 583 ms | global bootstrap; x4 duplicate |
| GET | `/api/shifts/{id}` | 200 | 725 ms | global bootstrap; x4 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 339 ms | global bootstrap; x4 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 244 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 256 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products` | 200 | 274 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products/categories` | 200 | 270 ms | global bootstrap; x2 duplicate |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 272 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts` | 200 | 535 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 775 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 559 ms | global bootstrap; x2 duplicate |
| GET | `/api/Reservations` | 200 | 553 ms | global bootstrap; x2 duplicate |
| GET | `/api/PackagePricingPlans` | 200 | 404 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 377 ms | global bootstrap; x2 duplicate |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 4 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 2 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/package/add-instructor-package`

Final URL: `/package/add-instructor-package` · first load 3386 ms · 76 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 563 ms | global bootstrap; x7 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 563 ms | global bootstrap; x7 duplicate |
| GET | `/api/Instructors` | 200 | 994 ms | global bootstrap; x5 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1026 ms | global bootstrap; x5 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 302 ms | global bootstrap; x4 duplicate |
| GET | `/api/PricingPlans` | 200 | 509 ms | global bootstrap; x4 duplicate |
| GET | `/api/Rooms` | 200 | 518 ms | global bootstrap; x4 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 455 ms | global bootstrap; x4 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 561 ms | global bootstrap; x4 duplicate |
| GET | `/api/shifts/{id}` | 200 | 627 ms | global bootstrap; x4 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 328 ms | global bootstrap; x4 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 275 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 269 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products` | 200 | 274 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products/categories` | 200 | 273 ms | global bootstrap; x2 duplicate |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 279 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts` | 200 | 482 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 672 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 731 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 497 ms | global bootstrap; x2 duplicate |
| GET | `/api/Reservations` | 200 | 502 ms | global bootstrap; x2 duplicate |
| GET | `/api/PackagePricingPlans` | 200 | 404 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 323 ms | global bootstrap; x2 duplicate |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 4 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 2 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/details/show-students`

Final URL: `/details/show-students` · first load 3418 ms · 44 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/Students?PageSize=1000` | 200 | 1040 ms | global bootstrap; x4 duplicate; slow >1s |
| GET | `/api/WorkspacePackages` | 200 | 509 ms | global bootstrap; x4 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 612 ms | global bootstrap; x4 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 317 ms | global bootstrap; x4 duplicate |
| GET | `/api/Instructors` | 200 | 1001 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/shifts/current` | 200 | 301 ms | global bootstrap; x2 duplicate |
| GET | `/api/Faculties` | 200 | 739 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 742 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 466 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 487 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 679 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 422 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 203 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 227 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 238 ms | global bootstrap |
| GET | `/api/Products` | 200 | 318 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 292 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 508 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 513 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 578 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 508 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 545 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 266 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 10 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 9 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/details/show-colleges`

Final URL: `/details/show-colleges` · first load 3379 ms · 45 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/Students?PageSize=1000` | 200 | 1063 ms | global bootstrap; x4 duplicate; slow >1s |
| GET | `/api/WorkspacePackages` | 200 | 521 ms | global bootstrap; x4 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 536 ms | global bootstrap; x4 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 353 ms | global bootstrap; x4 duplicate |
| GET | `/api/Instructors` | 200 | 982 ms | global bootstrap; x3 duplicate |
| GET | `/api/Faculties` | 200 | 699 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 258 ms | global bootstrap; x2 duplicate |
| GET | `/api/Blacklists` | 200 | 750 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 516 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 533 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 696 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces` | 200 | 360 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products/categories` | 200 | 233 ms | global bootstrap |
| GET | `/api/Products` | 200 | 243 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 253 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 266 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 259 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 474 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 489 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 506 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 501 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 524 ms | global bootstrap |
| GET | `/api/Accounts/unlinked-students` | 200 | 230 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 8 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 1 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/details/show-blacklist`

Final URL: `/details/show-blacklist` · first load 3004 ms · 34 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 515 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 709 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 273 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1031 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Instructors` | 200 | 1054 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Blacklists` | 200 | 780 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 513 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 514 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 715 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 312 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products/categories` | 200 | 225 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 257 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 276 ms | global bootstrap |
| GET | `/api/Products` | 200 | 275 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 269 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 501 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 521 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 524 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 672 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 462 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 467 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 302 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 5 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 3; Escape failed to close: 3; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/details/show-instructors`

Final URL: `/details/show-instructors` · first load 2956 ms · 34 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/Instructors` | 200 | 1024 ms | global bootstrap; x3 duplicate; slow >1s |
| GET | `/api/ClassroomPackages` | 200 | 507 ms | global bootstrap; x3 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 543 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 270 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 994 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 499 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 531 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 678 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 311 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 246 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 235 ms | global bootstrap |
| GET | `/api/Products` | 200 | 282 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 284 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 281 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 507 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 526 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 540 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 723 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 736 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 504 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 507 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 320 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 9 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 1; Escape failed to close: 1; clicks blocked by toasts: 6 (see [G-07]).

**Issues:** 

#### [P-11] Instructor "sessions" field is collected but never sent to the API
- Page / Area: /details/show-instructors → + ضيف إنستراكتور جديد
- Category: API integration
- Severity: Medium
- Status: Confirmed (reproduced)
- Location: show-instructors.component.ts (save) → details.service.ts / instructor-api.service.ts
- Description: The form has a number input `formSessions` (and an affiliation field) but the POST body contains only name, phoneNumber, email, specialty, organization, affiliation, bio, isActive, colour. The sessions value is lost (or kept only in localStorage, see [M-02]).
- Steps to reproduce: Add an instructor with sessions = 5.
- Expected vs actual: Value persisted vs not in payload.
- Evidence: POST /api/Instructors {"name":"Audit Test Instructor","phoneNumber":"01000000000","email":"audit-test@example.com","specialty":"AUDIT-TEST","organization":null,"affiliation":null,"bio":null,"isActive":true,"colour":"#f5b921"} → 201 (audit/logs/forms-run.json, network-forms.har)
- Suggested fix: Remove the field or add it to the DTO/backend.

#### [P-12] Misleading name validation message
- Page / Area: Instructor / student name fields
- Category: UX
- Severity: Low
- Status: Confirmed (reproduced)
- Location: src/app/core/utils/validators.util.ts:121-152
- Description: Name "AUDIT-TEST Instructor (safe to delete)" is rejected with "cannot be only digits or symbols" although it contains letters; the real reason is that parentheses/digits are not allowed at all.
- Steps to reproduce: Type a name with "(" in the add-instructor modal.
- Expected vs actual: Message naming the forbidden characters vs a wrong reason.
- Evidence: forms-run-main.json instructor-add.valid errorsShown
- Suggested fix: Return a specific message for disallowed characters.

---

### Page: `/catering/show-products`

Final URL: `/catering/show-products` · first load 3140 ms · 36 API/asset responses on load

**Console:** 
- `[error] Failed to load resource: the server responded with a status of 404 ()`
(all are image 404s, see [B-01])

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/ClassroomPackages` | 200 | 548 ms | global bootstrap; x3 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 592 ms | global bootstrap; x3 duplicate |
| GET | `/api/Products` | 200 | 328 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/current` | 200 | 303 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1012 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Instructors` | 200 | 1045 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 585 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 594 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 732 ms | global bootstrap; x2 duplicate |
| GET | `https://nook.runasp.net/uploads/products/{file}.jpg` | 404 | 259 ms | x2 duplicate; error status |
| GET | `/api/workspaces/{id}/catering` | 200 | 454 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 252 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 234 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 256 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 254 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 447 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 502 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 511 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 660 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 686 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 538 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 288 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 577 ms | global bootstrap |

Aborted on navigation: 1 requests (`GET http://localhost:4300/api/Accounts/unlinked-students`…)

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 8 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 1; Escape failed to close: 1; clicks blocked by toasts: 6 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/catering/add-products`

Final URL: `/catering/add-products` · first load 2964 ms · 33 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/ClassroomPackages` | 200 | 571 ms | global bootstrap; x3 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 571 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 292 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 995 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1039 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 523 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 546 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 711 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 324 ms | global bootstrap; x2 duplicate |
| GET | `/api/Products` | 200 | 268 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 275 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 302 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 302 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 298 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 533 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 553 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 555 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 754 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 762 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 512 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 519 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 251 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 3 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 2 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/catering/product-graph`

Final URL: `/catering/product-graph` · first load 2975 ms · 35 API/asset responses on load

**Console:** 
- `[error] Failed to load resource: the server responded with a status of 404 ()`
(all are image 404s, see [B-01])

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 521 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 541 ms | global bootstrap; x3 duplicate |
| GET | `/api/Products` | 200 | 270 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/current` | 200 | 281 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1032 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Instructors` | 200 | 1041 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 528 ms | global bootstrap; x2 duplicate |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 548 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 663 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 264 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 246 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 279 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 290 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 289 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 489 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 523 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 529 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 709 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 744 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 523 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 538 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 253 ms | global bootstrap |
| GET | `https://nook.runasp.net/uploads/products/{file}.jpg` | 404 | 69 ms | error status |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 5 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 1 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/settings/general`

Final URL: `/settings/general` · first load 3352 ms · 39 API/asset responses on load

**Console:** 
- `[error] Failed to load resource: the server responded with a status of 404 ()`
- `[error] Failed to load resource: the server responded with a status of 404 (Not Found)`
(all are image 404s, see [B-01])

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/Rooms` | 200 | 695 ms | global bootstrap; x3 duplicate |
| GET | `/api/PricingPlans` | 200 | 781 ms | global bootstrap; x3 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 562 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 568 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 384 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 1247 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1248 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 530 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 552 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 914 ms | global bootstrap; x2 duplicate |
| GET | `/api/PackagePricingPlans` | 200 | 868 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 356 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 255 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 272 ms | global bootstrap |
| GET | `/api/Products` | 200 | 286 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 288 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 287 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 562 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 728 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 773 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 691 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 692 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 401 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 8 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 1; Escape failed to close: 1; clicks blocked by toasts: 1 (see [G-07]).

**Issues:** 

#### [P-13] Pricing tiers overlap and contradict each other
- Page / Area: /settings/general → تسعير ساعات الستيودنتس
- Category: Logic
- Severity: High
- Status: Confirmed (reproduced: existing data) / Suspected (no overlap validation)
- Location: settings.component.ts (tier save), settings.service.ts
- Description: The tier table lists 0→1 h 80 EGP, then four tiers "1→1 h" priced 80, 60, 120, 80, then 1→9 h 50 EGP. It is undefined which price applies to a 1-hour session. The add-tier form only checks `to > from` (rejected 5→2), it does not check overlap with existing tiers.
- Steps to reproduce: Open /settings/general.
- Expected vs actual: Non-overlapping tiers vs duplicate ranges with different prices.
- Evidence: audit/screenshots/crawl/settings_general@1024.png; forms-run-main.json pricing-tier-add
- Suggested fix: Validate against existing tiers (client + server) and clean the data. Also "1 ساعات" → "ساعة".

---

### Page: `/settings/discounts`

Final URL: `/settings/discounts` · first load 2931 ms · 35 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 549 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 564 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 252 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 981 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1039 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 536 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 565 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 734 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 240 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 220 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 232 ms | global bootstrap |
| GET | `/api/Products` | 200 | 246 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 253 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 257 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 481 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 481 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 510 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 680 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 707 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 572 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 574 ms | global bootstrap |
| GET | `/api/Discounts` | 200 | 263 ms | – |
| GET | `/api/Coupons` | 200 | 284 ms | – |
| GET | `/api/Workspaces` | 200 | 308 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 8 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 2; Escape failed to close: 2; clicks blocked by toasts: 3 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/settings/show-user`

Final URL: `/settings/show-user` · first load 3309 ms · 39 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/Accounts/{id}/profile` | 200 | 421 ms | x4 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 579 ms | global bootstrap; x3 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 585 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 246 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 1008 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Students?PageSize=1000` | 200 | 1109 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 548 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 585 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 749 ms | global bootstrap; x2 duplicate |
| GET | `/api/Accounts` | 200 | 652 ms | x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 455 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 225 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 235 ms | global bootstrap |
| GET | `/api/Products` | 200 | 246 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 248 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 259 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 464 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 504 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 527 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 692 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 728 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 557 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 581 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 259 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 5 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 2; Escape failed to close: 2; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/settings/profile`

Final URL: `/settings/profile` · first load 3070 ms · 36 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/WorkspacePackages` | 200 | 606 ms | global bootstrap; x3 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 615 ms | global bootstrap; x3 duplicate |
| GET | `/api/shifts/current` | 200 | 292 ms | global bootstrap; x2 duplicate |
| GET | `/api/Instructors` | 200 | 970 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 1097 ms | global bootstrap; x2 duplicate; slow >1s |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 493 ms | global bootstrap; x2 duplicate |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 556 ms | global bootstrap; x2 duplicate |
| GET | `/api/shifts/{id}` | 200 | 694 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 271 ms | global bootstrap; x2 duplicate |
| GET | `/api/Settings/operational-alerts` | 200 | 258 ms | global bootstrap |
| GET | `/api/Products` | 200 | 268 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 272 ms | global bootstrap |
| GET | `/api/Notifications?pageSize=50` | 200 | 293 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 283 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 498 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 525 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 528 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 715 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 720 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 519 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 526 ms | global bootstrap |
| GET | `/api/Auth/me` | 200 | 321 ms | – |
| GET | `/api/Workspaces` | 200 | 354 ms | global bootstrap |
| GET | `/api/Accounts/{id}/profile` | 200 | 256 ms | – |
| GET | `/api/Accounts/unlinked-students` | 200 | 237 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 3 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

### Page: `/this-route-does-not-exist`

Final URL: `/this-route-does-not-exist` · first load 3172 ms · 27 API/asset responses on load

**Console:** No console errors

**Network:**

| Method | Endpoint | Status | Time | Problem |
|---|---|---|---|---|
| GET | `/api/Instructors` | 200 | 973 ms | global bootstrap; x2 duplicate |
| GET | `/api/Students?PageSize=1000` | 200 | 950 ms | global bootstrap; x2 duplicate |
| GET | `/api/WorkspacePackages` | 200 | 607 ms | global bootstrap; x2 duplicate |
| GET | `/api/ClassroomPackages` | 200 | 504 ms | global bootstrap; x2 duplicate |
| GET | `/api/workspaces/{id}/catering` | 200 | 597 ms | global bootstrap; x2 duplicate |
| GET | `/api/Notifications?pageSize=50` | 200 | 219 ms | global bootstrap |
| GET | `/api/Settings/operational-alerts` | 200 | 234 ms | global bootstrap |
| GET | `/api/Products` | 200 | 234 ms | global bootstrap |
| GET | `/api/Products/categories` | 200 | 248 ms | global bootstrap |
| GET | `/api/shifts/current` | 200 | 248 ms | global bootstrap |
| GET | `/api/shifts` | 200 | 431 ms | global bootstrap |
| GET | `/api/AuditLogs?pageSize=100` | 200 | 252 ms | global bootstrap |
| GET | `/api/Rooms` | 200 | 454 ms | global bootstrap |
| GET | `/api/PricingPlans` | 200 | 502 ms | global bootstrap |
| GET | `/api/Faculties` | 200 | 675 ms | global bootstrap |
| GET | `/api/Workspaces?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 458 ms | global bootstrap |
| GET | `/api/Blacklists` | 200 | 691 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-08T08:03:36.650Z` | 200 | 472 ms | global bootstrap |
| GET | `/api/shifts/{id}` | 200 | 682 ms | global bootstrap |
| GET | `/api/Classrooms?DateFrom=2026-11-10` | 200 | 463 ms | global bootstrap |
| GET | `/api/Reservations` | 200 | 459 ms | global bootstrap |
| GET | `/api/Workspaces` | 200 | 255 ms | global bootstrap |

**Responsive (360/768/1024/1440):** no horizontal page overflow at any width.

**Interactions:** 0 buttons clicked (destructive/paying/saving buttons skipped). Modals opened: 0; Escape failed to close: 0; clicks blocked by toasts: 0 (see [G-07]).

**Issues:** No page-specific issues beyond the cross-cutting ones.

---

## Cross-cutting / global issues

### [G-01] Checkout API failures are swallowed — UI shows a completed checkout even when the server rejected it
- Page / Area: Workspace checkout, Show student, Classroom checkout, catering, blacklist unblock, session update/delete
- Category: API integration
- Severity: Critical
- Status: Suspected (code reading only)
- Location: src/app/core/services/workspace.service.ts:1186, 1204, 1348, 1374, 1456, 1485, 1564, 1677; src/app/core/services/classroom.service.ts:1242; src/app/core/services/catering.service.ts:863; src/app/core/services/shift.service.ts:1165; src/app/core/services/package.service.ts:650 (14 `error: (err) => console.warn(...)` handlers in total)
- Description: State is updated locally first and the HTTP call is fire-and-forget. On error the only effect is a `console.warn('... notice')`. The cashier sees the student as checked out / item removed / session updated while the backend still has the old state, so money and session data drift apart and reappear after reload.
- Steps to reproduce: Check out a workspace student while the API returns an error (e.g. offline or 4xx/5xx) → toast says success, session disappears; reload page → session is back.
- Expected vs actual: Expected an error toast and rollback; actual silent warning in console.
- Evidence: `this.api.checkOut(studentId, {...}).subscribe({ error: (err) => console.warn('[WorkspaceService] Checkout API notice:', err?.message) });` (workspace.service.ts:1191-1205)
- Suggested fix: Make the HTTP call the source of truth: wait for success before mutating signals, show an error toast and keep state on failure.

### [G-02] Delete endpoints report success when the request fails
- Page / Area: Show blacklist (unblock), Settings → discounts, Show colleges
- Category: API integration
- Severity: High
- Status: Suspected (code reading only)
- Location: src/app/core/services/api/blacklist-api.service.ts:72, src/app/core/services/api/discount-api.service.ts:103, src/app/core/services/api/faculty-api.service.ts:64
- Description: `catchError(() => of(true))` turns any HTTP error (403, 404, 409, 500, network) into "deleted successfully". Missing `res` is also treated as success.
- Steps to reproduce: Delete a faculty that the backend refuses to delete (e.g. still referenced) → UI removes it and shows success; reload → it is still there.
- Expected vs actual: Error message vs fake success.
- Evidence: `catchError(() => of(true))`
- Suggested fix: Propagate the error (or return `false`) and show the backend message.

### [G-03] Missing `vercel.json` although production relies on it for `/api` rewrites
- Page / Area: All pages (production deploy)
- Category: API integration
- Severity: High
- Status: Confirmed (file absent in `Frontend/` on `mariem`)
- Location: src/app/core/constants/api-endpoints.ts:9-16; commit e903a17 "optimize output directory and vercel config"
- Description: `API_BASE_URL` is `''` and the comment says production requests go through "Vercel Serverless Rewrites (vercel.json)". No `vercel.json` exists in this folder, so a fresh deploy from this folder would send `/api/...` to the static host and get 404/HTML.
- Steps to reproduce: `git ls-files | grep -i vercel` → nothing.
- Expected vs actual: A rewrite config next to the app vs none.
- Evidence: comment at api-endpoints.ts:11-14; no file.
- Suggested fix: Restore `vercel.json` (rewrites for `/api`, `/uploads`, `/Uploads`) or make the base URL environment-driven. See Open questions Q-01 (maybe it lives outside this folder).

### [G-04] Hardcoded colours instead of theme tokens
- Page / Area: All feature pages, worst in classroom reservations, show-student, checkout modal, analytics modal, package pages
- Category: Colors
- Severity: Medium
- Status: Confirmed (static count)
- Location: 2,722 hex literals across component CSS files vs 3,883 `var(--…)` uses. Top: classroom-reservations.component.css (255), show-student.component.css (180), checkout-modal.component.css (142), student-analytics-modal.component.css (131), add-student-package / add-instructor-package (128 each), show-*-package (126 each)
- Description: `src/styles.css` defines 131 tokens with `[data-theme="dark"|"light"]`, but components bypass them, so light/dark mode only partially switches and the palette drifts between pages.
- Evidence: `git ls-files src/app | grep css$ | xargs grep -ohE '#[0-9a-fA-F]{3,8}\b' | wc -l` → 2722
- Suggested fix: Replace literals with existing tokens; add a stylelint rule (`color-no-hex`) for component CSS.

### [G-05] Student / instructor package pages are near-identical copies
- Page / Area: /package/student, /package/instructor, /package/add-student-package, /package/add-instructor-package
- Category: Consistency
- Severity: Low
- Status: Confirmed
- Location: src/app/features/package/*
- Description: `add-student-package.component.css` and `add-instructor-package.component.css` are byte-identical (1,031 lines, 0 diff lines); the show-* CSS differs in 33 of 2,856 lines; TS/HTML differ in ~10–30 %. Fixes are already diverging (the mock-coupon fallback [L-02] exists only in the instructor copies).
- Suggested fix: One shared package component parameterised by audience.

### [G-06] Very large components and services
- Page / Area: show-student, classroom-reservations, show-classroom, language.service
- Category: Logic
- Severity: Low
- Status: Confirmed
- Location: show-student.component.ts (2,982 lines) / .css (5,037) / .html (1,876); classroom-reservations.component.ts (2,642); show-classroom.component.ts (2,618); language.service.ts (4,277, all translations inline); classroom.service.ts (2,062); shift.service.ts (2,060); workspace.service.ts (1,847)
- Description: Single files mix API, business rules (pricing, discounts, coupons) and UI, which is where bugs like [L-01], [L-03] hide and why components have no tests.
- Suggested fix: Extract checkout/pricing logic into tested services; move translations to JSON.

### [T-01] No linter configured
- Page / Area: Tooling
- Category: Testing
- Severity: Low
- Status: Confirmed
- Location: package.json (no eslint), angular.json (no `lint` target)
- Description: Unused imports/vars, `any` (393 occurrences of `: any`/`as any`) and console statements are not caught.
- Suggested fix: `ng add @angular-eslint/schematics`.

### [T-02] Critical flows have no tests
- Page / Area: Testing
- Category: Testing
- Severity: Medium
- Status: Confirmed
- Location: no `*.spec.ts` for any component; no spec for classroom.service.ts, shift.service.ts (only permission), catering.service.ts, details.service.ts, user.service.ts, settings.service.ts, any `services/api/*`
- Description: Untested: login/refresh UI flow, workspace check-in → checkout → payment, classroom session checkout & reservation conflicts, shift open/close & end-of-shift balance, catering POS stock deduction, coupon/discount application, user management.
- Suggested fix: Start with service-level specs for checkout totals and coupon application, then a Playwright smoke test per flow.

### [L-01] Workspace checkout sends `totalCost = 30` when the real total is 0
- Page / Area: Workspace checkout / show-student checkout
- Category: Logic
- Severity: High
- Status: Suspected (code reading only)
- Location: src/app/core/services/workspace.service.ts:1201 (vs 1181)
- Description: The workspace checkout uses `checkoutOptions?.totalCost || student.cost || 30`. A legitimate total of `0` (fully covered by package hours / 100 % discount) is falsy, so it falls back to `student.cost` or the hardcoded `30`. The student-checkout call 20 lines above uses `!== undefined` and sends 0 — the two requests disagree.
- Steps to reproduce: Check out a student whose session is fully paid by package hours.
- Expected vs actual: `totalCost: 0` in `PUT /api/Workspaces/{id}/checkout` vs `30` (or session cost).
- Evidence: `totalCost: checkoutOptions?.totalCost || student.cost || 30`
- Suggested fix: Use `??`, and remove the hardcoded 30.

### [L-02] Fake coupon codes are accepted whenever the coupon API fails
- Page / Area: /package/add-instructor-package, /package/instructor (package sale modal)
- Category: Logic
- Severity: High
- Status: Suspected (code reading only)
- Location: src/app/features/package/add-instructor-package/add-instructor-package.component.ts:304-316; src/app/features/package/show-instructor-package/show-instructor-package.component.ts:491-503
- Description: In the `error` branch of the coupon lookup, codes `CORP10`/`NOOK10` give 10 % and `CORP100`/`WELCOME100` give 100 EGP, with a success toast. Any API error (404 "not found", 500, offline) therefore applies a discount that does not exist in the backend. The student-package copies do not have this, so behaviour differs between the two pages.
- Expected vs actual: "Invalid coupon" vs discount applied.
- Evidence: `// Fallback for demo mock codes if backend doesn't have them` / `if (code === 'CORP10' || code === 'NOOK10') { ... this.discountValue.set(10); ... 'success') }`
- Suggested fix: Delete the fallback; show the API error.

### [L-03] Quick check-in stores placeholder data when fields are empty (unreachable code)
- Page / Area: /workspace/add-student
- Category: Dead code (downgraded from Logic/High: the browser showed the component always redirects, see [P-06])
- Severity: Low
- Status: Confirmed (code is unreachable)
- Location: src/app/features/workspace/add-student/add-student.component.ts:131-135
- Description: Empty phone becomes `'010XXXXXXXX'`, empty WhatsApp becomes phone or `'010XXXXXXXX'`, empty college `'University'`, empty faculty `'General'`. These values are sent to the backend as real data, and every student without a phone shares the same "phone", which breaks lookup/dedup by phone.
- Expected vs actual: Field left empty / validation error vs fake values persisted.
- Evidence: `phone: this.phone() || '010XXXXXXXX'`
- Suggested fix: Send `null`/omit, or make the field required.

### [L-04] Login silently trims the password
- Page / Area: /auth/login
- Category: Logic
- Severity: Medium
- Status: Suspected (code reading only)
- Location: src/app/auth/login/login.component.ts:186; src/app/core/services/auth.service.ts:149; reset flow login.component.ts:141-142
- Description: `password.trim()` changes the secret the user typed; a password with leading/trailing spaces set elsewhere (e.g. directly through the API) can never log in from the web, and reset-password stores a trimmed version.
- Suggested fix: Do not trim passwords (trim only the identifier).

### [L-05] Workspace checkout fires two checkout requests for one action
- Page / Area: Workspace checkout
- Category: API integration
- Severity: Medium
- Status: Suspected (to be confirmed in network log)
- Location: src/app/core/services/workspace.service.ts:1175-1205
- Description: For one checkout the code calls `POST/PUT /api/Students/{id}/checkout` **and** `PUT /api/Workspaces/{id}/checkout`, each with its own amount/wallet fields, independently and in parallel. If both are recorded server-side the payment may be counted twice; if one fails it is silent ([G-01]).
- Suggested fix: Confirm with backend which endpoint is authoritative and call only that one.

### [M-01] Shift opening floats are stored only in localStorage
- Page / Area: /shift/active, end-of-shift balance
- Category: Missing backend
- Severity: Medium
- Status: Suspected (code reading only)
- Location: src/app/core/utils/shift-balance.util.ts:160-185
- Description: Opening cash/visa floats used to compute the end-of-shift balance are saved in `localStorage`. Closing the shift on another device/browser (or after clearing storage) computes the balance without them.
- Suggested fix: Persist floats on the shift record in the backend.

### [M-02] Instructor extra details stored only in localStorage
- Page / Area: /details/show-instructors
- Category: Missing backend
- Severity: Medium
- Status: Suspected (code reading only)
- Location: src/app/core/services/details.service.ts:183-218 (`nook_instructor_meta_<id|phone>`)
- Description: Some instructor fields are cached per browser and merged into API data, so different staff see different instructor details.
- Suggested fix: Store these fields in the Instructors API or drop them.

### [G-07] Overdue toasts block the main action buttons on every page
- Page / Area: All pages (also /auth/login and the 404 page)
- Category: UX
- Severity: High
- Status: Confirmed (reproduced)
- Location: src/app/core/services/notification.service.ts:395-425 (overtime alerts, severity `critical`); src/app/shared/components/toast-container/toast-container.component.ts
- Description: Two sessions open for 20 days create two red "critical" toasts on every page load. They sit top-left (RTL start of the header), cover the user avatar/notification icons, and intercept clicks on the primary buttons below them: "بيع باكيدج ستيودنت", "حجز روم جديدة", "طلّع النتائج دي بره", "+ ضيف كود ديسكاونت", Excel export, etc. They come back after every navigation and are also shown on the login and 404 pages.
- Steps to reproduce: With any long-overdue session, open /package/student and click "بيع باكيدج ستيودنت" without closing the toasts.
- Expected vs actual: Button opens the modal vs nothing happens (the click lands on the toast).
- Evidence: Playwright: `<div class="toast-message">الطالب "ساره محمد يسن" متأخر بمقدار 20 يوم و 17 س…</div> from <app-toast-container> subtree intercepts pointer events` (audit/scripts/diag.mjs); 118 blocked clicks in crawl-results.json; screenshots `*@360.png`, `dashboard@1440.png`, `this_route_does_not_exist@1440.png`.
- Suggested fix: Show overdue alerts once (notification center/badge), not as persistent toasts; place toasts where they don't overlap actions, or make the container `pointer-events: none` except the toast card.

### [G-08] Modals do not close with Escape
- Page / Area: /workspace/checkout (+ ضيف ديسكاونت, + زوّد أوردر), /classroom/reservation (حجز جديد), /shift/active (تعديل), and others
- Category: UX
- Severity: Low
- Status: Confirmed (reproduced)
- Location: src/app/shared/components/modal/modal.component.ts and feature-local modal markup
- Description: Escape does nothing; only the × / كنسل buttons close modals. Keyboard users get stuck.
- Evidence: crawl-clicks.json entries `↳ Escape did NOT close the modal`.
- Suggested fix: Handle `keydown.escape` in the shared modal and use it everywhere.

### [G-09] Global data bootstrap on every page load (27–51 requests, duplicates)
- Page / Area: All pages, including /auth/login and the 404 page
- Category: Network
- Severity: High
- Status: Confirmed (reproduced)
- Location: root-provided services that load in their constructors (workspace.service.ts, classroom.service.ts, package.service.ts, shift.service.ts, catering.service.ts, details.service.ts, notification.service.ts)
- Description: Opening any URL triggers the same ~25 GET endpoints (WorkspacePackages, ClassroomPackages, Students?PageSize=1000, Instructors, Rooms, PricingPlans, Faculties, Blacklists, Workspaces, Classrooms, Reservations, Products, shifts, AuditLogs, Notifications…). Several are fired 2–4 times in one load (dashboard: Students ×3, Instructors ×3, Rooms ×3, PricingPlans ×3, WorkspacePackages ×3, ClassroomPackages ×3). The 404 page alone makes 27 calls. Several take > 1 s (PricingPlans 1.6 s, Students 1.5 s, WorkspacePackages 1.5 s, Instructors 1.5 s, shifts 1.2 s).
- Steps to reproduce: Open /this-route-does-not-exist with DevTools → Network.
- Expected vs actual: Only the data the page needs, once vs everything, several times.
- Evidence: audit/logs/network.md ("Global" table; /dashboard and /this-route-does-not-exist sections), network.har
- Suggested fix: Lazy-load per feature, share in-flight requests (`shareReplay`), and paginate students instead of `PageSize=1000`.

### [G-10] N+1 catering requests per active workspace session
- Page / Area: All pages (bootstrap)
- Category: Network
- Severity: Medium
- Status: Confirmed (reproduced)
- Location: workspace.service.ts / catering.service.ts:300-315 (aggregate session items)
- Description: `GET /api/workspaces/{id}/catering` is called once per open session, and repeated (4 calls on /dashboard for 2 sessions; 86 calls across the crawl). Grows linearly with occupancy.
- Evidence: network.md "GET /api/workspaces/{id}/catering"
- Suggested fix: Include catering totals in the sessions list response or batch them.

### [G-11] Inconsistent validation behaviour and rules between forms
- Page / Area: All create/edit modals
- Category: Consistency
- Severity: Medium
- Status: Confirmed (reproduced)
- Location: see forms list
- Description: Some forms silently disable the submit button with no message (check-in, new reservation, sell student/instructor package, add instructor, add discount), others allow submit and show inline errors (room booking, blacklist, add user, pricing tier, password). Name rules also differ: user = at least 3 words ("اسم ثلاثي"), room booking = 3–50 letters, instructor/student = 2 letters, no parentheses. Users get no hint why the button is disabled.
- Evidence: audit/logs/forms-run-main.json (`submitDisabled: true` vs `errorsShown`), audit/screenshots/forms/*
- Suggested fix: One validation pattern (enabled button + inline errors on submit) and shared validators.

### [G-12] Mixed languages and duration formats
- Page / Area: Workspace, reservations, checkout, dashboard
- Category: Consistency
- Severity: Low
- Status: Confirmed (reproduced)
- Location: show-student.component.*, classroom-reservations.component.*, checkout-modal
- Description: Arabic UI shows English fragments: "5d 5h 19m", "20d 19h 53m", "1h 00m", "Today", "(November 10, 2026)", "Previous day/Next day", "Options", "Close", "AM/PM" mixed with "ص/م"; grammar "1 ساعات", "62 ساعات".
- Evidence: screenshots listed under P-04, P-05, P-09.
- Suggested fix: Route all dates/durations through LanguageService formatters.

### [D-01] Leftover debug logging in production code
- Page / Area: Global
- Category: Dead code
- Severity: Low
- Status: Confirmed
- Location: 77 `console.*` calls in `src/app` (non-spec). `console.log` success logs: show-classroom.component.ts:2407, workspace/checkout/checkout.component.ts:499, show-student.component.ts:2532
- Suggested fix: Remove `console.log`; route warnings through NotificationService / a logger.

---

## Backend issues observed from the frontend

No API request returned 4xx/5xx during the crawl, the click passes or the form tests. No CORS errors (all calls go through the dev proxy). Observations:

### [B-01] Uploaded images return 404
- Requests (all `GET`, via proxy to https://nook.runasp.net):
  - `/uploads/rooms/e611824140f64a19a5b66854854f6b31.jpg` → 404
  - `/uploads/rooms/d59aca6b2c85499383a332bae06f2d07.jpg` → 404
  - `/uploads/rooms/20dcc0bf76134ec29821e7d06bbd8def.jpg` → 404
  - `/uploads/rooms/c9242678d2e343098c2ca16dd081e460.jpg` → 404
  - `/uploads/rooms/bfdee21da69447ce9be08c76796e6e38.jpg` → 404
  - `/uploads/rooms/99c51b3ca3254610a10f5c51561a4ffe.jpg` → 404
  - `/uploads/products/72c47b92120646fb9cb006200b6728f6.jpg` → 404
- Seen on: /classroom/show-classroom, /classroom/add-classroom, /classroom/reservation, /workspace/show-student, /catering/show-products, /catering/product-graph. These are the only console errors in the app ("Failed to load resource: the server responded with a status of 404").
- The image paths come from the Rooms / Products API responses; the files are not served.

### [B-02] Slow endpoints (> 1 s at least once)
`GET /api/PricingPlans` 1,627 ms · `GET /api/Students?PageSize=1000` 1,506 ms · `GET /api/WorkspacePackages` 1,487 ms · `GET /api/Instructors` 1,469 ms · `POST /api/Auth/login` 1,416 ms · `GET /api/shifts` 1,223 ms · `GET /api/Blacklists` 1,131 ms · `GET /api/workspaces/{id}/catering` 1,033 ms · `GET /api/shifts/{id}` 1,010 ms · `GET /api/ClassroomPackages` 1,005 ms. The first unauthenticated `GET /api/Auth/me` took 4.3 s. (Timings include the dev proxy.)

### [B-03] Data returned that the UI cannot handle well
- `GET /api/Workspaces` returns 2 sessions still open since ~20 Oct 2026 (students "ساره محمد يسن", "دعاء شعبان"); this drives [G-07], [P-04], [P-05].
- `GET /api/PricingPlans` returns overlapping tiers (0→1, four × 1→1 with prices 80/60/120/80, 1→9) — see [P-13].

### [B-04] Instructor create response omits fields the form collects
`POST /api/Instructors` body (frontend) has no sessions field; the 201 response `data` has `organization: null` and no `affiliation`, although the request sent `affiliation`. Evidence: audit/logs/forms-run.json.

---

## Dead code & unnecessary files

Tools: knip 5.66 (`audit/logs/knip.txt`, config `audit/scripts/knip.json`) + manual `grep` for every file name/selector in `src`, `angular.json`, `tsconfig*.json`, templates and dynamic `import()`s. Routed components are reached via `loadComponent` and are not dead.

| Path | Type | Why it's unused | Safe to delete |
|---|---|---|---|
| src/app/core/api-enums.ts | file | Not imported anywhere | Yes |
| src/app/core/constants/app.constants.ts | file | Not imported (types duplicated in models) | Yes |
| src/app/core/constants/routes.ts | file | Not imported; router uses string literals | Yes |
| src/app/core/models/index.ts | file (barrel) | No import from `core/models` barrel | Yes |
| src/app/core/services/permission.service.ts | file/service | Never injected | Yes |
| src/app/core/services/student.service.ts | file/service | Never injected | Yes |
| src/app/shared/components/autocomplete/ | component | Selector `app-autocomplete` never used, not imported | Yes |
| src/app/shared/components/data-table/ | component | Selector `app-data-table` never used | Yes |
| src/app/shared/components/footer/ | component | Selector `app-footer` never used | Yes |
| src/app/shared/components/student-snapshot-card/ | component | Selector never used, not imported | Yes |
| ~116 API service methods (see `audit/logs/api-map.md`, rows marked **UNUSED**) | function | Defined, never called outside the api folder, e.g. `ClassroomApiService.getInvoice`, `removeCateringItem`, `updateCateringItem`, `AnalysisApiService.getTopStudents/getInstructorActivity`, `AccountApiService.unlink*` | Check first (generator is name-based) |
| `ClassroomApiService.removeCateringItem` hits `/api/catering/classroom/{id}` | function | Unused and uses a path not in `API_ENDPOINTS` | Yes |
| 15 unused exported values (knip): `extractItems`, `mapAuditLogDto`, `mapStaffNotificationDto`, `DEFAULT_CATEGORIES`, `inferCategoryFromName`, `getTodayDateISO`, `formatMinutesToDuration`, `parseIsoOrTimeToDisplay`, `getAvatarColors`, `normalizeIsoString`, `formatLocalDateToISO`, `DEFAULT_ROOM_FALLBACK`, `containsInvalidPhoneCharacters`, `getDistinctCollegeColor`, enums `PayWay/DiscountType/SessionStatus/BookingStatus` (duplicated in 3–4 model files) | export/function | No importer | Yes (un-export or remove) |
| 53 files with unused exported types (knip list) | type | No importer | Yes (low value) |
| `ClassroomTypeEnum.Reservation`, `.InstructorPackage` | enum member | Unused | Check first (backend enum mirror) |
| `PackageType` / `BackendPackageType` in pricing-plan.model.ts | duplicate export | Same thing exported twice | Yes (one) |
| public/images/kernel-panic-icon-dark.png | asset | No reference in src | Yes |
| public/images/kernel-panic-icon-light.png | asset | No reference in src | Yes |
| public/images/kernel-panic-logo.jpg | asset | No reference in src | Yes |
| prettier | devDependency | No script uses it (only `.prettierrc`; editor tool) | Check first |
| puppeteer-core | devDependency | Only used by ad-hoc root scripts (e2e_test.mjs etc.), not by the app/tests | Check first |
| Routes with no link: `/workspace/checkout`, `/classroom/add-classroom`, `/classroom/checkout`, `/classroom/show-reservation(/:id)`, `/shift/end-of-shift-balance`, `/shift/search-shift`, `/package/add-student-package`, `/package/add-instructor-package` | route/page | Reachable only by typing the URL | Check first |
| 20+ legacy redirect routes (`show-student-package`, `show-instructor-packages`, `active-shift`, `admin-console`, `add-reservation`, `/users`, `/show-users`, …) | route | Old URLs kept as redirects | Check first |
| Root docs: API_AUDIT.md, API_FRONTEND_MAPPING.md, API_INTEGRATION_REPORT.md, BACKEND_REQUESTS.md, BACKEND_REQUIRED.md, BACKEND_REQUIRED_ENDPOINTS.md, CLASSROOM_AUDIT.md, DESIGN_NOTES.md, MANUAL_QA_CHECKLIST.md, OPEN_QUESTIONS.md, REMEDIATION_REPORT.md, STUDENT_BACKEND_REQUIREMENTS.md, project_documentation.md | files | Generated reports, overlap with `docs/` | Check first (move to docs/) |
| live_openapi.json, openapi_spec.json, raw_openapi.json, swagger_live.json, swagger_summary.json | files | 5 snapshots of the backend spec, not used by build | Yes (keep one in docs/ if needed) |
| e2e_results.json, edit_persistence_test_result.json, scratch/audit_results.json | files | Test output committed to git | Yes |
| e2e_test.mjs, verify_edit_persistence.mjs, scratch/*.js (10 files), scripts/*.mjs (9 files) | files | Ad-hoc scripts, not in package.json scripts | Check first |
| .gemini/walkthrough.md | file | AI-tool artefact | Yes |
| .vscode/mcp.json | file | Editor/AI config committed | Check first |

---

## Test records created

| Entity | Id | Values | Created via |
|---|---|---|---|
| Instructor | `0be20cf9-4fd1-444d-8913-cd5fa2dc010e` | name "Audit Test Instructor", phone 01000000000, email audit-test@example.com, specialty "AUDIT-TEST" | /details/show-instructors → + ضيف إنستراكتور جديد |

No other records were created: every other submit was empty/invalid and was blocked by client validation (see forms-run-main.json). Nothing was deleted. Please delete the instructor above when convenient.

## Open questions

- **Q-01** Is `vercel.json` kept outside `Frontend/` (repo root or Vercel dashboard)? Not checked — outside scope. Determines whether [G-03] is real.
- **Q-02** Which checkout endpoint is authoritative for a workspace session: `/api/Students/{id}/checkout` or `/api/Workspaces/{id}/checkout`? ([L-05])
- **Q-04** Is https://nook.runasp.net production? The audit treated it as live and avoided money-moving submissions.
- **Q-05** Should a 20-day-open session be billable at all (P-05), or is there a backend auto-close rule?

## Live end-to-end test (2026-11-10 → 11, wiped backend)

Logs per step: `audit/logs/e2e/*.json`, screenshots: `audit/screenshots/e2e/`. Scripts: `audit/scripts/e2e-steps.mjs` (workspace, products, people, discounts, packages), `e2e-class.mjs` (classroom booking/edit/checkout), `e2e-res.mjs` + `e2e-res2.mjs` (reservations), `e2e-bl.mjs` (blacklist), `e2e-shift.mjs` (shift page and close).

### Round 1 — workspace, people, packages (passing after fixes)

Rooms, pricing tiers (overlap/reversed validation), package presets, alert settings, open shift (all 4 opening balances saved), products, instructors, student register/edit, promo codes + auto rule, check-in (existing + new), session catering, checkout (cash + 10 %, coupon FIX20 + Fawry, partial + Vodafone), shift expenses (InstaPay/Fawry) and manual income, student and instructor package sales.

Fixed: stock alert text, stored category ignored, unsaved reorder field, `shifts/open/{accountId}` 400 on every page, ~120 invisible messages (local toasts), student university/faculty swapped, duplicate phone silently renamed a student, false "saved locally", student edit sent PUT /Workspaces/{studentId}, zones off by one (Shared=1/Silent=2), billing type swapped (New=1/Coupon=2/Package=3), expected leave time dropped, walk-in path lost fields, new students matched by name, fake "1 visit / 2 h", double stock deduction for session orders, shift items rejected (category must be a number), checkout revenue double-posted, InstaPay/Fawry codes swapped (InstaPay=3/Fawry=4), coupons deducted twice (fixed coupon zeroed the bill), package sales missing from shift revenue, package sales filed as Workspace instead of Package.

### Round 2 — packages in use, classrooms, reservations, blacklist, shift close

| Flow | Result |
|---|---|
| Student check-in on package → checkout | ✓ 20 → 19 h, usage history entry, nothing charged |
| Classroom booking (cash) → edit → checkout (Vodafone) | ✓ 160 EGP lands in the shift as Classroom / Vodafone |
| Classroom booking on instructor package → checkout | ✓ one deduction (2 h), 0 EGP due, saved as type InstructorPackage |
| Reservation one-off, weekly ×4, conflict, cancel one day, edit, delete | ✓ |
| Start a session from a reservation → checkout (InstaPay) | ✓ 240 EGP in the shift |
| Blacklist add (registered student) → check-in blocked → unblock | ✓ |
| Shift close with a 9 EGP cash shortage | ✓ server stored loss 9 (wallet counts were wrong before fix 16) |
| Shift page totals vs server (new shift, wallet-paid expenses) | ✓ identical after fixes 16–17 |

Fixed in this round (each its own commit on `mariem`):

1. **Package hours not linked to the session/booking** — `use-hours` was sent with `sessionOrBookingId: null`.
2. **Classroom bookings crossing midnight** were saved with an end time before the start (11 PM → 1 AM ended on the same day); the card showed 0 minutes left.
3. **Editing a classroom booking cleared its date on the server** (`date: null` was sent).
4. **Instructor name copied into the booking note** for registered instructors, so every card showed it as a note.
5. **Card action buttons overflowed** the room card (check-out button cut off).
6. **Package classroom bookings deducted the hours twice** (2 h at booking + 2 h again at checkout; 10 → 6 for one 2-hour booking), and the checkout deduction ran before the server accepted the checkout. The checkout now reads the hours already deducted for the booking from the usage history, deducts only the rest, and only after success.
7. **Package classroom bookings were saved as type New** — now `InstructorPackage` (3).
8. **The live room board lost sessions that cross midnight** — it loaded and showed only today's bookings; a session started at 11:59 PM disappeared at midnight while still running.
9. **Editing a one-off reservation deleted it** — the server stores a recurrence frequency on every reservation, so one-offs were handled as a series: the edit cancelled its only day, then the replacement was rejected as overlapping. One-offs are now detected by their date range, and a single-occurrence edit creates the replacement before cancelling the old day.
10. **Reservation row menu opened below the screen** — "delete" could not be reached for a low row.
11. **Delete dialog said "cancel"** although it deletes permanently; it now warns that a series loses all its dates.
12. **Textareas used a monospace font**, which breaks Arabic letter joining (all notes fields).
13. **A future reservation could be started "now"** — the session then started days ahead and ended today.
14. **Blacklist search found only checked-in students** — registered students showed "no data".
15. **Blacklisting created two records** (one with reason "Other" and no student id, then a second one), so unblocking once left the student blocked.
16. **Shift close saved wrong wallet counts** — a few seconds after loading, the shift page rebuilt the channel totals from sessions (counting the opening wallet balance as income) and overwrote the server's totals; the close dialog pre-filled and sent those: Vodafone 210 instead of 270, InstaPay 970 instead of 1160, Fawry 35 instead of 15. The closed test shift (2026-11-10 20:03) therefore has false wallet differences (−60 / −220 / +5); its cash result (loss 9) is right because the server computes it.
17. **Wallet-paid expenses counted as wallet income** in the shift mapper (a 30 EGP InstaPay expense showed "+30 inside"), and revenue was re-split by keywords; both now run only when the server does not send those totals.

### Needs the backend

- **B-05** Editing one occurrence of a recurring reservation in the same slot is always rejected: after `cancel-day`, the overlap check still counts the cancelled day. The frontend now creates the replacement first, so nothing is lost, but the edit cannot succeed until the check ignores `canceledDates` (or an "edit one occurrence" endpoint exists).
- **B-06** `POST /api/Reservations` stores `recurrenceFrequency: 2` for one-off reservations.
- **B-07** The shift close endpoint accepts `vfCashInside`, `increase`, `loss` from the client and ignores them (it computes its own). Saying which close fields are computed by the server would avoid confusion.
- Earlier: partial-payment debt is stored only on the session (`wallet: -20`) and the student wallet stays 0; an old token is accepted after its account was deleted; shared/silent room capacity is not stored.

### Still open in the frontend (not fixed)

- No success toast after adding rooms/tiers/presets/products; selling price below cost allowed; room type options in English.
- The checkout modal of a running classroom session labels it "مكتملة" (completed).
- A 1-minute package session deducts a full hour (rounded up, minimum 1 h) — a policy question.
- Classroom checkout overwrites the booking note with "room – instructor".
- Legacy data: the 900 EGP instructor package sold before the category fix is filed as Workspace; Karim's 300 EGP package (sold before the shift fix) is in no shift.

### Not tested

User management and password changes (need the owner's password — for the owner to do), dashboard numbers vs. the API, notifications, filters/search/exports across lists, deleting students/instructors/products, the responsive pass at phone width.

### Data left on the server

A shift opened 2026-11-11 ~00:35 is **open** (opening 500 / VF 100 / InstaPay 50 / Fawry 20, two test expenses and one 40 EGP income). Reservations: a weekly series (Hall A, Fridays 13 Nov – 4 Dec, 20 Nov cancelled) and a one-off on 12 Nov whose day was cancelled by bug 9. Packages: Karim 18 h left, أحمد سمير 2 h left.
