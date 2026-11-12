# NOOK web — roles report

Tested on 2026-11-11 against the live API through the dev server (`localhost:4300`, branch `ui-consistency`, before any Part C change).

## Test accounts

| Role (as in the code) | Account | Password | How it was made |
|---|---|---|---|
| Guest | — (signed out) | — | Fresh browser context |
| Admin (`UserRole.Admin = 1` → `role: 'admin'`) | `admin` | not written here: the owner's existing account | Existing |
| Staff / Receptionist (`UserRole.Staff = 2`, `StaffRole.Receptionist = 2` → `role: 'user'`) | `fares` | not written here: chosen by the owner | Created by the owner in Settings → Users, then signed in by the owner in the test browser (`audit/scripts/signin-role.mjs staff`) |

**Why there are no passwords in this file:**
- The backend is live (`nook.runasp.net`).
- The tester does not type passwords or create accounts there.
- Each test profile (`audit/.pw-profile`, `audit/.pw-profile-staff`, git-ignored) keeps the session the owner signed in with.

**Role model found in the code:**
- `AuthService` turns the account's `roles` into just two values. `role: 'admin'` when the account has role 1, and `role: 'user'` for anything else.
- `adminGuard` protects 2 routes: `/settings/general` and `/settings/show-user`.
- `authGuard` protects everything else. `guestGuard` protects `/auth/login`.
- Student, Instructor and Parent accounts (`UserRole` 3–5) are for the mobile app. They are out of scope for the web.
- There is **no "reservation" role**. Reservations are done by admin and receptionist alike.

**Evidence:**
- Page captures with HAR files: `audit/logs/pages/before/<role>-<width>.har` and `<role>.md`
- Screenshots: `audit/screenshots/before/<role>/`
- Navigation probe: `audit/logs/roles/<role>-nav.json`
- Click walk-through (every non-destructive button and modal): `audit/logs/roles/<role>-explore.md`
- Cross-role runs: `audit/logs/roles/cross-*.log`, screenshots in `audit/screenshots/roles/`

---

## Guest (signed out)

All 19 app pages redirect to `/auth/login`, at 1440 and 360. No requests and no console errors. An unknown URL shows the 404 card.

### [R-G-01] 404 page offers "Back to dashboard" to a signed-out visitor
- Page: any unknown URL. Category: UI/UX. Severity: Low. Status: Fixed (C7-02, 8435d26).
- Location: not-found page component.
- Steps: sign out, open `/this-page-does-not-exist`.
- Expected: a "Go to sign in" action, or a dashboard link that clearly leads to sign-in.
- Actual: "العودة إلى لوحة التحكم" (back to dashboard), which then bounces to the login page.
- Evidence: `audit/screenshots/before/guest/this_page_does_not_exist@1440.png`
- Suggested fix: when signed out, label the button with "sign in" and link to `/auth/login`.

---

## Admin

- **Navigation:** 7 sidebar groups with 19 links, plus the navbar (search, notifications, language, theme). Every page opens.
- **Page loads:** 0 failed requests and 0 console errors on all 21 URLs, at both widths.
- **Walk-through:** 35 overlays opened (modals, dropdowns, menus). Every one closed with Escape. No failed request and no console error.
- **Deeper flows:** covered in `AUDIT_REPORT.md` → "Live end-to-end test" (check-in/out, packages, classrooms, reservations, blacklist, shift close). They were not repeated here.

### [R-A-01] Button class names don't match what the buttons do
- Page: student / instructor packages. Category: Consistency. Severity: Low. Status: Open.
- Location: `show-student-package.component.html`, `show-instructor-package.component.html`.
- Actual: the "edit" row button uses the class `btn-checkout`. Across the site, 30+ ad-hoc button classes do the same job (`btn-cancel`, `btn-secondary`, `btn-ghost-modal`, …).
- Suggested fix: use the shared button (see `DESIGN_STANDARD.md` §4).

---

### [R-A-02] Users page search did nothing
- Page: `/settings/show-user`. Category: Bug. Severity: Medium. Status: Fixed (C1-08, 81bbeeb).
- Location: `show-user.component.html`: `(searchChange)` instead of the shared search box output `(valueChange)`.
- Steps: type any text in the users search.
- Expected: the list filters. Actual: the list never changed.
- Evidence: `audit/screenshots/c1-08/empty/users@1440.png`

---

## Staff / Receptionist

- **Navigation:** the same sidebar as admin, including the 2 admin-only links.
- **Pages:** 17 pages open. `/settings/general` and `/settings/show-user` redirect to `/dashboard`.
- **Walk-through:** 31 overlays opened, and all closed with Escape.

### [R-S-01] Every page requests two admin-only endpoints and logs 403 errors
- Page: all. Category: Bug (role). Severity: Medium. Status: Fixed (C7-01, 1d5e38e).
- Location:
  - `GET /api/Settings/operational-alerts` from `NotificationService.reloadAlertSettings`
  - `GET /api/AuditLogs?pageSize=100` from the notification center (activity feed)
- Steps: sign in as the receptionist and open any page.
- Expected: no request the role isn't allowed to make; no console errors.
- Actual: both requests return **403** on every page, with a console error each time.
- Evidence: `audit/logs/pages/before/staff.md` (2 failed requests on each of 21 URLs).
- Suggested fix: make these calls only for admins. For the receptionist, use the default alert thresholds and hide the audit-log feed.

### [R-S-02] The dashboard requests four admin-only analytics endpoints
- Page: `/dashboard`. Category: Bug (role). Severity: Medium. Status: Fixed (C7-01, 1d5e38e).
- Location: `GET /api/Analysis/occupancy`, `/revenue`, `/top-students`, `/instructor-activity`.
- Actual: all four return **403**, giving 6 console errors on the dashboard. The page still renders from other data, as the screenshot shows.
- Evidence: `audit/screenshots/before/staff/dashboard@1440.png`, `audit/logs/pages/before/staff.md`.
- Suggested fix: skip these calls for non-admins, and keep the fallbacks the dashboard already has.

### [R-S-03] The sidebar shows "System settings" and "Users" to the receptionist
- Page: sidebar. Category: Navigation. Severity: Medium. Status: Fixed (C7-01, 1d5e38e).
- Location: `sidebar.component.html` lines 187 and 202. The links have no role check.
- Steps: as the receptionist, open Settings in the sidebar, then click "إعدادات النظام والأماكن" or "شوف اليوزرز".
- Expected: links the role can't open are not shown.
- Actual: the link is shown. Clicking it sends the user back to the dashboard with an "access denied" warning.
- Evidence: `audit/logs/roles/staff-nav.json` ("blocked").
- Suggested fix: show both links only when `authService.isAdmin()`.

### [R-S-04] Discount codes: the receptionist gets edit/toggle controls the server refuses, with no message
- Page: `/settings/discounts`. Category: Bug (silent failure) + Role UI. Severity: Medium. Status: Fixed (C7-01: error shown; C6-02: view-only, owner decision).
- Location: discount toggle and edit in `discount-rule-engine` / coupons page. `PUT /api/Coupons/{id}` returns 403, then a fallback `PUT /api/Discounts/{id}` also returns 403.
- Steps: as the receptionist, click "نشط" (active) on a code, or open edit → save.
- Expected: either the controls are hidden for the role, or a clear "not allowed" message appears.
- Actual: the request is refused (403) and **nothing is shown**. The toggle stays as it was, so the click looks like it did nothing.
- Evidence: `audit/screenshots/roles/staff/discount-toggle-403.png`, `audit/logs/roles/staff-explore.md`.
- Suggested fix:
  - Small, safe fix (done in Part C7): show the server's error message when the save fails.
  - Hiding the management controls for the receptionist is listed under "Needs approval". It depends on what the business wants the receptionist to do with codes, and only the backend knows which endpoints the role may use.

### [R-S-05] "Discount codes" quick-action card on the receptionist's dashboard
- Page: `/dashboard`. Category: Role UI. Severity: Low. Status: Decided: card stays (codes are view-only for the receptionist).
- Actual: the card leads to a page where the receptionist can view codes but every change is refused (R-S-04).
- Suggested fix: keep it if the receptionist should be able to look up codes. Otherwise hide it for non-admins.

### Missing for the receptionist
Nothing found that a front-desk person needs and can't reach. All of these work for the role:
- check-in/out
- packages
- room bookings and reservations
- the shift page
- students, instructors, blacklist
- products and the sales screen
- the profile page

---

## Cross-role flows

### Reservation: the receptionist creates one, the admin sees it
`audit/logs/roles/cross-reservation.log`
1. The admin opened the reservations page on 18 Nov. The list was empty.
2. The receptionist created a one-off reservation for 18 Nov, 13:00–15:00 in Hall A for منى عادل. The conflict check ran, then `POST /api/Reservations` succeeded with a success toast.
3. **The admin's open page still showed the empty list 15 s later.** After a reload, the reservation appeared with the right data and status "upcoming" (قادم).

### Workspace session: the receptionist checks a student in and out, the admin sees the money
`audit/logs/roles/cross-session.log`
1. Both roles see the same open shift, `b3eb522d`: cash 540, revenue 40, 3 items.
2. The receptionist checked in عمر خالد. `POST /api/Workspaces` succeeded with a toast. The admin saw the session on a fresh load.
3. The receptionist checked out with 30 EGP cash. `PUT …/checkout` succeeded with a toast.
4. **The admin's workspace page, left open, still listed the student as present 15 s later.**
5. On the shift page, the admin saw expected cash 540 → 570, revenue 40 → 70, and ledger rows 3 → 4. The amount and channel are correct.

### [X-01] Other users' changes appear only after a reload
- Pages: reservations, workspace, room board, shift. Category: UI/UX. Severity: Medium. Status: Fixed (C6-01, owner decision: auto-refresh every 45 s).
- Actual: no page refreshes data by itself. A second person at the desk works on stale lists until they reload.
- Suggested fix: refresh the visible list every 30–60 s while the tab is visible, plus right after the tab becomes visible again (frontend only). A push channel (SignalR) would need the backend. Listed under "Needs approval" in `CHANGES_LOG.md` because it changes how pages behave.

### [X-02] One shared shift for everyone at the desk
- Category: Note / owner decision.
- Actual: the receptionist's checkout was recorded in the shift the admin opened. The shift isn't per user, so the hand-over/closing person signs for money other users took in.
- This may be intended. If shifts should be per person, it needs the backend.

---

## Final re-test after the fixes (Part D, 2026-11-11)
All issues above marked Fixed were re-tested on `mariem` (commit `784226d`):
- **Guest, admin and receptionist:** 42 page views each (1440 and 360) with 0 console errors and 0 failed requests.
  - Before the fixes, the receptionist logged 403 errors on every page (R-S-01, R-S-02).
- **Walk-through of every button and dialog:** admin 147 clicks, receptionist 126 clicks, 0 errors.
- **Navigation:**
  - The receptionist no longer sees System settings and Users (R-S-03), and is sent back to the dashboard when opening them directly.
  - Discount codes are view-only for the receptionist (R-S-04).
  - A guest is sent to sign-in.
- **Saving flows** (admin, live API, TEST records): check-in, check-out, room booking, package sale and expense all save, show up on the server and move the shift totals by the right amounts, with no errors. Found: a room-board booking for another day started at once, so the room showed as occupied now. Fixed in C6-05: the room board books today only.
- **Bookings and checkout after the backend change (2026-11-11)**, admin on the test API: one-off reservation (T1), single-day edit of a series (T2), room board today and tomorrow (T3), and checkout with change handed back, change into the wallet, and payment from the wallet (T4–T6). All pass. Details are in CHANGES_LOG C7-05 to C7-07 and C6-05; open backend points are in CHANGES_LOG "Backend requests". The TEST records were deleted afterwards.
- **Cross-role:** lists refresh by themselves (X-01, C6-01). The flows were not created again, to avoid more test records on the live server.

## Re-check of AUDIT_REPORT.md

Evidence used:
- today's page captures and HAR files (`audit/logs/pages/before/`)
- the click walk-throughs (`audit/logs/roles/*-explore.*`)
- the cross-role runs
- the code (grep), and the live end-to-end runs of 2026-11-10/11

| Issue | Status | Evidence today |
|---|---|---|
| G-01 swallowed write errors | Partially fixed | Checkout and most writes report errors, but discount toggle/edit fail silently on 403 (R-S-04) |
| G-02 delete fake success | Fixed | The one remaining `catchError(() => of(true))` (shift.service) only covers refreshing totals after a successful update |
| G-03 vercel.json | Can't verify | Outside this folder; owner decision |
| G-04 hardcoded colours | Still broken | 2,248 hex literals in component CSS (`DESIGN_STANDARD.md` §0); Part C |
| G-05 duplicated package pages | Still broken | Both components still exist side by side; Part C |
| G-06 huge files | Still broken | e.g. `language.service.ts` 4,277 lines, `show-classroom` ~2,400 lines |
| G-07 toasts block buttons | Fixed | Toast container `pointer-events: none` (items `auto`); walk-through clicked 66 controls with no blocking |
| G-08 Escape | Fixed | 66 overlays opened in both roles, all closed with Escape |
| G-09 request storm | Fixed | 0 duplicate GETs within any of 42 page loads (admin HAR) |
| G-10 N+1 catering | Partially fixed | Up to 4 catering requests on one page load (one per open session); needs a backend endpoint |
| G-11 validation UX | Partially fixed | Disabled submits explain what's missing; rules still differ per form |
| G-12 mixed languages | Partially fixed | 1,939 lines of hardcoded Arabic and 1,214 `isArabic()` ternaries remain; Part C4 |
| T-01 no linter | Fixed | `ng lint`: 1 error (`no-dupe-else-if`, checkout-modal), 1,246 warnings |
| T-02 untested flows | Partially fixed | 114 unit tests; e2e scripts in `audit/scripts` only |
| L-01 total 0 → 30 | Fixed | No hardcoded 30; package checkout due 0 (live run) |
| L-02 fake coupons | Fixed | No fallback coupon code (only a comment matches) |
| L-03 placeholder check-in data | Fixed | Page removed |
| L-04 password trimmed | Fixed | No `.trim()` on passwords |
| L-05 double checkout | Fixed | Only `PUT /api/Workspaces/{id}/checkout` in the cross-role run |
| M-01 shift floats in localStorage | Fixed | Shift `b3eb522d` stores start VF 100 / InstaPay 50 / Fawry 20 on the server |
| M-02 instructor meta in localStorage | Partially fixed | As reported; not changed since |
| D-01 debug logging | Fixed | 0 `console.log` in `src/app` |
| B-01 uploaded images 404 | Fixed / can't reproduce | 0 image errors in today's captures (rooms now use built-in images) |
| B-02 slow endpoints | Still broken (backend) | 7 API responses > 1 s in one admin pass (Classrooms, Reservations, packages, shift by id) |
| B-03 data the UI can't handle | Can't verify | Depends on old data; backend was wiped |
| B-04 instructor create response | Can't verify | No instructor created in this pass |
| P-01 login page when signed in | Fixed | `/auth/login` → `/dashboard` for admin and staff |
| P-02 dashboard chart 0 % | Fixed | Live E2E 2026-11-10 |
| P-03 truncated titles | Fixed | Two-line quick-action titles (staff dashboard screenshot) |
| P-04 average duration | Fixed | Live E2E 2026-11-10 |
| P-05 7,210 EGP forgotten session | Fixed | `CheckoutModalComponent.LONG_SESSION_MINUTES` warning + confirm |
| P-06 / P-07 dead pages | Fixed | Routes no longer exist |
| P-08 timeline on phones | Fixed | `audit/screenshots/before/admin/classroom_reservation@360.png` |
| P-09 English in reservations | Partially fixed | Room names and "MAX" labels stay English (data/brand); the rest is Arabic |
| P-10 active packages 0 | Fixed | Live E2E |
| P-11 instructor sessions field | Fixed | Field removed |
| P-12 name validation message | Fixed | Specific messages |
| P-13 overlapping tiers | Fixed | Live E2E (overlap and reversed ranges rejected) |

---

## Notes for the security audit

Noticed in passing and **not tested**:
- The admin-only pages are blocked only by a client-side guard. The server does enforce 403 on the settings, analytics, audit-log and coupon endpoints the receptionist touched. That is good, but the full endpoint list wasn't checked.
- The receptionist can edit instructors (`PUT /api/Instructors/{id}` returned 200). Confirm this is intended.
- An old access token was accepted after its account was deleted (from the earlier audit, still open).
- The admin password was shared in the chat on 2026-11-11. It should be changed.
