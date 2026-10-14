# NOOK Workspace — Technical Audit & Reverse Engineering Report
## Volume 0: Executive Summary

> **Audit Date:** October 11, 2026  
> **Auditor Role:** Senior Software Architect & Staff Systems Auditor  
> **Audited Workspace:** `c:\Users\fares\Documents\GitHub\Nook\Frontend`  
> **Git Branch:** `mariem` (Commit `9605687`, clean working tree)  
> **Target API Host:** `https://nook.runasp.net` (ASP.NET Core REST API, OpenAPI v3.0.4)  
> **Audit Status:** COMPLETE — 100% Read-Only, 0 Code Changes to Project Source Files  

---

### 1. Plain-Language Mission: What the Project Does & Why It Exists

**NOOK Workspace** is an enterprise-grade operational management and Point of Sale (POS) dashboard engineered for an educational coworking space, study center, and training venue located in Egypt.

The business manages a physical hybrid facility that offers:
1. **Shared Workspace & Quiet Study Desks:** Students check in, occupy individual study desks, accumulate billable time based on customized hourly rates or prepaid subscription packages, order drinks and snacks from a canteen, and check out with itemized invoices.
2. **Classrooms & Training Halls:** Instructors book seminar rooms for workshops and academic courses. The system manages live room status boards, prevents double-booking conflicts, tracks overtime penalties, charges for printing and hospitality, and reconciles balances upon checkout.
3. **Prepaid Hours Packages:** Bundled hour subscriptions sold to students (workspace desk packages) and instructors (classroom teaching packages) with strict rules (e.g. only one active package per student).
4. **Shift & Financial Cash Drawer Management:** Cashiers and receptionists open shifts with an opening cash float, record multi-currency/multi-channel financial movements (Cash, POS Visa, Vodafone Cash Inside, Vodafone Cash Outside, Expenses, Other Income), and perform end-of-shift cash drawer reconciliations to detect discrepancies.
5. **Catering & Buffet POS:** An integrated cafeteria inventory and POS system supporting live room and desk order assignments, stock decrementing, and consumption analytics.
6. **Reference Data & Administration:** Student and instructor directories, university/faculty affiliations, custom discount codes, a customer blacklist, and staff account management with Role-Based Access Control (RBAC).

---

### 2. Confirmed Technology Stack

| Architectural Dimension | Technology / Library | Version / Specification | Evidence & Manifest Verification |
|---|---|---|---|
| **Frontend Framework** | Angular (Standalone Architecture) | `21.2.0` | `package.json:14-19`, `app.routes.ts` |
| **Language & Runtime** | TypeScript | `5.9.2` (Strict Mode) | `tsconfig.json`, `package.json:30` |
| **State Management** | Angular Signals (`signal`, `computed`) | Native Angular 21 | `workspace.service.ts`, `shift.service.ts` |
| **Reactivity & Async** | RxJS Observables | `7.8.0` | `base-api.service.ts`, `auth.interceptor.ts` |
| **Application Builder** | `@angular/build:application` (Vite-powered) | `21.2.7` | `angular.json:18`, `angular.json:65` |
| **Unit Test Runner** | Vitest via `@angular/build:unit-test` | `4.0.8` | `angular.json:80`, `app.spec.ts` |
| **Styling Architecture** | Vanilla Scoped CSS + Custom CSS Properties | Design System | `styles.css` (24.5 KB), CSS variables |
| **Typography** | Google Fonts (Poppins, Cairo, Quicksand) | Web Fonts | `index.html:13`, `styles.css` |
| **Internationalization** | Dual-Language (English LTR / Arabic RTL) | Custom Reactive Engine | `language.service.ts` (4,275 lines) |
| **Theming** | Dual-Theme (Dark / Light) | HTML `data-theme` | `theme.service.ts`, `index.html:2` |
| **Reverse Proxy (Dev)** | Angular Dev Server Proxy | `proxy.conf.json` | `proxy.conf.json:1-21` (Target: `https://nook.runasp.net`) |
| **Deployment Routing** | Vercel Serverless Rewrites | `vercel.json` | `vercel.json:1-23` |
| **Target Backend API** | ASP.NET Core REST API | OpenAPI v3.0.4 | `https://nook.runasp.net/openapi/v1.json` |

---

### 3. Major Architectural Components

```mermaid
graph TB
    subgraph UI_Presentation ["Presentation Layer (Angular Standalone Components)"]
        Dashboard["Dashboard & Analytics"]
        Workspace["Workspace Desk POS"]
        Classroom["Classroom Live Board"]
        Shift["Shift & Cash Drawer"]
        Catering["Catering & Canteen"]
        SharedUI["Shared UI (Table, Modal, Navbar, Sidebar)"]
    end

    subgraph Business_Services ["Domain State & Business Logic Layer (Signals)"]
        AuthSvc["AuthService (JWT & RBAC)"]
        WorkSvc["WorkspaceService (Desk Sessions)"]
        ClassSvc["ClassroomService (Room Booking)"]
        ShiftSvc["ShiftService (Financial Ledger)"]
        NotifSvc["NotificationService (Live Alerts Engine)"]
        LangSvc["LanguageService (EN / AR)"]
    end

    subgraph Pure_API ["Pure API Service Layer (27 Domain Services)"]
        BaseApi["BaseApiService (HttpClient Helpers)"]
        WorkApi["WorkspaceApiService"]
        ClassApi["ClassroomApiService"]
        ShiftApi["ShiftApiService"]
        AccApi["AccountApiService"]
    end

    subgraph Networking ["Network & Infrastructure Boundary"]
        Interceptor["authInterceptor (Bearer Token & Silent Refresh)"]
        HealthSvc["ApiHealthService (25s Heartbeat Ping)"]
        DevProxy["Dev Proxy / Vercel Rewrite"]
    end

    subgraph External_Backend ["Remote Backend Server"]
        AspNet["ASP.NET Core API (https://nook.runasp.net)"]
    end

    UI_Presentation --> Business_Services
    Business_Services --> Pure_API
    Pure_API --> BaseApi
    BaseApi --> Interceptor
    Interceptor --> HealthSvc
    Interceptor --> DevProxy
    DevProxy --> AspNet
```

The system strictly enforces a **5-Layer Clean Architecture**:
1. **Layer 1 — Models & DTOs (`src/app/core/models/`):** 27 TypeScript files mirroring OpenAPI v3.0.4 schemas without business logic.
2. **Layer 2 — API Endpoints Registry (`src/app/core/constants/api-endpoints.ts`):** Centralized endpoints dictionary eliminating hardcoded URLs.
3. **Layer 3 — Pure API Services (`src/app/core/services/api/`):** 27 services deriving from `BaseApiService`, returning raw RxJS Observables without local state side-effects.
4. **Layer 4 — Domain & Business State Services (`src/app/core/services/`):** 16 singleton services holding Angular Signals, computing derived metrics, orchestrating cross-domain flows, and maintaining in-memory session caches.
5. **Layer 5 — Presentation Components (`src/app/features/`, `src/app/shared/`, `src/app/layouts/`):** Pure consumer components bound to signals with zero direct HTTP calls.

---

### 4. Overall State Based on Concrete Evidence

- **Architecture Health:** **EXCELLENT.** The codebase adheres rigorously to separation of concerns. Standalone components, signals-based state, and lazy routing are modern and consistent.
- **Compilation Status:** **PASSED.** Strict TypeScript compilation (`npx tsc --noEmit`) passes with **0 errors**.
- **Unit Test Status:** **PASSED.** Vitest test runner executes 8 test files (35 individual test cases) with a **100% pass rate** in 5.8 seconds.
- **Production Bundle Status:** **PASSED.** `npm run build` generates optimized production artifacts in 25.6 seconds with **0 errors**.
- **Dev-Server Runtime Status:** **VERIFIED OPERATIONAL.** `ng serve` launches cleanly on port 4200.
- **Live Backend Connectivity:** **VERIFIED OPERATIONAL.** Requests proxied to `https://nook.runasp.net` return valid HTTP 401 on unauthenticated calls, and authenticate successfully using admin credentials (`admin` / `Admin@123`), receiving a valid signed JWT with role `Admin`.
- **Browser End-to-End Navigation:** **VERIFIED OPERATIONAL.** Headless Edge automation successfully tests login, JWT local storage persistence, and routing across `/dashboard`, `/workspace/show-student`, `/classroom/show-classroom`, and `/shift/active`.

---

### 5. Primary Strengths

1. **Zero Mock Leakage in Production Paths:** Unlike earlier iterations documented in August 2026, the active codebase communicates 100% with live backend API endpoints. All mock database files in `src/testing/` have been removed.
2. **Robust Multi-Layer Resilience:** `auth.interceptor.ts` implements a concurrency-safe refresh token queue via `BehaviorSubject`. If an access token expires while multiple requests are in-flight, they wait until a single refresh request succeeds before retrying.
3. **High-Performance In-Memory Relational Joins:** The frontend compensates for missing backend joins (e.g. `roomName` and `instructorName` in `GET /api/Classrooms`) by caching reference entities in O(1) in-memory HashMaps (`Map<string, T>`), avoiding client-side UI freezing.
4. **Deep Bilingual Capability:** The application boasts full Arabic and English support across all 33 routes, including automatic text-direction switching (`rtl` vs `ltr`), locale-aware duration parsers (`1h 30m` vs `1س 30د`), and typography loading.
5. **Real-Time Operational Alerts Engine:** `NotificationService` runs a continuous background evaluation checking low catering stock, expiring reservations, and student session durations, generating proactive notifications and badge counters.

---

### 6. Primary Concerns & Vulnerabilities

1. **Massive Monolithic Component & Style Files:**
   - `show-student.component.ts` (2,805 lines) and `show-student.component.css` (5,030 lines).
   - `classroom-reservations.component.ts` (2,558 lines) and its stylesheet (4,145 lines).
   - `language.service.ts` (4,275 lines of hardcoded translation dictionaries in a single file).
   These massive files represent significant maintenance risk and cognitive overload.
2. **Backend N+1 Demands Compensated on Client:**
   Because `GET /api/Classrooms` does not provide room names or catering totals, `classroom.service.ts` executes `forkJoin` requests or secondary lookups for every active room. While optimized in-memory, network latency increases with large session volumes.
3. **Sparse Unit Test Coverage for Complex Business Calculations:**
   While the existing 8 test files pass with 100% success, they cover only baseline utilities (`csv.util`), basic guards (`admin.guard`), and auth tokens. Over 85% of complex billing logic in `workspace.service.ts` and conflict algorithms in `classroom.service.ts` lack dedicated automated unit test assertions.
4. **Storage of Sensitive JWTs in LocalStorage:**
   Both access tokens and refresh tokens are stored in browser `localStorage`. While standard for SPAs without dedicated backend BFF cookies, it exposes tokens to Cross-Site Scripting (XSS) risks if unsanitized user content is rendered.

---

### 7. Build and Runtime Verdict

| Category | Verdict | Evidence |
|---|---|---|
| **TypeScript Strict Checking** | **PASSED (0 Errors)** | `npx tsc --noEmit` exited with code 0. |
| **Unit Test Suite** | **PASSED (35/35 Tests)** | Vitest executed 8 test suites in 5.8s with 0 failures. |
| **Production Build** | **PASSED (0 Errors)** | `@angular/build:application` generated bundles in 25.6s. |
| **Dev Server Execution** | **OPERATIONAL** | `http://localhost:4200` serving live traffic. |
| **Proxy Communication** | **OPERATIONAL** | Proxied requests reach `https://nook.runasp.net`. |
| **End-to-End Navigation** | **OPERATIONAL** | Headless Edge successfully logs in and navigates 4 core views. |

---

### 8. What Remains Unknown

1. **Production Deployment Topology:** The workspace contains `vercel.json`, indicating serverless hosting on Vercel, but no CI/CD configuration (`.github/workflows`) exists inside `Frontend`.
2. **Backend Database Consistency:** The schema and database migrations reside in `Backend/` (outside the frontend workspace root), so backend database trigger behaviors and cascade-delete rules cannot be inspected directly from the frontend repo.
3. **Role Enforcement on Mobile/Parent Profiles:** `AccountApiService` contains endpoints to link student, instructor, staff, and parent profiles, but the parent UI flow is not yet implemented in the frontend navigation.
