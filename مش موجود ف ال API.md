# النواقص والمقترحات المطلوبة في الـ Backend API الخاصة بقسم القاعات (Classroom & Reservations)

> **موجه إلى:** فريق تطوير الـ Backend (Backend API Team)  
> **الموضوع:** الحقول والـ Endpoints الإضافية المطلوبة لتشغيل صفحات القاعات وحجوزاتها بالكامل دون أي عمليات N+1 وبأعلى كفاءة.  
> **تاريخ التحديث:** سبتمبر 2026

---

## 1. قائمة جلسات القاعات الحالية النشطة (`GET /api/Classrooms`)

### الوضع الحالي في الـ OpenAPI:
الـ Endpoint يرجع كائنات من نوع `ClassroomDto` بالحقول التالية فقط:
```json
{
  "id": "uuid",
  "date": "2026-09-06T00:00:00Z",
  "timeFrom": "2026-09-06T10:00:00Z",
  "timeTo": "2026-09-06T12:00:00Z",
  "roomId": "uuid",
  "printing": 0,
  "discount": 0,
  "reservationCost": 100,
  "payWay": 1,
  "status": 1,
  "discountType": null,
  "type": 1,
  "activity": "ورشة عمل برمجة",
  "note": null,
  "instructorId": "uuid"
}
```

### المشكلة:
1. لا يتم إرجاع **اسم القاعة (`roomName`)**، مما يضطر الفرونت لعمل مطابقة يدوية مع جدول الغرف.
2. لا يتم إرجاع **اسم المحاضر (`instructorName`)** ولا **رقم الهاتف (`instructorPhoneNumber`)** في القائمة، على الرغم من وجودهما في endpoint التفاصيل الفردي `GET /api/Classrooms/{id}` (`ClassroomDetailDto`).
3. لا يتم إرجاع **إجمالي الكاترنج (`cateringTotal`)** مما يتطلب طلب إضافي لكل قاعة `GET /api/classrooms/{classroomId}/catering`.

### المطلوب إضافته في استجابة `GET /api/Classrooms`:
```json
{
  "roomName": "Nook Workshop Room",
  "instructorName": "د. أحمد حسام",
  "instructorPhoneNumber": "01012345678",
  "hourlyRate": 100,
  "cateringTotal": 45.00,
  "totalCost": 245.00
}
```

---

## 2. إنشاء حجز / جلسة قاعة جديدة (`POST /api/Classrooms`)

### المشكلة:
الـ DTO الحالي `CreateClassroomDto` يتطلب `instructorId` كـ GUID إلزامي، بينما في شاشة الكاشير السريعة يقوم الكاشير بكتابة اسم المحاضر ورقم هاتفه مباشرة (محاضر جديد أو زائر)، ولا يملك الكاشير دائماً وقت لفتح شاشة المحاضرين وتسجيل المحاضر أولاً ثم أخذ الـ GUID.

### المطلوب دعمه في الـ Request Body:
```json
{
  "roomId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "instructorName": "د. إبراهيم عادل",
  "instructorPhoneNumber": "01123456789",
  "instructorEmail": "ibrahim@example.com",
  "activity": "كورس إنجليزي مكثف",
  "date": "2026-09-06",
  "timeFrom": "2026-09-06T14:00:00Z",
  "timeTo": "2026-09-06T17:00:00Z",
  "hourlyRate": 150,
  "reservationCost": 450,
  "printing": 20,
  "discount": 0,
  "payWay": 1,
  "type": 1
}
```
* **سلوك مقترح للباك:** إذا تم إرسال `instructorId` يتم الربط به، أما إذا تم إرسال `instructorName` مع `instructorPhoneNumber` يقوم الـ Backend بالبحث عنه أو إنشائه تلقائياً في جدول `Instructors` وربط الجلسة به.

---

## 3. قائمة الحجوزات المجدولة في جدول المواعيد (`GET /api/Reservations`)

### الوضع الحالي:
الـ Endpoint يرجع:
```json
{
  "id": "uuid",
  "timeFrom": "2026-09-06T09:00:00Z",
  "timeTo": "2026-09-06T11:00:00Z",
  "dateFrom": "2026-09-06T00:00:00Z",
  "dateTo": "2026-09-06T00:00:00Z",
  "dayOfWeek": 1,
  "roomId": "uuid",
  "discount": 0,
  "discountType": null,
  "reservationCost": 200,
  "activity": "محاضرة فيزياء",
  "note": null,
  "instructorId": "uuid"
}
```

### المطلوب إضافته في الـ Response:
1. `roomName`: اسم القاعة المحجوزة.
2. `instructorName`: اسم المحاضر المحجوز له.
3. `instructorPhoneNumber`: رقم هاتف المحاضر.
4. `status`: حالة الحجز (`1 = Upcoming`, `2 = Active`, `3 = Completed`, `4 = Cancelled`).

---

## 4. إضافة وتعديل حجز مجدول (`POST / PUT /api/Reservations`)

### المطلوب دعمه في الـ Request Body:
دعم الحقول التالية مباشرة لتسهيل الحفظ من شاشة التقويم الإداري (24-Hour Calendar Grid):
* `instructorName`
* `instructorPhoneNumber`
* `roomName`

---

## 5. ميزة تجزئة / قص الحجز المجدول (Split Reservation Endpoint)

### الشرح:
في جدول المواعيد، يحتاج الأدمن في بعض الأحيان إلى تجزئة حجز طويل، مثلاً:
حجز من `10:00 ص` إلى `04:00 م`، يحتاج الأدمن إلى تفريغ أو استقطاع فترة الاستراحة من `01:00 م` إلى `02:00 م` لتأجيرها لعميل آخر.

### الـ Endpoint المقترح:
* **المسار:** `POST /api/Reservations/{id}/split`
* **Request Body:**
```json
{
  "cutStartTime": "13:00",
  "cutEndTime": "14:00"
}
```
* **السلوك المطلوب في الـ Backend:**
  تقسيم الحجز الأصلي ذرياً (Atomic Transaction) في قاعدة البيانات إلى جزئين:
  1. الجزء الأول: من `10:00` إلى `13:00`.
  2. الجزء الثاني: من `14:00` إلى `16:00`.
  مع إعادة حساب تكلفة كل جزء تلقائياً بناءً على سعر الساعة.

---

## 6. تفاصيل التشيك أوت والمدفوعات (`PUT /api/Classrooms/{id}/checkout`)

### الوضع الحالي:
الـ DTO الحالي `CheckoutClassroomDto` يستقبل فقط:
`timeTo, reservationCost, printing, discount, discountType, payWay, note`

### المطلوب إضافته لحفظ الفاتورة والتدقيق المالي (Audit Trail):
```json
{
  "timeTo": "2026-09-06T18:30:00Z",
  "reservationCost": 300.00,
  "cateringAmount": 85.50,
  "printing": 25.00,
  "manualAdjustment": 10.00,
  "loyaltyDiscount": 20.00,
  "finalAmount": 380.50,
  "amountReceived": 400.00,
  "changeDue": 19.50,
  "payWay": 1,
  "note": "تم الدفع كاش واستلام الإيصال"
}
```

---

## 7. متطلبات واقتراحات لوحة التحكم والتحليلات (Dashboard & Analytics)

### أ. تحسين ملخص لوحة التحكم (`GET /api/Dashboard/summary`)

#### الوضع الحالي في الـ OpenAPI:
الـ Endpoint يرجع كائن `DashboardSummaryDto` بالحقول التالية:
```json
{
  "todayWorkspaceSessions": 0,
  "activeWorkspaceSessions": 0,
  "todayClassroomSessions": 0,
  "activeClassroomSessions": 0,
  "todayRevenue": 0,
  "totalStudents": 0,
  "activeShifts": 0,
  "pendingBookings": 0,
  "recentWorkspaceSessions": [],
  "recentClassroomSessions": []
}
```

#### المشاكل والتحديات:
1. **عدد المكاتب المتاحة (`availableDesksCount`):** غير متوفر، مما يضطر الواجهة لجلب إجمالي سعة القاعات وحساب المتبقي يدوياً.
2. **نسبة الإشغال الإجمالية (`occupancyRatePercentage`):** غير محسوبة في السيرفر، والفرونت يضطر لحسابها بناءً على نسبة تقريبية.
3. **إجمالي الزوار المتوافدين اليوم (`totalFootfallToday`):** إجمالي عدد الأفراد الفريدين الذين تواجدوا بالورك سبيس والقاعات على مدار اليوم.

#### المطلوب إضافته في استجابة `GET /api/Dashboard/summary`:
```json
{
  "totalCapacity": 60,
  "availableDesksCount": 42,
  "occupancyRatePercentage": 30,
  "totalFootfallToday": 75
}
```

---

### ب. تحسين تحليلات الإشغال وحركة الزوار (`GET /api/Analysis/occupancy`)

#### الوضع الحالي:
الـ Endpoint يرجع فقط:
```json
{
  "totalWorkspaceSessions": 0,
  "totalClassroomSessions": 0,
  "averageSessionHours": 0,
  "peakHour": 0
}
```

#### المشاكل والتحديات:
1. **الرسم البياني لحركة الساعات (24-Hour Activity Flow Curve):** السيرفر يرجع فقط رقم ساعة الذروة (`peakHour`)، ولا يرجع توزيع النشاط على مدار ساعات اليوم (مثلاً 9:00 ص، 11:00 ص، 1:00 م...)، مما يضطر الفرونت لحساب نقاط المنحنى يدوياً من مصفوفات الجلسات.
2. **توزيع المساحات (Space Distribution Donut):** لا يوجد تصنيف دقيق لنسب الإشغال بين (المكاتب الخاصة Private Desks، المساحات المشتركة Shared Spaces، قاعات الاجتماعات Meeting Rooms).

#### المطلوب إضافته في استجابة `GET /api/Analysis/occupancy`:
```json
{
  "totalWorkspaceSessions": 28,
  "totalClassroomSessions": 6,
  "averageSessionHours": 2.5,
  "peakHour": 14,
  "hourlyFlow": [
    { "hour": 9, "sessionsCount": 8, "occupancyPercentage": 25 },
    { "hour": 11, "sessionsCount": 18, "occupancyPercentage": 55 },
    { "hour": 13, "sessionsCount": 24, "occupancyPercentage": 75 },
    { "hour": 15, "sessionsCount": 30, "occupancyPercentage": 90 },
    { "hour": 17, "sessionsCount": 22, "occupancyPercentage": 68 },
    { "hour": 19, "sessionsCount": 15, "occupancyPercentage": 45 },
    { "hour": 21, "sessionsCount": 6, "occupancyPercentage": 18 }
  ],
  "spaceDistribution": {
    "privateDesksPercentage": 35,
    "sharedSpacesPercentage": 45,
    "meetingRoomsPercentage": 20
  }
}
```

---

## 8. متطلبات واقتراحات قسم التفاصيل والإعدادات (Details Module)

### أ. كليات وجامعات الشراكة (`/api/Faculties`)

#### الوضع الحالي في الـ OpenAPI:
الـ Endpoint يرجع ويستقبل فقط:
```json
{
  "id": "uuid",
  "name": "كلية الهندسة"
}
```

#### المطلوب إضافته في الـ DTO (`FacultyDto`, `CreateFacultyDto`, `UpdateFacultyDto`):
```json
{
  "university": "جامعة القاهرة",
  "campus": "مجمع الجيزة",
  "studentCount": 120,
  "notes": "خصم مخصص لطلاب مشاريع التخرج"
}
```
* **الأهمية:** حفظ اسم الجامعة والفرع مباشرة في قاعدة البيانات، وإرجاع عدد الطلاب المسجلين بالكلية تلقائياً من السيرفر.

---

### ب. سجل المحاضرين والمدربين (`/api/Instructors`)

#### الوضع الحالي:
الـ DTO الحالي يدعم فقط:
`{ "id": "uuid", "name": "string", "phoneNumber": "string", "colour": "string" }`

#### المطلوب إضافته لحفظ الملف التعريفي للمحاضر:
```json
{
  "email": "dr.ahmed@example.com",
  "specialty": "هندسة برمجيات وذكاء اصطناعي",
  "affiliation": "جامعة عين شمس",
  "bio": "محاضر معتمد واستشاري تدريب",
  "isActive": true
}
```

---

### ج. القائمة السوداء والمحظورين (`/api/Blacklists`)

#### الوضع الحالي:
الـ Endpoint يرجع:
`{ "id": "uuid", "name": "string", "reason": "string", "blacklistedAt": "date", "studentId": "uuid" }`

#### المطلوب إضافته:
```json
{
  "studentPhone": "01012345678",
  "faculty": "كلية تجارة",
  "severity": "permanent",
  "notes": "إتلاف أجهزة ومخالفة قواعد الهدوء"
}
```
* **الأهمية:** توفير رقم الهاتف والكلية والدرجة لتمكين الكاشير من التعرف الفوري على المحظورين عند التشيك إن السريع.

---

### د. أكواد الخصومات والكوبونات (`/api/Discounts` و `/api/Coupons`)

#### الوضع الحالي:
* `/api/Discounts` يستقبل خصم نسبة/قيمة مرتبط بكلية (`facultyId`) ولا يحتوي على حقل `code`.
* `/api/Coupons` يحتوي على `code` و `discountPercentage` و `usageLimit` و `timesUsed`.

#### المقترح لفريق الـ Backend:
---

## 9. متطلبات واقتراحات قسم الباقات والاشتراكات (Workspace Packages & Classroom Packages)

### أ. باقات مساحة العمل للطلاب (`GET /api/WorkspacePackages` و `POST /api/WorkspacePackages`)

#### الوضع الحالي في الـ OpenAPI:
الـ Endpoint يرجع كائن `WorkspacePackageDto` بالحقول التالية فقط:
```json
{
  "id": "uuid",
  "studentId": "uuid",
  "purchasedAt": "2026-09-06T10:00:00Z",
  "dateFrom": "2026-09-06T10:00:00Z",
  "dateTo": "2026-10-06T23:59:59Z",
  "hours": 50,
  "remainingHours": 38,
  "cost": 1000.0,
  "payWay": 1
}
```

#### المشاكل والتحديات:
1. **بيانات الطالب مفقودة (`studentName`, `studentPhoneNumber`, `facultyName`):** الـ Endpoint يعيد فقط الـ `studentId` كـ GUID، مما يضطر الفرونت لتحميل جميع الطلاب لعمل Join يدوي في الذاكرة لعرض اسم الطالب ورقمه وكليته.
2. **اسم الباقة (`packageName`):** غير محفوظ أو غير مُعاد، مثل: "باقة المذاكرة الأساسية (10 ساعات)" أو "باقة الشهر القياسية (20 ساعة)".
3. **سعر الساعة المتفق عليه (`hourlyRate`):** غير مُعاد في الـ DTO.
4. **حالة الباقة الديناميكية (`status`):** لا يتم تقييمها في الـ Backend (`active`, `near_expiry`, `expired`, `exhausted`).

#### المطلوب إضافته في استجابة `GET /api/WorkspacePackages`:
```json
{
  "studentName": "زياد أحمد طارق",
  "studentPhoneNumber": "01098765432",
  "facultyName": "كلية حاسبات ومعلومات",
  "packageName": "باكيدج الشهر القياسية",
  "hourlyRate": 20.0,
  "status": "active"
}
```

---

### ب. باقات القاعات للمحاضرين والشركات (`GET /api/ClassroomPackages` و `POST /api/ClassroomPackages`)

#### الوضع الحالي في الـ OpenAPI:
الـ Endpoint يرجع كائن `ClassroomPackageDto` بالحقول التالية فقط:
```json
{
  "id": "uuid",
  "instructorId": "uuid",
  "purchasedAt": "2026-09-06T10:00:00Z",
  "dateFrom": "2026-09-06T10:00:00Z",
  "dateTo": "2026-11-06T23:59:59Z",
  "hours": 50,
  "remainingHours": 42,
  "cost": 4500.0,
  "payWay": 1
}
```

#### المطلوب إضافته في استجابة `GET /api/ClassroomPackages`:
```json
{
  "instructorName": "د. أحمد حسام",
  "instructorPhoneNumber": "01012345678",
  "specialty": "محاضر معتمد - ذكاء اصطناعي",
  "packageName": "باكيدج المعسكرات الاحترافية",
  "hourlyRate": 90.0,
  "status": "active"
}
```

---

### ج. سجل استهلاك الساعات واقتطاعها (Session Usage History & Dedicated Use-Hours Endpoint)

#### المشكلة الحالية:
حالياً، عندما يستهلك العميل ساعات من باقته، يقوم الفرونت بعملية `PUT` كاملة لتحديث حقل `remainingHours` فقط.
1. **لا يوجد سجل تاريخي (Audit Log):** لا توجد مصفوفة أو جدول يحفظ تفاصيل عمليات الخصم (التاريخ، عدد الساعات المخصومة، اسم الجلسة، رقم القاعة أو المكتب، اسم الكاشير الذي قام بالخصم).
2. **مخاطر الـ Race Conditions:** تعديل كامل الكائن عبر `PUT` لتغيير الساعات المتبقية قد يؤدي لتضارب في حال تسجيل جلستين متزامنتين.

#### المقترح لفريق الـ Backend:
1. **إضافة جدول وسجل استهلاك الساعات (`UsageHistory`):**
```json
{
  "id": "uuid",
  "packageId": "uuid",
  "date": "2026-09-06T14:30:00Z",
  "duration": 2.5,
  "sessionTitle": "جلسة مذاكرة فردية",
  "roomOrDesk": "Quiet Desk #04",
  "remainingHoursAfter": 35.5
}
```
2. **إنشاء Endpoint مخصص للاقتطاع الذري للساعات:**
- **المسار:** `POST /api/WorkspacePackages/{id}/use-hours`
- **المسار:** `POST /api/ClassroomPackages/{id}/use-hours`
- **Request Body:**
```json
{
  "hours": 2.0,
  "sessionTitle": "جلسة دراسية بمساحة العمل",
  "roomOrDesk": "Desk 12",
  "note": "تم الخصم عند التشيك أوت"
}
```

---

## 10. متطلبات واقتراحات قسم إعدادات النظام والمستخدمين والأسعار (Settings, Pricing Plans & Rooms)

### أ. خطط وشرائح أسعار الطلاب بالساعة (`GET /api/PricingPlans` و `POST /api/PricingPlans`)

#### الوضع الحالي في الـ OpenAPI:
الـ DTO الخاص بـ `PricingPlanDto` يعيد الحقول التالية فقط:
```json
{
  "id": "uuid",
  "roomId": "uuid",
  "roomName": "القاعة الرئيسية",
  "baseHours": 2,
  "baseCost": 20.0,
  "overageHourlyRate": 10.0,
  "note": "شريحة الساعتين الأولى"
}
```

#### المشاكل والتحديات:
1. **غياب نطاق البداية (`fromHours`):** الواجهة مصممة على نظام الشرائح المتدرجة (`From Hours` إلى `To Hours` بسعر محدد، مثلاً: من 0 إلى 2 ساعة بـ 20 ج.م، ومن 2 إلى 5 ساعات بـ 45 ج.م). حالياً الـ DTO يحتوي فقط على `baseHours`، مما يضطر الفرونت لترتيب الخطط وفرض بداية أول شريحة بـ 0 وفرض بداية الشريحة التالية بنهاية الشريحة السابقة.
2. **الاسم بالإنجليزية (`labelEn`):** غير مدعوم في الـ Backend (يوجد فقط `note` كنص وحيد).

#### المطلوب إضافته في `PricingPlanDto`:
```json
{
  "fromHours": 0,
  "toHours": 2,
  "price": 20.0,
  "labelAr": "أول ساعتين عمل",
  "labelEn": "First 2 hours"
}
```

---

### ب. قاعات ومساحات العمل (`GET /api/Rooms` و `POST /api/Rooms`)

#### الوضع الحالي في الـ OpenAPI:
الـ `RoomDto` يحتوي على الحقول التالية فقط:
```json
{
  "id": "uuid",
  "name": "قاعة الورش والتدريب",
  "capacity": 35,
  "hourlyRate": 120.0,
  "isAvailable": true,
  "supportsClassroom": true,
  "workspaceZone": 1
}
```

#### المشاكل والتحديات:
1. **الاسم باللغة الإنجليزية (`nameEn`):** غير متوفر، مما يجعل عرض اسم القاعة بالعربية فقط حتى عند تبديل اللغة للإنجليزية.
2. **نوع المساحة (`type`):** حالياً يعتمد على حقلين منفصلين (`supportsClassroom` و `workspaceZone`)، مما يتطلب منطق تحويل خاص في الواجهة لتحديد ما إذا كانت `Classroom` أو `Silent Zone` أو `Shared Space`. يفضل توحيدها في حقل نصي أو enum صريح `type`.
3. **رابط الصورة (`imageUrl`):** لا يتم حفظ رابط صورة القاعة المرفوعة عند الإضافة والتعديل في قاعدة بيانات السيرفر، وتعتمد الواجهة حالياً على صور محلية مسبقة حسب نوع القاعة.

#### المطلوب إضافته في `RoomDto`:
```json
{
  "nameEn": "Workshop Hall A",
  "type": "Classroom",
  "imageUrl": "https://storage.nook.io/rooms/workshop-a.jpg"
}
```

---

### ج. قوالب الباقات السريعة (`GET /api/PackagePricingPlans`)

#### الوضع الحالي:
الـ DTO يحتوي على:
- `id`, `name`, `hours`, `cost`, `expiryDays`, `packageType` (1: Student, 2: Instructor)
- **النقص:** ينقصه حقل `nameEn` لعرض اسم الباقة بالإنجليزية في واجهة المستخدم متعددة اللغات.

---

### د. إدارة حسابات النظام والموظفين (`/api/Accounts`)

#### الوضع الحالي والمشاكل:
1. **فصل إنشاء الحساب عن ربط الموظف:** عند إنشاء حساب مستخدم من الواجهة، يلزم إرسال طلب `POST /api/Accounts` ثم إرسال طلب ثانٍ `POST /api/Accounts/{id}/link-staff`.
   - **المقترح:** دعم إنشاء وتعيين دور الموظف ذرياً (Atomic) في طلب واحد:
   ```json
   POST /api/Accounts
   {
     "username": "sarah_reception",
     "password": "Password@123",
     "fullName": "سارة محمد أحمد",
     "email": "sarah@nook.io",
     "phoneNumber": "01012345678",
     "role": 2,
     "staffRole": 2
   }
   ```
2. **غياب الاسم الحقيقي (`fullName`) في قائمة الحسابات:** الـ `GET /api/Accounts` يعيد فقط `username` ولا يعيد الاسم الثلاثي للموظف (`fullName` أو `name`)، مما يضطر الواجهة لعرض الـ username بدلاً من اسم الموظف الحقيقي، أو عمل استعلامات منفصلة لكل حساب عبر `GET /api/Accounts/{id}/profile`.

---

## 11. متطلبات واقتراحات قسم الورديات وإدارة الخزينة ومطابقة المحافظ الإلكترونية (Shift Management & Cash Reconciliation)

### أ. الرصيد الافتتاحي للوردية متعدد القنوات (`POST /api/Shifts`)

#### الوضع الحالي في الـ OpenAPI:
الـ DTO الحالي `CreateShiftDto` يقبل فقط رصيد افتتاحي واحد للدرج:
```json
{
  "date": "2026-09-06T09:00:00Z",
  "timeFrom": "2026-09-06T09:00:00Z",
  "previousTotal": 500.0,
  "userId": "uuid"
}
```

#### المشاكل والتحديات:
مساحة العمل NOOK تعتمد على 4 قنوات دفع رئيسية يومياً (نقدية الدرج، فودافون كاش، إنستاباي، وفوري). حالياً لا يوجد في قاعدة بيانات الـ Backend سوى حقل `previousTotal` (نقدي)، مما يمنع حفظ واستلام الأرصدة الافتتاحية للمحافظ الإلكترونية عند استلام الشيفت.

#### المطلوب إضافته في `CreateShiftDto`:
```json
{
  "previousTotal": 500.0,
  "startVodafoneCash": 1200.0,
  "startInstapay": 3500.0,
  "startFawry": 800.0
}
```

---

### ب. إغلاق الوردية والمطابقة متعددة القنوات (`PUT /api/Shifts/{id}/close`)

#### الوضع الحالي في الـ OpenAPI:
الـ DTO الحالي `UpdateShiftDto` يحتوي فقط على:
- `timeTo`
- `administrative` (المصروفات)
- `vfCashInside` (فودافون كاش وارد)
- `vfCashOutside` (فودافون كاش صادر)
- `increase` (الزيادة في النقدية)
- `loss` (العجز في النقدية)
- `totalCost` (إجمالي النقدية المحصلة)
- `note`
- `status`

#### المشاكل والتحديات:
1. الـ DTO يدعم حركة فودافون كاش فقط (`vfCashInside` و `vfCashOutside`)، ولكنه يتجاهل تماماً وارد وصادر:
   - **إنستاباي (InstaPay):** لا توجد حقول لـ `instapayInside` و `instapayOutside`.
   - **فوري (Fawry):** لا توجد حقول لـ `fawryInside` و `fawryOutside`.
2. **غياب أرصدة الإغلاق الفعلية للمحافظ:** لا توجد حقول لحفظ الرصيد الفعلي المعدود بنهاية الوردية لكل قناة إلكترونية (`actualVodafone`, `actualInstapay`, `actualFawry`) لتدقيق الفوارق والعجز المحاسبي لكل محفظة.

#### المطلوب إضافته في `UpdateShiftDto`:
```json
{
  "instapayInside": 1400.0,
  "instapayOutside": 200.0,
  "fawryInside": 500.0,
  "fawryOutside": 0.0,
  "actualVodafone": 2400.0,
  "actualInstapay": 4700.0,
  "actualFawry": 1300.0
}
```

---

### ج. تصنيف حركات الوردية (`POST /api/Shifts/{id}/items`)

#### المشكلة الحالية:
الـ DTO يحتوي فقط على `cost` و `type` و `payWay` و `item` (كنص عام).

#### المطلوب إضافته:
إضافة حقل صريح لتصنيف الحركة التشغيلية `category`:
- `canteen`: مبيعات الكانتين والمنتجات.
- `classroom`: إيجار وحجز قاعات وورش.
- `workspace`: جلسات مساحة العمل والستيودنتس.
- `package`: مبيعات واشتراكات الباقات.
- `expense`: مصروفات ونثريات إدارية.
- `wallet_transfer`: تحويلات وسحوبات المحافظ الإلكترونية.

---

## 12. متطلبات واقتراحات قسم مساحات العمل والطلاب (Workspace Sessions & Students)

### أ. استرجاع جلسات مساحة العمل (`GET /api/Workspaces`)

#### المشكلة الحالية:
الـ DTO المرجع من `GET /api/Workspaces` يحتوي فقط على `studentId: Guid` و `seatElementId` و `note`. لا يحتوي على:
- `studentName`: اسم الطالب.
- `studentPhoneNumber`: رقم هاتف الطالب.
- `studentWhatsapp`: رقم واتساب الطالب.
- `facultyName` / `college`: اسم الكلية / الجامعة.
- `calculatedCost`: التكلفة المحتسبة تلقائياً بناءً على خطط الأسعار الحالية (`PricingPlans`).
- `calculatedDuration`: مدة الجلسة المحسوبة بالساعات والدقائق.
- `cateringTotal`: إجمالي طلبات الكاترنج والمشروبات المضافة للجلسة.

#### التأثير:
الفرونت إند يضطر لاستدعاء `GET /api/Students` بالكامل وإجراء عمليات Join يدوية في الذاكرة لربط كل جلسة ببيانات طالبها، مما يستهلك موارد ويزيد من وقت التحميل (N+1 Calls problem).

#### المطلوب إضافته في `WorkspaceDto`:
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "studentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "studentName": "أحمد محمود",
  "studentPhoneNumber": "01012345678",
  "studentWhatsapp": "01012345678",
  "facultyName": "هندسة",
  "college": "جامعة القاهرة",
  "timeFrom": "2026-09-06T10:00:00Z",
  "timeTo": null,
  "status": 1,
  "calculatedCost": 45.00,
  "cateringTotal": 30.00,
  "calculatedDuration": "1h 30m"
}
```

---

### ب. تسجيل دخول الطلاب الجدد والـ Walk-in (`POST /api/Workspaces`)

#### المشكلة الحالية:
`POST /api/Workspaces` يتطلب إجبارياً حقل `studentId: Guid` لطالب مسجل مسبقاً في جدول `Students`.
عند قدوم طالب جديد لأول مرة (Walk-in Student)، لا يمكن تسجيل دخوله في طلب واحد، بل يجب إرسال طلب `POST /api/Students` أولاً، ثم انتظار معرف الطالب `id: Guid`، ثم إرسال طلب `POST /api/Workspaces` ثانياً!

#### المطلوب:
إما دعم الحقول التالية مباشرة في `POST /api/Workspaces` وإنشاء الطالب تلقائياً إذا لم يكن مسجلاً:
- `studentName`: اسم الطالب
- `studentPhoneNumber`: رقم الهاتف
- `studentWhatsapp`: رقم الواتساب
- `facultyId`: معرف الكلية

أو توفير نقطة نهاية مخصصة للاستقبال المباشر:
- **المسار:** `POST /api/Workspaces/walk-in` تقوم بإنشاء الطالب وبدء جلسته ذرياً في طلب واحد (Atomic Operation).

---

### ج. إنهاء الجلسة والمحاسبة المتعددة (`PUT /api/Workspaces/{id}/checkout`)

#### المشكلة الحالية:
`PUT /api/Workspaces/{id}/checkout` يقبل طريقة دفع واحدة فقط (`payWay: number`) ومبلغ واحد (`paidAmount`).
لا يدعم:
- تقسيم الدفع (Split Payment) مثل دفع جزء كاش وجزء إنستاباي.
- تسجيل المبلغ المستلم والباقي للعميل (`changeDue`).
- تسجيل المديونية المتبقية (`remainingBalance` / `outstandingBalance`) في سجل الطالب إذا لم يسدد المبلغ كاملاً.

#### المطلوب إضافته:
إضافة حقول:
- `amountReceived`: المبلغ المستلم فعلياً من العميل.
- `changeDue`: المبلغ المسترجع كباقي للعميل.
- `remainingAmount`: المبلغ المتبقي كمديونية مؤجلة على الطالب.
- `paymentMethodBreakdown`: تفصيل مبالغ الدفع حسب القناة في حالة تعدد طرق السداد.

---

### د. تكامل الكاترنج مع جلسة مساحة العمل (`POST /api/workspaces/{workspaceId}/catering`)

#### المطلوب:
التأكد من أن إضافة منتجات الكاترنج للجلسة تؤثر تلقائياً على مخزون المنتجات في `Products`، وتنعكس في إجمالي الحساب عند الـ checkout وفي تقرير حركة الوردية الحالية.

---

---

## 13. متطلبات واقتراحات قسم المصادقة وإدارة الجلسات (Authentication & Session Management)

### أ. تفاصيل المستخدم والصلاحيات في استجابة تسجيل الدخول (`POST /api/Auth/login`)

#### الوضع الحالي في الـ OpenAPI:
استجابة `POST /api/Auth/login` تعيد حالياً كائن `AuthResponseDto`:
```json
{
  "token": "eyJhbGciOi...",
  "refreshToken": "d8f9...",
  "expiresAt": "2026-09-06T19:00:00Z",
  "userId": "uuid",
  "roles": [1]
}
```

#### المشاكل والتحديات:
1. **غياب الملف الشخصي الأساسي للمستخدم:** لا يتم إرجاع `fullName` (الاسم الثلاثي أو المعروض)، `email`، `staffRoleName` (مثل: "Receptionist", "Admin", "Manager").
2. **الاعتماد على فك تشفير الـ Token أو استدعاء إضافي:** يضطر الفرونت إند لفك تشفير الـ Claims من الـ JWT أو استدعاء `GET /api/Auth/me` في طلب منفصل فقط لمعرفة اسم الموظف المعروض في أعلى الشريط العلوي للبرنامج.

#### المطلوب إضافته في استجابة `POST /api/Auth/login`:
```json
{
  "token": "eyJhbGciOi...",
  "refreshToken": "d8f9...",
  "expiresAt": "2026-09-06T19:00:00Z",
  "userId": "uuid",
  "username": "fares_admin",
  "fullName": "فارس محمد",
  "email": "fares@nook.io",
  "roles": ["Admin"],
  "staffRole": "Manager"
}
```

---

### ب. إدارة الجلسات المفتوحة والإنهاء عن بُعد (Multi-Device Sessions & Global Revoke)

#### المشاكل والتحديات:
1. الـ Endpoint الحالي `POST /api/Auth/revoke-token` مخصص فقط لطلب إلغاء الـ Refresh Token الممرر محلياً.
2. لا توجد إمكانية للمستخدم أو لمدير النظام لاستعراض الجلسات النشطة (مثل متصفحات أو أجهزة مختلفة مع عناوين الـ IP وتاريخ آخر نشاط)، أو إلغاء جميع الجلسات المفتوحة عند تغيير كلمة المرور أو في حالات الأمان الحرجة.

#### المطلوب إضافته:
- `GET /api/Auth/sessions`: استرجاع قائمة الأجهزة والجلسات الفعالة للمستخدم الحالي.
- `DELETE /api/Auth/sessions/{sessionId}`: إنهاء جلسة معينة عن بُعد.
- `POST /api/Auth/revoke-all`: إلغاء صلاحية كافة الـ Tokens النشطة للمستخدم فوراً وتسجيل الخروج من جميع الأجهزة.

---

### ج. أكواد أخطاء المصادقة الهيكلية ودعم التوطين (Structured Auth Error Codes)

#### المشكلة الحالية:
تكتفي الـ Endpoints بإرجاع أكواد HTTP العامة (`400 Bad Request` أو `401 Unauthorized`) مع رسائل نصية متغيرة يصعب على الفرونت إند ترجمتها بدقة للمستخدم العربي والإنجليزية.

#### المطلوب إضافته:
توحيد جسم استجابة الخطأ ليتضمن `errorCode` قياسي:
```json
{
  "errorCode": "INVALID_CREDENTIALS",
  "messageAr": "اسم المستخدم أو كلمة المرور غير صحيحة",
  "messageEn": "Invalid username or password"
}
```
أو للأمان وحسابات الموظفين:
```json
{
  "errorCode": "ACCOUNT_DISABLED",
  "messageAr": "تم تجميد هذا الحساب، يرجى مراجعة إدارة النظام",
  "messageEn": "This account is disabled, please contact administrator"
}
```

---

## ملخص سريع لفريق الـ Backend:
| الأولوية | الـ Endpoint | التعديل المطلوب |
|---|---|---|
| **حرجة (P0)** | `GET /api/Workspaces` | إضافة `studentName`, `studentPhoneNumber`, `facultyName`, `calculatedCost`, `cateringTotal` لتجنب N+1 calls. |
| **حرجة (P0)** | `POST /api/Workspaces` | دعم تسجيل الطالب مباشرة (Walk-in) دون الحاجة لطلبين منفصلين (`POST /api/Students` ثم `POST /api/Workspaces`). |
| **حرجة (P0)** | `GET /api/WorkspacePackages` | إضافة `studentName`, `studentPhoneNumber`, `facultyName`, `packageName` لتجنب N+1 calls. |
| **حرجة (P0)** | `GET /api/ClassroomPackages` | إضافة `instructorName`, `instructorPhoneNumber`, `specialty`, `packageName`. |
| **حرجة (P0)** | `GET /api/Classrooms` | إضافة `roomName` و `instructorName` و `cateringTotal` في الاستجابة لتجنب N+1 calls. |
| **حرجة (P0)** | `GET /api/Reservations` | إضافة `roomName` و `instructorName` و `instructorPhoneNumber` في الاستجابة. |
| **عالية (P1)** | `POST /api/Auth/login` | تضمين `fullName`, `username`, `email`, `staffRole` مباشرة في الاستجابة لتجنب طلبات إضافية عند تسجيل الدخول. |
| **عالية (P1)** | `PUT /api/Workspaces/{id}/checkout` | إضافة حقول `amountReceived`, `changeDue`, `remainingAmount` ودعم الدفع المجزأ. |
| **عالية (P1)** | `POST /api/Shifts` | إضافة حقول الأرصدة الافتتاحية للمحافظ الإلكترونية `startVodafoneCash`, `startInstapay`, `startFawry`. |
| **عالية (P1)** | `PUT /api/Shifts/{id}/close` | إضافة حقول المطابقة والتسوية لإنستاباي وفوري `instapayInside`, `instapayOutside`, `fawryInside`, `fawryOutside`. |
| **عالية (P1)** | `POST /api/Shifts/{id}/items` | إضافة حقل `category` لتصنيف الإيرادات بدقة (`canteen`, `classroom`, `workspace`, `package`, `expense`). |
| **عالية (P1)** | `POST /api/WorkspacePackages/{id}/use-hours` | إضافة endpoint ذري لاقتطاع الساعات وحفظ سجل الاستهلاك `UsageHistory`. |
| **عالية (P1)** | `POST /api/ClassroomPackages/{id}/use-hours` | إضافة endpoint ذري لاقتطاع ساعات باقات المحاضرين وحفظ سجل الاستهلاك. |
| **عالية (P1)** | `GET /api/Accounts` | تضمين `fullName` و `phone` و `staffRole` مباشرة في قائمة الحسابات دون الحاجة لطلب إضافي لكل موظف. |
| **عالية (P1)** | `POST /api/Accounts` | دعم تمرير `fullName` و `staffRole` لإنشاء حساب الموظف في طلب ذري واحد. |
| **عالية (P1)** | `POST /api/Classrooms` | قبول `instructorName` و `instructorPhoneNumber` وإنشاء المحاضر تلقائياً. |
| **عالية (P1)** | `GET /api/Dashboard/summary` | إضافة `availableDesksCount` و `occupancyRatePercentage` و `totalFootfallToday`. |
| **عالية (P1)** | `/api/Faculties` | إضافة حقول `university`, `campus`, `studentCount`, `notes`. |
| **عالية (P1)** | `/api/Instructors` | إضافة حقول `email`, `specialty`, `affiliation`, `bio`. |
| **متوسطة (P2)** | `POST /api/Auth/revoke-all` | إضافة نقطة نهاية لإلغاء وتفريغ كافة الجلسات النشطة للمستخدم عن بُعد. |
| **متوسطة (P2)** | `/api/PricingPlans` | إضافة حقول `fromHours`, `toHours`, `labelEn` صراحة في الـ DTO بدلاً من استنتاج الشرائح. |
| **متوسطة (P2)** | `/api/Rooms` | إضافة حقول `nameEn`, `type`, `imageUrl` في الـ DTO لحفظ وتحديد نوع وصورة القاعة. |
| **متوسطة (P2)** | `/api/PackagePricingPlans` | إضافة حقل `nameEn` لدعم أسماء الباقات بالإنجليزية. |
| **متوسطة (P2)** | `/api/Blacklists` | إضافة حقول `studentPhone`, `faculty`, `severity`, `notes`. |
| **متوسطة (P2)** | `GET /api/Analysis/occupancy` | إضافة مصفوفة `hourlyFlow` ونسب `spaceDistribution` لإلغاء أي حسابات تقريبية من الفرونت. |
| **متوسطة (P2)** | `POST /api/Reservations/{id}/split` | إضافة endpoint لتجزئة الحجز ذرياً. |
| **متوسطة (P2)** | `PUT /api/Classrooms/{id}/checkout` | إضافة حقول `cateringAmount`, `amountReceived`, `changeDue`. |



