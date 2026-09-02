// ============================================================
// verify-payment — التحقق من حالة الدفع بأمان (webhook/callback موقّع)
// ============================================================
// يُرسل من العميل بعد العودة من البوابة: POST {
//   order_id, gateway, transaction_id, signature?
// }
// يرجع: { ok: true, status: 'paid'|'failed', order_id } أو { ok: false, error }
//
// أضف الأسرار التالية في Supabase:
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_URL
//   MOYASAR_SECRET_KEY (لو تستخدم Moyasar)
//
// للنشر:
//   supabase functions deploy verify-payment --no-verify-jwt
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase environment configuration');

    const body = await req.json();
    const { order_id, gateway, transaction_id, signature } = body;
    if (!order_id) throw new Error('order_id مطلوب');

    const supabase = createClient(supabaseUrl, serviceKey);

    // TODO: بالإنتاج — تحقق من توقيع البوابة (signature) أو استعلم عن حالة transaction من API البوابة.
    // في الوضع الحالي: نتحقق من وجود transaction بـ status='paid' في payment_transactions.

    let isPaid = false;
    if (transaction_id) {
      const { data: txn } = await supabase
        .from('payment_transactions')
        .select('status')
        .eq('id', transaction_id)
        .maybeSingle();
      isPaid = txn?.status === 'paid';
    }

    // TODO: Webhook: إذا أرسلت البوابة إشارة موقّعة بحالة paid، حدّث الطلب هنا.

    if (isPaid) {
      await supabase
        .from('store_orders')
        .update({ status: 'paid', payment_status: 'paid' })
        .eq('id', order_id);
    }

    return new Response(JSON.stringify({
      ok: true,
      order_id,
      status: isPaid ? 'paid' : 'pending',
      verified: isPaid,
    }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
