// ═══════════════════════════════════════════════════════════════
// درة فارس الشمال — وسيط إرسال الفواتير إلى زاتكا (Edge Function)
// الهدف: تجاوز CORS — خوادم زاتكا لا تقبل طلبات المتصفح المباشرة.
//
// دليل النشر (خطوات يدوية — لا تُنشر تلقائياً):
//   1) npm i -g supabase && supabase login
//   2) supabase link --project-ref kcbmvxuzjlaooknwhqqb
//   3) supabase functions new zatca-store-proxy
//      ثم انسخ محتوى هذا الملف إلى supabase/functions/zatca-store-proxy/index.ts
//   4) supabase functions deploy zatca-store-proxy --no-verify-jwt
//   5) في لوحة التحكم ← تبويب ⚡ زاتكا ← حقل «وسيط الإرسال (Proxy URL)»:
//      https://kcbmvxuzjlaooknwhqqb.functions.supabase.co/zatca-store-proxy
//
// الاستخدام: POST { action, env: 'simulation'|'production', csid?, secret?, otp?, payload }
//   action: 'report' | 'clear' | 'compliance' | 'compliance-invoice' | 'production-csid'
// ═══════════════════════════════════════════════════════════════

const BASES: Record<string, string> = {
  simulation: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal',
  production: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core',
};
const PATHS: Record<string, string> = {
  report: '/invoices/reporting/single',
  clear: '/invoices/clearance/single',
  compliance: '/compliance',
  'compliance-invoice': '/compliance/invoices',
  'production-csid': '/production/csids',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
  try {
    const { action, env, csid, secret, otp, payload } = await req.json();
    const base = BASES[env] || BASES.simulation;
    const path = PATHS[action];
    if (!path) throw new Error('action غير معروف: ' + action);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Accept': 'application/json', 'Accept-Version': 'V2',
    };
    if (action === 'compliance') {
      if (!otp) throw new Error('OTP مطلوب');
      headers['OTP'] = String(otp);
    } else {
      if (!csid || !secret) throw new Error('CSID/Secret مطلوبان');
      headers['Authorization'] = 'Basic ' + btoa(csid + ':' + secret);
    }

    const res = await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(payload) });
    const text = await res.text();
    return new Response(JSON.stringify({ upstreamStatus: res.status, body: safeJson(text) }), {
      status: 200, // نمرّر نتيجة زاتكا دائماً بـ 200 ليقرأها العميل
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
});

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}
