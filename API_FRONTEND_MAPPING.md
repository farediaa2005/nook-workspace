# NOOK API to Frontend Mapping (API_FRONTEND_MAPPING.md)

> Source of Truth: OpenAPI 3.0.4 (openapi.json / https://nook.runasp.net)
> Total Documented Operations: 219

| # | Frontend Page | Feature | API Endpoint | Method | Request DTO | Response DTO | Status |
|---|---|---|---|---|---|---|---|
| 1 | General / Core | NookWorkspace.API | / | **GET** | - | - | **READY** |
| 2 | src/app/features/settings/show-user | List Staff & Accounts | /api/Accounts | **GET** | - | Object | **READY** |
| 3 | src/app/features/settings/add-user | Create Account | /api/Accounts | **POST** | Object | Object | **READY** |
| 4 | src/app/features/settings/show-user | Account CRUD | /api/Accounts/{id} | **GET** | - | Object | **READY** |
| 5 | src/app/features/settings/show-user | Account CRUD | /api/Accounts/{id} | **PUT** | Object | Object | **READY** |
| 6 | src/app/features/settings/show-user | Account CRUD | /api/Accounts/{id} | **DELETE** | - | Object | **READY** |
| 7 | src/app/features/settings/profile | Get Account Profile | /api/Accounts/{id}/profile | **GET** | - | Object | **READY** |
| 8 | src/app/features/settings/show-user | Toggle User Status | /api/Accounts/{id}/toggle-active | **PUT** | - | Object | **READY** |
| 9 | src/app/features/settings/show-user | Link/Unlink Account Profile | /api/Accounts/{id}/profiles/staff | **POST** | Object | Object | **READY** |
| 10 | src/app/features/settings/show-user | Link/Unlink Account Profile | /api/Accounts/{id}/profiles/student | **POST** | Object | Object | **READY** |
| 11 | src/app/features/settings/show-user | Link/Unlink Account Profile | /api/Accounts/{id}/profiles/instructor | **POST** | Object | Object | **READY** |
| 12 | src/app/features/settings/show-user | Link/Unlink Account Profile | /api/Accounts/{id}/profiles/parent | **POST** | Object | Object | **READY** |
| 13 | src/app/features/settings/show-user | Link/Unlink Account Profile | /api/Accounts/{id}/profiles/{role} | **DELETE** | - | Object | **READY** |
| 14 | src/app/features/settings/show-user | List Unlinked Profiles | /api/Accounts/unlinked-students | **GET** | - | Object | **READY** |
| 15 | src/app/features/settings/show-user | List Unlinked Profiles | /api/Accounts/unlinked-instructors | **GET** | - | Object | **READY** |
| 16 | src/app/features/dashboard & catering/product-graph | Revenue Analytics | /api/Analysis/revenue | **GET** | - | Object | **READY** |
| 17 | src/app/features/dashboard | Occupancy & Activity Analytics | /api/Analysis/occupancy | **GET** | - | Object | **READY** |
| 18 | src/app/features/dashboard | Occupancy & Activity Analytics | /api/Analysis/top-students | **GET** | - | Object | **READY** |
| 19 | src/app/features/dashboard | Occupancy & Activity Analytics | /api/Analysis/instructor-activity | **GET** | - | Object | **READY** |
| 20 | src/app/auth/login | User Registration | /api/Auth/register | **POST** | Object | Object | **READY** |
| 21 | src/app/auth/login | User Login | /api/Auth/login | **POST** | Object | Object | **READY** |
| 22 | src/app/auth/login | Google OAuth Login | /api/Auth/google | **POST** | Object | Object | **READY** |
| 23 | App Shell / Core | Current User Info | /api/Auth/me | **GET** | - | Object | **READY** |
| 24 | src/app/auth/login | Password Recovery | /api/Auth/forgot-password | **POST** | Object | Object | **READY** |
| 25 | src/app/auth/login | Password Reset | /api/Auth/reset-password | **POST** | Object | Object | **READY** |
| 26 | src/app/features/settings/profile | Change Password | /api/Auth/change-password | **PUT** | Object | Object | **READY** |
| 27 | Core Interceptor | Token Refresh | /api/Auth/refresh-token | **POST** | Object | Object | **READY** |
| 28 | Core Auth | Token Revocation | /api/Auth/revoke-token | **POST** | string | Object | **READY** |
| 29 | src/app/features/details/show-blacklist | Blacklist Management | /api/Blacklists | **GET** | - | Object | **READY** |
| 30 | src/app/features/details/show-blacklist | Blacklist Management | /api/Blacklists | **POST** | Object | Object | **READY** |
| 31 | src/app/features/details/show-blacklist | Blacklist Management | /api/Blacklists/{id} | **GET** | - | Object | **READY** |
| 32 | src/app/features/details/show-blacklist | Blacklist Management | /api/Blacklists/{id} | **PUT** | Object | Object | **READY** |
| 33 | src/app/features/details/show-blacklist | Blacklist Management | /api/Blacklists/{id} | **DELETE** | - | Object | **READY** |
| 34 | src/app/features/classroom/classroom-reservations | Mobile Online Bookings Approval | /api/Bookings | **GET** | - | Object | **READY** |
| 35 | src/app/features/classroom/classroom-reservations | Mobile Online Bookings Approval | /api/Bookings/{id} | **GET** | - | Object | **READY** |
| 36 | src/app/features/classroom/classroom-reservations | Mobile Online Bookings Approval | /api/Bookings/{id} | **DELETE** | - | Object | **READY** |
| 37 | src/app/features/classroom/classroom-reservations | Mobile Online Bookings Approval | /api/Bookings/{id}/status | **PUT** | Object | Object | **READY** |
| 38 | src/app/features/workspace/show-student | Workspace Catering Orders | /api/workspaces/{workspaceId}/catering | **GET** | - | - | **READY** |
| 39 | src/app/features/workspace/show-student | Workspace Catering Orders | /api/workspaces/{workspaceId}/catering | **POST** | Object | - | **READY** |
| 40 | src/app/features/workspace/show-student | Workspace Catering Orders | /api/workspaces/{workspaceId}/catering/{id} | **PUT** | Object | - | **READY** |
| 41 | src/app/features/workspace/show-student | Workspace Catering Orders | /api/workspaces/{workspaceId}/catering/{id} | **DELETE** | - | - | **READY** |
| 42 | src/app/features/classroom/show-classroom | Classroom Catering Orders | /api/classrooms/{classroomId}/catering | **GET** | - | - | **READY** |
| 43 | src/app/features/classroom/show-classroom | Classroom Catering Orders | /api/classrooms/{classroomId}/catering | **POST** | Object | - | **READY** |
| 44 | src/app/features/classroom/show-classroom | Classroom Catering Orders | /api/classrooms/{classroomId}/catering/{id} | **PUT** | Object | - | **READY** |
| 45 | src/app/features/classroom/show-classroom | Classroom Catering Orders | /api/classrooms/{classroomId}/catering/{id} | **DELETE** | - | - | **READY** |
| 46 | src/app/features/package/show-instructor-package | Instructor Packages Directory | /api/ClassroomPackages | **GET** | - | Object | **PARTIAL** |
| 47 | src/app/features/package/add-instructor-package | Purchase Instructor Package | /api/ClassroomPackages | **POST** | Object | Object | **READY** |
| 48 | src/app/features/package/show-instructor-package | Instructor Packages Directory | /api/ClassroomPackages/{id} | **GET** | - | Object | **PARTIAL** |
| 49 | src/app/features/package/show-instructor-package | Instructor Packages Directory | /api/ClassroomPackages/{id} | **PUT** | Object | Object | **PARTIAL** |
| 50 | src/app/features/package/show-instructor-package | Instructor Packages Directory | /api/ClassroomPackages/{id} | **DELETE** | - | Object | **PARTIAL** |
| 51 | src/app/features/package/show-instructor-package | Instructor Packages Directory | /api/ClassroomPackages/instructor/{instructorId} | **GET** | - | Object | **PARTIAL** |
| 52 | src/app/features/classroom/show-classroom | Classroom Sessions List & Details | /api/Classrooms | **GET** | - | Object | **READY** |
| 53 | src/app/features/classroom/add-classroom | Create Classroom Session | /api/Classrooms | **POST** | Object | Object | **READY** |
| 54 | src/app/features/classroom/show-classroom | Classroom Sessions List & Details | /api/Classrooms/{id} | **GET** | - | Object | **READY** |
| 55 | src/app/features/classroom/show-classroom | Classroom Sessions List & Details | /api/Classrooms/{id} | **PUT** | Object | Object | **READY** |
| 56 | src/app/features/classroom/show-classroom | Classroom Sessions List & Details | /api/Classrooms/{id} | **DELETE** | - | Object | **READY** |
| 57 | src/app/features/classroom/checkout | Classroom Checkout | /api/Classrooms/{id}/checkout | **PUT** | Object | Object | **READY** |
| 58 | src/app/features/details/add-discount | Coupons CRUD & Redemptions | /api/Coupons | **GET** | - | Object | **READY** |
| 59 | src/app/features/details/add-discount | Coupons CRUD & Redemptions | /api/Coupons | **POST** | Object | Object | **READY** |
| 60 | src/app/features/details/add-discount | Coupons CRUD & Redemptions | /api/Coupons/{id} | **GET** | - | Object | **READY** |
| 61 | src/app/features/details/add-discount | Coupons CRUD & Redemptions | /api/Coupons/{id} | **PUT** | Object | Object | **READY** |
| 62 | src/app/features/details/add-discount | Coupons CRUD & Redemptions | /api/Coupons/{id} | **DELETE** | - | Object | **READY** |
| 63 | src/app/features/workspace/checkout | Coupon Validation & Redemption | /api/Coupons/code/{code} | **GET** | - | Object | **READY** |
| 64 | src/app/features/details/add-discount | Coupons CRUD & Redemptions | /api/Coupons/{id}/redemptions | **GET** | - | Object | **READY** |
| 65 | src/app/features/workspace/checkout | Coupon Validation & Redemption | /api/Coupons/redeem/{code} | **POST** | Object | Object | **READY** |
| 66 | Core Course API | Course Management & Attendance | /api/Courses | **GET** | - | Object | **READY** |
| 67 | Core Course API | Course Management & Attendance | /api/Courses | **POST** | Object | Object | **READY** |
| 68 | Core Course API | Course Management & Attendance | /api/Courses/{id} | **GET** | - | Object | **READY** |
| 69 | Core Course API | Course Management & Attendance | /api/Courses/{id} | **PUT** | Object | Object | **READY** |
| 70 | Core Course API | Course Management & Attendance | /api/Courses/{id} | **DELETE** | - | Object | **READY** |
| 71 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/enroll | **POST** | Object | Object | **READY** |
| 72 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/enroll/{studentId} | **DELETE** | - | Object | **READY** |
| 73 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/students | **GET** | - | Object | **READY** |
| 74 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/sessions | **POST** | Object | Object | **READY** |
| 75 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/sessions | **GET** | - | Object | **READY** |
| 76 | Core Course API | Course Management & Attendance | /api/Courses/sessions/{sessionId}/attendance | **POST** | Object | Object | **READY** |
| 77 | Core Course API | Course Management & Attendance | /api/Courses/sessions/{sessionId}/attendance | **GET** | - | Object | **READY** |
| 78 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/students/{studentId}/attendance | **GET** | - | Object | **READY** |
| 79 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/files | **POST** | object | Object | **READY** |
| 80 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/files | **GET** | - | Object | **READY** |
| 81 | Core Course API | Course Management & Attendance | /api/Courses/files/{fileId} | **DELETE** | - | Object | **READY** |
| 82 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/materials-summary | **GET** | - | Object | **READY** |
| 83 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/announcements | **POST** | Object | Object | **READY** |
| 84 | Core Course API | Course Management & Attendance | /api/Courses/{courseId}/announcements | **GET** | - | Object | **READY** |
| 85 | src/app/features/dashboard | Live Summary KPIs | /api/Dashboard/summary | **GET** | - | Object | **READY** |
| 86 | src/app/features/details/add-discount | Discount Rules CRUD | /api/Discounts | **GET** | - | Object | **READY** |
| 87 | src/app/features/details/add-discount | Discount Rules CRUD | /api/Discounts | **POST** | Object | Object | **READY** |
| 88 | src/app/features/details/add-discount | Discount Rules CRUD | /api/Discounts/{id} | **GET** | - | Object | **READY** |
| 89 | src/app/features/details/add-discount | Discount Rules CRUD | /api/Discounts/{id} | **PUT** | Object | Object | **READY** |
| 90 | src/app/features/details/add-discount | Discount Rules CRUD | /api/Discounts/{id} | **DELETE** | - | Object | **READY** |
| 91 | src/app/features/workspace/checkout | Automatic Discounts Calculation | /api/Discounts/active | **GET** | - | Object | **READY** |
| 92 | src/app/features/workspace/checkout | Automatic Discounts Calculation | /api/Discounts/faculty/{facultyId} | **GET** | - | Object | **READY** |
| 93 | src/app/features/details/show-colleges | Faculties Directory & CRUD | /api/Faculties | **GET** | - | Object | **READY** |
| 94 | src/app/features/details/show-colleges | Faculties Directory & CRUD | /api/Faculties | **POST** | Object | Object | **READY** |
| 95 | src/app/features/details/show-colleges | Faculties Directory & CRUD | /api/Faculties/{id} | **GET** | - | Object | **READY** |
| 96 | src/app/features/details/show-colleges | Faculties Directory & CRUD | /api/Faculties/{id} | **PUT** | Object | Object | **READY** |
| 97 | src/app/features/details/show-colleges | Faculties Directory & CRUD | /api/Faculties/{id} | **DELETE** | - | Object | **READY** |
| 98 | Core Layout API | Interactive Floor Plan & Desks | /api/FloorPlans | **GET** | - | Object | **READY** |
| 99 | Core Layout API | Interactive Floor Plan & Desks | /api/FloorPlans | **POST** | Object | Object | **READY** |
| 100 | Core Layout API | Interactive Floor Plan & Desks | /api/FloorPlans/{id} | **GET** | - | Object | **READY** |
| 101 | Core Layout API | Interactive Floor Plan & Desks | /api/FloorPlans/{id} | **PUT** | Object | Object | **READY** |
| 102 | Core Layout API | Interactive Floor Plan & Desks | /api/FloorPlans/{id} | **DELETE** | - | Object | **READY** |
| 103 | src/app/features/details/show-instructors | Instructors Directory & CRUD | /api/Instructors | **GET** | - | Object | **READY** |
| 104 | src/app/features/details/show-instructors | Instructors Directory & CRUD | /api/Instructors | **POST** | Object | Object | **READY** |
| 105 | src/app/features/details/show-instructors | Instructors Directory & CRUD | /api/Instructors/{id} | **GET** | - | Object | **READY** |
| 106 | src/app/features/details/show-instructors | Instructors Directory & CRUD | /api/Instructors/{id} | **PUT** | Object | Object | **READY** |
| 107 | src/app/features/details/show-instructors | Instructors Directory & CRUD | /api/Instructors/{id} | **DELETE** | - | Object | **READY** |
| 108 | src/app/features/settings/general | Package Pricing Templates | /api/PackagePricingPlans | **GET** | - | Object | **READY** |
| 109 | src/app/features/settings/general | Package Pricing Templates | /api/PackagePricingPlans | **POST** | Object | Object | **READY** |
| 110 | src/app/features/settings/general | Package Pricing Templates | /api/PackagePricingPlans/{id} | **GET** | - | Object | **READY** |
| 111 | src/app/features/settings/general | Package Pricing Templates | /api/PackagePricingPlans/{id} | **PUT** | Object | Object | **READY** |
| 112 | src/app/features/settings/general | Package Pricing Templates | /api/PackagePricingPlans/{id} | **DELETE** | - | Object | **READY** |
| 113 | General / Core | Packages | /api/Packages | **GET** | - | Object | **READY** |
| 114 | General / Core | Packages | /api/Packages | **POST** | Object | Object | **READY** |
| 115 | General / Core | Packages | /api/Packages/{id} | **GET** | - | Object | **READY** |
| 116 | General / Core | Packages | /api/Packages/{id} | **PUT** | Object | Object | **READY** |
| 117 | General / Core | Packages | /api/Packages/{id} | **DELETE** | - | Object | **READY** |
| 118 | General / Core | Packages | /api/Packages/student/{studentId} | **GET** | - | Object | **READY** |
| 119 | src/app/features/settings/general | Hourly Pricing Plans | /api/PricingPlans | **GET** | - | Object | **READY** |
| 120 | src/app/features/settings/general | Hourly Pricing Plans | /api/PricingPlans | **POST** | Object | Object | **READY** |
| 121 | src/app/features/settings/general | Hourly Pricing Plans | /api/PricingPlans/{id} | **GET** | - | Object | **READY** |
| 122 | src/app/features/settings/general | Hourly Pricing Plans | /api/PricingPlans/{id} | **PUT** | Object | Object | **READY** |
| 123 | src/app/features/settings/general | Hourly Pricing Plans | /api/PricingPlans/{id} | **DELETE** | - | Object | **READY** |
| 124 | src/app/features/workspace/checkout | Pricing Suggestion Calculator | /api/PricingPlans/suggestion | **GET** | - | Object | **READY** |
| 125 | src/app/features/catering/show-products | Catering Inventory & Stock | /api/Products | **GET** | - | Object | **READY** |
| 126 | src/app/features/catering/add-products | Add Inventory Product | /api/Products | **POST** | object | Object | **READY** |
| 127 | src/app/features/catering/show-products | Catering Inventory & Stock | /api/Products/{id} | **GET** | - | Object | **READY** |
| 128 | src/app/features/catering/show-products | Catering Inventory & Stock | /api/Products/{id} | **PUT** | object | Object | **READY** |
| 129 | src/app/features/catering/show-products | Catering Inventory & Stock | /api/Products/{id} | **DELETE** | - | Object | **READY** |
| 130 | src/app/features/catering/show-products | Catering Inventory & Stock | /api/Products/{id}/image | **POST** | object | Object | **READY** |
| 131 | src/app/features/classroom/classroom-reservations | Reservations List & Cancel | /api/Reservations | **GET** | - | Object | **READY** |
| 132 | src/app/features/classroom/add-reservation | Create Reservation | /api/Reservations | **POST** | Object | Object | **READY** |
| 133 | src/app/features/classroom/show-reservation | Reservation Details & Edit | /api/Reservations/{id} | **GET** | - | Object | **READY** |
| 134 | src/app/features/classroom/show-reservation | Reservation Details & Edit | /api/Reservations/{id} | **PUT** | Object | Object | **READY** |
| 135 | src/app/features/classroom/show-reservation | Reservation Details & Edit | /api/Reservations/{id} | **DELETE** | - | Object | **READY** |
| 136 | src/app/features/classroom/classroom-reservations | Reservations List & Cancel | /api/Reservations/instructor/{instructorId} | **GET** | - | Object | **READY** |
| 137 | src/app/features/settings/general | Rooms Management & Image Upload | /api/Rooms | **GET** | - | Object | **READY** |
| 138 | src/app/features/settings/general | Rooms Management & Image Upload | /api/Rooms | **POST** | object | Object | **READY** |
| 139 | src/app/features/settings/general | Rooms Management & Image Upload | /api/Rooms/{id} | **GET** | - | Object | **READY** |
| 140 | src/app/features/settings/general | Rooms Management & Image Upload | /api/Rooms/{id} | **PUT** | object | Object | **READY** |
| 141 | src/app/features/settings/general | Rooms Management & Image Upload | /api/Rooms/{id} | **DELETE** | - | Object | **READY** |
| 142 | src/app/features/settings/general | Rooms Management & Image Upload | /api/Rooms/{id}/image | **POST** | object | Object | **READY** |
| 143 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElements/floor-plan/{floorPlanId} | **GET** | - | Object | **READY** |
| 144 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElements/{id} | **GET** | - | Object | **READY** |
| 145 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElements/{id} | **PUT** | Object | Object | **READY** |
| 146 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElements/{id} | **DELETE** | - | Object | **READY** |
| 147 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElements | **POST** | Object | Object | **READY** |
| 148 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElements/sync/{floorPlanId} | **POST** | Object | Object | **READY** |
| 149 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElementTypes | **GET** | - | Object | **READY** |
| 150 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElementTypes | **POST** | object | Object | **READY** |
| 151 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElementTypes/{id} | **GET** | - | Object | **READY** |
| 152 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElementTypes/{id} | **PUT** | object | Object | **READY** |
| 153 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElementTypes/{id} | **DELETE** | - | Object | **READY** |
| 154 | Core Layout API | Interactive Floor Plan & Desks | /api/SeatElementTypes/{id}/image | **POST** | object | Object | **READY** |
| 155 | src/app/features/shift/shift-history | Shifts Audit History | /api/Shifts | **GET** | - | Object | **READY** |
| 156 | src/app/features/shift/add-shift | Start Shift | /api/Shifts | **POST** | Object | Object | **READY** |
| 157 | src/app/features/shift/shift-history | Shifts Audit History | /api/Shifts/{id} | **GET** | - | Object | **READY** |
| 158 | src/app/features/shift/active-shift | Get Active Shift | /api/Shifts/open/{userId} | **GET** | - | Object | **READY** |
| 159 | src/app/features/shift/end-of-shift-balance | Close & Reconcile Shift | /api/Shifts/{id}/close | **PUT** | Object | Object | **READY** |
| 160 | src/app/features/shift/active-shift | Shift Transactions & Expenses | /api/Shifts/{id}/items | **POST** | Object | Object | **READY** |
| 161 | src/app/features/shift/active-shift | Shift Transactions & Expenses | /api/Shifts/{id}/items/{itemId} | **DELETE** | - | Object | **READY** |
| 162 | src/app/features/details/show-students | Student Directory | /api/Students | **GET** | - | Object | **READY** |
| 163 | src/app/features/workspace/add-student | Create Student | /api/Students | **POST** | Object | Object | **READY** |
| 164 | src/app/features/workspace/show-student | Student Details & Update | /api/Students/{id} | **GET** | - | Object | **READY** |
| 165 | src/app/features/workspace/show-student | Student Details & Update | /api/Students/{id} | **PUT** | Object | Object | **READY** |
| 166 | src/app/features/workspace/show-student | Student Details & Update | /api/Students/{id} | **DELETE** | - | Object | **READY** |
| 167 | src/app/features/workspace/show-student | Student Wallet Management | /api/Wallet/student/{studentId}/balance | **GET** | - | Object | **READY** |
| 168 | src/app/features/workspace/show-student | Student Wallet Management | /api/Wallet/student/{studentId}/transactions | **GET** | - | Object | **READY** |
| 169 | src/app/features/workspace/show-student | Student Wallet Management | /api/Wallet/topup/direct | **POST** | Object | Object | **READY** |
| 170 | src/app/features/workspace/checkout | Checkout Wallet Payment | /api/Wallet/deduct | **POST** | Object | Object | **READY** |
| 171 | src/app/features/settings/general | Wallet Topup Requests | /api/Wallet/topup/request | **POST** | Object | Object | **READY** |
| 172 | src/app/features/settings/general | Wallet Topup Requests | /api/Wallet/topup/requests | **GET** | - | Object | **READY** |
| 173 | src/app/features/settings/general | Wallet Topup Requests | /api/Wallet/topup/requests/{id} | **GET** | - | Object | **READY** |
| 174 | src/app/features/settings/general | Wallet Topup Requests | /api/Wallet/topup/requests/{id}/review | **PUT** | Object | Object | **READY** |
| 175 | src/app/features/package/show-student-package | Student Packages Directory | /api/WorkspacePackages | **GET** | - | Object | **PARTIAL** |
| 176 | src/app/features/package/add-student-package | Purchase Student Package | /api/WorkspacePackages | **POST** | Object | Object | **READY** |
| 177 | src/app/features/package/show-student-package | Student Packages Directory | /api/WorkspacePackages/{id} | **GET** | - | Object | **PARTIAL** |
| 178 | src/app/features/package/show-student-package | Student Packages Directory | /api/WorkspacePackages/{id} | **PUT** | Object | Object | **PARTIAL** |
| 179 | src/app/features/package/show-student-package | Student Packages Directory | /api/WorkspacePackages/{id} | **DELETE** | - | Object | **PARTIAL** |
| 180 | src/app/features/package/show-student-package | Student Packages Directory | /api/WorkspacePackages/student/{studentId} | **GET** | - | Object | **PARTIAL** |
| 181 | src/app/features/workspace/show-student | Active Sessions List | /api/Workspaces | **GET** | - | Object | **PARTIAL** |
| 182 | src/app/features/workspace/add-student | Start Student Session | /api/Workspaces | **POST** | Object | Object | **READY** |
| 183 | src/app/features/workspace/show-student | Active Sessions List | /api/Workspaces/{id} | **GET** | - | Object | **PARTIAL** |
| 184 | src/app/features/workspace/show-student | Active Sessions List | /api/Workspaces/{id} | **PUT** | Object | Object | **PARTIAL** |
| 185 | src/app/features/workspace/show-student | Active Sessions List | /api/Workspaces/{id} | **DELETE** | - | Object | **PARTIAL** |
| 186 | src/app/features/workspace/checkout | Workspace Checkout | /api/Workspaces/{id}/checkout | **PUT** | Object | Object | **READY** |
| 187 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/profile | **GET** | - | Object | **READY** |
| 188 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/profile | **PUT** | Object | Object | **READY** |
| 189 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/rooms | **GET** | - | Object | **READY** |
| 190 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/rooms/{roomId}/availability | **GET** | - | Object | **READY** |
| 191 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/classrooms | **GET** | - | Object | **READY** |
| 192 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/classrooms | **POST** | Object | Object | **READY** |
| 193 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/classrooms/{id} | **GET** | - | Object | **READY** |
| 194 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/reservations | **GET** | - | Object | **READY** |
| 195 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/reservations/{id} | **GET** | - | Object | **READY** |
| 196 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/packages | **GET** | - | Object | **READY** |
| 197 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/pricing-plans | **GET** | - | Object | **READY** |
| 198 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/package-pricing-plans | **GET** | - | Object | **READY** |
| 199 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/notifications | **GET** | - | Object | **READY** |
| 200 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/notifications/{id}/read | **PUT** | - | Object | **READY** |
| 201 | Mobile Instructor Client | Mobile Instructor Services | /api/mobile/instructor/notifications/read-all | **PUT** | - | Object | **READY** |
| 202 | Mobile Student Client | Mobile Student Services | /api/mobile/student/profile | **GET** | - | Object | **READY** |
| 203 | Mobile Student Client | Mobile Student Services | /api/mobile/student/profile | **PUT** | Object | Object | **READY** |
| 204 | Mobile Student Client | Mobile Student Services | /api/mobile/student/rooms | **GET** | - | Object | **READY** |
| 205 | Mobile Student Client | Mobile Student Services | /api/mobile/student/rooms/{roomId}/floor-plan | **GET** | - | Object | **READY** |
| 206 | Mobile Student Client | Mobile Student Services | /api/mobile/student/bookings | **POST** | Object | Object | **READY** |
| 207 | Mobile Student Client | Mobile Student Services | /api/mobile/student/bookings | **GET** | - | Object | **READY** |
| 208 | Mobile Student Client | Mobile Student Services | /api/mobile/student/bookings/{id} | **GET** | - | Object | **READY** |
| 209 | Mobile Student Client | Mobile Student Services | /api/mobile/student/bookings/{id}/cancel | **DELETE** | - | Object | **READY** |
| 210 | Mobile Student Client | Mobile Student Services | /api/mobile/student/wallet/balance | **GET** | - | Object | **READY** |
| 211 | Mobile Student Client | Mobile Student Services | /api/mobile/student/wallet/transactions | **GET** | - | Object | **READY** |
| 212 | Mobile Student Client | Mobile Student Services | /api/mobile/student/wallet/topup | **POST** | object | Object | **READY** |
| 213 | Mobile Student Client | Mobile Student Services | /api/mobile/student/wallet/topup-requests | **GET** | - | Object | **READY** |
| 214 | Mobile Student Client | Mobile Student Services | /api/mobile/student/packages | **GET** | - | Object | **READY** |
| 215 | Mobile Student Client | Mobile Student Services | /api/mobile/student/pricing-plans | **GET** | - | Object | **READY** |
| 216 | Mobile Student Client | Mobile Student Services | /api/mobile/student/package-pricing-plans | **GET** | - | Object | **READY** |
| 217 | Mobile Student Client | Mobile Student Services | /api/mobile/student/notifications | **GET** | - | Object | **READY** |
| 218 | Mobile Student Client | Mobile Student Services | /api/mobile/student/notifications/{id}/read | **PUT** | - | Object | **READY** |
| 219 | Mobile Student Client | Mobile Student Services | /api/mobile/student/notifications/read-all | **PUT** | - | Object | **READY** |
