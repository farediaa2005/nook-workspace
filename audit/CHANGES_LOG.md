# UI consistency — change log

Branch: done on `ui-consistency` (from `cleanup/dead-code` at `2ac706c`, 2026-11-11), then merged into `mariem`, the team branch; all later work is on `mariem` (owner decision, 2026-11-11).

**Evidence files:** screenshots (`audit/screenshots/`), measurement logs (`audit/logs/`) and the one-off scripts that made the changes are no longer in the repo (owner decision, 2026-11-11). They are listed in `audit/.gitignore`, stay on the machine that made them, and remain in the git history up to commit `1a80720`. Entries below still name them so a change can be traced. The repo keeps the reports and the re-runnable checks in `audit/scripts/`.
Dev server: `ng serve --port 4300 --proxy-config proxy.conf.json` from this folder (API: the URL in `proxy.conf.json`).
Per-batch check: `node audit/scripts/cleanup-check.mjs <label>` (build, lint, tests, 19 pages as admin), plus `ONLY=<pages> node audit/scripts/capture-pages.mjs <role> <label> 360,768,1024,1440` for the affected pages and role.

## Progress

- [x] 0. Branch `ui-consistency` created; dev server running on :4300
- [x] 0. Browser helper supports one profile per role (`audit/scripts/e2e-lib.mjs` → `start({ role, har })`), and there is a sign-in window per role (`audit/scripts/signin-role.mjs`)
- [x] A1. Roles found in the code: guest (signed out), admin (account role 1 → `role: 'admin'`), and any other account (`role: 'user'`; on the web that's staff, `StaffRole.Receptionist`). No "reservation" role exists.
- [x] A2/A3. Test accounts: admin (existing), receptionist `fares` (created and signed in by the owner), guest
- [x] A4. Baseline screenshots at 1440 / 360 → `audit/screenshots/before/{admin,staff,guest}` (logs: `audit/logs/pages/before/`)
- [x] A5. Per-role walk-through (`audit/logs/roles/*-explore.md`)
- [x] A6. Cross-role flows (reservation, check-in/out → shift)
- [x] A7. Navigation per role
- [x] A9. Re-check of AUDIT_REPORT.md
- [x] A. `audit/ROLES_REPORT.md` written
- [x] B. `audit/DESIGN_STANDARD.md` written
- [~] C1. Shared components: buttons done. Button variants added (C1-01); delete dialogs (C1-02), cancel buttons (C1-03) and save/confirm buttons (C1-05) moved to the shared button; old CSS removed (C1-04, C1-06). Delete confirmations moved to the shared app-confirm-dialog (C1-07). Empty states → app-empty-state (C1-08); status badges → app-status-badge (C1-09). Page titles → app-page-header on every page (C1-10). The large custom dialogs (check-in, checkout, cafe sales, booking) stay as they are and are listed under "Needs approval".
- [~] C2. Tokens:
  - Tokens added (C2-01).
  - Colors moved to tokens: C2-02 to C2-05 (1,026), plus C2-08 (116 theme-only colors).
  - Font sizes: 1,499 use `--fs-*` tokens (C2-06, C2-09, C2-10, with the new `--fs-ui`). The 97 left are headings and numbers far from any token (1.25, 1.35, 1.5rem …).
  - Radii: 925 use `--radius-*` tokens (C2-07, C2-11). 50% circles and 14 far values (2, 3, 24px …) stay.
  - Status colors: 223 blue/amber/green/red values now follow the theme (C2-12).
  - Left: about 1,000 hex colors. These are slate neutrals that are backgrounds in one place and text in another, white, purple `#a855f7` (no token), and light amber `#fbbf24`. See "Not changed".
- [~] C3. Duplicated logic:
  - `find-duplicates.mjs` found 40 method bodies repeated across files (about 416 lines).
  - Shared helpers for durations and dates are done (C3-01 to C3-03).
  - The two package pages share one base class (C3-04, G-05), and their status filter works again (C3-05).
  - The rest is page-level and listed under "Not changed": the recurrence editor, pagination glue.
- [x] C4. i18n:
  - Language file cleaned: broken Arabic fixed (C4-01), 285 unused keys removed (C4-02).
  - Extraction tool working: the reservations template is done (C4-03).
  - All components processed (C4-04 to C4-07).
  - Every `isArabic() ? text : text` is now a key (C4-08). The 148 left are code values (direction, locale, SVG paths, which name field to show).
  - Arabic written straight in the code: 794 lines at the start, 542 now (C4-09). What is left is data, not screen text (see "Not changed"), plus a short list still to convert.
  - English pages: the only Arabic left is data people typed (names, colleges, products) and the "ع" language button (C4-10).
  - Language file: 2,151 keys per language, none missing, none unused.
  - Egyptian-dialect wording: 283 Arabic texts reworded (C4-11).
  - RTL: text alignment follows the reading side; direction and sideways scroll checked on 19 pages (C4-12).
  - Left as it is, with reasons, under "Not changed": data in Arabic, and some text that already has both languages inside code (durations, validators).
  - Tool: `node audit/scripts/i18n-extract.mjs <prefix> <files…>`. Health check: `node audit/scripts/i18n-audit.mjs`.
- [~] C5. Consistency:
  - Table headers, search boxes, form labels, dialog titles and label casing now each have one style (C5-01 to C5-05).
  - Left: button variants and the colors used in both themes (see "Not changed").
- [~] C6. UI/UX improvements:
  - Lists refresh by themselves (C6-01). Discount codes are view-only for the receptionist (C6-02).
  - Row actions stay in view on wide tables (C6-03). The 404 page follows the chosen theme (C6-04).
  - The package pages got the pinned actions column after the G-05 merge, so all 17 tables with an actions column have it.
- [x] C7. Small frontend bugs: R-S-01 to R-S-04 (C7-01), R-G-01 (C7-02), the empty time column in the shift ledger (C7-03), the unreachable checkout branch and last lint error (C7-04)
- [x] Owner decisions applied: auto-refresh (C6-01), discount codes view-only for the receptionist (C6-02)
- [x] D. Final re-test of every role, after-screenshots, build / lint / tests: all clean (see "Part D — final re-test")

## Owner decisions (2026-11-11)

- Lists refresh by themselves (done, C6-01).
- The receptionist only views discount codes (done, C6-02).
- Wording standard for the language files: **Egyptian dialect** (the style used most). Formal words are converted to it.
- **English:** translate every text fully; every key must exist in both languages.
- **Order of the remaining work:** shared components (C1) first, then language files (C4), then the remaining colors and sizes (C2).
- The receptionist may edit instructor data (intended; no change).

## Changes

## Part D — final re-test (2026-11-11, on `mariem`)
- **Where:** the main checkout on `mariem` (commit `784226d`), dev server on :4300, the live API.
- **Build, lint, tests:** build passes. Lint shows **0 errors** (1,216 warnings; the one old error was fixed in C7-04). All 116 tests pass.
- **Every page, every role** (`capture-pages.mjs`, 1440 and 360, read-only):

  | Role | Page views | Console errors | Failed requests |
  |---|---|---|---|
  | Guest | 42 | 0 | 0 |
  | Admin | 42 | 0 | 0 |
  | Receptionist | 42 | 0 | 0 |

- **Walk-through** (`explore-role.mjs`): every non-destructive button and dialog on every page, opened and closed without saving. Admin: 147 clicks, receptionist: 126 clicks, 0 with console errors or failed requests.
- **Navigation** (`nav-probe.mjs`): a guest is sent to sign-in from every page. The admin can open every page. The receptionist is sent back to the dashboard from System settings and Users, the two admin-only pages.
- **Languages and layout:** 21 pages and dialogs in Arabic and English with no raw keys and no `undefined`. 76 layout checks (19 pages, 360 and 1440, both languages) with no sideways scroll.
- **Flows that save data** (owner approved, run as admin on the live API, TEST-marked records, no shift close, no deletes):

  | Flow | Saved on the server | Effect on the shift |
  |---|---|---|
  | Check-in of a new student | faculty, student and session created (201) | none |
  | Check-out of that student, cash | session closed (200, status 2) | +30 EGP workspace revenue, +30 cash, +1 transaction |
  | Room booking from the room board | booking saved (201), 240 EGP | none |
  | Sell a package (2 h × 20) | package created (201), 2 h, 40 EGP, Active | +40 EGP package revenue, +40 cash, +1 transaction |
  | Add an expense (5 EGP, cash) | shift item saved (200), shown in the ledger | expenses 45 → 50, cash −5, +1 transaction |

  No console errors and no failed requests in any of them. The package page, rebuilt in C3-04 (G-05), sells and records correctly.
- **Found: the room board's "New room booking" starts the booking now, whatever date is picked.**
  - A booking made for tomorrow was saved as started (status 1, "تم بدء حجز القاعة"), so the room board shows Hall A as "occupied now".
  - This is not from the UI work. The booking save logic only changed in the first audit's fixes (midnight crossing, date kept on edit), and neither changes how a booking starts.
  - That dialog is for starting a session now, while future bookings belong on the reservations page.
  - Proposed fix, listed under "Needs approval" because it changes a flow: the room-board dialog only allows today, and points to the reservations page for other dates.
- **TEST records left on the live server**, to be removed by someone with access (they were not deleted, per the rules):
  - Student "TEST Final Retest" with one finished session (30 EGP) and one package (2 h, 40 EGP).
  - The Hall A booking "TEST final re-test booking" for 2026-11-12, which makes Hall A look occupied now.
  - The shift expense "TEST final re-test expense" (5 EGP).
  - From Part A: the student "يوسف علي", still checked in, and a test reservation.
- **Cross-role flows:** not created again. They make real records on the live server (a reservation and a checked-in student). Part A's run already left test data there (the student "يوسف علي" is still checked in). The read side was re-checked instead: the admin sees the receptionist's earlier records, and lists refresh on their own (C6-01).
- **After-screenshots:** `audit/screenshots/after/{admin,staff,guest}`, kept on the machine (see the note at the top).

### C7-03 Shift ledger: a dash when the server sends no time
- **Type:** Bug (frontend shows a blank)
- **Problem:** the "Time" column of the shift ledger was empty on every row. Shift items from the API (`/api/shifts/current` → `items`) have no time field, only `id, cost, type, category, payWay, item, shiftId`, so the page had nothing to show.
- **What changed:** the cell shows "—". The shift-history detail no longer starts with an empty "time •".
- **For the backend team:** real times need the API to return a creation time for shift items. The backend was out of scope here.
- **Commit:** `784226d`

### C7-04 Unreachable branch in the checkout discount label
- **Type:** Bug (dead logic)
- **Problem:** `discountLineLabel` in the checkout dialog had a third branch identical to the first, so it could never run. This was the one lint error in the project (`no-dupe-else-if`).
- **What changed:** the duplicate branch was removed. Behaviour is unchanged, and lint now has 0 errors.
- **Commit:** `784226d`

### C7-01 Receptionist: no admin-only requests or links; discount errors shown
- **Type:** Bug fix
- **Pages:** every page (notification center), `/dashboard`, the sidebar, `/settings/discounts`
- **Files:**
  - `core/services/notification.service.ts`
  - `core/services/audit.service.ts`
  - `core/services/dashboard.service.ts`
  - `features/dashboard/dashboard.component.{ts,html}`
  - `shared/components/sidebar/sidebar.component.{ts,html}`
  - `core/services/details.service.ts`
  - `features/details/add-discount/add-discount.component.ts`
  - Test mocks: `admin.guard.spec.ts`, `workspace.service.spec.ts`
- **What was wrong:**
  - The receptionist's browser requested 6 admin-only endpoints. Each returned 403 and logged a console error: 2 on every page, 6 on the dashboard.
  - The sidebar linked to 2 admin-only pages, which sent the receptionist back to the dashboard.
  - A refused discount toggle showed nothing.
  - A refused discount edit even said "updated successfully".
- **What changed:**
  - Those 6 calls only run for admins. The receptionist keeps the default alert thresholds and the summary-based dashboard figures. The "top activity" card shows for admins only.
  - The 2 admin-only links are hidden from non-admins.
  - `updateDiscount` now passes the server error on instead of returning `false`, and both the toggle and the edit form show it.
- **Result:**
  - Receptionist page loads have 0 failed requests and 0 console errors at 360/768/1024/1440 (`audit/logs/pages/c7/staff.md`).
  - The refused toggle now shows "تعذّر تغيير حالة كود الخصم: ليس لديك صلاحية…".
  - The admin menu is unchanged.
  - Lint has 1 error (it was already there), 114 tests pass, and the build is OK.
- **Screenshots:**
  - Before: `audit/screenshots/before/staff/dashboard@1440.png`
  - After: `audit/screenshots/c7/staff/dashboard@1440.png`, `audit/screenshots/roles/staff/discount-toggle-403.png`
- **Commit:** `1d5e38e`

### C2-01 Design tokens added
- **Type:** Tokens/colors/fonts
- **Pages:** none on screen (definitions only)
- **Files:** `src/styles.css`
- **What changed:** added the tokens from `DESIGN_STANDARD.md`, with per-theme values where they differ:
  - `--on-primary`, `--on-color`, `--warning`, `--info`, `--danger-strong`, `--success-strong`
  - the `*-soft` / `*-line` tints and `--overlay`
  - the font-size scale `--fs-*`, the spacing scale `--space-*`, and `--radius-2xs` / `-md` / `-pill`
  - `--shadow-primary`, `--shadow-focus`, `--font-mono`
- **Also:** `--radius-xl` is now an alias of `--radius-lg` (both 20 px).
- **Checked:** no component used these names before, so nothing changes. Build OK, 114 tests pass, 0 console errors on 19 pages.
- **Commit:** `0efe3d4`

### C2-02 Brand yellow and on-yellow text from tokens
- **Type:** Tokens/colors/fonts
- **Pages:** 42 stylesheets/templates (all pages)
- **What changed:**
  - `#f5b921` → `var(--yellow)` (397)
  - `#16130a` → `var(--on-primary)` (63)
- **Scope:** CSS files and `style=""` attributes only, via `audit/scripts/tokenize-colors.mjs`. TS data colors (instructor `colour`, charts) are untouched.
- **Why:** this was the most repeated literal. Both tokens have exactly these values in both themes, so there is no visual change.
- **Screenshots** (identical):
  - before: `audit/screenshots/before/admin/settings_general@1440.png`
  - after: `audit/screenshots/c2-02/admin/settings_general@1440.png`
  - after, at 360/768/1024/1440: `audit/screenshots/c2-02/admin/`
- **Commit:** `c9a1260`

### C2-03 Red, green and orange from status tokens
- **Type:** Tokens/colors/fonts
- **Pages:** 41 files (all pages with status colors)
- **What changed:**
  - `#ef4444` → `var(--danger-strong)` (193)
  - `#22c55e` → `var(--success-strong)` (92)
  - `#f59e0b` → `var(--warning)` (72)
- **Visual effect:**
  - Dark theme: identical.
  - Light theme: slightly darker shades for contrast on the cream background (`#dc2626`, `#16a34a`, `#b45309`).
- **Screenshots (light):**
  - before: `audit/screenshots/c2-03-before/admin-light/`
  - after: `audit/screenshots/c2-03/admin-light/` (e.g. `details_show_blacklist@1440.png`)
- **Checks:** build OK, lint unchanged, 114 tests pass, 0 console errors.
- **Note:** during the "before" capture the live API briefly returned 400/500 to every request. That was a server-side issue; the "after" run of the same pages was clean.
- **Commit:** `d2e62cc`

### C2-04 Cold "slate" grays mapped to the warm semantic tokens
- **Type:** Tokens/colors/fonts
- **Pages:** 23 files
- **What was wrong:** the site's palette is warm (cream / black), but 414 colors came from Tailwind's cold slate grays.
- **What changed:** each slate color is mapped by context with `audit/scripts/slate-map.mjs`. 236 were replaced:
  - In light-only rules:
    - dark text → `--text`, muted text → `--text-dim`
    - borders → `--border`
    - pale backgrounds → `--surface-2`
    - white backgrounds → `--surface` (identical value)
  - In rules for both themes: muted text `#64748b` / `#94a3b8` → `--text-dim`. This is also more readable in dark mode: the old `#64748b` on near-black had low contrast.
- **Left alone (178):** slate colors whose role depends on the element, such as dark text on yellow or colored chips in both themes, and dark-only backgrounds. They need a per-component look and are listed in "Not changed".
- **Screenshots:**
  - light, before/after: `audit/screenshots/c2-04-before/admin-light/` vs `audit/screenshots/c2-04/admin-light/`
  - dark, at 4 widths: `audit/screenshots/c2-04/admin/`
- **Checks:** build OK, lint unchanged, 114 tests pass, 0 console errors.
- **Commit:** `fab15aa`

### C1-01 Shared button variants
- **Type:** Shared component
- **Files:** `shared/components/primary-button/*`
- **What changed:** `app-primary-button` gains:
  - `variant`: primary / secondary / ghost / danger
  - `size`: md 44 px / sm 34 px
  - `loading` (spinner, blocks clicks)
  - a focus ring (`--shadow-focus`)
  - all styled from the design tokens
- **Why:** the site has 30+ hand-made button classes doing these same jobs (`.btn-cancel` 18, `.btn-secondary` 14, `.btn-ghost-modal`, `.btn-confirm-delete`, …). The shared button had only the primary style, so pages couldn't use it.
- **Visual effect:** none yet. The default is the existing primary button.
- **Checks:** build OK, lint unchanged, 114 tests pass, 0 console errors.
- **Commit:** `80bea51`

### C1-02 Delete dialogs use the shared button
- **Type:** Shared component
- **Pages:** products, discount codes, colleges, instructors, reservations
- **What was wrong:** each delete dialog had its own hand-made "cancel" and "delete" buttons. The products page even used inline styles for it.
- **What changed:**
  - cancel became `app-primary-button variant="secondary"`
  - delete became `variant="danger"`
  - the reservations dialog shows the button's spinner while deleting
  - fixed the typo "اامسح" in two language strings
- **Verified:** each dialog was opened and **cancelled** at 1440 and 360. It closed, and no request was sent (`audit/scripts/probe-delete-dialogs.mjs`).
- **Screenshots:** `audit/screenshots/c1-02/dialogs/`
- **Commit:** `273faf9`

### C1-03 Every cancel button in form dialogs uses the shared button
- **Type:** Shared component / Consistency
- **Pages:** products, discount codes, blacklist, colleges, instructors, settings (tiers, rooms, packages), users, shift close
- **What changed:** 13 hand-made `.btn-cancel` buttons in 8 components became `variant="secondary"`.
- **Verified:** 8 dialogs at 1440 and 360. Each opens, has the shared cancel, closes on cancel, and sends no request (`audit/scripts/probe-cancel-dialogs.mjs`).
- **Screenshots:** `audit/screenshots/c1-03/dialogs/`
- **Commit:** `78ef608`

### C1-04 Unused button styles removed
- **Type:** Duplicated code
- **What changed:** removed the 13 `.btn-cancel` / `.btn-confirm-delete` rules (99 lines) from 9 stylesheets.
- **Safety:** `audit/scripts/drop-dead-selectors.mjs` refuses to remove a class that any template still uses.
- **Checks:** build OK, 114 tests pass, 0 console errors; the dialog probes passed again.
- **Commit:** `4e8e0b0`

### C1-05 Save, confirm and secondary buttons use the shared button
- **Type:** Shared component / Consistency
- **Pages:** settings (tier, room, package preset), users, product edit, student and instructor package drawers, profile, blacklist (block, unblock), shift close, open shift
- **What changed:** 12 hand-made buttons became `app-primary-button`:
  - form submit buttons keep `type="submit"`
  - room save and shift close show the spinner (`loading`) instead of swapping the label to "جاري الحفظ…"
  - "confirm block" is the `danger` variant
  - "cancel" on the open-shift page is `secondary`
  - 4 components gained the import
- **Verified:** with an **empty** form, the shared submit still triggers each form's validation and sends nothing:
  - tier: "ساعات النهاية يجب أن تكون أكبر…"
  - user: "لازم تدخل الاسم ثلاثي…"
  - blacklist: "اختار أو اكتب اسم…"
  - The open-shift cancel returns to `/shift/active`.
  - Checked at 1440 and 360 (`audit/scripts/probe-submit-empty.mjs`).
- **Screenshots:** `audit/screenshots/c1-05/submit-empty/`
- **Commit:** `14cf906`

### C1-06 Unused save/confirm styles removed
- **Type:** Duplicated code
- **What changed:** removed 12 rules (116 lines) for `.btn-save`, `.btn-save-drawer`, `.btn-save-profile`, `.btn-submit-save`, `.btn-confirm-unblock` and `.btn-confirm-block-action`.
- **Checks:** build OK. The dialog and empty-submit probes passed again: 16/16, and 4/4 at 1440.
- **Commit:** `361b662`

### C1-07 One shared confirmation dialog for deletes
- **Type:** Shared component / i18n / Consistency
- **Pages:** products, discount codes, colleges, instructors, reservations, student packages, instructor packages, users
- **What was wrong:**
  - The shared `app-confirm-dialog` (used only for deleting a user) had hardcoded English labels, "Cancel" and "Confirm", which showed up in the Arabic interface.
  - Seven pages each had their own hand-made copy of the same delete dialog: icon, title, message, two buttons.
- **What changed:**
  - `app-confirm-dialog` now has the site's delete-dialog design:
    - a danger or default icon and tone
    - title and message
    - an optional details area (projected content)
    - labels from the language file by default
    - a `loading` state
    - closes on cancel, backdrop or Escape
    - stacks the buttons full width on phones
  - The 7 hand-made dialogs now use it. The reservations dialog keeps its details card inside.
  - 12 old CSS rules removed.
- **Verified:** each dialog opened at 1440 and 360 with the right title, message and buttons; cancel closed it; no delete request was sent (`probe-delete-dialogs.mjs`, `probe-pkg-del.mjs`). User delete now shows "كنسل / امسح".
- **Checks:** build OK, lint 1 error (pre-existing), warnings 1247 → 1222, 114 tests pass.
- **Screenshots:** `audit/screenshots/c1-07/dialogs/` (e.g. `_classroom_reservation@360.png`)
- **Commit:** `ba82688`

### C1-08 Shared empty state; users-page search fixed
- **Type:** Shared component / Bug fix / UI/UX
- **Pages:** blacklist, students, users, notifications, shift history, products, room board, reservations
- **What changed:**
  - New `app-empty-state`: icon (info, check, box, bell, search, calendar, users), title, message and an optional action. It is styled from the tokens.
  - It stays pinned to the visible part of a horizontally scrolling table. Before, on phones the message sat off-screen in the middle of the wide table.
  - 8 hand-made "no data" blocks now use it. The students page keeps its "+ تسجيل طالب جديد" action.
- **Bug found while testing:** the users page search did nothing. The page listened for `(searchChange)`, but the shared search box emits `(valueChange)`. Fixed.
- **Verified:** each empty state was triggered (a search that matches nothing, or an empty date) at 1440 and 360 (`audit/scripts/probe-empty-states.mjs`).
- **Screenshots:** `audit/screenshots/c1-08/empty/`
- **Not removed:** the old empty-state CSS classes are still used by other elements (e.g. the empty room card), so they stay.
- **Commit:** `81bbeeb`

### C1-09 Shared status badge
- **Type:** Shared component / Consistency
- **Pages:** reservations, room board, blacklist, instructors, students, student and instructor packages, workspace, student analytics
- **What changed:**
  - New `app-status-badge`: a dot and a label on a tinted pill. Tones: success, danger, warning, info, primary, neutral.
  - 31 hand-made `.badge-status--x` / `.status-pill--x` pills now use it. Each tone follows the pill's previous color: an inactive instructor stays neutral, while an expired package is danger.
- **Left as they are:** pills with icons instead of a dot (shift history balanced/disputed, the live "جالس الآن" pill).
- **Screenshots:**
  - dark, 1440 and 360: `audit/screenshots/c1-09/admin/`
  - light: `audit/screenshots/c1-09/admin-light/`
- **Checks:** build OK, lint unchanged, 114 tests pass, 0 console errors.
- **Commit:** `a015f31`

### C1-10 One page title component on every page
- **Type:** Shared component / Consistency
- **Pages:** all 19 app pages
- **What was wrong:**
  - The shared `app-page-header` rendered an `<h2>`.
  - 11 pages built their own `<h1>`.
  - Titles varied between 24 and 29.6 px, with weights from 600 to 800.
- **What changed:**
  - `app-page-header` renders the page's single `<h1>`, an optional subtitle, and a `titleExtra` slot (e.g. the "live" pill on the active shift).
  - 11 pages use it, each keeping its own wrapper and action buttons.
  - Every title is now 25.6 px / 800, and every subtitle is `--fs-base` dim (`audit/scripts/probe-titles.mjs`).
  - `--fs-xl` corrected to 1.6rem in the standard: 1.35rem was smaller than any title on the site.
- **Screenshots:** `audit/screenshots/c1-10/admin/` (360 / 768 / 1024 / 1440)
- **Commit:** `41117a3`

### C4-01 Broken Arabic phrases fixed
- **Type:** i18n
- **What was wrong:** an old global replace of "حذف" with "امسح" produced 9 broken strings, e.g. "تأكيد امسح الكلية" and "متأكد؟ من امسح دي الكلية…".
- **What changed:** rewritten in Egyptian dialect, e.g. "تمسح الكلية؟" and "متأكد إنك عايز تمسح الكلية دي من السيستم؟".
- **Verified:** the delete dialogs show the new text.
- **Commit:** `1f461b4`

### C4-02 Unused translation keys removed
- **Type:** i18n / Duplicated code
- **What changed:** removed 285 keys that nothing uses (leftovers from removed pages) from the `Translations` interface and from both languages.
  - Keys per language: 1,266 → 981.
  - `language.service.ts`: 4,277 → 3,422 lines.
  - No key is read dynamically.
  - `audit/scripts/i18n-audit.mjs` reports 0 missing, 0 unused, 0 broken.
- **Commit:** `1f461b4`

### C4-03 Reservations page text moved to the language file
- **Type:** i18n
- **Files:** `classroom-reservations.component.html`, `language.service.ts`
- **What changed:** `audit/scripts/i18n-extract.mjs` moved 140 `isArabic() ? '…' : '…'` pairs to 118 new `res*` keys, reusing any existing key with the same text. The text is unchanged; the dialect pass comes later.
- **Verified:**
  - Arabic and English, both the page and the new-reservation dialog: no raw keys, no `undefined`.
  - Build OK, 114 tests pass.
  - Screenshots: `audit/screenshots/c4-03/`.
- **Left in this file:** 22 compound expressions (nested conditions), to be done by hand.
- **Commit:** `3c53d1e`

### C4-04 Workspace and students pages
- **Type:** i18n
- **What changed:** 233 pairs in the workspace and students templates and code moved to 173 new `ws*` / `stu*` keys.
- **Verified:** in Arabic and English, on the pages and on the check-in and register dialogs.
- **Commit:** `095717a`

### C4-05 Classroom, checkout, discounts, colleges, analytics
- **Type:** i18n
- **What changed:** 345 pairs moved to 248 new keys (`cls*`, `res*`, `chk*`, `disc*`, `col*`, `ana*`).
- **Verified:** in Arabic and English, on the pages and on the booking, add-discount, checkout and analytics dialogs.
- **Commit:** `e280de8`

### C4-06 Shift, settings, packages, login, layout, shared parts
- **Type:** i18n
- **What changed:**
  - About 300 more pairs moved.
  - Five components had no `t` member and now have one: active sessions, alert settings, clock picker, 404 and top activity.
- **Mistake found and fixed:** the extractor had also moved **code values** (text direction `rtl/ltr`, number locale `ar-EG/en-US`, `left/right` for scrolling, SVG paths, `0.00`, an identical phone example).
  - The type check caught it on the cafe screen: `scrollPills(t().catLeft)`.
  - All 10 are back in the components (`audit/scripts/i18n-revert-keys.mjs`).
  - The extractor now skips any pair with no Arabic letters.
  - No user-visible effect: the values were the same per language.
- **Verified:**
  - Every page in Arabic and English: 25 cases each, plus dialogs, plus the login page as a guest.
  - No raw keys, no `undefined`, no console errors.
  - Build OK, 114 tests pass.
- **Result:** 1,813 keys per language; 0 missing, 0 unused.
- **Commit:** `3b3d633`

### C4-07 Service messages, sentences with values, page-specific Arabic
- **Type:** i18n
- **New helper:** `LanguageService.tf(key, params)`, for translations with `{placeholders}`.
- **What changed:**
  - 24 service and guard messages moved: shift, users, workspace, classroom, dashboard AM/PM, admin guard. Services read them through their own LanguageService.
  - 18 sentences with values (a name, a time, an error) became `{placeholder}` keys, called with `tf()`. Example: `User "{name}" created successfully!`.
  - 21 cases of `isArabic() ? 'Arabic' : t().key`, where the page overrode only the Arabic, now use one key each. 10 new keys were needed where the page's Arabic differed from the key's.
  - One case needed a hand fix: the English side was `t().college + ' & ' + t().faculty`, so the key's English is now "College & Faculty".
- **Tests:** two test mocks faked `t()` as an empty object, so the messages came out empty. They now return the key name, and 114 tests pass (`c595c54`).
- **Verified:** Arabic and English on the workspace page, check-in, reservations and its dialog, users, both package pages, room board and shift. No raw keys, no `undefined`, no console errors.
- **Commit:** `c445da1`

### C4-08 The last texts the tools could not convert
- **Type:** i18n
- **What changed:**
  - 36 hand conversions: nested conditions, sentences built with `+`, and the two CSV column-header lists on the workspace page. Script: `audit/scripts/i18n-manual-c408.mjs`.
  - Delete messages in the package pages now come from a small `deleteMessage()` method instead of a very long template expression.
  - About 180 more texts written as `isAr ? 'عربي' : 'English'` (a local copy of the language) moved: invoice, notifications, navbar search, room board, reservations, workspace. The extract tools take `VAR_PAIRS=1` for this.
  - Lines declaring `isAr` that are no longer used were removed (12).
- **English completed:** a few English sides were shorter than the Arabic. Examples: "Weekly on {day}", "Full Bill ({amount} EGP)", and the wallet placeholders ("Amount to deduct (e.g. 50)" instead of "Amount").
- **Commit:** `b70fe7a`

### C4-09 Arabic-only messages get English
- **Type:** i18n
- **Problem:** 74 toasts, errors, tooltips and action names were written only in Arabic, so English users saw Arabic. They were in the package, workspace, shift, coupon, catering and settings services, plus a few templates.
- **What changed:**
  - Each one is now a key with an English translation. Example: `Student "{name}" checked in successfully!`.
  - The "could not save on the server" helper on the workspace page now takes the action name as a key.
  - Hard-coded `title` tooltips and "ج.م" in a few templates use the language file.
  - Four services (packages, coupons, catering, settings) now read the language service.
- **Not changed:** text sent to the server (transaction descriptions, notes, reasons) stays as it is, because changing it would change the API payload.
- **Tests:** the package service test builds the service by hand, so it now sets a language-service mock as well. 114 tests pass.
- **Checks:**
  - Build passes. Lint shows 1 error, the same one as before.
  - Arabic and English were checked on 22 pages and dialogs: workspace, check-in, students, room board, booking, reservations, colleges, discounts, shift, settings, profile, users, packages, products, instructors, dashboard, checkout, analytics. No raw keys, no `undefined`, no console errors.
- **Note:** the build warns that the first bundle is over its 1 MB budget (1.15 MB). The language file grows with every moved text. The budget is not changed here.
- **Commit:** `b70fe7a`

### C4-10 What English users still saw in Arabic
- **Type:** i18n
- **How it was found:** `probe-lang.mjs` now lists every line, tooltip and placeholder with Arabic letters on the English pages (27 pages and dialogs).
- **What changed:**
  - Shift start times and time ranges showed "12:37 ص" in English. They now show AM/PM. This is display only: the stored value, which is also sent to the server, keeps ص/م. New helper: `localizeMeridiem()` in `date-time.util.ts`.
  - "Missing: name، phone" lists used the Arabic comma in English. New key `listSeparator`.
  - WhatsApp tooltip and the register dialog's example placeholders moved to the language file.
  - 12 `t().key || 'عربي'` fallbacks removed. The keys always have text, so the fallback could never show.
- **Result:** the only Arabic left on English pages is data people typed (student, college, product and expense names) and the "ع" button that switches to Arabic.
- **Commit:** `3271765`

### C4-11 Arabic wording in Egyptian dialect
- **Type:** i18n / wording
- **Decision:** Egyptian dialect, owner decision 2026-11-11.
- **What changed:** 283 Arabic texts reworded from formal Arabic. Examples:
  - "يرجى إدخال" → "من فضلك اكتب"
  - "لا يمكن" → "مينفعش"
  - "يجب" → "لازم"
  - "تعذّر / فشل" → "حصلت مشكلة في"
  - "هذا الحجز" → "الحجز ده"
  - "هل أنت متأكد من حذف" → "متأكد إنك عايز تمسح"
  - "الخادم" → "السيرفر"
- **By hand:** six sentences needed a new word order and were written by hand. Example: "اسم القاعة لازم ميزيدش عن 50 حرف علشان الجداول تفضل متناسقة."
- **Kept:**
  - "تم … بنجاح" (58 texts), which is normal in Egyptian app wording.
  - Short labels that were already dialect or plain nouns.
- **Review file:** `audit/logs/i18n/dialect-review.tsv` has every text before and after. The rules are in `audit/scripts/i18n-dialect.mjs`.
- **Checks:** 114 tests pass. Arabic and English were checked on 10 pages.
- **Commit:** `ea08792`

### C4-12 RTL: text alignment follows the reading side
- **Type:** i18n / RTL
- **How it was checked:** `probe-rtl.mjs` checks 19 pages in Arabic and English at 1440 and 360 for:
  - the page direction
  - text aligned to the wrong side
  - sideways scroll
- **Found:**
  - The direction was right everywhere, with no sideways scroll.
  - In Arabic, tables, dropdown menus and some cards used `text-align: left`, so headers sat on the opposite side from their content. Example: "اسم الطالب" was above the middle of the row.
- **What changed:**
  - 43 `text-align: left/right` rules without an Arabic override became `start/end`.
  - English cannot change, because start = left and end = right in LTR.
  - Rules that already had an Arabic override (`.page--rtl`, `.rtl`, `[dir="rtl"]`) were left as they are.
  - List: `audit/logs/rtl/text-align.tsv`.
- **Still flagged, on purpose:** number columns (sales, revenue, amount) and the actions column sit at the row's end in both languages.
- **Checks:** build passes and lint shows the same 1 error as before. Arabic screenshots before and after are in `audit/screenshots/rtl-before` and `rtl-after`.
- **Commit:** `4c2447f`

### C2-06 Font sizes equal to a token
- **Type:** Tokens / fonts
- **What changed:** 466 `font-size` values that equal a `--fs-*` token use the token. Examples: 0.88rem → `--fs-base`, 0.95rem → `--fs-md`, 0.8rem → `--fs-sm`, 12px → `--fs-xs`.
- **How it was checked:** `probe-computed.mjs` records each element's computed font size, radius and colors on 19 pages in both themes. Two runs before the change were identical, so the check has no noise. The run after the change was identical too.
- **Script:** `audit/scripts/tokenize-c2.mjs --fonts`, with the list in `audit/logs/c2/fonts.tsv`.
- **Commit:** `500f1d3`

### C2-07 Border radii equal to a token
- **Type:** Tokens / radius
- **What changed:** 790 single-value radii use a `--radius-*` token: 10px, 8px, 6px, 12px, 20px, 14px, 999px/9999px. 50% (circles) stays.
- **Visual effect:** none. The computed styles are identical except pills going from 9999px to 999px, and both are fully round.
- **Commit:** `fe34256`

### C2-08 Theme-only colors use that theme's token
- **Type:** Tokens / colors
- **What changed:** 116 hex colors in rules that apply to one theme only (`[data-theme="light"] …`) and equal that theme's token now use the token. Examples: `#7a7360` → `--text-dim`, `#e8e1d2` → `--border`, `#b45309` → `--warning`.
- **Left as they were:** gradients, `var(--x, #fallback)` fallbacks, and white.
- **Visual effect:** none. The computed styles are identical.
- **Commit:** `7ca6fbf`

### C2-09 Font sizes within 0.02rem of a token
- **Type:** Tokens / fonts
- **What changed:** 699 more font sizes snap to the nearest token, all within 0.02rem (0.32px). Examples: 0.72rem → `--fs-2xs`, 0.78/0.82rem → `--fs-sm`, 0.86/0.9rem → `--fs-base`, 11/13/14px.
- **Measured:** 1,015 elements on 19 pages (both themes) changed size by at most 0.32px, and nothing else changed.
- **Layout check:** no sideways scroll on any page at 360, 768, 1024 and 1440 in Arabic or English. Screenshots at the 4 widths are in `audit/screenshots/c2-after/`.
- **Checks:** build passes, lint shows the same 1 error, 114 tests pass.
- **Commit:** `c3070f5`

### C6-03 Row actions stay in view on wide tables
- **Type:** UI/UX
- **Problem:** on tables wider than the screen, the row actions (edit, delete, check-out …) were at the far end of the row, out of view until the user scrolled the table sideways. Measured with `audit/scripts/probe-row-actions.mjs` (16 pages, 4 widths, both languages): row controls were off-screen in 74 of 104 table checks. That covered almost every table on phones, and on desktop the products, discounts, shift history and part of the workspace list.
- **What changed:**
  - The 15 tables whose last column is "Actions" use the shared class `sticky-actions` (`styles.css`).
  - That column stays pinned to the row's end side while the rest of the row scrolls.
  - `inset-inline-end` makes it the left side in Arabic.
  - A soft edge shadow shows that there is more to scroll.
  - No column order, layout or flow change.
- **Result:** the actions column is in view in all 80 checks of the pinned tables. Middle columns with switches (discount status, user status) scroll with their data, like the other columns.
- **Package pages:** added after merging G-05 (`868d63a`, `e9c32af`). 96 of 96 checks of the pinned tables show the actions column.
- **Commit:** `4c2227c`

### C6-04 The 404 page follows the chosen theme
- **Type:** UI/UX
- **Problem:** the theme service applies the saved light/dark theme when it is created, but only the navbar and the login page created it. The 404 page is outside the main layout, so it always showed the dark theme.
- **What changed:** the theme service is created once at the app root (`app.ts`).
- **Checked:** the 404 page shows the light theme when light is chosen.
- **Commit:** `4c2227c`

### C5-06 Reservations table header, and a probe route fix
- **Type:** Consistency
- **What happened:** four probes (`probe-rtl`, `probe-computed`, `probe-consistency`, `probe-row-actions`) had the reservations page as `/classroom/classroom-reservations`. The real route is `/classroom/reservation`.
  - In C2-06 to C2-12, C4-12 and C5-01 to C5-05, these probes measured the 404 page instead of the reservations page.
  - The language checks (`probe-lang`) used the right route.
  - All other probed routes were checked and are real pages.
- **Re-checked after the fix:**
  - The reservations page has no sideways scroll at 4 widths in either language.
  - Its actions column is in view.
  - The only difference found was its table header (14.08px, no uppercase, white text), which now uses the shared header style.
- **Commit:** `4c2227c`

### C5-01 to C5-05 Shared elements look the same on every page
- **Type:** Consistency
- **How it was measured:** `audit/scripts/probe-consistency.mjs` records the computed style of every input, select, table header, form label, dialog title and plain button on 22 pages and dialogs, then lists the distinct styles. Results before and after are in `audit/logs/c5/`.
- **What changed:**

  | Element | Before | After |
  |---|---|---|
  | Table headers | 8 styles (11.2–13.6px, weight 700/800, letter spacing normal/0.04em/0.05em) | 1 style on 18 pages: `--fs-sm`, 700, uppercase, 0.5px, `--text-dim` |
  | Search boxes | round on 10 pages, 10px corners on the room board and shift history | round everywhere (`--radius-pill`) |
  | Form labels | 8 styles (12–14px, 600/700, uppercase in the booking dialog and profile, white text in the register dialog and open-shift form) | 1 style in 7 forms: `--fs-sm`, 600, `--text-dim`, no uppercase |
  | Dialog titles | 17.6 / 18.72 / 18.88 / 20px, 700/800; the shared `app-modal` title had no size | `--fs-lg`, 700 everywhere |
  | Label casing (English) | 85 values written in ALL CAPS in the language file ("INSTRUCTOR", "BOOKING DATE") next to Title Case ones | Title Case. Abbreviations (EGP, PDF, ID, NOOK …) keep their capitals, and WhatsApp keeps its spelling. The login tagline stays in capitals as brand styling. List: `audit/logs/i18n/caps.tsv` |

- **Also:** the booking dialog's "Booking Summary" heading had no size (browser default) and now uses the section-title size.
- **Left as it is:** the small uppercase labels in the workspace's extra-services tiles (a compact tile design), and the checkbox label on the profile page.
- **Not touched:** the two package pages, which another session was merging at the time (G-05, merged in `868d63a`).
- **Checks:**
  - No sideways scroll at 360/768/1024/1440 in either language (152 checks).
  - Build passes, lint shows the same 1 error, 116 tests pass.
  - Booking dialog checked visually.
- **Commit:** `d035cbb`

### C3-04 Package pages share one base class (G-05)
- **Type:** Duplicated logic
- **How it was found:** `find-duplicates.mjs` listed about 20 identical methods (about 250 lines) between the student and instructor package pages. The audit had this as G-05.
- **What changed:**
  - New `features/package/package-page.base.ts` (`PackagePageBase`). It holds the logic both pages had copied: list, search, status filter, pagination, sell drawer, details drawer, record usage, and the edit and delete dialogs.
  - Each page now only provides a `PackagePageConfig` through the `PACKAGE_PAGE_CONFIG` token: the package type, default hours and hourly rate (student 50 × 20, instructor 20 × 100), default validity (30 / 60 days), record-usage defaults, and its translation keys.
  - The page components went from about 840 lines each to about 40.
  - Templates: `studentMemberOptions` / `instructorMemberOptions` → `memberOptions`. CSS not touched.
  - API calls and payloads are the same as before.
- **Visible effect:** none.
- **Checks:**
  - Build passes, lint shows the same 1 error, 116 tests pass.
  - `find-duplicates.mjs` no longer lists methods shared by the two package pages. The base class still matches `goToPage` / `prevPage` / `nextPage` on other pages (pagination glue, see "Not changed").
  - Both pages checked as admin in Arabic and English: search (match and no match), the sell drawer (defaults, member list, adding a member, totals, Cancel), the details drawer (open, close, Escape), the edit dialog (Cancel) and the delete dialog (Cancel only). The paging buttons were checked with one page of data.
- **Found:** the status filter could not be used on either page. It was like that before this change and is fixed in C3-05.
- **Commit:** `4395b1b`

### C3-05 Package status filter can be used again
- **Type:** Bug found during C3-04 (owner approved fixing it, 2026-11-11)
- **What was wrong:** on both package pages the status filter could not be used. There were two causes:
  - The menu closed straight after opening. The document-click handler looked for `.status-filter-wrap`, a class the template does not have. It now checks `.date-filter-wrapper`.
  - With the menu open, its items could not be clicked. A later `.menu-backdrop` rule (`z-index: 999990 !important`, written for the old action menu) put the backdrop over the menu card (`z-index: 101`). The card is now `999991` on both pages.
- **Visible effect:** the menu opens, a status can be picked and the list filters. Clicking outside closes it.
- **Checks:** build passes, lint shows the same 1 error, 116 tests pass. Checked with real clicks on both pages in Arabic: open, pick expired / active / exhausted, click outside.
- **Commit:** `ee1f27c`

### C3-01 to C3-03 Shared helpers for durations and dates
- **Type:** Duplicated logic
- **How it was found:** `audit/scripts/find-duplicates.mjs` compares every method body in the TypeScript files, with comments and whitespace ignored. The list is in `audit/logs/c3-duplicates.txt`.
- **What changed:**
  - `parseDurationMinutes`: one copy in `date-time.util.ts`. Before, `dashboard.service` had its own copy and `workspace.service` exported the other.
  - `formatLocalDateToISO`: one copy in `date-time.util.ts`. Before, the classroom service, the room board and the reservations page each had their own.
  - **Durations:** the Arabic number agreement (ساعة واحدة / ساعتان / 3–10 ساعات / 11 ساعة) was written out separately in the classroom service and the time picker. Some displays used no agreement at all ("2 ساعات").
    - Now there is one rule: `LanguageService.hoursText(n)` and `hoursMinutesText(h, m)`, with the words in the language file (14 `dur*` keys).
    - Used by: actual, billed and early/overtime texts on checkout and the invoice; the time picker; the booking summary; the checkout duration; the room card; the reservation panel.
  - `calculateSessionDurationDetails` no longer takes `isArabic`, because its only caller passed the screen language.
- **Visible effect:**
  - Arabic: "2 ساعات" → "ساعتان" where it appeared.
  - English: the early/overtime text is now written out ("Early departure (1 hr 5 min remaining)" instead of "1h 5m").
  - Day lengths read "2 يوم و 3 ساعات" / "2d 3 hrs".
- **Tests:** 2 new tests pin the Arabic and English rules, and 116 tests pass.
- **Checks:**
  - Build passes and lint shows the same 1 error (4 fewer warnings).
  - Booking dialog, room board, reservations, workspace, dashboard, colleges, analytics and shift were checked in both languages. The booking summary reads "ساعتان" / "2 hours".
- **Note:** `i18n-audit.mjs` now also counts keys used inside the language service's own helpers.
- **Commit:** `f6f03fc`

### C2-10 New --fs-ui token; close font sizes snap
- **Type:** Tokens / fonts
- **Decision:** owner approved option (a), 2026-11-11.
- **What changed:**
  - New token `--fs-ui: 0.85rem`, used for the 0.84/0.85rem group (180 uses).
  - Values within 0.05rem (0.8px) of a token snap to it: 0.92/1rem → `--fs-md`, 1.05/1.15rem → `--fs-lg`, 0.65rem → `--fs-2xs` and similar. 334 declarations in total.
  - `DESIGN_STANDARD.md` lists the new token.
- **Measured:** 189 elements on 19 pages (both themes) changed size by at most 0.8px, and nothing else changed.
- **Left literal:** headings far from any token (1.25, 1.35, 1.5rem …).
- **Commit:** `5d989d0`

### C2-11 Radii without a token snap to the nearest one
- **Type:** Tokens / radius
- **Decision:** owner approved, 2026-11-11.
- **What changed:** 135 radii within 2px of a token use it: 4/5px → 6, 7/9px → 8/10, 16px → 14, 18/21/22px → 20, 11px → 12. A tie goes to the more used, larger token.
- **Measured:** 230 elements changed radius by at most 2px, and nothing else changed. A first run also showed a few hover states; a second run confirmed only radii differ.
- **Commit:** `5a0851b`

### C2-12 Status colors follow the theme
- **Type:** Tokens / colors
- **Decision:** owner approved, 2026-11-11.
- **What changed:** 223 status colors written for both themes now use the status tokens, which have a value per theme. Gradients and `var()` fallbacks are unchanged.
  - Blue `#3b82f6/#2563eb/#60a5fa` → `--info`
  - Amber `#d97706/#b45309/#f59e0b` → `--warning`
  - Green `#10b981/#16a34a/#22c55e` → `--success-strong`
  - Red `#dc2626/#ef4444` → `--danger-strong`
- **Visual effect, by design:** blues are a bit lighter in dark and deeper in light, and the same goes for amber and green. Measured: only colors changed (190 element properties on 19 pages in both themes), with no layout or size change.
- **Screenshots:** before and after in both themes, in `audit/screenshots/status-before-{dark,light}` and `status-after-{dark,light}`.
- **Checks:** build passes, lint shows the same 1 error, 114 tests pass.
- **Commit:** `a3063c2`

### C2-05 White text on filled buttons and badges uses --on-color
- **Type:** Tokens/colors/fonts
- **Pages:** 24 stylesheets
- **What changed:** in 44 rules that set both a background and `color: #fff`, the color became `var(--on-color)`.
- **Visual effect:** none. The token is `#ffffff` in both themes.
- **Script:** `audit/scripts/on-color.mjs`
- **Screenshots:** `audit/screenshots/c2-05/admin/` (4 widths)
- **Commit:** `e7a436e`

### C7-02 404 page for signed-out visitors (R-G-01)
- **Type:** Bug fix + Tokens
- **Pages:** any unknown URL
- **Files:** `features/not-found/not-found.component.ts`
- **What was wrong:**
  - A signed-out visitor was offered "back to dashboard", which then bounced to the login page.
  - The page used an undefined `--bg` variable and hardcoded colors.
- **What changed:**
  - Signed-out visitors get a "تسجيل الدخول" (sign in) button that goes to `/auth/login`.
  - Colors, sizes, radius and shadows come from tokens.
- **Screenshots:**
  - before: `audit/screenshots/before/guest/this_page_does_not_exist@1440.png`
  - after: `audit/screenshots/r-g-01/guest/` (4 widths)
- **Note:** the theme is only applied inside the main layout, so this page always shows the dark theme.
- **Commit:** `8435d26`

### C6-01 Lists refresh by themselves (owner decision X-01)
- **Type:** UI/UX improvement
- **Pages:** workspace, room board, reservations, active shift, dashboard
- **Files:**
  - new `core/services/live-refresh.service.ts`
  - `layouts/main-layout/main-layout.component.ts`
  - a `silent` option in `workspace.service.ts` (`loadFromBackend`), `classroom.service.ts` (`refreshSilently`, `loadClassrooms`) and `shift.service.ts` (`fetchCurrentShiftFromApi`)
- **What was wrong:** changes made by another person at the desk only showed after a manual reload.
- **What changed:**
  - Every 45 s, and right after the tab becomes visible again, the data behind the current page is re-fetched without the loading spinner.
  - A cycle is skipped while the tab is hidden, a modal or menu is open, or a field has focus, so nothing changes under an open form.
- **Verified:** the receptionist checked a student out, and 55 s later the admin's open workspace list had dropped the row without a reload (`audit/logs/roles/cross-session.log`). Build OK, 114 tests pass, 0 console errors.
- **Commit:** `0df0f6a`

### C6-02 Discount codes are view-only for the receptionist (owner decision R-S-04)
- **Type:** UI/UX improvement (role)
- **Pages:** `/settings/discounts`
- **Files:** `features/details/add-discount/add-discount.component.{ts,html,css}`
- **What changed:** for non-admins:
  - the "add" button and the edit/delete buttons are hidden (a "—" is shown instead)
  - the status badges are shown but can't be clicked
- **Admin:** unchanged.
- **Checked:** columns stay aligned (8 header cells, 8 cells per row).
- **Screenshots:** `audit/screenshots/approved-1/staff/settings_discounts@{360,768,1024,1440}.png`
- **Commit:** `5ae6d94`

### C7-05 One-off reservations are saved as one-off
- **Type:** Bug fix (follows the backend change of 2026-11-11)
- **Pages:** `/classroom/reservation`
- **Files:** `features/classroom/classroom-reservations/classroom-reservations.component.ts`
- **What was wrong:** a one-off booking sent the weekday of its date in `daysOfWeek`. The backend now treats any days as weekly, so it was saved as a weekly series.
- **What changed:** a one-off sends no frequency and an empty `daysOfWeek`.
- **Verified on the test API:** a new one-off came back with `frequency: null` and `daysOfWeek: []` (T1).
- **Commit:** `b39ff3a`

### C7-06 Editing one day of a series: cancel the day first, then book the new time
- **Type:** Bug fix (follows the backend change)
- **Pages:** `/classroom/reservation`
- **What was wrong:** the new one-off was created before the old day was cancelled, so it clashed with the day it replaces.
- **What changed:**
  - The day is cancelled first (`cancel-day`), then the new one-off is created.
  - If the second step fails, a message says the day was cancelled but the new time was not saved (`resDayCancelledNewTimeFailed`).
- **Verified (T2):** cancel-day 200, then POST 201. The series lists the day in `canceledDates`, and 3 sessions remain.
- **Commit:** `b39ff3a`

### C7-07 Checkout: change handed back, change kept in the wallet, paying from the wallet
- **Type:** Bug fix (money)
- **Pages:** workspace checkout dialog
- **Files:** `core/services/workspace.service.ts` (`checkOutStudent`), `features/workspace/show-student/show-student.component.ts` (`finalizeCheckout`), `shared/components/checkout-modal/checkout-modal.component.ts`
- **What was wrong:** the server adds `amountReceived` to the drawer and `changeDue − remainingAmount` to the wallet.
  - Change handed back in cash still counted as cash in the drawer.
  - Paying from the wallet sent `wallet`, which the server only stores; it never took the money from the wallet.
- **What changed:**
  - `amountReceived` = cash received minus change handed back.
  - `changeDue` = only the part deposited into the wallet.
  - Paying from the wallet calls `POST /api/Wallet/deduct` after the checkout succeeds. If it fails, a message says so (`wsWalletDeductFailed`).
- **Verified on the test API** (bill 30, through the dialog):
  - T4, paid 100 and change handed back: wallet unchanged, drawer +30.
  - T5, paid 100 and change into the wallet: wallet +70, drawer +100.
  - T6, whole bill from the wallet: wallet −30, drawer +0, deduct 200.
- **Commit:** `b39ff3a`

### C6-05 Room board books today only (Needs approval item, approved)
- **Type:** UI/UX (flow)
- **Pages:** `/classroom/show-classroom`
- **What changed:**
  - A new booking on the room board can't be dated after today: the date field stops at today, and saving checks it again.
  - A link under the date opens the reservations page for other days.
  - Editing an existing booking is unchanged.
- **Verified:** tomorrow was refused with nothing sent (T3a); today on Hall B saved (201, T3b).
- **Commit:** `b39ff3a`

### C7-08 / C7-09 "This day or the whole series" question back; typed instructors kept
- **Type:** Bug fix
- **Pages:** `/classroom/reservation`
- **What changed:**
  - Editing a recurring booking asks again whether to change this day or the whole series.
  - A whole-series edit keeps the series start date (`seriesDateFrom`) instead of moving it to the clicked day.
  - An instructor name typed without choosing from the list is created as an instructor first, so the name is not dropped by the server.
- **Commit:** `c86bb72`

### C7-10 Placeholders for a missing instructor, room or title
- **Type:** Bug fix + i18n
- **What changed:**
  - "No instructor", "Untitled booking" and "Room" now come from the language file.
  - Editing a booking with no instructor leaves the field empty, so the placeholder is never saved as a name.
- **Commit:** `319c60d`

### C7-11 Last English placeholders on Arabic screens; the room board no longer saves "Instructor"
- **Type:** Bug fix + i18n
- **Files:** `show-classroom.component.ts`, `classroom-reservations.component.ts`, `show-student.component.html`, `student-analytics-modal.component.html`, `show-blacklist.component.html`, both package pages, `package.service.ts`
- **What was wrong:**
  - A room-board booking with no instructor or activity was saved with the English words "Instructor" and "Workshop" as data.
  - "Staff", "Student", "General", "Workspace Desk", "Classroom Hall" and "Main Co-Working Zone" showed in English on Arabic pages.
- **What changed:**
  - The room board sends an empty instructor and activity instead of the English words.
  - The visible fallbacks use language keys. Two new keys: `fbStaff`, `fbWorkspaceDesk`.
- **Left as is:** English fallbacks that only appear in English mode (`sessionEn`, `subEn`), in CSV exports, or as internal values (role codes, category keys).

### Test data removed (2026-11-11)
- The save-flow tests (T1–T6, Part D) created records on the test database. All 25 were deleted through the API, and each delete returned 200:
  - 8 workspace sessions, 1 room-board booking, 3 reservations, 1 package
  - the student "TEST Final Retest", the instructors "TEST Final Instructor" and "Instructor", and "TEST Faculty"
  - 8 shift items, including the test expense
- Kept: the student "يوسف علي". Only that student's test session was removed, because the student record may be older than the tests.

### C8-01 Keyboard access, labels tied to fields, small code warnings (lint 1,216 → 569)
- **Type:** Accessibility + code quality
- **What changed:**
  - **Clickable areas:** 163 clickable `div`s got keyboard support. Dialog bodies and backdrops are marked `role="presentation"`. Real controls (cards, pills, list items) get `role="button"`, `tabindex="0"` and the Enter key.
  - **Labels:** 207 labels now point at their field (`for` + `id`). 20 labels that title a group of buttons became `span.group-label`, which looks the same.
  - **Dialogs:** two backdrops close only when the backdrop itself is clicked, so the dialog no longer needs to stop clicks.
  - **Autofocus:** the `autofocus` attribute became the `appAutofocus` directive, which also works inside dialogs.
  - **Output names:** outputs named like DOM events were renamed: `close` → `closed` and `cancel` → `cancelled` (9 components and their parents).
  - **Dead code:**
    - starting values that are always overwritten were removed
    - two time methods that computed a value and threw it away were deleted
    - an unused method was deleted
    - empty error handlers now say why they ignore the error
- **Left:** 569 `any` warnings. Each one reads a server field the data types don't declare, often under several spellings (`phone` / `phoneNumber`, `Instructor` / `instructor_name`). Typing them by guessing could hide real mismatches, so it waits for the backend's API description (Backend requests, item 10). An automatic pass removed the 36 that the compiler could already type.
- **Commits:** `acbf5ba`, `4ce6406`

### C8-02 The last 976 hex colors become palette tokens (no visual change)
- **Type:** Tokens/colors
- **What changed:**
  - **Palette:** `styles.css` has one palette block of 189 tokens, all with the same values in both themes.
    - Tailwind-scale names where the value matches: `--slate-900`, `--amber-400`, `--purple-500` …
    - `--tone-*` for the brand's own warm and dark tones.
    - Existing tokens are reused when the value is identical.
  - **Pages:** component CSS and inline styles use `var(--…)`; no hex is left in page CSS.
  - **Edge cases:** hex inside `url(...)` was left alone; 8-digit hex became `rgba()`.
- **Checked:** the computed colors of every element on every page, in both themes, were recorded before and after. 42 of 42 page–theme combinations are identical.
- **Note:** the palette tokens keep today's look. Moving a page to the theme tokens (`--text`, `--surface`, `--success` …) is still a design choice, page by page.
- **Commit:** `4d6fda6`

### C8-03 Repeat options: one shared editor; the room board's unused copy removed
- **Type:** Duplicated logic
- **What changed:**
  - **Shared editor:** the repeat options, the custom recurrence dialog and the date list now live once, in `features/classroom/recurrence-editor.ts`. The reservations page uses it through one-line aliases, so its template didn't change.
  - **Room board:** it had a full second copy, but no control on it ever changes the repeat option (it books today only, C6-05). That copy, the "repeat sessions" branch after saving, three helpers and 6 language keys were removed.
  - **Repeated ids:** four labels that titled a list pointed at the first button in it, so its id repeated on every item. Fixed.
- **Checked:**
  - **Custom repeat (T7):** on the reservations page, the quick menu shows every option, the dialog shows 7 days, and clicking two days selects them.
  - **Unique ids (T9):** no page has a repeated id.
- **Commits:** `c215d51`, `4ce6406`

### C8-04 First load under 1 MB: languages load on demand
- **Type:** Performance
- **What changed:**
  - **Split files:** the texts were split into `core/i18n/translations.ts` (keys), `en.ts` and `ar.ts`.
  - **Loading:** only the language in use is downloaded at start-up; the app waits for it before the first screen. The other language loads the first time the user switches.
  - **Unused CSS:** 34 selectors for classes no template uses were removed. The workspace page's CSS is back under its 75 kB budget.
  - **Tools:** the audit language tools read the split files through `audit/scripts/lang-src.mjs`. `i18n-add-keys.mjs` writes to all three files; tested by adding and removing a key.
- **Result:** initial bundle 1.16 MB → 766 kB (budget 1 MB). No budget warnings remain.
- **Checked:** switching to English downloads the English chunk and flips the page to left-to-right with English text; switching back returns to right-to-left (T8).
- **Commits:** `c215d51`, plus the test fix after it

### C9-01 Following the backend's answers to the requests (2026-11-12)
- **Type:** API integration
- **Checked first on the test API:** the new OpenAPI spec was compared with the saved one, then each change was tried with TEST records, which were deleted afterwards.
  - **New fields:**
    - checkout: `walletUsed`, `cashChangeReturned`, `walletDeposit`
    - shift: `walletTopUps`, `walletPaidRevenue`
    - shift item: `createdAt`
    - reservation: `instructorName`, `instructorPhoneNumber`
    - classroom: `reservationId`
    - direct top-up: `payWay`
  - **Not found:** no way to restore a cancelled day (request 7). Cancelling the day again or sending the reservation back unchanged keeps the day cancelled.
  - **Data:** 2 reservations dated on a single day are still stored as weekly (request 9).
- **What changed:**
  - **Checkout:** one request carries everything: `amountReceived` (all the cash handed over), `cashChangeReturned`, `walletDeposit` and `walletUsed`, with `changeDue` sent as 0. The separate `POST /api/Wallet/deduct` is gone.
  - **Active shift:** a new "Wallets" card shows the top-ups taken in and how much of the revenue was paid from wallets. Ledger times come from `createdAt`.
  - **Reservations:**
    - `instructorPhoneNumber` is sent.
    - The server keeps a typed instructor (and creates it from the name and phone), so the frontend saves the instructor first only when an email was typed.
    - A session started from a reservation (`reservationId`) replaces that day's reservation row instead of showing the booking twice.
- **Verified in the app** (bill 30):
  - **T10a, change handed back in cash:** wallet unchanged, drawer +30.
  - **T10b, change into the wallet:** wallet +70, drawer +100, revenue +30, top-ups +70.
  - **T10c, paid from the wallet:** wallet −30, drawer 0, paid from wallets +30, no extra request.
  - **T11, active shift:** the Wallets card shows the figures and every ledger row has a time.
  - **T12, typed instructor (no email):** one request; name and phone kept.
  - **T13, session from today's reservation:** shown once in the list.
  - **Checks:** build OK, lint 0 errors, 116 tests, 19 pages with 0 console errors.
- **Commit:** `de63bf1`

## Backend requests

From the tests on 2026-11-11, after the backend change "تقرير تعديلات نظام حجوزات":

1. **A room-board session blocks reservations on other days.** An active classroom at 14:00 today made a reservation at 14:00 on a different date fail as a clash. The check should compare dates as well as times.
2. **`wallet` on checkout is stored but never deducted.** The frontend now calls `POST /api/Wallet/deduct` after checkout, which takes two requests. Better: a `walletUsed` field on checkout, applied in the same transaction.
3. **`changeDue` counts as cash.** Money put into the wallet from change is added to the drawer and to workspace revenue. Better: separate `cashChangeReturned` and `walletDeposit` fields, or confirm the intended meaning.
4. **Revenue for sessions paid from the wallet.** Decide whether these count as revenue on the day of the session, or when the wallet was topped up.
5. **Shift items have no `createdAt`.** The shift ledger can't show a time (the frontend shows "—").
6. **A reservation without `instructorId` loses `instructorName`.** The frontend now creates the instructor first. Keeping the free-text name would also work.
7. **No way to restore a cancelled day.** `cancel-day` has no undo endpoint.
8. **Classroom has no `ReservationId`.** A session started from a reservation can't be traced back to it (the backend team suggested this too).
9. **Old one-off reservations are still weekly.** Records saved before the fix stay weekly. A one-time data fix: `frequency = null`, `daysOfWeek = []` for records that were meant as a single session.
**Status on 2026-11-12** (the backend answered; checked on the test API):
- **Done, and the frontend follows it (C9-01):** 1, 2, 3, 4 (wallet-paid revenue is reported separately as `walletPaidRevenue`), 5, 6, 8.
- **Still open:**
  - **7:** no restore endpoint for a cancelled day.
  - **9:** 2 old single-day reservations are still weekly.
  - **10:** no response types are published yet.

10. **An API description (Swagger / OpenAPI) for the responses.** The frontend reads several spellings of the same field (`phone` / `phoneNumber`, `Instructor` / `instructor_name` …), which is where the 569 remaining `any` warnings come from. With the published shapes the data types can be written once and checked.

## Needs approval

- ~~**Room-board booking with a future date**~~: approved and done (C6-05).

- ~~X-01 Auto-refresh~~: approved and done (C6-01).
- ~~R-S-04 Discount management for the receptionist~~: approved as view-only and done (C6-02).
- ~~R-S-05~~: the "Discount codes" card stays on the receptionist's dashboard, since codes can now be viewed.
- ~~**C2-A / C2-B / C2-C**~~: approved as recommended and done (C2-10, C2-11, C2-12). The original notes follow.
- **C2-A Font sizes between two tokens** (428 values, mostly 0.85rem ×121 and 0.84rem ×59, also 0.92, 1, 1.05, 1.15, 1.25rem).
  - Snapping them to the nearest token would change text by 0.5–0.8px, which is visible.
  - Options: (a) add a token `--fs-ui: 0.85rem` for the 0.84/0.85 group and snap the rest; (b) snap all to the current scale; (c) leave them.
  - Recommendation: (a).
- **C2-B Radii with no token** (148: 4px ×43, 16px ×37, 9px ×19, 18px ×10, 5px, 7px).
  - Options: map 4/5px → `--radius-2xs` (6px), 16/18px → `--radius-lg` (20px) or a new `--radius-xl: 16px`, 7/9px → `--radius-xs` (8px).
  - Each would change corners by 1–4px.
- **C2-C Colors used in both themes** (about 1,220 hex values).
  - Most are a Tailwind-style palette written straight into rules that apply in both themes. Examples: `#3b82f6` ×71, `#d97706` ×57, `#0f172a` ×46, `#10b981` ×43, `#1e293b` ×32.
  - Moving them to the status tokens (`--info`, `--warning`, `--success` …) would make one theme look different, because the tokens have a different value per theme. That is the point of the tokens, but it is a visible change.
  - Proposal: do it page by page with before/after screenshots in both themes.

## Not changed


- ~~**Broken Arabic in the language file**~~ ("تأكيد امسح كود الديسكاونت" …): fixed in C4-01, and the whole file was reworded in Egyptian dialect in C4-11.
- ~~**Phones, reservations table:** the row actions were outside the screen at 360px.~~ Done in C6-03 (actions column pinned on 15 tables).
- **Arabic in the code that is data, not screen text** (C4): staying as it is.
  - Words used to read or match values: AM/PM markers ص/م, duration units, `[كافيه]`-style tags in transaction descriptions, catering category keywords.
  - Text sent to the server: transaction descriptions, session notes, block reasons, staff name defaults.
  - Arabic fields of bilingual data: `nameAr`, `labelAr`, category names, built-in package examples.
  - The full list is in `audit/logs/i18n/arabic-literals.json` (`node audit/scripts/i18n-arabic-literals.mjs`).
- **Button variants** (C5): 65 computed styles. They are different kinds of button: nav items, icon buttons, chips, the language switch, pagination. Main actions already use the shared `app-primary-button` (C1). Making the rest the same would be a redesign of each kind.
- **Duplicated page logic** (C3):
  - ~~**Recurrence editor**~~: done in C8-03 (one shared editor; the room board's copy was unused and is removed).
  - **Pagination and search glue:** `setPage`, `nextPage`, `onSearchChange` are 4–6 lines each on 7 pages. A shared helper would save little.
  - **Live-alerts trigger:** 3 services, 8 lines each. It reaches the notification service through a lazy lookup on purpose (circular dependency), so it is left as it is.
- **Text with both languages inside code** (C4): durations now go through the shared helper (C3-02). Still in code: the "long stay" badge, the form validators and the discount labels.
- **Text with both languages inside code** (C4, original note): staying for now.
  - Some text already shows correctly in both languages, but builds its wording in code because Arabic plurals change the word ("ساعة واحدة / ساعتان / 3 ساعات").
  - Where: durations in the classroom service and time picker, the "long stay" badge, the form validators, discount labels (`labelAr`/`labelEn`), the date filter's month names.
  - Moving them would need a shared duration formatter. That fits C3 (duplicated logic), where they are listed.
- **Physical margins and paddings** (C4 RTL): about 300 `margin/padding/border-left|right` and `left/right` rules were not converted.
  - Many already have Arabic overrides. Others position things that must not flip (centering, icons inside inputs).
  - The RTL check found no layout breaking because of them.
- ~~**Shift ledger time column empty**~~: the frontend part is done in C7-03 (shows "—"). Real times need the backend to send a creation time for shift items.
- ~~**Colors left as hex** (C2)~~: done in C8-02 (palette tokens, same values, checked on every page in both themes). The original note follows.
  - Slate neutrals (`#0f172a`, `#1e293b`, `#f8fafc`, `#e2e8f0`, `#94a3b8`) are a background in some rules and text in others, so no single token fits. Mapping them one rule at a time is C5 work.
  - White: not every white background should become `--surface`.
  - Purple `#a855f7` and light amber `#fbbf24`: there is no token, and adding them is a design choice.
  - Gradients: kept as they are.
- **Cross-role flows not re-created in Part D:** they create real records on the live server. See Part D.
- **Lint warnings:** 1,216 → 569 in C8-01, with 0 errors. The 569 left are `any` reads of server fields; they wait for the API description (Backend requests, item 10).
- **Large custom dialogs** (check-in, checkout, cafe sales, room booking, reservation form, student analytics): moving them into a generic modal would mean redesigning them. They stay as they are; only their buttons and colors follow the standard.
