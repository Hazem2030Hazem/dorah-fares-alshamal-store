-- ============================================================
-- درة فارس الشمال — توحيد أسماء الجداول المتضاربة
--
-- المشكلة:
--   • كود الواجهة (admin-*.js) يستخدم أسماء جمع (zatca_logs, audit_logs, afaky_sync_logs, e_invoices)
--   • ملفات SQL بعضها يستخدم مفرد (zatca_log, audit_log, afaky_sync_log, einvoices)
--
-- هذا الملف:
--   • يعيد التسمية للجداول المفردة إلى الجمع
--   • ينشئ view `e_invoices` يوحّد schema الجدول `einvoices`
--   • يحدّث الدوال التي تشير للأسماء القديمة
--
-- يجب تشغيل هذا الملف بعد:
--   جداول-اللوحة-المتقدمة.sql
--   store-staff-complete.sql
--   missing-core-tables.sql
-- ============================================================

-- ============================================================
-- 1) zatca_log → zatca_logs
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'zatca_log')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'zatca_logs') THEN
    ALTER TABLE public.zatca_log RENAME TO zatca_logs;
  END IF;
END $$;

-- إذا كان الجدولان موجودان (نادر)، نحتفظ بالجمع ونلغي المفرد
DROP TABLE IF EXISTS public.zatca_log;

-- ============================================================
-- 2) afaky_sync_log → afaky_sync_logs
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'afaky_sync_log')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'afaky_sync_logs') THEN
    ALTER TABLE public.afaky_sync_log RENAME TO afaky_sync_logs;
  END IF;
END $$;

DROP TABLE IF EXISTS public.afaky_sync_log;

-- ============================================================
-- 3) audit_log → audit_logs
--    missing-core-tables.sql أنشأ audit_logs بعمود created_by الإضافي.
--    نحتفظ بـ audit_logs ونلغي audit_log.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_log RENAME TO audit_logs;
  END IF;
END $$;

DROP TABLE IF EXISTS public.audit_log;

-- ============================================================
-- 4) einvoices → e_invoices view
--    كود الأدمن يتوقع e_invoices مع أعمدة (uuid, order_id, status)
-- ============================================================
DROP VIEW IF EXISTS public.e_invoices;

CREATE OR REPLACE VIEW public.e_invoices AS
SELECT
  id AS uuid,
  order_id,
  invoice_number,
  seller_name,
  vat_number,
  total,
  tax,
  qr_code,
  xml_payload,
  status,
  created_by,
  created_at,
  updated_at
FROM public.einvoices;

-- ============================================================
-- 5) تحديث الدوال التي تشير لـ zatca_log القديم
-- ============================================================
CREATE OR REPLACE FUNCTION public.staff_save_einvoice(
  p_token text,
  p_order_id uuid,
  p_xml text,
  p_qr text,
  p_invoice_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_id uuid;
  v_total numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_order public.store_orders%rowtype;
BEGIN
  SELECT * INTO r FROM public.staff_session_role(p_token);
  IF NOT r.ok OR NOT public.staff_can(r.role, 'einvoice') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  END IF;

  IF p_order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.store_orders WHERE id = p_order_id;
    IF FOUND THEN
      v_total := v_order.total;
      v_tax := v_order.tax;
    END IF;
  END IF;

  INSERT INTO public.einvoices (order_id, invoice_number, total, tax, qr_code, xml_payload, created_by)
  VALUES (p_order_id, p_invoice_number, v_total, v_tax, p_qr, p_xml, r.staff_id)
  RETURNING id INTO v_id;

  INSERT INTO public.zatca_logs (invoice_number, total, tax, qr_code, xml_payload)
  VALUES (p_invoice_number, v_total, v_tax, p_qr, p_xml);

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ============================================================
-- 6) RLS + منح الصلاحيات
-- ============================================================
-- zatca_logs
ALTER TABLE public.zatca_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zatca_logs_admin_only ON public.zatca_logs;
CREATE POLICY zatca_logs_admin_only ON public.zatca_logs
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- afaky_sync_logs
ALTER TABLE public.afaky_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS afaky_sync_logs_admin_only ON public.afaky_sync_logs;
CREATE POLICY afaky_sync_logs_admin_only ON public.afaky_sync_logs
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- audit_logs (already created in missing-core-tables.sql, just ensure policy exists)
DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS audit_logs_admin_insert ON public.audit_logs;
CREATE POLICY audit_logs_admin_insert ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- e_invoices view inherits RLS from einvoices

-- منح الصلاحيات
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zatca_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.afaky_sync_logs TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.e_invoices TO authenticated;

-- ============================================================
-- 7) تحديث أسماء indexes والـ triggers المرتبطة (أمان)
-- ============================================================
-- PostgreSQL يعيد تسمية الـ indexes والـ triggers تلقائياً عند RENAME TABLE،
-- لكننا نضمن عدم وجود تداخل.
DROP INDEX IF EXISTS public.idx_zatca_invoice_number;
DROP INDEX IF EXISTS public.idx_zatca_created_at;
CREATE INDEX IF NOT EXISTS idx_zatca_logs_invoice_number ON public.zatca_logs(invoice_number);
CREATE INDEX IF NOT EXISTS idx_zatca_logs_created_at ON public.zatca_logs(created_at desc);

DROP INDEX IF EXISTS public.zatca_log_created_at_idx;
DROP INDEX IF EXISTS public.afaky_sync_log_created_at_idx;
DROP INDEX IF EXISTS public.audit_log_created_at_idx;
CREATE INDEX IF NOT EXISTS idx_afaky_sync_logs_created_at ON public.afaky_sync_logs(created_at desc);

-- ============================================================
-- ملاحظة: بعد هذا الملف، admin-reports.js و admin-auth.js
-- سيجدان الجداول بالأسماء المتوقعة.
-- ============================================================
