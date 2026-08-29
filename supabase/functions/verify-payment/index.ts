// ═══════════════════════════════════════════════════════════════
// درة فارس الشمال — التحقق السيرفري من الدفع (Edge Function)
// الغرض: إغلاق ثغرة تأكيد الدفع من المتصفح — تأكيد payment_status
//        يتم هنا فقط بعد جلب الحالة الحقيقية من سيرفر بوابة الدفع
//        ومطابقة المبلغ مع store_orders.total عبر service_role.
//
// دليل النشر (خطوات يدوية — لا تُنشر تلقائياً):
//   1) supabase link --project-ref kcbmvxuzjlaooknwhqqb
//   2) supabase secrets set MOYASAR_SECRET_KEY=sk_live_xxx
//   3) supabase functions deploy verify-payment --no-verify-jwt
//      (تُستدعى من صفحة عودة الدفع وقد لا يتوفر JWT — التحقق يتم
//       سيرفرياً عبر payment_id + مطابقة المبلغ، والدالة idempotent)
//
// الاستخدام: POST { order_id: uuid, payment_id: string, gateway: 'moyasar' }
// يرجع: { success, payment_status, order_number?, message?, status? }
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// ─── بوابات الدفع — بنية قابلة لإضافة بوابات جديدة ───
// كل بوابة تطبّق fetchPayment وترجع شكلاً موحداً:
//   { id, status, amount } — amount بأصغر وحدة عملة (هللة لـ SAR)
interface GatewayPayment {
  id: string;
  status: string;
  amount: number | null;
}

class GatewayConfigError extends Error {} // بوابة غير مهيأة → 500
class GatewayFetchError extends Error {}  // فشل الاتصال بالبوابة → 502

interface PaymentGateway {
  name: string;
  fetchPayment(paymentId: string): Promise<GatewayPayment>;
}

const moyasarGateway: PaymentGateway = {
  name: "moyasar",
  async fetchPayment(paymentId: string): Promise<GatewayPayment> {
    const secret = Deno.env.get("MOYASAR_SECRET_KEY");
    if (!secret) throw new GatewayConfigError("MOYASAR_SECRET_KEY is not configured");
    let res: Response;
    try {
      res = await fetch(
        `https://api.moyasar.com/v1/payments/${encodeURIComponent(paymentId)}`,
        {
          method: "GET",
          headers: {
            "Authorization": "Basic " + btoa(secret + ":"),
            "Accept": "application/json",
          },
        },
      );
    } catch (e) {
      throw new GatewayFetchError("Moyasar API unreachable: " + String(e));
    }
    if (res.status === 404) throw new GatewayFetchError("Payment not found at Moyasar (404)");
    if (res.status === 401) throw new GatewayConfigError("Moyasar rejected the secret key (401)");
    if (!res.ok) throw new GatewayFetchError(`Moyasar API returned HTTP ${res.status}`);
    const p = await res.json().catch(() => null);
    if (!p || typeof p.id !== "string" || typeof p.status !== "string") {
      throw new GatewayFetchError("Unexpected Moyasar response shape");
    }
    return { id: p.id, status: String(p.status), amount: typeof p.amount === "number" ? p.amount : null };
  },
};

// سجل البوابات — لإضافة بوابة جديدة: أنشئ implementation وأضفه هنا
const GATEWAYS: Record<string, PaymentGateway> = {
  moyasar: moyasarGateway,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") {
    return json(req, 405, { success: false, payment_status: "unknown", message: "يُقبل POST فقط", details: "POST only" });
  }

  try {
    // عميل service_role — كل القراءة/الكتابة سيرفرية فقط
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ─── 1) التحقق من المدخلات ───
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json(req, 400, { success: false, payment_status: "unknown", message: "جسم الطلب غير صالح", details: "Invalid JSON body" });
    }
    const orderId = String(body.order_id || "");
    const paymentId = String(body.payment_id || "").trim();
    const gatewayName = String(body.gateway || "moyasar").toLowerCase();

    if (!UUID_RE.test(orderId)) {
      return json(req, 400, { success: false, payment_status: "unknown", message: "معرّف الطلب غير صالح", details: "order_id must be a valid uuid" });
    }
    if (!paymentId) {
      return json(req, 400, { success: false, payment_status: "unknown", message: "معرّف عملية الدفع مطلوب", details: "payment_id is required" });
    }
    const gateway = GATEWAYS[gatewayName];
    if (!gateway) {
      return json(req, 400, { success: false, payment_status: "unknown", message: "بوابة الدفع غير مدعومة", details: `Unsupported gateway: ${gatewayName}` });
    }

    // ─── 2) جلب الطلب ───
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("store_orders")
      .select("id, order_number, total, payment_status, user_id, customer_name")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr) {
      console.error("store_orders fetch error:", orderErr);
      return json(req, 500, { success: false, payment_status: "unknown", message: "تعذر قراءة الطلب", details: "DB error while fetching order" });
    }
    if (!order) {
      return json(req, 404, { success: false, payment_status: "unknown", message: "الطلب غير موجود", details: "Order not found" });
    }

    // ─── 3) Idempotency — طلب مؤكد سابقاً لا يُعاد تحديثه ───
    const currentStatus = String(order.payment_status || "").toLowerCase();
    if (currentStatus === "paid" || currentStatus === "failed") {
      return json(req, 200, {
        success: currentStatus === "paid",
        status: "already_confirmed",
        payment_status: currentStatus,
        order_number: order.order_number ?? undefined,
      });
    }

    // ─── 4) جلب حالة الدفع الحقيقية من البوابة ───
    let payment: GatewayPayment;
    try {
      payment = await gateway.fetchPayment(paymentId);
    } catch (e) {
      if (e instanceof GatewayConfigError) {
        console.error("gateway config error:", e);
        return json(req, 500, { success: false, payment_status: "unknown", message: "بوابة الدفع غير مهيأة", details: String(e.message || e) });
      }
      console.error("gateway fetch error:", e);
      return json(req, 502, { success: false, payment_status: "unknown", message: "تعذر التحقق من بوابة الدفع، حاول لاحقاً", details: String(e instanceof Error ? e.message : e) });
    }

    // ─── 8) فشل الدفع لدى البوابة → تحديث الطلب failed ───
    if (payment.status === "failed") {
      try {
        await supabaseAdmin
          .from("store_orders")
          .update({ payment_status: "failed" })
          .eq("id", orderId);
      } catch (e) {
        console.error("failed-status update error:", e);
      }
      return json(req, 200, {
        success: false,
        payment_status: "failed",
        order_number: order.order_number ?? undefined,
        message: "فشلت عملية الدفع لدى البوابة",
      });
    }

    // ─── 5) نجاح الدفع + مطابقة المبلغ (بالهللة، تسامح ±1) ───
    if (payment.status !== "paid") {
      // حالة وسيطة (initiated/authorized/...) — لا نحدّث الطلب
      return json(req, 200, {
        success: false,
        payment_status: currentStatus || "pending",
        order_number: order.order_number ?? undefined,
        message: "عملية الدفع لم تكتمل بعد",
        details: `Gateway status: ${payment.status}`,
      });
    }
    const expectedHalalas = Math.round(Number(order.total) * 100);
    if (payment.amount === null || Math.abs(payment.amount - expectedHalalas) > 1) {
      // عدم تطابق المبلغ — محاولة مشبوهة محتملة: سجّل وعلّم للمراجعة
      console.error(
        `amount mismatch: order=${orderId} expected=${expectedHalalas} got=${payment.amount} payment=${payment.id}`,
      );
      try {
        await supabaseAdmin
          .from("store_orders")
          .update({ payment_status: "payment_review" })
          .eq("id", orderId);
        await supabaseAdmin.from("audit_logs").insert([{
          user_id: order.user_id ?? null,
          action: "payment_amount_mismatch",
          entity_type: "store_orders",
          entity_id: orderId,
          details: { order_id: orderId, payment_id: paymentId, expected_halalas: expectedHalalas, gateway_amount: payment.amount, gateway: gateway.name },
        }]);
      } catch (e) {
        console.error("payment_review update/audit error:", e);
      }
      return json(req, 409, {
        success: false,
        payment_status: "payment_review",
        order_number: order.order_number ?? undefined,
        message: "مبلغ الدفع لا يطابق قيمة الطلب — حُوّل للمراجعة",
        details: "Amount mismatch between gateway and order total",
      });
    }

    // ─── 6) تحديث الطلب — تحديث واحد فقط ───
    const { error: updErr } = await supabaseAdmin
      .from("store_orders")
      .update({
        payment_status: "paid",
        status: "new",
        payment_reference: paymentId,
        payment_transaction_id: payment.id,
        payment_gateway: gateway.name,
      })
      .eq("id", orderId);
    if (updErr) {
      console.error("order update error:", updErr);
      return json(req, 500, { success: false, payment_status: "unknown", message: "تعذر تحديث الطلب بعد تأكيد الدفع", details: "DB error while updating order" });
    }

    // ─── 7) سجل التدقيق (غير حرج — فشله لا يفشل التأكيد) ───
    try {
      await supabaseAdmin.from("audit_logs").insert([{
        user_id: order.user_id ?? null,
        action: "payment_verified",
        entity_type: "store_orders",
        entity_id: orderId,
        details: { order_id: orderId, payment_id: paymentId, gateway: gateway.name },
      }]);
    } catch (e) {
      console.error("audit_logs insert error:", e);
    }

    // لا نُرجع أي بيانات بوابة أو أسرار — الحالة فقط
    return json(req, 200, {
      success: true,
      payment_status: "paid",
      order_number: order.order_number ?? undefined,
      message: "تم تأكيد الدفع بنجاح",
    });
  } catch (e) {
    console.error("verify-payment unhandled error:", e);
    return json(req, 500, {
      success: false,
      payment_status: "unknown",
      message: "حدث خطأ غير متوقع أثناء التحقق من الدفع",
      details: String(e instanceof Error ? e.message : e),
    });
  }
});
