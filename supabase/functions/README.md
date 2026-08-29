# Supabase Edge Functions — درة فارس الشمال

## الدوال

### 1) `verify-payment` — التحقق السيرفري من الدفع
يغلق ثغرة تأكيد الدفع من المتصفح: يجلب حالة العملية الحقيقية من سيرفر البوابة،
يطابق المبلغ مع `store_orders.total` (بالهللة، تسامح ±1)، ثم يحدّث الطلب عبر
`service_role` بشكل idempotent ويسجّل في `audit_logs`.

- **الطلب:** `POST { order_id: uuid, payment_id: string, gateway: "moyasar" }`
- **الرد:** `{ success, payment_status, order_number?, message?, status? }`
- **متغيرات env المطلوبة:**
  - `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` (متوفرة تلقائياً)
  - `MOYASAR_SECRET_KEY` — سر بوابة Moyasar (إلزامي)
  - `ALLOWED_ORIGIN` — (اختياري) نطاق إضافي مسموح له بـ CORS
- **النشر:**
  ```bash
  supabase secrets set MOYASAR_SECRET_KEY=sk_live_xxx
  supabase functions deploy verify-payment --no-verify-jwt
  ```
  (تُستدعى من صفحة عودة الدفع وقد لا يتوفر JWT — التحقق يتم سيرفرياً عبر
  payment_id + مطابقة المبلغ، والدالة idempotent.)

### 2) `store-zatca` — وسيط زاتكا المحصّن
نسخة محصّنة من `edge-function-store-zatca.ts`: JWT إلزامي + دور `admin` من
جدول `profiles` + CORS مقيد + أسرار زاتكا من env فقط. نفس مسارات ZATCA
(developer-portal للمحاكاة، `/compliance`, `/compliance/invoices`,
`/invoices/reporting/single`, `/invoices/clearance/single`, `/production/csids`).

- **الطلب:** `POST { action, otp?, payload }` مع ترويسة `Authorization: Bearer <user jwt>`
- **الرد:** `{ upstreamStatus, body }` (دائماً HTTP 200 — نفس عقد النسخة الأصلية)
- **متغيرات env المطلوبة:**
  - `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` (متوفرة تلقائياً)
  - `ZATCA_ENV` — `simulation` أو `production` (الافتراضي: `simulation`)
  - `ZATCA_CSID` و `ZATCA_SECRET` — شهادة زاتكا وسرّها (إلزامي لكل الإجراءات عدا `compliance` الذي يحتاج OTP فقط)
  - `ALLOWED_ORIGIN` — (اختياري) نطاق إضافي مسموح له بـ CORS
- **النشر:**
  ```bash
  supabase secrets set ZATCA_ENV=simulation ZATCA_CSID=xxx ZATCA_SECRET=xxx
  supabase functions deploy store-zatca
  ```
  ⚠️ **بدون** `--no-verify-jwt` — التحقق من JWT يتم يدوياً داخل الكود،
  والنشر الافتراضي (verify-jwt مفعّل) مطلوب كطبقة حماية إضافية.

## ملاحظات مشتركة
- CORS في الدالتين مقيد بـ `https://alshamal-df.com` و `https://www.alshamal-df.com`
  (+ `ALLOWED_ORIGIN` إن ضُبط)، مع دعم preflight `OPTIONS`.
- رسائل الأخطاء للمستخدم بالعربية، والتفاصيل التقنية بالإنجليزية في حقل `details`.
- لا تُرجع الدالتان أي أسرار أو بيانات بوابة كاملة — الحالة فقط.
