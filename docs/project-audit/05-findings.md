# NOOK Workspace — Technical Audit & Reverse Engineering Report
## Volume 5: Findings Register & Contradictions Ledger

> **Workspace Path:** `c:\Users\fares\Documents\GitHub\Nook\Frontend`  
> **Status:** Evidence-Based Audit Findings (Distinguishing Verified Facts from Hypotheses)  

---

### 1. Prioritized Findings Register

| ID | Severity | Category | Finding | Evidence & File References | Why It Matters / Impact | Confidence | Recommended Action |
|:---:|:---:|:---:|---|---|---|:---:|---|
| **F-01** | **High** | Performance & Architecture | **Client-Side Relational Joins due to Backend Schema Gaps** | `classroom.service.ts:1-100`, `مش موجود ف ال API.md:9-48` | `GET /api/Classrooms` returns raw IDs without `roomName`, `instructorName`, `hourlyRate`, or `cateringTotal`. The frontend is forced to execute `forkJoin` and O(1) in-memory joins. Increases network payload and client memory usage with large datasets. | **Verified Fact** | Request backend team to enrich `ClassroomDto` with joined display fields as detailed in `مش موجود ف ال API.md`. |
| **F-02** | **Medium** | Maintainability | **Massive Monolithic Component & Style Files** | `show-student.component.ts` (2,805 L), `show-student.component.css` (5,030 L), `classroom-reservations.component.css` (4,145 L), `language.service.ts` (4,275 L) | Large files make code reviews difficult, increase bundle compilation times, and present high risk of regression when multiple engineers collaborate. | **Verified Fact** | Decompose monolithic components into atomic sub-components (e.g. `student-table-row`, `session-timer-badge`, `catering-drawer`). Split language dictionary by feature domain. |
| **F-03** | **Medium** | Security | **JWT Tokens Stored in Browser LocalStorage** | `auth.service.ts:23-25`, `auth.service.ts:125-137` | Storing access and refresh tokens in `localStorage` makes them accessible to JavaScript. Any potential XSS flaw could expose authentication tokens. | **Verified Fact** | Consider moving refresh token handling to backend HttpOnly SameSite cookies via a Backend-for-Frontend (BFF) proxy pattern. |
| **F-04** | **Medium** | Quality & Testing | **Sparse Unit Test Coverage for Core Business Logic** | `src/app/core/services/` vs `src/app/**/*.spec.ts` (Only 8 spec files, 1,024 lines total) | Core business math (duration-to-fee calculations in `workspace.service.ts`, overtime penalties in `classroom.service.ts`, variance reconciliation in `shift.service.ts`) has 0 unit test assertions. | **Verified Fact** | Implement automated Vitest unit tests for domain calculation engines, parameterized across normal and edge cases (boundary minutes, midnight rollovers). |
| **F-05** | **Low** | Architecture | **Absence of Standard Angular Environment Files** | `src/app/core/constants/api-endpoints.ts:16` | The project avoids `environment.ts` and hardcodes `export const API_BASE_URL = '';`. It relies solely on `proxy.conf.json` in dev and `vercel.json` in production. | **Verified Fact** | Maintain the current proxy strategy (which successfully avoids CORS), but add formal environment manifests for explicit configuration management. |
| **F-06** | **Low** | Documentation Drift | **Historical Documentation Contradicts Active Codebase** | `project_documentation.md:76` vs `API_INTEGRATION_REPORT.md:1-26` | `project_documentation.md` (Aug 2026) claims "No backend connected yet — All data is mock/in-memory with localStorage fallback". The active code is 100% connected to 143 live endpoints. | **Verified Fact** | Archive or update `project_documentation.md` with a notice pointing to the September/October Clean Architecture overhaul. |
| **F-07** | **Informational** | Feature Parity | **Unexposed Mobile & Parent Profile API Capabilities** | `account-api.service.ts:41-45`, `api-endpoints.ts:41` | `linkParent` and `profiles/parent` API endpoints exist in Layer 3 services, but there is no dedicated parent management view in the desktop dashboard UI. | **Verified Fact** | Clarify with product owner whether parent accounts are exclusively intended for a mobile app or slated for future frontend release. |

---

### 2. Mandatory Section: Contradictions and Illogical Decisions

#### Contradiction 1: Mock Documentation vs Live Production API Reality
- **What the Code Currently Does:** The active codebase communicates 100% with the live backend at `https://nook.runasp.net` across 143 endpoints. `auth.interceptor.ts` injects live JWT tokens, and `App` purges mock database keys from `localStorage` on bootstrap.
- **Why It Appears Inconsistent:** `project_documentation.md` (lines 75-76) explicitly states:  
  *“2. No backend connected yet — All data is mock/in-memory with localStorage fallback”* and *“src/testing/mocks/ with students.mock.ts, sessions.mock.ts, users.mock.ts”*.
- **The Evidence:**  
  1. `Get-ChildItem -Path src -Recurse -Filter "*mock*"` returned **0 files**. The mock folder was deleted.
  2. `API_INTEGRATION_REPORT.md` (Sept 6, 2026) documents the complete elimination of fake data.
  3. Runtime testing verified real network requests returning signed JWTs from `https://nook.runasp.net`.
- **Status:** **Confirmed Historical Documentation Drift.**
- **Possible Consequence:** An incoming engineer reading `project_documentation.md` would incorrectly assume the system is an offline prototype rather than a production-connected client.
- **Clarification Recommended:** Update repository documentation to establish the September 2026 Clean Architecture migration as the single source of truth.

---

#### Contradiction 2: Backend Classroom Creation Requires GUID for Instructor vs Cashier Quick Booking
- **What the Code Currently Does:** In `ClassroomService.createClassroomSession()` and `add-classroom.component.ts`, the UI forces selection of an existing instructor with a valid GUID to satisfy `CreateClassroomDto.instructorId: string`.
- **Why It Appears Inconsistent:** In physical coworking spaces, visiting instructors frequently book workshop rooms on short notice. Cashiers need to record an instructor name and phone number without navigating to an administrative screen to create a formal instructor account first.
- **The Evidence:** Documented in `مش موجود ف ال API.md:52-78`.
- **Status:** **Confirmed Architectural Bottleneck.**
- **Possible Consequence:** Friction during cashier peak hours; cashiers may reuse a generic "Guest Instructor" profile, skewing instructor reporting.
- **Clarification Recommended:** Coordinate with the backend team to support inline instructor creation or make `instructorId` optional in favor of `instructorName` and `instructorPhoneNumber`.

---

#### Contradiction 3: Monolithic `LanguageService` Dictionaries vs Modular Lazy Loading
- **What the Code Currently Does:** `LanguageService` (`src/app/core/services/language.service.ts`) is 4,275 lines long and contains complete English and Arabic dictionaries for every single screen, modal, error message, and table in one monolithic file.
- **Why It Appears Inconsistent:** Angular uses route-level lazy loading (`loadComponent()`) for every feature to minimize initial bundle size. However, because `LanguageService` is `providedIn: 'root'`, the entire 186 KB dictionary for all 33 routes is downloaded in the initial bundle (`chunk-LM62YZXS.js`), diminishing the benefit of lazy loading.
- **The Evidence:** `language.service.ts` size is 186.6 KB, imported directly into root providers and layouts.
- **Status:** **Confirmed Design Trade-Off.**
- **Possible Consequence:** Larger initial bundle download, slower initial load on mobile networks.
- **Clarification Recommended:** Move feature-specific translations to asynchronous JSON assets loaded on-demand via an `HttpLoader` or per-feature dictionary chunks.
