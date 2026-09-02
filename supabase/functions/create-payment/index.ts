// ============================================================
// create-payment — إنشاء عملية دفع عبر Moyasar (أو وضع توضيحي)
// ============================================================
// يُرسل من العميل: POST {
//   order_id, amount, currency, customer: { name, email, phone },
//   callback_url, gateway_code (optional)
// }
// يرجع: { ok: true, payment_url, transaction_id } أو { ok: false, error }
//
// أضف الأسرار التالية في Supabase Dashboard → Project Settings → Edge Functions → Secrets:
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_URL
//   MOYASAR_SECRET_KEY   (مثال: sk_test_... أو sk_live_...)
//   MOYASAR_PUBLISHABLE_KEY (مثال: pk_test_... أو pk_live_...)
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

interface Customer {
  name?: string;
  email?: string;
  phone?: string;
}

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

    if (!order_id || typeof amount !== 'number' || !callback_url) {
      throw new Error('order_id, amount, callback_url مطلوبة');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('إعدادات Supabase غير مكتملة');
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    const moyasarSecret = Deno.env.get('MOYASAR_SECRET_KEY');
    const moyasarPublishable = Deno.env.get('MOYASAR_PUBLISHABLE_KEY');

    // إذا لم تُضف أسرار Moyasar، نعمل في الوضع التوضيحي (demo)
    const isDemo = !moyasarSecret || !moyasarPublishable;

    const transactionId = crypto.randomUUID();
    let paymentUrl = '';

    if (!isDemo) {
      // إنشاء دفعة في Moyasar (المبلغ بالهللات)
      const amountHalalas = Math.round(amount * 100);
      const moyasarRes = await fetch('https://api.moyasar.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(moyasarSecret + ':'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountHalalas,
          currency: currency || 'SAR',
          description: 'طلب متجر درة فارس الشمال رقم ' + order_id,
          callback_url: callback_url,
          metadata: {
            order_id: String(order_id),
            transaction_id: transactionId,
            customer_name: customer?.name || '',
            customer_email: customer?.email || '',
            customer_phone: customer?.phone || '',
          },
        }),
      });

      const moyasarData = await moyasarRes.json();
      if (!moyasarRes.ok || !moyasarData.id) {
        throw new Error(moyasarData.message || 'فشل إنشاء الدفع في Moyasar');
      }

      paymentUrl = moyasarData.url;

      await supabase.from('payment_transactions').insert([{
        id: transactionId,
        order_id: order_id || null,
        gateway_code: gateway_code || 'moyasar',
        gateway_transaction_id: moyasarData.id,
        amount: amount || 0,
        currency: currency || 'SAR',
        status: 'pending',
        raw_response: moyasarData,
      }]);
    } else {
      // الوضع التوضيحي: رابط عودة مباشر
      const sep = callback_url.indexOf('?') === -1 ? '?' : '&';
      paymentUrl = callback_url + sep + 'status=success&gateway=demo&transaction=' + encodeURIComponent(transactionId);

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

    return new Response(JSON.stringify({
      ok: true,
      transaction_id: transactionId,
      payment_url: paymentUrl,
      gateway: isDemo ? 'demo' : 'moyasar',
      message: isDemo ? 'وضع توضيحي — أضف MOYASAR_SECRET_KEY للإنتاج' : 'تم إنشاء عملية الدفع',
    }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
