-- ============================================================
-- تفعيل تتبع الطلبات للزوار — شركة درة فارس الشمال
-- شغّل هذا الملف مرة واحدة في: Supabase Dashboard → SQL Editor
-- ------------------------------------------------------------
-- لماذا؟ سياسات RLS تمنع الزائر من قراءة store_orders،
-- فصفحة track.html لا تجد الطلبات. هذه الدالة آمنة:
-- لا تُرجع الطلب إلا إذا تطابق رقم الطلب + رقم الجوال معاً،
-- وتُرجع حقولاً محدودة فقط (بدون بيانات حساسة).
-- ============================================================

CREATE OR REPLACE FUNCTION public.track_order(
    p_order_number TEXT,
    p_phone TEXT
)
RETURNS TABLE (
    order_number TEXT,
    status TEXT,
    total NUMERIC,
    items JSONB,
    customer_name TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_digits TEXT;
BEGIN
    -- توحيد صيغة الجوال: نأخذ الأرقام فقط ونقارن بآخر 9 أرقام
    v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
    v_digits := right(v_digits, 9);

    RETURN QUERY
    SELECT
        o.order_number::TEXT,
        o.status::TEXT,
        o.total,
        to_jsonb(o.items),
        o.customer_name::TEXT,
        o.created_at
    FROM store_orders o
    WHERE o.order_number::TEXT = p_order_number
      AND right(regexp_replace(coalesce(o.customer_phone, ''), '\D', '', 'g'), 9) = v_digits
    LIMIT 1;
END;
$$;

-- السماح للزوار (anon) والمستخدمين بتنفيذ الدالة فقط
GRANT EXECUTE ON FUNCTION public.track_order(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.track_order(TEXT, TEXT) TO authenticated;

-- ============================================================
-- ملاحظة: بعد تنفيذ هذا الملف، أخبر المطوّر (حازم AI)
-- ليحدّث track.html ليستخدم الدالة بدل الاستعلام المباشر.
-- ============================================================
