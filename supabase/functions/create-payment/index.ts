// ============================================================
// create-payment — إنشاء عملية دفع عبر بوابة الدفع
// ============================================================
// يُرسل من العميل: POST {
//   order_id, amount, currency, customer: { name, email, phone },
//   callback_url, gateway_code (optional)
// }
// يرجع: { ok: true, payment_url, transaction_id } أو { ok: false, error }
//
// أضف الأسرار التالية في Supabase:
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_URL
//   MOYASAR_SECRET_KEY (لو تستخدم Moyasar)
//   GATEWAY_MASTER_KEY (مفتاح تشفير إعدادات البوابات)
//
// للنشر:
//   supabase functions deploy create-payment --no-verify-jwt
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { order_id, amount, currency, customer, callback_url, gateway_code } = body;

    if (!order_id || !amount || !callback_url) {
      throw new Error('order_id, amount, callback_url مطلوبة');
    }

    // TODO: اقرأ إعدادات البوابة المفعلة من site_settings (مشفرة)
    // TODO: أنشئ session دفع حقيقية مع Moyasar أو غيرها
    // TODO: احفظ transaction في جدول payment_transactions

    // مثال توضيحي فقط — يجب استبداله بالتكامل الحقيقي
    const transactionId = crypto.randomUUID();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);
      await supabase.from('payment_transactions').insert([{
        id: transactionId,
        order_id: order_id || null,
        gateway_code: gateway_code || 'demo',
        amount: amount || 0,
        currency: currency || 'SAR',
        status: 'pending',
        raw_response: { callback_url, customer, demo: true },
      }]);
    }

    const separator = callback_url.indexOf('?') === -1 ? '?' : '&';
    const finalPaymentUrl = callback_url + separator + 'status=success&gateway=' + encodeURIComponent(gateway_code || 'demo') + '&transaction=' + encodeURIComponent(transactionId);

    return new Response(JSON.stringify({
      ok: true,
      transaction_id: transactionId,
      payment_url: finalPaymentUrl,
      message: 'تم إنشاء عملية الدفع (وضع توضيحي)',
    }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
