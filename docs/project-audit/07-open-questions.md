# NOOK Workspace — Technical Audit & Reverse Engineering Report
## Volume 7: Knowledge Gaps & Unresolved Questions

> **Workspace Path:** `c:\Users\fares\Documents\GitHub\Nook\Frontend`  
> **Status:** Open Architectural & Product Inquiries for Stakeholders  

---

### 1. Backend Integration & API Roadmap Questions

#### Q1: Enrichment of `GET /api/Classrooms` Response Payload
- **Context:** Currently, `GET /api/Classrooms` returns only raw GUID identifiers (`roomId`, `instructorId`). The frontend must perform multiple secondary lookups and in-memory joins to display the room name, instructor name, instructor phone number, and catering total on the live board.
- **Question for Backend Team:** Is there an upcoming backend release planned to enrich `ClassroomDto` with joined display fields (`roomName`, `instructorName`, `instructorPhone`, `cateringTotal`, `hourlyRate`), or should the frontend formalize a composite GraphQL / BFF query?

#### Q2: Inline Instructor Creation in `POST /api/Classrooms`
- **Context:** Cashiers creating quick walk-in room bookings often need to record a guest or visiting instructor who does not yet have an account in the system. The current API requires a valid existing GUID `instructorId`.
- **Question for Product Owner & Backend:** Can `POST /api/Classrooms` be updated to accept either `instructorId: GUID` OR `{ instructorName: string, instructorPhone: string }`, allowing inline instructor creation during room booking?

#### Q3: Real-Time WebSockets / SignalR vs Client Polling
- **Context:** The frontend currently simulates live status using a 25-second interval loop in `ApiHealthService` and `NotificationService`. For a busy coworking center with multiple reception desks, simultaneous updates to desk occupancy or room status can lead to race conditions.
- **Question for Backend Architect:** Does the ASP.NET Core backend support SignalR hubs (e.g. `/hubs/workspace` or `/hubs/classroom`) for push notifications, or is polling intended to remain the operational standard?

---

### 2. Product Scope & Functional Parity Questions

#### Q4: Status of Mobile & Parent Profile Features
- **Context:** `AccountApiService` contains endpoints to link student, instructor, staff, and parent profiles (`/api/Accounts/{id}/profiles/parent`), and outer git repository shows a sibling `Mobile/` directory.
- **Question for Product Owner:** Are parent profiles intended strictly for a mobile client (e.g. Flutter / React Native), or is there an upcoming desktop web portal required for parents to monitor student study hours and invoices?

#### Q5: Single Active Package Constraint Enforcement
- **Context:** The frontend validates that a student can only hold **one active package at a time** (displaying a warning banner in Arabic). In end-to-end tests (`e2e_results.json`), the backend rejected a 2nd package with a validation error.
- **Question for Business Operations:** If a student exhausts their hours before the expiration date, what is the exact business rule for renewing or upgrading a package? Can an existing package be explicitly closed early, or must it expire?

#### Q6: Status of Root Arabic Working Documents
- **Context:** The repository root contains four detailed Arabic markdown files:
  1. `صلح اللي ناصق يا عبدلله.md` (Fix what is missing, Abdullah)
  2. `طلبات جديدة من الباك.md` (New requests from the backend)
  3. `مش موجود ف ال API.md` (What is missing in the API)
  4. `مشاكل التيستنج.md` (Testing issues)
- **Question for Lead Developer:** Have all items in `طلبات جديدة من الباك.md` and `صلح اللي ناصق يا عبدلله.md` been completed and merged, or do specific outstanding feature requests remain active?

---

### 3. DevOps, Infrastructure & Deployment Questions

#### Q7: Production Hosting & CI/CD Pipeline
- **Context:** The repository includes `vercel.json` with serverless rewrites, but lacks `.github/workflows` or automated deployment scripts inside `Frontend`.
- **Question for DevOps Engineer:** What is the authoritative production URL and deployment pipeline for the frontend? Is deployment triggered via Vercel GitHub integration directly on branch `main`?

#### Q8: Environment Manifests & Multi-Tenant Staging
- **Context:** `API_BASE_URL` is hardcoded as an empty string `''` in `src/app/core/constants/api-endpoints.ts`, and `proxy.conf.json` hardcodes `https://nook.runasp.net`.
- **Question for DevOps / Backend:** How are staging, QA, and production backend environments differentiated? Is `https://nook.runasp.net` the staging or production server?
