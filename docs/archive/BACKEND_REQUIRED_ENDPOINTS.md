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

### 7. حساب وتخزين إحصائيات مبيعات وإيرادات المنتجات (`GET /api/Products`)
* **المشكلة (مشكلة 3 و 4 في التيستنج):** عند بيع منتج من الكافتيريا أو الجلسات، يتم خصم المخزون بنجاح، ولكن عمود المبيعات والإيراد في قائمة المنتجات يعود إلى `0` بعد تحديث الصفحة (Refresh) لعدم وجود حقول `soldCount` و `totalRevenue` في استجابة `GET /api/Products` (`ProductDto`). كما أن كروت الإحصائيات (متوسط قيمة الطلب، طرق الدفع) تحتاج إلى ربط موحد مع معاملات المبيعات.
* **المطلوب في الباك إند:**
  1. إضافة حقلي `soldCount` (عدد القطع المباعة) و `totalRevenue` (إجمالي إيراد المنتج) في `ProductDto` المرجع من `GET /api/Products`.
  2. تحديث هذين الحقلين في قاعدة البيانات تلقائياً مع كل حركة بيع من الكافتيريا أو جلسات الورك سبيس والقاعات.
  3. ربط معاملات الكافتيريا المباشرة بالورديات لتغذية كروت الإحصائيات وطرق الدفع (نقدي / فيزا / محفظة) بدقة.

---

### 8. التحقق الصارم من الحد الأقصى لاستخدام كود الخصم في السيرفر (`POST /api/Coupons/redeem/{code}`)
* **المشكلة (مشكلة 10 في التيستنج):** يمكن تطبيق كود الخصم (مثل `SAVE91`) أكثر من الحد الأقصى المحدد له (مثلاً 2) دون أن يرفض السيرفر الطلب، والعداد في الواجهة يظهر `2/0` بدلاً من `x/2` إذا كان الـ DTO يرجع حقل الحد الأقصى باسم غير متطابق أو بقيمة `0`.
* **المطلوب في الباك إند:**
  1. عند طلب `POST /api/Coupons/redeem/{code}` أو أثناء إنشاء/دفع الفاتورة، التحقق الصارم في الـ Controller/Service: إذا كان `coupon.UsageCount >= coupon.UsageLimit` (وكان `UsageLimit > 0`)، يتم رفض الطلب فوراً بـ `400 Bad Request` مع رسالة: `"تم تجاوز الحد الأقصى لاستخدام هذا الكوبون"`.
  2. زيادة `UsageCount` بمقدار 1 في نفس الـ Database Transaction الخاصة بتسديد الفاتورة.
  3. التأكد من إرجاع `usageLimit` و `usageCount` في كائن `CouponDto` عند استدعاء `GET /api/Coupons` و `GET /api/Coupons/{id}`.

---

### 9. منع تجاوز قيمة الخصم لإجمالي الفاتورة في السيرفر (Server-side Subtotal Clamping)
* **المشكلة (مشكلة 11 في التيستنج):** عند تطبيق كود خصم بقيمة ثابتة (مثلاً 20 ج.م) على فاتورة إجماليها 10 ج.م فقط، يُسمح بتطبيق الكود مما ينتج عنه رصيد سالب أو غير منطقي.
* **المطلوب في الباك إند:**
  - في منطق احتساب الفاتورة بالباك إند، تقييد قيمة الخصم المطبقة بـ `Math.Min(discountValue, subtotal)` بحيث لا يتجاوز الخصم الإجمالي الفرعي للفاتورة مطلقاً، ولا ينتج إجمالي نهائي أقل من الصفر.

---

### 10. تفعيل وتكوين خدمة الملفات الثابتة (Static Files) لمجلد الصور المرفوعة (`/uploads`) في السيرفر
* **المشكلة الصريحة:**
  - عند رفع أي صورة منتج من الفرونت إند عبر `POST /api/Products` أو `POST /api/Products/{id}/image` (مثل المنتج `ff` أو المنتجات السابقة `cafe ole`, `chicken 1-4`, `شاي نعناع`)، يقوم السيرفر باستلام الصورة وتخزين المسار في قاعدة البيانات بنجاح:
    `"imageUrl": "/uploads/products/f037622238a74cdeb4029f6af1ba760a.jpeg"`
  - **ولكن** عند محاولة المتصفح طلب الصورة عبر:
    `GET https://nook.runasp.net/uploads/products/f037622238a74cdeb4029f6af1ba760a.jpeg`
    يقوم سيرفر الـ ASP.NET Core على استضافة RunAsp بإرجاع **`HTTP 404 Not Found`** لجميع الصور بدون استثناء!
* **السبب التقني في الباك إند:**
  - في ASP.NET Core، دالة `app.UseStaticFiles()` الافتراضية تقوم بخدمة الملفات الموجودة داخل مجلد `wwwroot` فقط.
  - إذا كان كود السيرفر يقوم بحفظ الصور في مجلد `uploads` في مسار المشروع الرئيسي (خارج `wwwroot`، مثلاً عبر `Directory.GetCurrentDirectory() + "/uploads"`):
    فإن ASP.NET Core **يرفض تقديم هذه الملفات ويعطي 404** لأنه لم يتم تسجيل `PhysicalFileProvider` لمجلد الـ `uploads`.
* **الحل البرمجي المطلوب تنفيذه في الباك إند (`Program.cs`):**
  إضافة الكود التالي في ملف `Program.cs` بعد بناء التطبيق وقبل `app.Run()`:
  ```csharp
  // 1. تشغيل الملفات الثابتة لـ wwwroot الافتراضي
  app.UseStaticFiles();

  // 2. تشغيل وخدمة مجلد الـ uploads لكي يتمكن المتصفح من استعراض الصور المرفوعة
  var uploadsFolder = Path.Combine(builder.Environment.ContentRootPath, "uploads");
  if (!Directory.Exists(uploadsFolder))
  {
      Directory.CreateDirectory(uploadsFolder);
  }

  app.UseStaticFiles(new StaticFileOptions
  {
      FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsFolder),
      RequestPath = "/uploads"
  });
  ```
  *(إذا كان المجلد الفعلي يُحفظ داخل `wwwroot/uploads`، يرجى التأكد من وجود مجلد `wwwroot` في ملفات النشر على استضافة RunAsp ومنح صلاحيات القراءة له).*

---

### ملخص توافق الفرونت إند الحالي:
- ✅ كود الفرونت إند الحالي متوافق 100% ويعمل بسلاسة مع الباك إند الحالي والـ Endpoints الجديدة.
- ✅ تم تنفيذ معالجات الفرونت إند لجميع مشاكل التيستنج الـ 11 بدون أي استخدام لقواعد بيانات محلية أو كاش محلي (Zero Local DB / Zero Local Storage)، وبالاعتماد المباشر على الـ API.
- ✅ تم إضافة حماية للمعاينة الفورية (Local Preview) في شاشات الإضافة والنجاح لكي تظهر الصورة التي اختارها المستخدم فوراً ريثما يقوم الباك إند بتفعيل الـ Static Files في `Program.cs`.
- ✅ جميع اختبارات التحقق و `npm run build` تعمل بـ 0 أخطاء (Build Success exit code 0).
