# Dead-code cleanup log

- Branch: `cleanup/dead-code`, created from `mariem` at `850835b` (2026-11-11).
- Source list: `audit/AUDIT_REPORT.md` → "Dead code & unnecessary files". Only rows marked **Safe to delete: Yes** were touched.
- Result: 6 commits, 56 files under `src/`, +82 / −582 lines. Nothing was marked "Not safe".

## How each batch was checked

`audit/scripts/cleanup-check.mjs <batch>` after every batch:

1. `ng build --configuration development`
2. `ng lint`, compared with the baseline
3. `ng test --watch=false`
4. The dev server (`ng serve` on this branch, port 4300) is opened on 19 pages: dashboard, both package pages, workspace, room board, reservations, active shift, shift history, open shift, students, colleges, blacklist, instructors, products, product graph, settings, discounts, users and profile. Console errors are recorded and compared with the baseline.

Results are in `audit/logs/cleanup/<batch>.json`.

Baseline before any change: build OK, 114 tests passing, lint **1 error / 1248 warnings**. The one lint error is `no-dupe-else-if` in `src/app/shared/components/checkout-modal/checkout-modal.component.ts:80`. It was already there, is not in the dead-code list, and was left as it is.

| Batch | Commit | Build | Lint (errors / warnings) | Tests | New console errors |
|---|---|---|---|---|---|
| baseline | – | OK | 1 / 1248 | 114 passed | – |
| 1 `ClassroomApiService.removeCateringItem` | `8ddf115` | OK | 1 / 1248 | 114 passed | none |
| 2 unused exported values | `93c9b03` | OK | 1 / 1247 | 114 passed | none |
| 3 `BackendPackageType` duplicate | `1c0f3d1` | OK | 1 / 1247 | 114 passed | none (first run hit a short backend outage, HTTP 500 on every page for a few seconds; rerun clean, API confirmed healthy) |
| 4a types in `core/models` | `9418ba8` | OK | 1 / 1246 | 114 passed | none |
| 4b types in `core/services`, `core/utils` | `9f6a573` | OK | 1 / 1246 | 114 passed | none |
| 4c types in `features`, `shared` | `861accc` | OK | 1 / 1246 | 114 passed | none |

## Already removed before this run

These "Yes" rows no longer existed when this run started. They were deleted on `mariem` in commit `8443179` ("Remove dead code, unused files and leftover scripts", 2026-11-10):

- **Unused files:**
  - `src/app/core/api-enums.ts`
  - `core/constants/app.constants.ts`
  - `core/constants/routes.ts`
  - `core/models/index.ts`
  - `core/services/permission.service.ts`
  - `core/services/student.service.ts`
- **Unused components:** `shared/components/autocomplete/`, `data-table/`, `footer/`, `student-snapshot-card/`
- **Images:** `public/images/kernel-panic-icon-dark.png`, `kernel-panic-icon-light.png`, `kernel-panic-logo.jpg`
- **OpenAPI snapshots:** `openapi_spec.json`, `raw_openapi.json` and the other copies were deleted; one copy was kept as `docs/api/openapi.json`.
- **Test output:** `e2e_results.json`, `edit_persistence_test_result.json`, `scratch/audit_results.json`
- `.gemini/walkthrough.md`

The same earlier commit also handled some rows that are marked **Check first**, during the "fix all audit problems" work:
- It removed `puppeteer-core`.
- It deleted the ad-hoc root scripts (`e2e_test.mjs`, `verify_edit_persistence.mjs`, `scratch/*.js`, `scripts/*.mjs`), which contained the admin password.
- It moved the root docs to `docs/archive/`.
- It removed 58 service members.

This run did not touch any "Check first" row.

## Removed or un-exported in this run

### Batch 1: `8ddf115`
- `ClassroomApiService.removeCateringItem` (`src/app/core/services/api/classroom-api.service.ts`) was deleted. Nothing calls it. The `removeCateringItem` calls that remain belong to `WorkspaceApiService` and to a component method.

### Batch 2: `93c9b03` (the "15 unused exported values" row)
- **Deleted (used nowhere):**
  - `extractItems` in `core/models/api-response.model.ts`
  - `DEFAULT_ROOM_FALLBACK` in `core/utils/image-url.util.ts`
- **Only the `export` keyword dropped** (still used inside their own file):
  - `mapAuditLogDto`
  - `mapStaffNotificationDto`
  - `DEFAULT_CATEGORIES`
  - `inferCategoryFromName`
  - `formatMinutesToDuration`
  - `parseIsoOrTimeToDisplay`
  - `getAvatarColors`
  - `normalizeIsoString`
  - `formatLocalDateToISO`
  - `containsInvalidPhoneCharacters`
  - `getDistinctCollegeColor`
- **Duplicate re-export lines deleted.** The real definitions stay in `workspace-session.model.ts` and `date-time.util.ts`, which are what every importer uses.
  - `export { PayWay, DiscountType, SessionStatus }` and `export { BookingStatusEnum as BookingStatus }` in `classroom.model.ts`
  - `export { DiscountType }` in `coupon.model.ts` and `discount.model.ts`
  - `export { PayWay }` in `package-api.model.ts`
  - `export { getTodayDateISO }` in `workspace.service.ts`

### Batch 3: `1c0f3d1`
- `export const BackendPackageType = PackageType` in `core/models/pricing-plan.model.ts` was deleted. It was a `@deprecated` alias that nothing imported.

### Batch 4: `9418ba8`, `9f6a573`, `861accc` (the "53 files with unused exported types" row)

knip listed 152 exported types that nothing imports, across 53 files. Results:
- **71 types** are still used inside their own file. Only `export` was dropped.
- **64 types** were used nowhere and were deleted with their doc comments. One import in `user.model.ts` (`ProfileDetailDto`, `StaffRole`) was deleted too, because only the deleted types used it.
- **17 were skipped.** They are re-export statements rather than declarations (see "Skipped" below).

The per-type list is in `audit/logs/cleanup/types-src_app_*.json`. The deleted types:
- **Removed in 4a (core/models):**
  - `PaginatedResult`, `PaginatedApiResponse`, `ApiError`, `AuditFilterOptions`
  - `RegisterRequestDto`, `RefreshTokenRequestDto`, `ChangePasswordDto`, `ForgotPasswordDto`, `ResetPasswordDto`, `GoogleAuthRequestDto`
  - `BlacklistReason`, `UpdateBlacklistDto` (×2)
  - `BackendProductDto`, `CreateProductPayload`, `UpdateProductPayload`, `PosSalePayload`
  - `BookingStatusEnum`, `ClassroomSessionStatus`, `ClassroomType`, `BookingDto`, `UpdateBookingStatusDto`, `Classroom`, `ClassroomBookingPayload`
  - `TopStudentDto`, `CollegeAnalyticsItem`, `StudentMilestoneProgress`, `InstructorActivityDto`, `NotificationFilterOptions`
  - `PackageUsageDto`, `PricingSuggestionDto`, `profileDto`, `changePasswordDto`
  - `UpdateShiftDto`, `StartShiftDto`, `ShiftTransactionDto`, `BackendShiftDto`
  - `StudentDto`, `UpdateStudentDto`
  - `User`, `AccountProfileDto`, `LinkStaffProfileDto`, `LinkStudentProfileDto`, `LinkInstructorProfileDto`, `LinkParentProfileDto`
  - `WalletTopUpRequestStatus`, `CreateWalletTopUpRequestDto`, `WalletTopUpRequestDto`, `ReviewWalletTopUpRequestDto`
  - `WorkspaceSessionStatus`, `WorkspacePaymentMethod`, `BackendWorkspaceDto`, `CreateWorkspaceSessionDto`, `CheckoutWorkspaceSessionDto`, `CateringLineItem`, `StudentDirectoryItem`
- **Removed in 4b (core/services):**
  - `BackendProductDto`, `CreateProductPayload`, `UpdateProductPayload` (product API)
  - `BackendReservationDto`, `CreateReservationPayload`
  - `StudentCheckoutPayload`, `StudentCheckoutResponse`
- **Removed in 4c (features):** `PosCategoryTab`

## Reverted attempts

Both happened inside batch 4. Neither was committed, and the item itself turned out safe with a narrower method.

1. **`knip --fix --fix-type types`** was reverted straight away with `git checkout -- src`, before any check ran. Besides dropping `export`, knip:
   - removed the enum member `ClassroomTypeEnum.Reservation`, which the report marks **Check first**
   - replaced re-export statements with stray `;` lines
   - rewrote whole files

   It was replaced by `audit/scripts/cleanup-types.mjs`, which uses the TypeScript AST and only edits the listed declarations.
2. **Drop `export` from all 88 model types** was reverted. Build, tests and pages were fine, but lint went from **1 to 54 errors**. Types that are unused even inside their own file become "defined but never used" (`@typescript-eslint/no-unused-vars`). It was redone as batch 4a with the rule from batch 2:
   - drop `export` when the type is still used in its file
   - delete the type when it is used nowhere

   Lint was back at the baseline.

## Skipped

### Marked "Check first" in the report (not touched)
- **~116 API service methods** (rows marked UNUSED in `audit/logs/api-map.md`). The report's generator matched by name only. 58 of them were already removed in `8443179` after a grep check.
- **`ClassroomTypeEnum.Reservation` / `.InstructorPackage`** mirror the backend enum. `InstructorPackage` is used now: package classroom bookings send type 3.
- **`prettier`** devDependency. knip still reports it as unused; editors use it via `.prettierrc`.
- **`puppeteer-core`** devDependency. It was already removed in `8443179`.
- **Routes with no link:**
  - `/workspace/checkout`
  - `/classroom/add-classroom`
  - `/classroom/checkout`
  - `/classroom/show-reservation(/:id)`
  - `/shift/end-of-shift-balance`
  - `/shift/search-shift`
  - `/package/add-student-package`
  - `/package/add-instructor-package`

  Most of these were turned into redirects or removed during the earlier fix round.
- **20+ legacy redirect routes:** `show-student-package`, `show-instructor-packages`, `active-shift`, `admin-console`, `add-reservation`, `/users`, `/show-users`, …
- **Root docs** (API_AUDIT.md … project_documentation.md). They are already in `docs/archive/` since `8443179`.
- **Ad-hoc scripts** `e2e_test.mjs`, `verify_edit_persistence.mjs`, `scratch/*.js`, `scripts/*.mjs`. Already deleted in `8443179`.
- **`.vscode/mcp.json`**

### "Yes" items left in place
These 17 types are listed by knip, but they are re-export statements (`export type { X } from …` / `export { X }`), not declarations. Changing them means changing what a module exposes, so they were left alone:
- `details.model.ts`: `FacultyDto`, `InstructorDto`, `BlacklistDto`, `DiscountDto`
- `product-api.service.ts`: `ProductDto`, `CreateProductDto`, `UpdateProductDto`
- `dashboard.component.ts`: `UpcomingRoomBooking`, `ActiveStudentPreviewItem`, `ActivityFlowPoint`, `SpaceDistributionMetrics`, `DashboardMetrics`
- `show-colleges.component.ts`: `College`
- `show-blacklist.component.ts`: `BlacklistRecord`
- `show-instructors.component.ts`: `Instructor`
- `add-discount.component.ts`: `DiscountCode`, `DiscountRule`

### Not in the report (found by knip now, not touched)
These became unused after the report was written, so they are not on the list:
- `WorkspaceType` export in `core/constants/backend-enums.ts`
- `extractBaseReservationId` and `getTimeSegments` in `core/utils/reservation-conflict.util.ts`
- unlisted dependency `@angular-eslint/builder` in `angular.json`

## Files added for the cleanup (not app code)
- `audit/scripts/cleanup-check.mjs`: the per-batch check (build, lint, tests, 19 pages, console errors)
- `audit/scripts/cleanup-exports.mjs`: batch 2 edits
- `audit/scripts/cleanup-types.mjs`: batch 4 edits (TypeScript AST)
- `audit/logs/cleanup/`: check result per batch, knip output (`knip-types.json`, `knip-types.tsv`) and the per-type lists
