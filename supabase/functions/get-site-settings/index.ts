// ============================================================
// get-site-settings — قراءة إعدادات المتجر بأمان (بدون exposing الـ anon key)
// ============================================================
// يُرسل من العميل: POST {} (no body)
// يرجع: { ok: true, settings: {...} } أو { ok: false, error: '...' }
//
// أضف السر التالي في Supabase Dashboard ← Project Settings ← Edge Functions ← Secrets:
//   SUPABASE_SERVICE_ROLE_KEY = <service_role_key>
//   SUPABASE_URL = https://kcbmvxuzjlaooknwhqqb.supabase.co
//
// للنشر:
//   supabase functions deploy get-site-settings --no-verify-jwt
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
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase environment configuration');
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase
      .from('site_settings')
      .select('settings')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, settings: data?.settings || {} }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
