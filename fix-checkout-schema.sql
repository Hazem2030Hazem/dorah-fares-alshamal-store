-- ============================================================
-- درة فارس الشمال — إصلاح schema صفحة الدفع (checkout)
--
-- يغطّي:
--   • إضافة أعمدة الشحن والدفع المفقودة على store_orders
--   • تحديث قيود حالة الطلب لتشمل القيم الجديدة
--   • إنشاء جدول invoices
--   • إنشاء دالة compute_order_total للتحقق السيرفري من الأسعار
--
-- يجب تشغيل هذا الملف بعد:
--   إعداد-نظام-الحسابات-والطلبات.sql
--   missing-core-tables.sql
-- ============================================================

-- ============================================================
-- 1) توسيع جدول الطلبات بأعمدة الشحن والدفع
-- ============================================================
alter table public.store_orders
  add column if not exists shipping_cost numeric(12,2) default 0,
  add column if not exists shipping_city text,
  add column if not exists shipping_fee numeric(12,2) default 0;

-- تحديث قيود الحالة لتشمل القيم المستخدمة في checkout.html
alter table public.store_orders drop constraint if exists store_orders_status_check;
alter table public.store_orders add constraint store_orders_status_check
  check (status in ('new','review','processing','shipped','delivered','completed','cancelled','pending_confirmation','pending_payment'));

-- ============================================================
-- 2) جدول الفواتير (invoices)
-- ============================================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  order_id uuid references public.store_orders(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'issued' check (status in ('issued','paid','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create index if not exists idx_invoices_invoice_number on public.invoices(invoice_number);
create index if not exists idx_invoices_order_id on public.invoices(order_id);
create index if not exists idx_invoices_created_at on public.invoices(created_at desc);

-- الجميع يقرأ فواتيره؛ الأدمن يقرأ الكل
drop policy if exists invoices_select_own_or_admin on public.invoices;
create policy invoices_select_own_or_admin on public.invoices
for select to authenticated
using (
  public.is_admin()
  or order_id in (select id from public.store_orders where user_id = auth.uid())
);

drop policy if exists invoices_insert_admin on public.invoices;
create policy invoices_insert_admin on public.invoices
for insert to authenticated with check (public.is_admin());

drop policy if exists invoices_update_admin on public.invoices;
create policy invoices_update_admin on public.invoices
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 3) دالة حساب إجمالي الطلب (server-side price verification)
-- ============================================================
create or replace function public.compute_order_total(
  p_items jsonb,
  p_coupon text default null,
  p_city text default null,
  p_delivery text default 'delivery'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_shipping_fee numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product public.store_products%rowtype;
  v_qty integer;
  v_price numeric(12,2);
  v_default_shipping numeric(12,2) := 25;
  v_coupon_value numeric(12,2) := 0;
  v_coupon_type text := 'fixed'; -- 'fixed' | 'percent'
begin
  -- حساب المجموع الفرعي من أسعار قاعدة البيانات (لا يُعتمد على المتصفح)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'qty')::integer, 1);
    if v_qty <= 0 then continue; end if;

    select * into v_product from public.store_products
    where id = (v_item->>'id')::integer and is_active = true;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'منتج غير موجود أو غير نشط: ' || (v_item->>'id'));
    end if;

    v_price := coalesce(v_product.price, 0);
    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  -- تطبيق الكوبون (لو موجود)
  if p_coupon is not null and btrim(p_coupon) != '' then
    -- كوبون تجريبي: WELCOME10 = 10% خصم
    if lower(btrim(p_coupon)) = 'welcome10' then
      v_coupon_type := 'percent';
      v_coupon_value := 0.10;
    end if;

    if v_coupon_type = 'percent' then
      v_discount := round(v_subtotal * v_coupon_value, 2);
    else
      v_discount := least(v_coupon_value, v_subtotal);
    end if;
  end if;

  -- حساب الشحن
  if p_delivery = 'delivery' then
    -- محاولة قراءة سعر الشحن الافتراضي من site_settings
    select coalesce((settings->'shipping'->>'default_price')::numeric, 25) into v_default_shipping
    from public.site_settings where id = 1;

    -- محاولة قراءة سعر محدد للمدينة
    select price_sar into v_shipping_fee
    from public.shipping_rates
    where to_city = coalesce(p_city, '')
    order by id limit 1;

    if v_shipping_fee is null or v_shipping_fee = 0 then
      v_shipping_fee := v_default_shipping;
    end if;
  else
    v_shipping_fee := 0;
  end if;

  -- الضريبة 15% على (المجموع - الخصم + الشحن)
  v_tax := round((v_subtotal - v_discount + v_shipping_fee) * 0.15, 2);

  -- الإجمالي
  v_total := v_subtotal - v_discount + v_tax + v_shipping_fee;

  return jsonb_build_object(
    'ok', true,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'discount', v_discount,
    'shipping_fee', v_shipping_fee,
    'total', v_total
  );
end;
$$;

grant execute on function public.compute_order_total(jsonb, text, text, text) to anon, authenticated;

-- ============================================================
-- 4) تسلسل أرقام الفواتير
-- ============================================================
create sequence if not exists public.invoice_number_seq start 1001;

-- توليد رقم فاتورة تلقائي
 create or replace function public.generate_invoice_number()
 returns trigger
 language plpgsql
 as $$
 begin
   if new.invoice_number is null or btrim(new.invoice_number) = '' then
     new.invoice_number = 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
   end if;
   return new;
 end;
 $$;

 drop trigger if exists invoices_generate_number on public.invoices;
 create trigger invoices_generate_number
 before insert on public.invoices
 for each row execute function public.generate_invoice_number();

-- ============================================================
-- ملاحظة: بعد تشغيل هذا الملف، تأكد من وجود بيانات في:
--   • store_products (منتجات)
--   • site_settings -> shipping.default_price (سعر الشحن الافتراضي)
--   • shipping_rates (أسعار شحن حسب المدينة — اختياري)
-- ============================================================
