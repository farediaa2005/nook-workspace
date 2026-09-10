# Nook Workspace API Status & Remaining Requirements

> **موجه إلى:** فريق تطوير الباك إند (Backend Development Team - عبدالله)  
> **حالة المراجعة:** بعد مراجعة وثيقة التحديث `20260909100902_AddReservationRecurrenceAndCancellationFields` ومطابقتها مع الفرونت إند.  
> **تاريخ التحديث:** سبتمبر 2026

---

## 🟢 أولاً: المهام التي تم استلامها ودمجها بنجاح في الفرونت إند (Delivered & Integrated)

تم ربط وتفعيل كافة الـ Endpoints والـ DTOs الجديدة التي أطلقها الباك إند:

1. **الورديات (Shifts API):**
   - ✅ **`GET /api/Shifts/current`**: تم ربطه بالكامل في `ShiftApiService` و `ShiftService` لجلب الوردية النشطة وحساباتها المباشرة (`canteenRevenue`, `classroomRevenue`, `workspaceRevenue`, `packageRevenue`, `totalRevenue`, الخزائن والمحافظ الإلكترونية).
   - ✅ **`POST /api/Shifts/{id}/recalculate`**: تم ربطه كخدمة إعادة احتساب تدقيقية للأرصدة والإيرادات والمدفوعات من نقطة `timeFrom`.
   - ✅ **قيد الوردية الواحدة (Single Active Shift Enforcement)**: تم معالجة خطأ HTTP 400 وعرض الرسالة الصريحة للمستخدم لمنع فتح أكثر من وردية نشطة.
   - ✅ **التسجيل التلقائي للمصروفات والإيرادات على الوردية عند الـ Checkout**: تم التأكيد عليه واحتسابه في التدفقات المالية.

2. **الحجوزات المتكررة والتعارضات (Reservations & Recurrence):**
   - ✅ **حقول التكرار**: تم إضافة `RecurrenceFrequency` (Daily=1, Weekly=2, Monthly=3)، `recurrenceInterval`، `daysOfWeek`، `totalSessions`، `isOngoing`، `canceledDates`، `upcomingSessions`.
   - ✅ **فحص التعارض المستقل (`POST /api/Reservations/check-conflict`)**: تم بناء DTOs والخدمة في `ReservationApiService` و `ClassroomService` لتفادي التعارض مع جلسات القاعات والورك سبيس والحجوزات السابقة.
   - ✅ **إلغاء يوم محدد (`POST /api/Reservations/{id}/cancel-day`)**: تم ربطه مع استبعاد التاريخ وتحديث قائمة الحجوزات.
   - ✅ **بدء جلسة قاعة من حجز (`POST /api/Reservations/{id}/create-classroom`)**: تم ربطه وتحديث شاشة القاعات فور الإنشاء.

---

## 🔴 ثانياً: النواقص المتبقية المطلوبة من الباك إند (Pending Backend Requirements)

للوصول إلى أعلى استقرار وتفادي أي Caching بالواجهة، هذه هي النقاط الـ 5 المتبقية المطلوب إضافتها في الباك إند:

### 1. تخزين حقول المحاضر الإضافية في جدول وقوائم المحاضرين (`/api/Instructors`)
* **الوضع الحالي:** عند إنشاء محاضر عبر `POST /api/Instructors` أو استرجاعه عبر `GET /api/Instructors`، يتم تخزين وإرجاع (`id`, `name`, `phoneNumber`, `colour`) فقط، ويتم إسقاط الحقول الهامة التالية من الـ Database و الـ DTO:
  - البريد الإلكتروني (`email`)
  - التخصص (`specialty`)
  - جهة العمل / الانتماء (`affiliation`)
  - النبذة التعريفية (`bio`)
* **الحل المؤقت بالفرونت إند:** قمنا بعمل دمج محلي للبيانات في الـ Client Cache، ولكن بمجرد فتح النظام من جهاز أو متصفح آخر تُفقد هذه التفاصيل لعدم تخزينها في الـ SQL Database.
* **المطلوب في الباك إند:** إضافة الأعمدة لجدول `Instructors` وإدراجها في `CreateInstructorDto`, `UpdateInstructorDto`, `InstructorDto`.

```json
{
  "id": "guid-instructor-id",
  "name": "د. أحمد خليل",
  "phoneNumber": "01012345678",
  "email": "ahmed.khalil@example.com",
  "specialty": "برمجة وتطوير ويب",
  "affiliation": "جامعة القاهرة",
  "bio": "خبير معتمد في تدريب أطر عمل الويب",
  "colour": "#3b82f6"
}
```

---

### 2. دعم الاسم والوصف في أكواد الخصم والكوبونات (`/api/Coupons`)
* **الوضع الحالي:** `POST /api/Coupons` و `GET /api/Coupons` تستقبل وتحتفظ بـ `code`, `discountType`, `value`, `expiryDate`, `usageLimit`، لكنها لا تحتوي على حقول لوصف العرض أو اسمه (`name` / `description`).
* **الحل المؤقت بالفرونت إند:** قمنا بربط `CouponApiService` مع حفظ وصف الكوبون في Local Cache، ونحتاج لدعمها في الـ DTO ليتم حفظها في قاعدة البيانات وتظهر في التقارير الإدارية.
* **المطلوب في الباك إند:** إضافة `name` و `description` إلى `Coupon` Entity و `CouponDto` و `CreateCouponDto`.

---

### 3. تضمين بيانات المحاضر والقاعة والكاترينج في قائمة الجلسات (`GET /api/Classrooms`)
* **الوضع الحالي:** الـ Endpoint `GET /api/Classrooms/{id}` أصبح يرجع `roomName` و `instructorName`، ولكن قائمة الجلسات العامة `GET /api/Classrooms` ما زالت ترجع الحقول المباشرة بدون Foreign Entities، كما تفتقر لإجمالي الكاترينج (`cateringTotal`).
* **المشكلة:** يضطر الفرونت إند لعمل طلبات منفصلة لكل جلسة لجلب منتجات الكاترينج مسبباً عبء $N+1$ Requests على السيرفر.
* **المطلوب:** تضمين `roomName`, `instructorName`, `instructorPhoneNumber`, `cateringTotal` في `ClassroomDto` المرجع من `GET /api/Classrooms`.

---

### 4. دعم الإنشاء السريع لجلسة القاعة بدون GUID مسبق للمحاضر (`POST /api/Classrooms`)
* **الوضع الحالي:** يتطلب الـ Endpoint وجود `instructorId` كـ GUID موجود مسبقاً في جدول المحاضرين.
* **المطلوب:** في حال عدم توفر `instructorId`، السماح بتمرير `instructorName` و `instructorPhoneNumber` ليقوم الباك إند بالبحث عنه أو إنشائه تلقائياً وربطه بالجلسة تيسيراً لموظف الاستقبال عند الحجز السريع.

---

### 5. ميزة تجزئة الحجز الذرية (Atomic Split Reservation)
* **المسار المقترح:** `POST /api/Reservations/{id}/split`
* **المطلوب:** إمكانية اقتطاع فترة زمنية من حجز قائم وتقسيمه في Database Transaction إلى فترتين منفصلتين دون الحاجة لحذف الحجز القديم يدوياً.

---

### 6. تخزين البريد الإلكتروني والجامعة في جدول وقوائم الطلاب (`/api/Students`)
* **الوضع الحالي:** عند إنشاء طالب عبر `POST /api/Students` أو تحديثه عبر `PUT /api/Students/{id}` أو جلبه عبر `GET /api/Students`، يتم تخزين وإرجاع (`id`, `name`, `phoneNumber`, `whatsapp`, `facultyName`) فقط، ويتم إسقاط الحقول التالية من قاعدة البيانات والـ DTO لعدم وجود أعمدة لها:
  - البريد الإلكتروني (`email`)
  - الجامعة / الكلية الإضافية (`university` أو `college`)
* **المشكلة:** الفرونت إند لا يستخدم أي تخزين محلي أو لوكال داتا بيز (Zero Local Database / Zero Local Storage) ويعتمد بنسبة 100% وبشكل مباشر ولحظي على الـ API وقاعدة بيانات السيرفر، ونظراً لعدم وجود هذين العمودين في جدول `Students` بالسيرفر، فإن الإيميل والجامعة يُفقدان فوراً وتظهر الحقول فارغة عند إعادة فتح أو اختيار الطالب.
* **المطلوب بشكل عاجل في الباك إند:** إضافة عمود `Email` وعمود `University` إلى جدول `Students` وإدراجهما في `CreateStudentDto`, `UpdateStudentDto`, `StudentDto` لتمكين حفظهما واسترجاعهما من السيرفر مباشرة.

---

### ملخص توافق الفرونت إند الحالي:
- ✅ كود الفرونت إند الحالي متوافق 100% ويعمل بسلاسة مع الباك إند الحالي والـ Endpoints الجديدة.
- ✅ جميع اختبارات التحقق و `npm run build` تعمل بـ 0 أخطاء (Build Success exit code 0).
