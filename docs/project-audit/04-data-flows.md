# NOOK Workspace — Technical Audit & Reverse Engineering Report
## Volume 4: Critical End-to-End Data Flows & Tracing

> **Workspace Path:** `c:\Users\fares\Documents\GitHub\Nook\Frontend`  
> **Target API Host:** `https://nook.runasp.net`  
> **Status:** Traced & Verified  

---

### Workflow 1: Authentication, Token Refresh & Role RBAC

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Receptionist / Cashier
    participant LoginUI as LoginComponent (/auth/login)
    participant AuthSvc as AuthService
    participant Http as HttpClient / authInterceptor
    participant Proxy as Dev Proxy / Vercel Rewrite
    participant Backend as ASP.NET Core (/api/Auth)
    participant LocalStorage as Browser LocalStorage
    participant Router as Angular Router

    Staff->>LoginUI: Enter username/email & password, Click Submit
    LoginUI->>LoginUI: Validate non-empty fields
    LoginUI->>AuthSvc: login({ identifier, password })
    AuthSvc->>Http: POST /api/Auth/login
    Http->>Proxy: Forward request
    Proxy->>Backend: Forward request over HTTPS
    Backend-->>Proxy: 200 OK + { accessToken, refreshToken, account }
    Proxy-->>Http: 200 OK Payload
    Http-->>AuthSvc: Emit AuthResponseDto
    AuthSvc->>LocalStorage: Save nook_access_token & nook_refresh_token
    AuthSvc->>AuthSvc: Decode JWT claims & parse Role (Admin vs User)
    AuthSvc->>LocalStorage: Save nook_user_data
    AuthSvc->>AuthSvc: currentUser.set(userProfile)
    AuthSvc-->>LoginUI: Observable completes
    LoginUI->>LoginUI: Hydrate services (Shift, Classroom, Workspace, Catering)
    LoginUI->>Router: navigate(['/dashboard'])
    Router->>Router: authGuard activates, checks isAuthenticated() -> TRUE
    Router-->>Staff: Render Dashboard with authorized Sidebar items
```

#### Detailed Flow Trace
1. **Trigger:** User submits the credentials form on `/auth/login`.
2. **Component Execution (`login.component.ts:182-224`):** Clears previous error messages, checks input presence, and calls `authService.login()`.
3. **HTTP Transport:** `POST /api/Auth/login` is recognized as a public endpoint by `auth.interceptor.ts:10-17`, so no `Authorization` header is attached.
4. **Proxy & Backend:** Vite proxy forwards the request to `https://nook.runasp.net/api/Auth/login`. Backend authenticates against ASP.NET Identity and returns signed JWT tokens.
5. **State & Storage Updates (`auth.service.ts:156-178`):**
   - Access token stored in memory and `localStorage['nook_access_token']`.
   - Refresh token stored in `localStorage['nook_refresh_token']`.
   - User profile signal `currentUser` updated.
6. **Hydration Pipeline (`login.component.ts:198-207`):** Once login resolves, the component asynchronously dispatches hydration calls to:
   - `shiftService.fetchCurrentShiftFromApi()`
   - `classroomService.syncWithBackend()`
   - `workspaceService.loadFromBackend()`
   - `cateringService.syncWithBackend()`
   - `packageService.syncPackagesFromBackend()`
7. **Route Transition:** Navigates to `/dashboard`. `authGuard` verifies `isAuthenticated()` is true and permits activation.

---

### Workflow 2: Student Check-In to Checkout & Invoicing

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Receptionist
    participant AddUI as AddStudentComponent (/workspace/add-student)
    participant ShowUI as ShowStudentComponent (/workspace/show-student)
    participant WorkSvc as WorkspaceService
    participant WorkApi as WorkspaceApiService
    participant Backend as ASP.NET API (/api/Workspaces)
    participant CheckoutUI as WorkspaceCheckoutComponent

    Staff->>AddUI: Search student by phone/name, select seat, click Check-In
    AddUI->>WorkSvc: checkInStudent({ studentId, seatNumber, ... })
    WorkSvc->>WorkApi: walkIn(dto)
    WorkApi->>Backend: POST /api/Workspaces/walk-in
    Backend-->>WorkApi: 201 Created + WorkspaceSessionDto
    WorkApi-->>WorkSvc: Emit Session Data
    WorkSvc->>WorkSvc: Append to activeStudentsState signal
    WorkSvc-->>AddUI: Success toast
    AddUI->>ShowUI: Navigate to Live Students Table

    Note over ShowUI,WorkSvc: Timer interval recalculates elapsed duration every 60s
    Staff->>ShowUI: Order Catering Drink (Catering POS Modal)
    ShowUI->>WorkSvc: addCateringOrder(sessionId, orderDto)
    WorkSvc->>Backend: POST /api/workspaces/{id}/catering
    Backend-->>WorkSvc: 200 OK, updates session catering total

    Staff->>ShowUI: Click "Checkout" for Student
    ShowUI->>CheckoutUI: Open Checkout modal with session details
    CheckoutUI->>CheckoutUI: Compute (Stayed Hours × Hourly Rate) + Catering - Discounts
    Staff->>CheckoutUI: Select Payment (Cash / Visa / Vodafone) & Confirm
    CheckoutUI->>WorkSvc: checkout(sessionId, payload)
    WorkSvc->>WorkApi: checkout(sessionId, payload)
    WorkApi->>Backend: POST /api/Workspaces/{id}/checkout
    Backend-->>WorkApi: 200 OK + Invoice Summary
    WorkSvc->>WorkSvc: Remove from activeStudentsState, append to history
    WorkSvc->>WorkSvc: shiftService.recordTransaction(...)
    CheckoutUI-->>Staff: Display Checkout Success Modal with print receipt
```

#### Key Logic & Business Rules
- **Duration Calculation (`workspace.service.ts:176-195`):** Calculates exact time spent from check-in ISO time to current time or checkout time, formatted into standard format (`Xh Ym`).
- **Billing Rate Matrix:** If a student has an active package, the billable study hours are decremented from the package balance. If no active package exists, the student is billed at the hourly rate (defaulting to the faculty/workspace pricing tier).
- **Catering Integration:** Catering items added during the stay are attached directly to the session ID and rolled into the final checkout invoice.

---

### Workflow 3: Classroom Booking, Overtime Tracking & Instructor Settlement

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Receptionist
    participant LiveBoard as ShowClassroomComponent (/classroom/show-classroom)
    participant AddModal as AddClassroomComponent
    participant ClassSvc as ClassroomService
    participant ResApi as ReservationApiService
    participant ClassApi as ClassroomApiService
    participant Backend as ASP.NET API

    Staff->>LiveBoard: Click "Book Room"
    LiveBoard->>AddModal: Open Booking Wizard
    Staff->>AddModal: Select Room, Date, Time (From - To), Instructor, Activity
    AddModal->>ResApi: checkConflict({ roomId, date, timeFrom, timeTo })
    ResApi->>Backend: POST /api/Reservations/check-conflict
    Backend-->>ResApi: ConflictCheckResult { hasConflict: false }
    ResApi-->>AddModal: Show green "Available" indicator
    Staff->>AddModal: Click "Confirm Booking"
    AddModal->>ClassSvc: createClassroomSession(payload)
    ClassSvc->>ClassApi: createClassroom(dto)
    ClassApi->>Backend: POST /api/Classrooms
    Backend-->>ClassApi: 201 Created + ClassroomDto
    ClassSvc->>ClassSvc: Perform in-memory join with Room & Instructor profiles
    ClassSvc->>ClassSvc: Append to cardsState signal
    ClassSvc-->>LiveBoard: Live Board renders active Room Card with timer

    Note over LiveBoard,ClassSvc: Background loop checks current time vs scheduled timeTo
    alt Current Time > Scheduled timeTo
        ClassSvc->>LiveBoard: Mark Card as "Overtime" (Red Banner)
        ClassSvc->>ClassSvc: Compute overtime penalty minutes
    end

    Staff->>LiveBoard: Click "End Session & Checkout"
    LiveBoard->>ClassSvc: checkoutClassroom(classroomId, checkoutDto)
    ClassSvc->>ClassApi: checkout(classroomId, checkoutDto)
    ClassApi->>Backend: POST /api/Classrooms/{id}/checkout
    Backend-->>ClassApi: 200 OK + Settlement Invoice
    ClassSvc->>ClassSvc: Set card status to Available, trigger Shift update
```

#### Key Logic & Business Rules
- **Conflict Prevention:** Conflict checking calls `POST /api/Reservations/check-conflict` before allowing session creation.
- **Relational Joins on Client:** `ClassroomService` merges the raw `ClassroomDto` with local cached arrays of `RoomDto` and `InstructorDto` to supply `roomName`, `hourlyRate`, and `instructorPhoneNumber` in the UI.
- **Overtime Calculation (`classroom.service.ts:9-11`):** Overtime minutes are computed automatically once current clock time passes the reservation's end time.

---

### Workflow 4: Shift Lifecycle & Cash Drawer Float Reconciliation

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cashier Staff
    participant OpenUI as AddShiftComponent (/shift/add-shift)
    participant ActiveUI as ActiveShiftComponent (/shift/active)
    participant BalanceUI as EndOfShiftBalanceComponent (/shift/end-of-shift-balance)
    participant ShiftSvc as ShiftService
    participant ShiftApi as ShiftApiService
    participant Backend as ASP.NET API (/api/Shifts)

    Cashier->>OpenUI: Enter Starting Float (e.g. 1,000 EGP) & Click Start Shift
    OpenUI->>ShiftSvc: openShift({ openingBalance: 1000 })
    ShiftSvc->>ShiftApi: openShift(dto)
    ShiftApi->>Backend: POST /api/Shifts/open
    Backend-->>ShiftApi: 200 OK + ShiftRecord
    ShiftSvc->>ShiftSvc: Initialize activeShift signal & ledger
    ShiftSvc-->>OpenUI: Navigate to /shift/active

    Note over ActiveUI,ShiftSvc: During shift, operations emit financial transactions
    rect rgb(240, 248, 255)
        Note over ShiftSvc: Incoming Payments:<br/>+ Workspace Cash<br/>+ Classroom Cash<br/>+ Package Sales<br/>+ Catering POS<br/>+ Vodafone Cash Inside<br/>- Vodafone Cash Outside<br/>- Administrative Expenses
    end

    Cashier->>ActiveUI: Click "Close Shift"
    ActiveUI->>BalanceUI: Navigate to End of Shift Balance
    BalanceUI->>ShiftSvc: expectedCash() computed signal: Starting Float + Cash In - Cash Out
    BalanceUI-->>Cashier: Display Expected Cash (e.g. 2,855.00 EGP)
    Cashier->>BalanceUI: Count physical register cash & input Actual Cash Counted
    BalanceUI->>ShiftSvc: Calculate variance: actualCash - expectedCash
    alt Variance == 0
        BalanceUI-->>Cashier: Display Green "Balanced" Badge
    else Variance != 0
        BalanceUI-->>Cashier: Display Warning "Disputed / Discrepancy" Badge
    end
    Cashier->>BalanceUI: Click "Confirm & Close Shift"
    BalanceUI->>ShiftSvc: closeShift({ actualClosingBalance, notes })
    ShiftSvc->>ShiftApi: closeShift(shiftId, dto)
    ShiftApi->>Backend: POST /api/Shifts/{id}/close
    Backend-->>ShiftApi: 200 OK
    ShiftSvc->>ShiftSvc: Clear activeShift signal, archive to shift history
    BalanceUI-->>Cashier: Shift completed successfully
```

---

### Workflow 5: Real-Time Operational Live Alerts Engine

```mermaid
sequenceDiagram
    autonumber
    participant Engine as NotificationService Heartbeat Loop
    participant WorkSvc as WorkspaceService
    participant ClassSvc as ClassroomService
    participant CatSvc as CateringService
    participant NavUI as NavbarComponent / NotificationCenter
    actor User as Staff Member

    loop Every 25 Seconds
        Engine->>WorkSvc: activeStudents() signal
        WorkSvc-->>Engine: List of Active Students
        Engine->>Engine: Check for sessions > 4h (Long Stay Alert)

        Engine->>ClassSvc: cards() signal
        ClassSvc-->>Engine: List of Classroom Cards
        Engine->>Engine: Check for current time > timeTo (Classroom Overtime Alert)

        Engine->>CatSvc: products() signal
        CatSvc-->>Engine: Inventory Items
        Engine->>Engine: Check products where stockQuantity <= 5 (Low Stock Alert)

        Engine->>Engine: Compile unread StaffNotification[] array
        Engine->>NavUI: unreadCount() signal updates
        NavUI-->>User: Pulsing badge counter updates in top navigation
    end

    User->>NavUI: Click Notification Bell
    NavUI-->>User: Open slide-out drawer with categorized alerts
    User->>NavUI: Click "Dismiss" on an alert
    NavUI->>Engine: dismissNotification(alertId)
    Engine->>Engine: Remove from active unread list
```
