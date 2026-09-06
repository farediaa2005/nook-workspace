# 📁 خريطة وهيكلية ملفات مشروع NOOK Workspace

> **مرجع شامل لتوزيع الملفات والمسؤوليات (Project File Structure & Architecture Map)**  
> تم تصميم هذه الهيكلية باتباع مبادئ **Clean Architecture** وفصل المسؤوليات (**Separation of Concerns**) لتكون واضحة، سهلة الصيانة، وقابلة للتوسع.

---

## 🌳 الشجرة الكاملة للمشروع (Full Project Tree)

```text
Frontend/
│
├── docs/                                    # 📚 التوثيق المرجعي للمشروع
│   ├── ARCHITECTURE.md                      # ميثاق المعمارية والقواعد التنظيمية
│   ├── DESIGN_SYSTEM.md                     # توثيق نظام التصميم (الألوان، الخطوط، المتغيرات)
│   ├── DESIGN_SYSTEM.html                   # صفحة المعاينة التفاعلية لنظام التصميم
│   ├── FILE_STRUCTURE.md                    # نبذة عامة عن الهيكل
│   └── PROJECT_STRUCTURE.md                 # الدليل الشامل لجميع الملفات والمسارات
│
├── public/                                  # 🖼️ الملفات الثابتة (Static Assets)
│   ├── favicon.ico                          # أيقونة الموقع في المتصفح
│   └── images/                              # الصور والشعارات
│       ├── logo-dark.png                    # الشعار للوضع الليلي (Dark Theme)
│       ├── logo-light.png                   # الشعار للوضع النهاري (Light Theme)
│       ├── login-bg-dark.jpg                # خلفية تسجيل الدخول (Dark)
│       └── login-bg-light.jpg               # خلفية تسجيل الدخول (Light)
│
├── src/
│   ├── index.html                           # نقطة الدخول الرئيسية لصفحة الويب (HTML Shell + Google Fonts)
│   ├── main.ts                              # ملف الإقلاع وتشغيل التطبيق (Angular Bootstrap)
│   ├── styles.css                           # التصميم العام والمتغيرات والـ Utilities العامة
│   │
│   ├── app/
│   │   ├── app.ts                           # المكون الجذري (Root Component)
│   │   ├── app.html                         # قالب المكون الجذري (<router-outlet>)
│   │   ├── app.css                          # استايل المكون الجذري
│   │   ├── app.config.ts                    # إعدادات التطبيق والمزودات (Router, HttpClient, Interceptors)
│   │   ├── app.routes.ts                    # جدول التوجيه والمسارات الكلي (Lazy-loaded Routes)
│   │   ├── app.spec.ts                      # اختبارات الوحدة للمكون الجذري
│   │   │
│   │   ├── core/                            # ⚙️ البنية التحتية والخدمات العامة (Singleton Core)
│   │   │   ├── constants/                   # الثوابت الموحدة (تمنع التكرار والـ Hardcoding)
│   │   │   │   ├── routes.ts                # ثوابت جميع الروابط والمسارات (ROUTES)
│   │   │   │   ├── app.constants.ts         # ثوابت التطبيق (STORAGE_KEYS, Roles, Pagination)
│   │   │   │   └── api-endpoints.ts         # عناوين ونقاط الـ API لكل الميزات (API_ENDPOINTS)
│   │   │   │
│   │   │   ├── guards/                      # حراس المسارات (Route Guards)
│   │   │   │   └── auth.guard.ts            # حماية المسارات والتحقق من تسجيل الدخول
│   │   │   │
│   │   │   ├── interceptors/                # معترضات طلبات HTTP
│   │   │   │   └── auth.interceptor.ts      # إرفاق توكن المصادقة (Bearer Token) تلقائياً
│   │   │   │
│   │   │   ├── models/                      # نماذج البيانات والواجهات (TypeScript Interfaces & DTOs)
│   │   │   │   ├── user.model.ts            # بيانات المستخدم وصلاحياته (AuthUser, User)
│   │   │   │   ├── student.model.ts         # بيانات الطالب
│   │   │   │   ├── classroom.model.ts       # بيانات القاعات والغرف
│   │   │   │   ├── api-response.model.ts    # واجهات استجابة الـ API الموحدة (Paginated, Error, etc.)
│   │   │   │   └── index.ts                 # Barrel Export لتسهيل استيراد الـ Models
│   │   │   │
│   │   │   └── services/                    # الخدمات العامة (Singleton Services)
│   │   │       ├── auth.service.ts          # إدارة جلسة المستخدم والمصادقة (Signals-based)
│   │   │       ├── language.service.ts      # نظام الترجمة المزدوج (عربي RTL / إنجليزي LTR)
│   │   │       └── api/                     # خدمات الاتصال بالخادم والـ Backend
│   │   │           └── base-api.service.ts  # الخدمة الأساسية للتعامل مع HTTP (Get, Post, Put, Delete)
│   │   │
│   │   ├── layouts/                         # 📐 تخطيطات الشاشات (Layout Wrappers)
│   │   │   ├── auth-layout/                 # تخطيط شاشات المصادقة (شاشة كاملة بدون شريط جانبي)
│   │   │   │   ├── auth-layout.component.ts
│   │   │   │   ├── auth-layout.component.html
│   │   │   │   └── auth-layout.component.css
│   │   │   │
│   │   │   └── main-layout/                 # التخطيط الرئيسي للوحة التحكم (Sidebar + Navbar + Content)
│   │   │       ├── main-layout.component.ts
│   │   │       ├── main-layout.component.html
│   │   │       └── main-layout.component.css
│   │   │
│   │   ├── shared/                          # 🧩 المكونات المشتركة القابلة لإعادة الاستخدام (Generic UI)
│   │   │   └── components/
│   │   │       ├── sidebar/                 # القائمة الجانبية (الأكورديون، التوجيه، التجاوب)
│   │   │       ├── navbar/                  # الشريط العلوي (البحث، تغيير الثيم، اللغة، الحساب)
│   │   │       ├── page-header/             # ترويسة الصفحات الموحدة (العنوان والوصف)
│   │   │       ├── data-table/              # جدول عرض البيانات
│   │   │       ├── modal/                   # النوافذ المنبثقة (Popups/Modals)
│   │   │       ├── confirm-dialog/          # نافذة تأكيد الإجراءات (حذف/تعديل)
│   │   │       ├── search-box/              # صندوق البحث السريع
│   │   │       ├── pagination/              # شريط التنقل بين الصفحات
│   │   │       └── footer/                  # التذييل السفلي
│   │   │
│   │   ├── auth/                            # 🔐 ميزات وصفحات المصادقة
│   │   │   └── login/                       # صفحة تسجيل الدخول (مع تأثير المصباح والتفاعل)
│   │   │       ├── login.component.ts
│   │   │       ├── login.component.html
│   │   │       └── login.component.css
│   │   │
│   │   └── features/                        # 🚀 صفحات وميزات الأعمال (Business Features)
│   │       │
│   │       ├── dashboard/                   # 1. لوحة التحكم الرئيسية والإحصائيات
│   │       │   ├── dashboard.component.ts
│   │       │   ├── dashboard.component.html
│   │       │   └── dashboard.component.css
│   │       │
│   │       ├── workspace/                   # 2. ميزة مساحة عمل الطلاب (Workspace)
│   │       │   ├── add-student/             # تسجيل دخول طالب جديد (Check-in & Billing)
│   │       │   ├── show-student/            # عرض الطلاب المتواجدين
│   │       │   └── checkout/                # محاسبة ومغادرة الطالب (Checkout)
│   │       │
│   │       ├── classroom/                   # 3. ميزة القاعات والغرف (Classrooms)
│   │       │   ├── add-classroom/           # إضافة قاعة جديدة
│   │       │   ├── show-classroom/          # عرض القاعات وحالتها
│   │       │   └── checkout/                # إنهاء حجز قاعة
│   │       │
│   │       ├── package/                     # 4. ميزة الباقات والاشتراكات (Packages)
│   │       │   ├── add-student-package/     # إضافة باقة طالب
│   │       │   ├── show-student-package/    # عرض باقات الطلاب
│   │       │   ├── add-instructor-package/  # إضافة باقة محاضر
│   │       │   └── show-instructor-package/ # عرض باقات المحاضرين
│   │       │
│   │       ├── shift/                       # 5. ميزة إدارة الورديات (Shifts)
│   │       │   ├── add-shift/               # بدء وردية جديدة
│   │       │   ├── show-shift/              # عرض تفاصيل الوردية الحالية
│   │       │   └── search-shift/            # البحث في أرشيف الورديات
│   │       │
│   │       ├── reservation/                 # 6. ميزة الحجوزات المسبقة (Reservations)
│   │       │   ├── add-reservation/         # إنشاء حجز مسبق
│   │       │   └── show-reservation/        # عرض جدول الحجوزات
│   │       │
│   │       ├── details/                     # 7. البيانات المرجعية والإعدادات الفرعية (Details)
│   │       │   ├── add-discount/            # إضافة كود خصم
│   │       │   ├── show-colleges/           # قائمة الكليات والجامعات
│   │       │   ├── show-blacklist/          # القائمة السوداء (Blacklist)
│   │       │   └── show-instructors/        # قائمة المحاضرين والمدربين
│   │       │
│   │       ├── catering/                    # 8. البوفيه والمشروبات والمخزن (Catering)
│   │       │   ├── add-products/            # إضافة منتج جديد للبوفيه
│   │       │   ├── show-products/           # قائمة المنتجات والأسعار
│   │       │   └── product-graph/           # إحصائيات ورسوم بيانية لاستهلاك المنتجات
│   │       │
│   │       └── settings/                    # 9. إعدادات النظام والمستخدمين (Settings)
│   │           ├── add-user/                # إضافة موظف/مستخدم جديد للنظام
│   │           └── show-user/               # عرض وإدارة مستخدمي لوحة التحكم
│   │
│   └── testing/                             # 🧪 أدوات الاختبار والبيانات الوهمية
│       └── mocks/                           # بيانات التطوير المؤقتة (منفصلة تماماً عن كود الإنتاج)
│           ├── students.mock.ts             # بيانات الطلاب التجريبية
│           ├── sessions.mock.ts             # بيانات الجلسات التجريبية
│           └── users.mock.ts                # بيانات المستخدمين التجريبية
│
├── .editorconfig                            # معايير التحرير والتنسيق الموحدة لمحررات الأكواد
├── .gitignore                               # استثناء مجلدات التثبيت والبناء من Git
├── .prettierrc                              # إعدادات المنسق Prettier
├── angular.json                             # إعدادات الـ CLI والبناء في Angular
├── package.json                             # الحزم والمكتبات والـ Scripts
├── package-lock.json                        # إصدارات الحزم المقفلة
├── tsconfig.json                            # إعدادات TypeScript الأساسية
├── tsconfig.app.json                        # إعدادات TypeScript لتطبيق Angular
├── tsconfig.spec.json                       # إعدادات TypeScript للاختبارات (Vitest)
└── README.md                                # الدليل العام لتشغيل المشروع
```

---

## 🎯 قواعد المسؤولية وتوزيع الكود (Architectural Responsibilities)

| نوع الكود (Code Type) | المجلد المخصص (Directory) | المسؤولية وقواعد الاستخدام (Rule) |
| :--- | :--- | :--- |
| **واجهات ومكونات عامة** | `src/app/shared/components/` | مكونات عامة بدون Business Logic (مثل: أزرار، جداول، نوافذ منبثقة). |
| **صفحات الميزات** | `src/app/features/` | الصفحات الفعلية الخاصة بنظام Workspace مرتبة حسب المجال (Domain). |
| **خدمات الـ API** | `src/app/core/services/api/` | طلبات HTTP مع الـ Backend عبر `BaseApiService`، ولا توضع أبداً داخل الـ Component مباشرة. |
| **نماذج البيانات (Models)** | `src/app/core/models/` | واجهات TypeScript الخاصة بالبيانات والـ DTOs لكل مجال في ملف منفصل. |
| **الثوابت المشتركة** | `src/app/core/constants/` | الروابط (`routes.ts`)، العناوين (`api-endpoints.ts`)، ومفاتيح التخزين. |
| **بيانات المحاكاة (Mocks)** | `src/testing/mocks/` | بيانات وهمية للتطوير فقط، معزولة تماماً ليتم استبدالها بروابط الـ API لاحقاً. |
| **التوثيق (Docs)** | `docs/` | مراجع التصميم والمعمارية والتعليمات. |

---

## 💡 التوجيه والمصادقة (Routing & Auth Flow)

1. **المسار الافتراضي `/`**: محمي عبر `authGuard`.
2. **شاشات المصادقة (`/auth/login`)**: تفتح داخل `AuthLayoutComponent`.
3. **شاشات لوحة التحكم (`/dashboard`, `/workspace/...`, إلخ)**: تفتح داخل `MainLayoutComponent` الذي يوفر الشريط الجانبي والعلوي.
4. **التحميل الكسول (Lazy Loading)**: جميع الصفحات داخل `app.routes.ts` يتم تحميلها عند الحاجة عبر `loadComponent()`.
