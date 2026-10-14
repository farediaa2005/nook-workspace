# NOOK Workspace — Technical Audit & Reverse Engineering Report
## Volume 8: Project Handover & Engineering Runbook

> **Audited Workspace:** `c:\Users\fares\Documents\GitHub\Nook\Frontend`  
> **Target Audience:** Incoming Staff Engineer, Frontend Tech Lead, AI Assistant  
> **Handover Date:** October 11, 2026  
> **Current Status:** Verified Operational on Branch `mariem` (Commit `9605687`)  

---

### 1. Executive Handover Summary

**NOOK Workspace** is an Angular 21 operational management and POS web application for a hybrid educational coworking and classroom training space. It connects to an ASP.NET Core REST API hosted at `https://nook.runasp.net` (OpenAPI v3.0.4).

The platform handles desk check-in/out, live room bookings, prepaid subscription packages, cashier shifts with cash register float reconciliations, a cafeteria POS, student/instructor reference directories, and dual-language (Arabic/English) operations.

---

### 2. Quick Reference Technology Matrix

| Component | Standard / Command | Notes |
|---|---|---|
| **Node.js** | `>= 20.0.0` (Tested on `v24.20.0`) | Recommended LTS |
| **npm** | `>= 10.0.0` (Tested on `12.0.2`) | Package manager |
| **Angular CLI** | `@angular/cli@21.2.7` | Local CLI in `node_modules` |
| **Dev Server** | `npm start` or `npx ng serve` | Runs on `http://localhost:4200` with proxy |
| **Type Checking** | `npx tsc --noEmit` | Strict mode (0 errors) |
| **Unit Tests** | `npm test -- --watch=false` | Vitest (8 suites, 35 tests, 100% pass) |
| **Production Build** | `npm run build` | Generates bundles in `dist/nook_website` |
| **Headless E2E** | `node scripts/test_all_fixes.mjs` | Puppeteer with Microsoft Edge |

---

### 3. Essential File Map

```text
src/
├── app/
│   ├── app.config.ts                 # Providers: provideRouter, provideHttpClient, authInterceptor
│   ├── app.routes.ts                 # 33 Lazy-loaded routes with authGuard and adminGuard
│   ├── app.ts                        # Root shell component with LocalStorage garbage cleanup
│   │
│   ├── core/
│   │   ├── constants/api-endpoints.ts # Single source of truth for all 143 API URLs
│   │   ├── guards/auth.guard.ts       # Route guard requiring active authenticated session
│   │   ├── guards/admin.guard.ts      # Route guard requiring Admin role
│   │   ├── interceptors/auth.interceptor.ts # Bearer token injection, silent refresh queue
│   │   ├── models/                   # 27 TypeScript DTO interfaces matching backend schemas
│   │   ├── services/api/             # 27 Pure HTTP transport services (Layer 3)
│   │   ├── services/                 # 16 Domain state services with Angular Signals (Layer 4)
│   │   │   ├── auth.service.ts       # JWT lifecycle, user profile, role claims
│   │   │   ├── workspace.service.ts  # Active student sessions, durations, desk checkout
│   │   │   ├── classroom.service.ts  # Room bookings, live board, overtime, instructor settlement
│   │   │   ├── shift.service.ts      # Cash register float, multi-source financial tracking
│   │   │   ├── notification.service.ts # Live operational alerts engine
│   │   │   └── language.service.ts   # English / Arabic bilingual dictionary (4,275 lines)
│   │
│   ├── features/                     # 9 Business domain modules (Layer 5)
│   ├── shared/                       # 66 Reusable UI components (table, modal, navbar, sidebar)
│   └── layouts/                      # auth-layout (login) and main-layout (dashboard shell)
│
├── proxy.conf.json                   # Dev-server reverse proxy routing /api to https://nook.runasp.net
├── vercel.json                       # Production serverless rewrite routing /api to backend
└── styles.css                        # NOOK Design System tokens and global styles (24.5 KB)
```

---

### 4. Developer Onboarding & Local Setup Runbook

#### Step 1: Environment Verification
Ensure Node.js and npm are installed:
```powershell
node -v   # Target: v20+
npm -v    # Target: v10+
```

#### Step 2: Running Development Server
Start the Angular dev server with proxy enabled:
```powershell
# In PowerShell on Windows:
cmd /c "npm start"
```
The server will compile and listen at `http://localhost:4200/`.

#### Step 3: Accessing the Dashboard
1. Open browser to `http://localhost:4200/auth/login`.
2. Login with standard administrative credentials:
   - **Identifier:** `admin`
   - **Password:** `Admin@123`
3. Upon submission, the app authenticates against `https://nook.runasp.net`, receives a JWT, stores it in `localStorage['nook_access_token']`, and navigates to `http://localhost:4200/dashboard`.

---

### 5. Troubleshooting Runbook

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| **PowerShell script execution error (`npx.ps1 cannot be loaded`)** | Windows PowerShell ExecutionPolicy blocks `.ps1` execution. | Prefix commands with `cmd /c` (e.g. `cmd /c "npx tsc --noEmit"` or `cmd /c "npm test"`). |
| **API requests fail with CORS errors** | Direct URL to `https://nook.runasp.net` was used instead of relative path `/api/...`. | Ensure `API_BASE_URL` in `src/app/core/constants/api-endpoints.ts` remains an empty string `''` so requests route through `proxy.conf.json`. |
| **User redirected to login unexpectedly** | Access token expired and refresh token failed, or token manually tampered with. | Check network tab for `/api/Auth/refresh-token` response. Re-login with valid credentials. |
| **Live board shows blank room names or instructor names** | Secondary in-memory relational joins failed because reference tables were not loaded. | Ensure `settingsService.syncRoomsFromBackend()` and `detailsService.loadInstructors()` ran on login. |

---

### 6. Prioritized Future Roadmap (Recommendations)

#### Priority 1: High Impact / Low Effort
1. **Enrich Backend Classroom DTO:** Request backend team to update `GET /api/Classrooms` to include `roomName`, `instructorName`, `hourlyRate`, and `cateringTotal`, eliminating client-side `forkJoin` and O(1) joins.
2. **Decompose Monolithic CSS Stylesheets:** Break down `show-student.component.css` (5,030 lines) and `show-classroom.component.css` (4,245 lines) into scoped sub-component styles or shared mixins.

#### Priority 2: Quality & Reliability
3. **Expand Vitest Test Coverage for Domain Calculations:** Write parameterized unit tests for:
   - `workspace.service.ts`: `parseDurationMinutes`, `formatMinutesToDuration`, desk hourly rates.
   - `classroom.service.ts`: Overtime minutes calculations and reservation conflict rules.
   - `shift.service.ts`: Variance calculation (`actualCash - expectedCash`).
4. **Decompose `LanguageService` Dictionaries:** Split the 4,275-line monolithic dictionary file into per-domain translation files or JSON assets loaded via an asynchronous HTTP loader.

#### Priority 3: Architecture & Security
5. **HttpOnly Cookie BFF Authentication:** Evaluate migrating JWT tokens from `localStorage` to HttpOnly SameSite cookies via a reverse proxy BFF to enhance defense against XSS.
6. **WebSockets / SignalR for Real-Time Status:** Replace 25-second client polling in `NotificationService` with backend SignalR hubs for instant push notifications of desk occupancy and room reservations.
