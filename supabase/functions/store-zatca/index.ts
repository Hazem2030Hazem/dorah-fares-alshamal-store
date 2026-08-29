// ═══════════════════════════════════════════════════════════════
// درة فارس الشمال — وسيط إرسال الفواتير إلى زاتكا (Edge Function محصّنة)
// نسخة محصّنة من edge-function-store-zatca.ts الموجود في جذر الريبو:
//   1) Authorization Bearer إلزامي + تحقق يدوي عبر auth.getUser
//   2) يشترط دور admin في جدول profiles (وإلا 403)
//   3) CORS مقيد لنطاقي الموقع فقط (بدل *)
//   4) أسرار زاتكا من env فقط (ZATCA_ENV / ZATCA_CSID / ZATCA_SECRET)
//      — ممنوع تمرير CSID/Secret من المتصفح، ولا قيم مضمّنة هنا
//
// دليل النشر (خطوات يدوية — لا تُنشر تلقائياً):
//   1) supabase link --project-ref kcbmvxuzjlaooknwhqqb
//   2) supabase secrets set ZATCA_ENV=simulation ZATCA_CSID=xxx ZATCA_SECRET=xxx
//   3) supabase functions deploy store-zatca
//      ⚠️ انشر بدون --no-verify-jwt (أي --no-verify-jwt=false) —
//      التحقق من JWT يتم يدوياً داخل الكود، لذا النشر الافتراضي
//      (verify-jwt مفعّل) مقبول ومطلوب كطبقة حماية إضافية.
//   4) في لوحة التحكم ← تبويب ⚡ زاتكا ← حقل «وسيط الإرسال (Proxy URL)»:
//      https://kcbmvxuzjlaooknwhqqb.functions.supabase.co/store-zatca
//      (الواجهة يجب أن ترسل Authorization: Bearer <user access token>)
//
// الاستخدام: POST { action, otp?, payload } + Authorization: Bearer <jwt>
//   action: 'report' | 'clear' | 'compliance' | 'compliance-invoice' | 'production-csid'
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// مسارات زاتكا الصحيحة: developer-portal للمحاكاة، core للإنتاج
const BASES: Record<string, string> = {
  simulation: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};
const PATHS: Record<string, string> = {
  report: "/invoices/reporting/single",
  clear: "/invoices/clearance/single",
  compliance: "/compliance",
  "compliance-invoice": "/compliance/invoices",
  "production-csid": "/production/csids",
};

// ─── CORS مقيد لنطاقي الموقع فقط (+ ALLOWED_ORIGIN من env إن وجد) ───
const ALLOWED_ORIGINS: string[] = [
  "https://alshamal-df.com",
  "https://www.alshamal-df.com",
];
const envOrigin = Deno.env.get("ALLOWED_ORIGIN");
if (envOrigin && !ALLOWED_ORIGINS.includes(envOrigin)) ALLOWED_ORIGINS.push(envOrigin);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") {
    return json(req, 405, { error: "يُقبل POST فقط", details: "POST only" });
  }

  try {
    // ─── 1) Authorization Bearer إلزامي + تحقق يدوي من JWT ───
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return json(req, 401, { error: "مطلوب تسجيل الدخول", details: "Missing Authorization Bearer token" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) {
      return json(req, 401, { error: "جلسة غير صالحة — سجّل الدخول مجدداً", details: "Invalid or expired JWT" });
    }

    // ─── 2) التحقق من الدور: admin فقط ───
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr) {
      console.error("profiles fetch error:", profErr);
      return json(req, 500, { error: "تعذر التحقق من الصلاحيات", details: "DB error while fetching profile role" });
    }
    if (!profile || profile.role !== "admin") {
      return json(req, 403, { error: "هذه العملية للمسؤولين فقط", details: "Admin role required" });
    }

    // ─── 3) المدخلات ───
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json(req, 400, { error: "جسم الطلب غير صالح", details: "Invalid JSON body" });
    }
    const { action, otp, payload } = body as { action?: string; otp?: string | number; payload?: unknown };
    const path = action ? PATHS[action] : undefined;
    if (!action || !path) {
      return json(req, 400, { error: "إجراء غير معروف", details: "Unknown action: " + String(action) });
    }

    // بيئة زاتكا من env أولاً (ZATCA_ENV) — المحاكاة هي الافتراضي الآمن
    const envKey = Deno.env.get("ZATCA_ENV") || "simulation";
    const base = BASES[envKey] || BASES.simulation;

    // ─── 4) المصادقة لدى زاتكا — أسرار من env فقط ───
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Accept-Version": "V2",
    };
    if (action === "compliance") {
      // طلب شهادة الامتثال يحتاج OTP (يُدخله المسؤول يدوياً — ليس سراً مخزناً)
      if (!otp) {
        return json(req, 400, { error: "OTP مطلوب", details: "OTP is required for compliance action" });
      }
      headers["OTP"] = String(otp);
    } else {
      const csid = Deno.env.get("ZATCA_CSID");
      const secret = Deno.env.get("ZATCA_SECRET");
      if (!csid || !secret) {
        return json(req, 500, { error: "زاتكا غير مهيأة على الخادم", details: "ZATCA_CSID/ZATCA_SECRET are not configured" });
      }
      headers["Authorization"] = "Basic " + btoa(csid + ":" + secret);
    }

    // ─── 5) تمرير الطلب إلى زاتكا ───
    let res: Response;
    try {
      res = await fetch(base + path, {
        method: "POST",
        headers,
        body: JSON.stringify(payload ?? {}),
      });
    } catch (e) {
      console.error("zatca upstream fetch error:", e);
      return json(req, 502, { error: "تعذر الاتصال بخوادم زاتكا", details: "ZATCA upstream unreachable: " + String(e instanceof Error ? e.message : e) });
    }
    const text = await res.text();
    // نمرّر نتيجة زاتكا دائماً بـ 200 ليقرأها العميل (نفس عقد النسخة الأصلية)
    return json(req, 200, { upstreamStatus: res.status, body: safeJson(text) });
  } catch (e) {
    console.error("store-zatca unhandled error:", e);
    return json(req, 500, {
      error: "حدث خطأ غير متوقع في وسيط زاتكا",
      details: String(e instanceof Error ? e.message : e),
    });
  }
});
