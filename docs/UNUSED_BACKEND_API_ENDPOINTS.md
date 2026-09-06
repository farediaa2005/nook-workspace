# خدمات ونقاط اتصال الـ API المتوفرة في الباك إند وغير مستخدمة في الفرونت إند
# Unused Backend API Endpoints in Current Frontend UI

تم استخراج هذه القائمة من توثيق OpenAPI الخاص بـ Nook Workspace API (`https://nook.runasp.net/openapi/v1.json`) بعد مراجعة شاملة لجميع شاشات ومسارات الفرونت إند الحالية.

هذه الخدمات موجودة وجاهزة في الـ Backend ولكن لا توجد لها صفحات أو واجهات مستخدم مخصصة في الفرونت إند حالياً.

---

## 1. نظام إدارة الكورسات والأنشطة التعليمية (Courses System) - 19 نقطة اتصال
يمتلك الـ Backend نظاماً متكاملاً لإدارة الدورات التدريبية والكورسات، لكن لا توجد شاشة للكورسات في الفرونت إند حالياً:

| Endpoint | Method | الوصف |
|---|---|---|
| `/api/Courses` | `GET` | استرجاع قائمة الكورسات والدورات مع التصفية |
| `/api/Courses` | `POST` | إنشاء كورس تدريبي جديد |
| `/api/Courses/{id}` | `GET` | استرجاع تفاصيل الكورس |
| `/api/Courses/{id}` | `PUT` | تعديل بيانات الكورس |
| `/api/Courses/{id}` | `DELETE` | حذف كورس |
| `/api/Courses/{courseId}/enroll` | `POST` | تسجيل وتسجيل طالب في الكورس |
| `/api/Courses/{courseId}/enroll/{studentId}` | `DELETE` | إلغاء تسجيل طالب من الكورس |
| `/api/Courses/{courseId}/students` | `GET` | استعراض قائمة الطلاب المسجلين بالكورس |
| `/api/Courses/{courseId}/sessions` | `POST` | إضافة جلسة/محاضرة للكورس |
| `/api/Courses/{courseId}/sessions` | `GET` | استعراض جدول محاضرات وجلسات الكورس |
| `/api/Courses/sessions/{sessionId}/attendance` | `POST` | تسجيل حضور وغياب الطلاب في المحاضرة |
| `/api/Courses/sessions/{sessionId}/attendance` | `GET` | استعراض كشف حضور المحاضرة |
| `/api/Courses/{courseId}/students/{studentId}/attendance` | `GET` | سجل حضور طالب معين طوال فترة الكورس |
| `/api/Courses/{courseId}/files` | `POST` | رفع ملفات ومذكرات تعليمية للكورس |
| `/api/Courses/{courseId}/files` | `GET` | تحميل واستعراض ملفات الكورس |
| `/api/Courses/files/{fileId}` | `DELETE` | حذف ملف من الكورس |
| `/api/Courses/{courseId}/materials-summary` | `GET` | ملخص المواد والملفات التعليمية |
| `/api/Courses/{courseId}/announcements` | `POST` | نشر إعلان وتنبيه لطلاب الكورس |
| `/api/Courses/{courseId}/announcements` | `GET` | استعراض إعلانات الكورس |

> **المقترح:** يمكن إضافة قسم جديد في القائمة الجانبية باسم "الكورسات التدريبية / Courses" لإدارة المحاضرات والمواد والحضور.

---

## 2. نظام محفظة الطالب وشحن الرصيد (Student Wallet System) - 8 نقاط اتصال
يمتلك الـ Backend نظام محفظة مالية رقمية متطور لكل طالب، ولكن الفرونت يقتصر فقط على حقل إدخال رقمي بسيط عند تسجيل الدخول دون واجهة إدارة وسجل حركات:

| Endpoint | Method | الوصف |
|---|---|---|
| `/api/Wallet/student/{studentId}/balance` | `GET` | استعلام رصيد محفظة الطالب الحالي |
| `/api/Wallet/student/{studentId}/transactions` | `GET` | كشف حساب وسجل حركات المحفظة (إيداع، خصم) |
| `/api/Wallet/topup/direct` | `POST` | شحن مباشر لمحفظة الطالب من الاستقبال |
| `/api/Wallet/deduct` | `POST` | خصم يدوي من محفظة الطالب |
| `/api/Wallet/topup/request` | `POST` | طلب شحن محفظة (من التطبيق أو التحويل البنكي) |
| `/api/Wallet/topup/requests` | `GET` | استعراض جميع طلبات شحن المحفظة المعلقة |
| `/api/Wallet/topup/requests/{id}` | `GET` | مراجعة تفاصيل طلب الشحن وإيصال التحويل |
| `/api/Wallet/topup/requests/{id}/review` | `PUT` | قبول أو رفض طلب الشحن وإيداع الرصيد |

> **المقترح:** يمكن إضافة تبويب فرعي أو شاشة "المحافظ المالية / Wallets" لمراجعة إيداعات الطلاب وتأكيد إيصالات التحويل (InstaPay / فودافون كاش).

---

## 3. المخطط التفاعلي ومواقع المقاعد (Floor Plans & Seat Layouts) - 17 نقطة اتصال
يتضمن الـ Backend محركاً بيانياً متكاملاً لمخطط الصالة والطوابق وتوزيع المكاتب والمقاعد وأنواعها وإحداثياتها:

| Endpoint | Method | الوصف |
|---|---|---|
| `/api/FloorPlans` | `GET`, `POST` | استعراض وإنشاء مخططات الأدوار والصالات |
| `/api/FloorPlans/{id}` | `GET`, `PUT`, `DELETE` | إدارة وحذف مخطط دور معين |
| `/api/SeatElementTypes` | `GET`, `POST` | استعراض وإنشاء أنواع المقاعد (مكتب فردي، طاولة اجتماعات، كرسي صامت) |
| `/api/SeatElementTypes/{id}` | `GET`, `PUT`, `DELETE` | تعديل وتخصيص نوع المقعد وأبعاده وطاقته |
| `/api/SeatElementTypes/{id}/image` | `POST` | رفع أيقونة/صورة لنوع المقعد |
| `/api/SeatElements` | `POST` | إضافة عنصر مقعد/مكتب للمخطط |
| `/api/SeatElements/{id}` | `GET`, `PUT`, `DELETE` | تعديل موقع المقعد وحالته |
| `/api/SeatElements/floor-plan/{floorPlanId}` | `GET` | جلب جميع المقاعد والمكاتب لمخطط محدد |
| `/api/SeatElements/sync/{floorPlanId}` | `POST` | مزامنة حفظ كامل المقاعد على المخطط دفعة واحدة |

> **المقترح:** في شاشات الاستقبال والـ Settings، يمكن دمج خريطة مرئية (Visual Floor Map) تمكن الموظف من النقر على المكتب مباشرة لحجزه للعميل.

---

## 4. نظام إدارة كوبونات الخصم الترويجية (Promotional Coupons) - 8 نقاط اتصال
يوفر الـ Backend نظام كوبونات خصم (Promo Codes) منفصل عن خصومات الكليات:

| Endpoint | Method | الوصف |
|---|---|---|
| `/api/Coupons` | `GET`, `POST` | استعراض وإنشاء كوبونات الخصم الترويجية |
| `/api/Coupons/{id}` | `GET`, `PUT`, `DELETE` | تفاصيل وتعديل وإلغاء كوبون خصم |
| `/api/Coupons/code/{code}` | `GET` | فحص كود الكوبون وصلاحيته وقيمته |
| `/api/Coupons/redeem/{code}` | `POST` | تفعيل واستخدام كوبون |
| `/api/Coupons/{id}/redemptions` | `GET` | كشف وسجل جميع عمليات استخدام الكوبون والعملاء المستفيدين |

> **المقترح:** إضافة شاشة فرعية ضمن قسم التفاصيل (`/details/coupons`) لإنشاء أكواد الخصم والحملات التسويقية وتحديد عدد مرات الاستخدام.

---

## 5. واجهات تطبيقات الموبايل للمحاضرين والطلاب (Mobile APIs) - 33 نقطة اتصال
هذه المجموعة مصممة خصيصاً لتطبيقات الهواتف الذكية (iOS / Android) الخاصة بالمحاضرين والطلاب:
- **تطبيق المحاضر (`/api/mobile/instructor/*` - 15 نقطة):**
  - فحص توافر القاعات، حجز القاعات ومراجعة حجوزاته، استعراض الباقات والأسعار، واستقبال وقراءة الإشعارات.
- **تطبيق الطالب (`/api/mobile/student/*` - 18 نقطة):**
  - استعراض المخطط والغرف، حجز مقعد، إدارة المحفظة وشحن الرصيد، شراء الباقات، واستقبال الإشعارات.

---

## 6. استعادة وتغيير كلمة المرور وتسجيل الدخول بجوجل (Auth Extensions) - 4 نقاط اتصال
| Endpoint | Method | الوصف |
|---|---|---|
| `/api/Auth/forgot-password` | `POST` | طلب استعادة كلمة المرور عبر البريد |
| `/api/Auth/reset-password` | `POST` | إعادة تعيين كلمة المرور برمز التحقق |
| `/api/Auth/change-password` | `PUT` | تغيير كلمة المرور للمستخدم المسجل |
| `/api/Auth/google` | `POST` | تسجيل الدخول باستخدام حساب Google |

> **المقترح:** إضافة روابط "نسيت كلمة المرور؟" و"تغيير كلمة المرور" من ملف المستخدم في شريط التنقل العلوي.
