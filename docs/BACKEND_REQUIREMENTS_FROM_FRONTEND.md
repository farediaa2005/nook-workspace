# متطلبات ونواقص الـ Frontend المطلوبة من فريق الـ Backend (API)
# Frontend Requirements & Gaps from Backend API

تم إعداد هذا الملف بناءً على دراسة تفصيلية لجميع صفحات ومكونات تطبيق الـ Frontend ومقارنتها بـ OpenAPI Specification (v1.0) الخاص بـ Nook Workspace API (`https://nook.runasp.net/openapi/v1.json`).

يرجى إرسال هذه المتطلبات إلى مطوري الـ Backend لتوفيرها أو تعديلها.

---

## 0. تفعيل سياسة الـ CORS ومعالجة طلبات OPTIONS (مهم وحرج للغاية - Blocking)
* **المشكلة الحالية:**
  - عند محاولة المتصفح إرسال طلبات POST أو PUT أو DELETE مع `Content-Type: application/json` أو الهيدر `Authorization: Bearer <token>`، يقوم المتصفح تلقائياً بإرسال طلب فحص مبدئي (CORS Preflight `OPTIONS`).
  - يعيد خادم الباك إند (`https://nook.runasp.net`) حالياً:
    ```http
    HTTP/1.1 405 Method Not Allowed
    ```
    بدون أي ترويسات `Access-Control-Allow-Origin` أو `Access-Control-Allow-Methods`!
  - مما يتسبب في قيام المتصفح بحظر الطلب فورياً في الفرونت إند بظهور خطأ CORS ومنع استكمال تسجيل الدخول وباقي العمليات إلا إذا تم استخدام Proxy محلي.
* **المطلوب من الباك إند:**
  - إضافة تفعيل الـ CORS في `Program.cs` في ASP.NET Core قبل Middleware الخاص بـ Authentication و Authorization:
    ```csharp
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowAll", policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    });

    // داخل خط المعالجة (Pipeline) - قبل UseAuthentication و UseAuthorization:
    app.UseCors("AllowAll");
    ```

---

## 1. حساب المدير الافتراضي والصلاحيات (Admin Seed Credentials & Roles)
* **المشكلة الحالية:**
  - عند تجربة تسجيل الدخول باستخدام مستخدم جديد عبر `POST /api/Auth/register`، يتم إعطاؤه دور **طالب (Student / Role 3)** بشكل افتراضي.
  - وبمجرد تسجيل دخوله بنجاح ومحاولة فتح لوحة التحكم الرئيسية (`/api/Dashboard/summary`) أو إدارة الغرف أو الورديات أو الطلاب أو المنتجات، يعيد الـ API خطأ:
    ```json
    403 Forbidden: {"success":false,"message":"ليس لديك صلاحية للوصول لهذا المورد."}
    ```
  - لا توجد بيانات اعتماد لحساب مسؤول/مدير (Admin / Staff) مسجلة مسبقاً (Seeded) في قاعدة البيانات وموثقة في Swagger.
* **المطلوب من الباك إند:**
  1. إنشاء حساب مدير رئيسي افتراضي (Default System Admin) مع توفير اسم المستخدم وكلمة المرور لتسجيل الدخول به في الفرونت إند.
  2. توفير endpoint لإنشاء وتعيين موظفين ومديرين بصلاحيات إدارية كاملة (Staff / Admin Roles) من لوحة تحكم الإدارة.

---

## 2. تسجيل دخول الطالب المباشر لمساحة العمل (Walk-in Workspace Session)
* **المشكلة الحالية:**
  - في واجهة الاستقبال (`/workspace/add-student` و `/workspace/show-student`)، يقوم موظف الاستقبال بإدخال اسم الطالب ورقم هاتفه وكليته ونوع الحساب مباشرة لفتح الجلسة في لحظتها.
  - في الـ API، نقطة النهاية `POST /api/Workspaces` تتطلب إجبارياً حقل `studentId: Guid` لطالب موجود بالفعل مسبقاً في جدول `Students`!
* **المطلوب من الباك إند:**
  1. إما السماح لـ `POST /api/Workspaces` باستقبال بيانات الطالب (`name`, `phoneNumber`, `facultyId`) وإنشاء الطالب تلقائياً إذا لم يكن مسجلاً،
  2. أو توفير نقطة نهاية مخصصة للاستقبال المباشر: `POST /api/Workspaces/checkin-walkin`.

---

## 3. تصنيفات منتجات الكاترنج (Product Categories)
* **المشكلة الحالية:**
  - واجهات الكاترنج (`/catering/show-products` و `/catering/add-products` و `/catering/product-graph`) مقسمة حسب تصنيفات المنتجات (سناكس ومخبوزات، مشروبات وعصائر، قهوة مثلجة وساخنة، وجبات، إلخ).
  - نموذج الـ API الحالي `ProductDto` في `GET /api/Products` و `POST /api/Products` يحتوي فقط على:
    `name, imageUrl, serialNo, piecePrice, quantity, cost, restockDate, expireDate`.
    ولا يحتوي على حقل **التصنيف (Category)** أو اسم التصنيف!
* **المطلوب من الباك إند:**
  - إضافة حقل `category` (string أو enum) في كلاً من `ProductDto` و `CreateProductDto`.

---

## 4. نقطة بيع مباشرة وسريعة للمنتجات (Direct Counter POS Endpoint)
* **المشكلة الحالية:**
  - الـ API يتيح حالياً إضافة كاترنج فقط لجلسة مساحة عمل نشطة (`/api/workspaces/{workspaceId}/catering`) أو قاعة نشطة (`/api/classrooms/{classroomId}/catering`).
  - لكن في الواقع، يأتي عملاء أو زوار للشراء المباشر من الكافيتريا/الاستقبال (Takeaway / Direct POS) دون فتح جلسة دراسية أو قاعة.
* **المطلوب من الباك إند:**
  - توفير نقطة نهاية لتسجيل بيع مباشر:
    `POST /api/Products/sale` أو `POST /api/Orders` تأخذ:
    `{ items: [{ productId, quantity, price }], payWay: PayWay, totalAmount, shiftId }`
    وتربط المعاملة فورياً بالوردية النشطة للموظف.

---

## 5. تفاصيل وتصنيفات المصروفات الإدارية في الوردية (Shift Petty Cash Expenses)
* **المشكلة الحالية:**
  - نموذج إغلاق وتحديث الوردية في الـ API `UpdateShiftDto` يحتوي فقط على رقم واحد إجمالي:
    `administrative: double`.
  - بينما واجهة الوردية والتقفيل في الفرونت إند (`/shift/active` و `/shift/end-of-shift-balance`) تسجل بنود المصروفات بتفاصيلها (صيانة، نثريات، ضيافة، فواتير، مشتريات) مع الوصف ورقم الإيصال.
* **المطلوب من الباك إند:**
  - دعم إرسال مصفوفة بنود المصروفات الإدارية عبر `POST /api/Shifts/{id}/items` بنوع صريح `Expense`، أو ربط المصروفات كـ sub-collection للوردية.

---

## 6. واجهة إعدادات النظام العامة وتخصيص المكان (System Settings API)
* **المشكلة الحالية:**
  - صفحة الإعدادات العامة (`/settings/general`) تتيح للمدير ضبط:
    - اسم المكان، الشعار، الهاتف، العنوان، الرقم الضريبي.
    - العملة الافتراضية، سعر طباعة الورقة، كود الواي فاي التلقائي، فترة السماح (Grace Period).
  - لا توجد أي endpoint في الـ API لإعدادات النظام العامة (`/api/Settings` غير موجودة إطلاقاً).
* **المطلوب من الباك إند:**
  - توفير endpoints:
    - `GET /api/Settings` (استرجاع إعدادات مساحة العمل).
    - `PUT /api/Settings` (تحديث الإعدادات وحفظها في قاعدة البيانات).

---

## 7. تطبيق كوبونات الخصم على جلسات مساحة العمل (Coupon Redemption on Workspaces)
* **المشكلة الحالية:**
  - الـ API يمتلك نظام كوبونات متقدم (`/api/Coupons`)، ولكن نموذج إنشاء أو محاسبة مساحة العمل (`CreateWorkspaceDto` و `CheckoutWorkspaceDto`) لا يقبل حقل `couponCode` لخصم القيمة تلقائياً من الفاتورة.
* **المطلوب من الباك إند:**
  - إضافة حقل `couponCode: string?` إلى `CreateWorkspaceDto` و `CheckoutWorkspaceDto` ليتم التحقق منه وتطبيق الخصم تلقائياً وتسجيل عملية الاستخدام (Redemption).

---

## 8. توثيق وحساب مدة الجلسة والتكلفة التلقائية (Live Session Duration Calculation)
* **المشكلة الحالية:**
  - عند استرجاع الجلسات من `GET /api/Workspaces`، تأتي أوقات البداية والنهاية (`timeFrom`, `timeTo`)، ولكن لا يتم إرجاع التكلفة المحتسبة تلقائياً بناءً على خطة الأسعار النشطة (`PricingPlans`)، مما يضطر الفرونت إند لحسابها يدوياً.
* **المطلوب من الباك إند:**
  - إرجاع حقل `currentCost` و `durationMinutes` ضمن `WorkspaceDto` للجلسات النشطة لتطابق الحسابات بدقة متناهية بين الخادم والعميل.
