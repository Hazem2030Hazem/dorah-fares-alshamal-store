// ============================================================
// 💳 create-payment — Supabase Edge Function (Deno — ملف واحد self-contained)
// ============================================================
//
// 📌 طريقة النشر من Dashboard (بدون CLI):
//   1) افتح Supabase Dashboard ← Edge Functions ← Create a new function
//      باسم: create-payment
//   2) امسح محتوى المحرر والصق هذا الملف كاملاً ثم اضغط Deploy
//   3) تأكد من وجود متغيرات البيئة التالية (Project Settings ← Edge Functions):
//        SUPABASE_URL              (تُضاف تلقائياً)
//        SUPABASE_SERVICE_ROLE_KEY (تُضاف تلقائياً)
//   4) ملاحظة: يُفضّل إيقاف "Verify JWT" للفانكشن من Dashboard
//      (الفانكشن عامة لأن checkout يعمل بمفتاح anon)
//
// 📌 ما تفعله الفانكشن:
//   - تستقبل طلب POST من checkout.html
//   - تقرأ البوابة المفعلة من جدول payment_gateways بمفتاح service_role
//     (الجدول محمي RLS — لا يقرأه الفرونت إطلاقاً)
//   - mode='test' ← تحوّل العميل لصفحة محاكي test-payment.html بدون أي اتصال خارجي
//   - mode='live' ← تُنشئ فاتورة/عملية دفع لدى البوابة (moyasar / tap / hyperpay)
//     وترجع رابط الدفع
//   - تسجّل كل عملية في payment_logs (لو الجدول غير موجود يتم التجاهل بصمت)
//
// 🔒 الأمان: المفاتيح لا تُرجع في أي استجابة ولا تُطبع — تُرسل للبوابة فقط.
// ============================================================

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// إرجاع استجابة JSON موحّدة مع CORS
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// شكل صف البوابة في جدول payment_gateways
interface GatewayRow {
  gateway_code: string;
  gateway_name: string;
  is_active: boolean;
  mode: 'test' | 'live';
  secret_key?: string | null;
  settings?: Record<string, unknown> | null;
}

// شكل جسم الطلب الوارد من checkout بعد المعالجة
interface PayRequest {
  order_ref: string;
  amount: number;
  currency: string;
  customer: { name: string; email: string; phone: string };
  callback_url: string;
}

// ── قراءة البوابة المفعلة من payment_gateways عبر REST بمفتاح service_role ──
async function getActiveGateway(code?: string): Promise<GatewayRow | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) throw new Error('ENV_MISSING');

  let url = `${supabaseUrl}/rest/v1/payment_gateways?is_active=eq.true&select=*&limit=1`;
  if (code) url = `${supabaseUrl}/rest/v1/payment_gateways?gateway_code=eq.${encodeURIComponent(code)}&select=*&limit=1`;

  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) {
    // الجدول غير موجود أو خطأ صلاحيات — نرمي خطأ داخلي بدون تفاصيل حساسة
    await res.text().catch(() => '');
    throw new Error('GATEWAY_LOOKUP_FAILED');
  }
  const rows: GatewayRow[] = await res.json();
  return rows && rows.length ? rows[0] : null;
}

// ── تسجيل العملية في payment_logs (تجاهل صامت لو الجدول غير موجود) ──
async function logPayment(entry: {
  order_ref: string;
  gateway_code: string;
  mode: string;
  amount: number;
  status: string;
  raw: unknown;
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return;
    await fetch(`${supabaseUrl}/rest/v1/payment_logs`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(entry),
    });
  } catch {
    // صمت تام — السجل تشغيلي فقط ولا يجب أن يكسر الدفع
  }
}

// ════════════════════════════════════════════════════════════
// 🏦 محوّلات البوابات (mode = live)
// ════════════════════════════════════════════════════════════

// ── Moyasar: إنشاء فاتورة وإرجاع رابط الدفع ──
async function createMoyasarPayment(gw: GatewayRow, p: PayRequest): Promise<string> {
  const res = await fetch('https://api.moyasar.com/v1/invoices', {
    method: 'POST',
    headers: {
      // Basic auth: secret_key كاسم مستخدم وكلمة مرور فارغة
      Authorization: 'Basic ' + btoa(`${gw.secret_key}:`),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(p.amount * 100), // ميسر يعمل بالهللات
      currency: p.currency,
      description: `طلب ${p.order_ref} — ${p.customer.name || 'عميل'}`,
      callback_url: p.callback_url,
      success_url: p.callback_url,
      back_url: p.callback_url,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.url) {
    throw new Error(`GATEWAY_ERROR_${res.status}`);
  }
  return data.url as string;
}

// ── Tap Payments: إنشاء عملية (charge) وإرجاع رابط التحويل ──
async function createTapPayment(gw: GatewayRow, p: PayRequest): Promise<string> {
  const res = await fetch('https://api.tap.company/v2/charges', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gw.secret_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: p.amount,
      currency: p.currency,
      customer: {
        first_name: p.customer.name || 'عميل',
        email: p.customer.email || undefined,
        phone: { country_code: '966', number: (p.customer.phone || '').replace(/^\+?966|^0/, '') },
      },
      source: { id: 'src_all' },
      redirect: { url: p.callback_url },
      reference: { transaction: p.order_ref },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.transaction || !data.transaction.url) {
    throw new Error(`GATEWAY_ERROR_${res.status}`);
  }
  return data.transaction.url as string;
}

// ── HyperPay (OPPWA): إنشاء checkoutId لودجت الدفع ──
// ملاحظة: ودجت HyperPay يحتاج صفحة استضافة؛ نرجع رابط callback مضافاً له checkoutId
// كي تستطيع صفحة العودة عرض الودجت أو متابعة الحالة — وid محفوظ في السجل.
async function createHyperpayPayment(gw: GatewayRow, p: PayRequest): Promise<string> {
  const settings = gw.settings || {};
  const entityId = String(settings.entityId || settings.entity_id || '');
  // اختيار بيئة الاستضافة: من الإعدادات أو حسب الـ mode
  const host = String(settings.host || (gw.mode === 'live' ? 'https://oppwa.com' : 'https://eu-test.oppwa.com'));

  const body = new URLSearchParams({
    entityId,
    amount: p.amount.toFixed(2),
    currency: p.currency,
    paymentType: 'DB', // خصم مباشر
    'customer.givenName': p.customer.name || 'عميل',
    'customer.email': p.customer.email || '',
    'customer.phone': p.customer.phone || '',
    shopperResultUrl: p.callback_url,
  });

  const res = await fetch(`${host}/v1/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gw.secret_key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await res.json().catch(() => null);
  const checkoutId = data && data.id ? String(data.id) : null;
  if (!res.ok || !checkoutId) {
    throw new Error(`GATEWAY_ERROR_${res.status}`);
  }
  // رابط مناسب يحمل checkoutId — العميل ينتقل لصفحة الودجت على نفس الموقع
  return `${p.callback_url}${p.callback_url.includes('?') ? '&' : '?'}hp_checkout=${encodeURIComponent(checkoutId)}`;
}

// ════════════════════════════════════════════════════════════
// 🚀 المعالج الرئيسي
// ════════════════════════════════════════════════════════════
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let logEntry: {
    order_ref: string;
    gateway_code: string;
    mode: string;
    amount: number;
    status: string;
    raw: unknown;
  } | null = null;

  try {
    // ── قراءة والتحقق من جسم الطلب ──
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'جسم الطلب غير صالح (JSON)' }, 400);
    }

    const orderRef = String(body.order_id || body.order_number || '').trim();
    const amount = Number(body.amount);
    const currency = String(body.currency || 'SAR').toUpperCase();
    const customer = (body.customer || {}) as Record<string, string>;
    const callbackUrl = String(body.callback_url || '').trim();
    const gatewayCode = body.gateway_code ? String(body.gateway_code).trim() : undefined;

    if (!orderRef) return jsonResponse({ error: 'order_id أو order_number مطلوب' }, 400);
    if (!amount || isNaN(amount) || amount <= 0) return jsonResponse({ error: 'amount غير صالح' }, 400);
    if (!callbackUrl) return jsonResponse({ error: 'callback_url مطلوب' }, 400);

    const payReq: PayRequest = {
      order_ref: orderRef,
      amount,
      currency,
      customer: {
        name: String(customer.name || ''),
        email: String(customer.email || ''),
        phone: String(customer.phone || ''),
      },
      callback_url: callbackUrl,
    };

    // ── جلب البوابة المفعلة ──
    let gateway: GatewayRow | null;
    try {
      gateway = await getActiveGateway(gatewayCode);
    } catch {
      return jsonResponse({ error: 'تعذر قراءة إعدادات البوابة' }, 500);
    }
    if (!gateway) return jsonResponse({ error: 'لا توجد بوابة دفع مفعلة' }, 404);
    if (!gateway.is_active) return jsonResponse({ error: 'البوابة المطلوبة غير مفعلة' }, 400);

    logEntry = {
      order_ref: orderRef,
      gateway_code: gateway.gateway_code,
      mode: gateway.mode,
      amount,
      status: 'initiated',
      raw: null,
    };

    // ── وضع تجريبي: لا اتصال بأي بوابة — تحويل لمحاكي الدفع ──
    if (gateway.mode === 'test') {
      const baseUrl = callbackUrl.split('?')[0].replace(/[^/]*$/, ''); // جذر الصفحة الحالية
      const paymentUrl =
        `${baseUrl}test-payment.html` +
        `?order=${encodeURIComponent(orderRef)}&amount=${encodeURIComponent(String(amount))}` +
        `&gateway=${encodeURIComponent(gateway.gateway_code)}&mode=test` +
        `&return=${encodeURIComponent(callbackUrl)}`;
      logEntry.status = 'test_redirect';
      await logPayment(logEntry);
      return jsonResponse({ payment_url: paymentUrl, mode: 'test', gateway: gateway.gateway_code });
    }

    // ── وضع حقيقي: التحقق من المفتاح ثم استدعاء محوّل البوابة ──
    if (!gateway.secret_key) return jsonResponse({ error: 'إعدادات البوابة ناقصة' }, 500);

    let paymentUrl: string;
    const code = gateway.gateway_code.toLowerCase();
    try {
      if (code === 'moyasar') {
        paymentUrl = await createMoyasarPayment(gateway, payReq);
      } else if (code === 'tap') {
        paymentUrl = await createTapPayment(gateway, payReq);
      } else if (code === 'hyperpay') {
        paymentUrl = await createHyperpayPayment(gateway, payReq);
      } else {
        return jsonResponse({ error: 'بوابة غير مدعومة: ' + gateway.gateway_code }, 400);
      }
    } catch (e) {
      // خطأ من البوابة — نسجله ونرجع رسالة عامة بدون كشف المفتاح
      logEntry.status = 'gateway_error';
      logEntry.raw = { message: String((e as Error) && (e as Error).message ? (e as Error).message : e) };
      await logPayment(logEntry);
      return jsonResponse({ error: 'فشل الاتصال ببوابة الدفع' }, 502);
    }

    logEntry.status = 'redirected';
    await logPayment(logEntry);
    return jsonResponse({ payment_url: paymentUrl, mode: 'live', gateway: gateway.gateway_code });
  } catch (e) {
    // خطأ غير متوقع — تسجيل داخلي فقط بدون تفاصيل للعميل
    try {
      if (logEntry) {
        logEntry.status = 'error';
        logEntry.raw = { message: String((e as Error) && (e as Error).message ? (e as Error).message : e) };
        await logPayment(logEntry);
      }
    } catch { /* صمت */ }
    return jsonResponse({ error: 'خطأ داخلي غير متوقع' }, 500);
  }
});
