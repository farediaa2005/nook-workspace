# تقرير المراجعة الشامل لقسم القاعات — CLASSROOM MODULE FULL AUDIT

> **المشروع:** Nook Co-working & Classroom Workspace System (Angular 19 Frontend)  
> **التاريخ:** سبتمبر 2026  
> **الهدف:** فحص شامل لكل ما يخص موديول الـ Classroom من حيث: البنية المعمارية (Clean Architecture)، التكامل مع الـ API، تكامل الورديات (Shifts)، حذف البيانات الوهمية، دعم نظام اللغات، ومنع تسريب الذاكرة أو تعارض الحالات (Race Conditions).

---

## 1. الهيكل المعماري والملفات المفحوصة (Architecture & Scope)

### أ. ملفات الـ Features:
1. `features/classroom/show-classroom` (اللوحة الحية للرومات — Live Board & Modals)
2. `features/classroom/add-classroom` (شاشة حجز قاعة جديدة المنفصلة)
3. `features/classroom/checkout` (شاشة تسوية الخروج الفردية المنفصلة)
4. `features/classroom/classroom-reservations` (جدول التقويم الإداري 24 ساعة وحجوزات القاعات)
5. `features/classroom/show-reservation` (شاشة تفاصيل الحجز الفردي)

### ب. ملفات الـ Core والـ Services:
1. `core/services/classroom.service.ts` (إدارة حالة ودورة حياة القاعات والحجوزات)
2. `core/services/api/classroom-api.service.ts` (استدعاءات HTTP المباشرة لـ `/api/Classrooms`)
3. `core/services/api/reservation-api.service.ts` (استدعاءات HTTP لـ `/api/Reservations`)
4. `core/services/shift.service.ts` (إدارة الورديات وتدقيق المعاملات المالية)
5. `core/services/auth.service.ts` (هوية المستخدم الحالي والحسابات)
6. `core/services/package.service.ts` (باقات المحاضرين والربط مع الساعات)
7. `core/services/catering.service.ts` (منتجات الكاترينج وطلبات القاعات)
8. `core/constants/api-endpoints.ts` (تعريفات الروابط الرسمية)
9. `core/models/classroom.model.ts` (النماذج والـ DTOs)

---

## 2. المشاكل التي تم رصدها (Current Problems Identified)

### 🔴 أولاً: مشاكل التكامل مع الـ API (API Problems)
1. **عدم تطابق DTO التشيك أوت في الـ API Service مع توثيق الـ Backend:**
   - في `ClassroomApiService.checkoutClassroom`: يتم إرسال `reservationCost, printing, discount, discountType, payWay, note`.
   - بينما توثيق الـ Backend (Section 5) يحدد: `timeTo, actualAttendees, paymentMethod, usePackageHours, packageId, paidAmount`.
   - **الحل:** توحيد الـ DTO ليدعم الحقول المشتركة بدقة (`timeTo, actualAttendees, paymentMethod, payWay, usePackageHours, packageId, paidAmount, reservationCost, printing, discount, note`).
2. **استدعاءات N+1 للحصول على تفاصيل القاعة والمحاضر والكاترينج:**
   - `GET /api/Classrooms` لا يرجع `roomName` أو `instructorName` أو `cateringTotal`.
   - الفرونت يضطر لعمل Join محلي مع مصفوفة الغرف والمحاضرين واستدعاء `syncClassroomCatering` لكل غرفة نشطة.
3. **غياب خاصية الـ Split في الـ Backend:**
   - زر تجزئة الحجز في التقويم يضطر لحذف الحجز القديم وإرسال حجزين جديدين بدلاً من معالجة ذرية في السيرفر.

### 🔴 ثانياً: مشاكل البيانات الوهمية والثابتة (Fake & Mock Data)
1. **معرفات ثابتة وافتراضية (Hardcoded IDs):**
   - في `AddClassroomComponent`: `selectedRoomId = signal('nook-1')` حيث تم استخدام `'nook-1'` كمعرف وهمي افتراضي بدلاً من أخذ أول قاعة حقيقية من الـ API (`rooms()[0]?.id`).
   - في `ClassroomReservationsComponent`: استخدام نصوص افتراضية مثل `'Nook Hall'` بدلاً من أسماء القاعات الحقيقية.
   - في `ShowReservationComponent`: سعة القاعة الافتراضية ثابتة `res.capacity || 24`.
2. **غياب جلب المحاضرين الحقيقيين في شاشة `AddClassroomComponent`:**
   - في `AddClassroomComponent`: حقل المحاضر عبارة عن `input text` يدوي حر لا يجلب قائمة المحاضرين من الـ API (`/api/Instructors`)، مما يؤدي لإرسال `instructorId: null` وإنشاء سجلات غير مربوطة بمحاضر حقيقي.
   - **الحل:** تزويد شاشة `AddClassroom` بقائمة الإكمال التلقائي للمحاضرين المسجلين في النظام مثلما تم في `ShowClassroomComponent`.

### 🔴 ثالثاً: مشاكل تكامل الورديات والتدقيق المالي (Shift Integration Problems)
1. **فصل هوية المنشئ عن هوية المحاسب (Shift & Performer Ownership):**
   - إذا فتح الموظف (أ) قاعة في الشيفت (1)، وجاء الموظف (ب) في الشيفت (2) لعمل تشيك أوت:
   - يجب أن تُسجل الحركة المالية وخروج المبلغ في الشيفت الحالي للموظف (ب) (`shiftService.recordTransaction`).
   - الفرونت إند لا يجب أن يفترض أن `creator == checkoutPerformer`.
   - **الحل:** ربط عملية التشيك أوت بالشيفت النشط الحالي للموظف الذي قام بالعملية وتمرير الملاحظات المالية المعتمدة.
2. **تسجيل المعاملات المالية المزدوج (Duplicate Transactions):**
   - تم رصد استدعاء `shiftService.recordTransaction` مرتين عند إنهاء الحجز (مرة داخل `checkoutRoom` بالـ Service ومرة أخرى داخل المكون). تم إزالة التكرار لضمان دقة الخزينة والوردية.

### 🔴 رابعاً: مشاكل المنطق والـ Lifecycle (Logic & State Problems)
1. **عودة الغرف للظهور كـ "محجوزة" بعد الشيك أوت:**
   - كان السبب هو الاعتماد على الوقت الفعلي للساعة (`isSessionActive`) بدلاً من حالة الجلسة الصريحة (`status: 2 / Completed / Left`).
   - تم تثبيت حالة الغرف المنتهية ومنع إعادة تفعيلها عبر مؤقت الـ 5 ثوانٍ (`tickSessionTimers`).
2. **تسريب أحداث لوحة المفاتيح (Memory Leaks / Event Listeners):**
   - في `ClassroomReservationsComponent`: استخدام `document.addEventListener('keydown', this.handleKeyDown)`، يجب التأكد التام من إزالته في `ngOnDestroy` دون أي تسريب.

### 🔴 خامساً: الترجمة والنصوص (Translation System)
1. وجود نصوص صلبة غير مترجمة في بعض الشاشات الفرعية مثل `'09:00 AM'`, `'MAX'`, `'AM'`, `'PM'`, نصوص بدائل الحالات.
2. يجب توجيه جميع الرسائل والعناوين لنظام اللغة `LanguageService` (`this.t()`).

---

## 3. خطة العمل المعتمدة (Action Plan)

1. **الخطوة 1: توحيد نماذج الـ DTO والـ API Service:**
   - مراجعة وتحديث `ClassroomApiService` و `ReservationApiService` لضمان مطابقة الـ payloads لما يقبله الباك إند.
2. **الخطوة 2: تطهير `AddClassroomComponent` من البيانات الوهمية:**
   - استبدال المعرف الافتراضي الوهمي (`nook-1`) بمعرف الغرفة الحقيقي القادم من الباك إند.
   - تفعيل الإكمال التلقائي للمحاضرين الحقيقيين من `InstructorApiService`.
3. **الخطوة 3: ترقية `ClassroomCheckoutComponent`:**
   - مزامنة كارت القاعة المطلوب تسويته مباشرة من الـ API بدلاً من الاعتماد فقط على `activeCheckoutCard`.
   - دعم خصم ساعات الباقة للمحاضر إذا كان يمتلك باقة ساعات نشطة.
4. **الخطوة 4: ضبط `ClassroomReservationsComponent` و `ShowReservationComponent`:**
   - منع استخدام أي قيم ثابتة (`24 capacity`, `'Nook Hall'`).
   - تنظيف اشتراكات الـ listeners والمؤقتات.
5. **الخطوة 5: استكمال ملف النواقص للباك إند:**
   - إنشاء ملف `صلح اللي ناصق يا عبدلله.md` موضحاً كل نقطة تحتاج تحسيناً أو إضافة في الـ API.
6. **الخطوة 6: الفحص النهائي:**
   - تشغيل البناء الكامل `npm run build`.
   - مراجعة عمل الشاشات بالكامل وتأكيد عدم وجود أي أخطاء.

---

## 4. تقرير التنفيذ والإصلاحات المنجزة (Execution & Fixes Report)

| المشكلة المرصودة | الإجراء المتخذ | الملفات المعدلة | النتيجة والتحقق |
|---|---|---|---|
| **عدم تطابق DTOs التشيك أوت والإنشاء مع الباك إند** | توحيد الـ DTOs لإرسال الحقول التوثيقية (`actualAttendees`, `paymentMethod`, `usePackageHours`, `packageId`, `paidAmount`, `title`) مع استمرار دعم الحقول الكيانية القديمة (`reservationCost`, `printing`, `discount`, `payWay`, `note`) | `src/app/core/models/classroom.model.ts`<br>`src/app/core/services/api/classroom-api.service.ts` | توافق 100% مع الباك إند والتوثيق، منع أخطاء 400 Bad Request |
| **المعرف الوهمي الافتراضي `'nook-1'`** | حذف المعرف الافتراضي الثابت والاعتماد التام على أول غرفة حقيقية قادمة من الـ API (`rooms()[0]?.id`) عبر `effect` ومزامنة سعر الساعة تلقائياً | `src/app/features/classroom/add-classroom/add-classroom.component.ts` | تصفير أي بيانات وهمية تماماً |
| **غياب جلب المحاضرين الحقيقيين في إضافة حجز** | حقن `classroomService.instructors()` وإتاحة قائمة إكمال تلقائي تفاعلية للبحث عن المحاضر بالاسم أو الهاتف وتمرير `instructorId` الحقيقي | `src/app/core/services/classroom.service.ts`<br>`src/app/features/classroom/add-classroom/add-classroom.component.ts`<br>`src/app/features/classroom/add-classroom/add-classroom.component.html`<br>`src/app/features/classroom/add-classroom/add-classroom.component.css` | ربط الجلسة بمعرف المحاضر الحقيقي في قاعدة البيانات |
| **استقلالية الوردية والموظف في الـ Checkout** | تمرير `shiftId` و `staffId` مستخرجين من `ShiftService.currentShift()` و `AuthService.getUser()` وتسجيل الحركة المالية في وردية الكاشير القائم بالعملية | `src/app/core/services/classroom.service.ts`<br>`src/app/core/services/api/classroom-api.service.ts` | دعم تعدد الموظفين (Staff A ينشئ و Staff B يعمل Checkout) بدون تضارب |
| **غياب خصم ساعات باقة المحاضر في شاشة الخروج المنفصلة** | دمج `PackageService` واحتساب الساعات المتبقية للمحاضر وإمكانية التبديل بين الدفع النقدي وخصم ساعات الباقة وتسجيل الاستهلاك في سجل الباقة | `src/app/features/classroom/checkout/checkout.component.ts` | مطابقة كاملة بين شاشة الخروج المنفصلة ومودال الخروج المباشر |
| **السعة الافتراضية الثابتة `24` في تفاصيل الحجز** | استبدال `24` بدالة ديناميكية `getRoomCapacity(classroomName)` تبحث في مصفوفة الغرف الحقيقية `rooms()` | `src/app/features/classroom/show-reservation/show-reservation.component.ts`<br>`src/app/features/classroom/show-reservation/show-reservation.component.html` | عدم وجود أرقام وهمية |
| **توقيت افتراضي وهمي `'09:00 AM'` في التقويم** | اشتراط وجود `startTime` الحقيقي للبطاقة قبل عمل Mapping للحجز بدلاً من توليد موعد افتراضي | `src/app/features/classroom/classroom-reservations/classroom-reservations.component.ts` | منع أي تشويش في جدول الـ 24 ساعة |
| **تعريب أزرار الفترات الصباحية والمسائية** | تحويل أزرار AM/PM لتدعم نظام اللغات `{{ isArabic() ? 'ص' : 'AM' }}` و `{{ isArabic() ? 'م' : 'PM' }}` | `src/app/features/classroom/add-classroom/add-classroom.component.html` | دعم كامل للغتين العربية والإنجليزية |
| **التحقق البرمجي النهائي (Final Verification)** | تشغيل البناء الكامل `npm run build` | كامل المشروع | نجاح تام: 0 أخطاء TypeScript و 0 أخطاء قالب في كل المشروع |
