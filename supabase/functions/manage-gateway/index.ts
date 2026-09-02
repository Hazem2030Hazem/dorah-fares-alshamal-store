// ============================================================
// manage-gateway — حفظ/قراءة إعدادات بوابات الدفع بأمان
// ============================================================
// يُرسل من لوحة الإدارة: POST { action: 'save'|'list', code, ...payload }
// يرجع: { ok: true, ... } أو { ok: false, error }
//
// يتطلب JWT صالح للأدمن (يُرسل كـ Bearer token).
//
// أضف الأسرار التالية في Supabase:
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPABASE_URL
//   GATEWAY_MASTER_KEY (مفتاح تشفير إعدادات البوابات)
//
// للنشر:
//   supabase functions deploy manage-gateway
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
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '');
    if (!token) throw new Error('مطلوب توثيق الأدمن');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase environment configuration');

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // التحقق من أن المستخدم أدمن
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('جلسة غير صالحة');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
      return new Response(JSON.stringify({ ok: false, error: 'صلاحية مرفوضة' }), {
        status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'save') {
      // TODO: تشفير المفتاح السري بـ GATEWAY_MASTER_KEY قبل الحفظ
      // TODO: تحديث site_settings.gateways
      return new Response(JSON.stringify({ ok: true, saved: true }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      // TODO: إرجاع قائمة البوابات بدون exposing المفاتيح السرية
      return new Response(JSON.stringify({ ok: true, gateways: [] }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('action غير معروف');
  } catch (e) {
    const status = String(e).includes('صلاحية') ? 403 : 400;
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
