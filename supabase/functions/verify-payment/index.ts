// ============================================================
// verify-payment — التحقق من حالة الدفع بأمان (Moyasar callback/webhook)
// ============================================================
// يُرسل من العميل بعد العودة من البوابة: POST {
//   order_id, gateway, transaction_id, payment_id?
// }
// يرجع: { ok: true, status: 'paid'|'failed', order_id, verified } أو { ok: false, error }
//
// أضف الأسرار التالية في Supabase:
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_URL
//   MOYASAR_SECRET_KEY
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
    const { order_id, gateway, transaction_id, payment_id } = body;
    if (!order_id) throw new Error('order_id مطلوب');

    const supabase = createClient(supabaseUrl, serviceKey);
    const moyasarSecret = Deno.env.get('MOYASAR_SECRET_KEY');
    const isDemo = !moyasarSecret || gateway === 'demo';

    let isPaid = false;
    let verified = false;
    let upstreamResponse: unknown = null;

    if (!isDemo && payment_id) {
      // استعلام عن حالة الدفع من Moyasar
      const moyasarRes = await fetch('https://api.moyasar.com/v1/payments/' + encodeURIComponent(payment_id), {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(moyasarSecret + ':'),
          'Content-Type': 'application/json',
        },
      });
      upstreamResponse = await moyasarRes.json();

      if (moyasarRes.ok && (upstreamResponse as any)?.status === 'paid') {
        isPaid = true;
        verified = true;
      }
    } else if (!isDemo && transaction_id) {
      // محاولة البحث عن transaction محلياً وتحديثها
      const { data: txn } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transaction_id)
        .maybeSingle();

      if (txn?.gateway_transaction_id && moyasarSecret) {
        const moyasarRes = await fetch('https://api.moyasar.com/v1/payments/' + encodeURIComponent(txn.gateway_transaction_id), {
          method: 'GET',
          headers: {
            'Authorization': 'Basic ' + btoa(moyasarSecret + ':'),
            'Content-Type': 'application/json',
          },
        });
        upstreamResponse = await moyasarRes.json();
        if (moyasarRes.ok && (upstreamResponse as any)?.status === 'paid') {
          isPaid = true;
          verified = true;
        }
      }
    } else if (isDemo) {
      // الوضع التوضيحي: نعتبر الدفع ناجحاً لكن غير موثّق
      isPaid = true;
      verified = false;
    }

    // تحديث حالة الطلب والمعاملة
    if (isPaid) {
      await supabase
        .from('store_orders')
        .update({ status: 'processing', payment_status: 'paid' })
        .eq('id', order_id);

      if (transaction_id) {
        await supabase
          .from('payment_transactions')
          .update({ status: 'paid', raw_response: upstreamResponse || { demo: true } })
          .eq('id', transaction_id);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      order_id,
      status: isPaid ? 'paid' : 'pending',
      verified,
    }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
