-- ============================================================
-- درة فارس الشمال — نظام نقاط البيع (POS)
-- شغّل هذا الملف من: Supabase Dashboard → SQL Editor → Run
--
-- ملاحظة: هذا الملف يُنشئ الجداول والدوال الأساسية. بعض التفاصيل
-- مثل طباعة الإيصالات والربط مع الأجهزة تحتاج إلى إعدادات إضافية.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1) الجداول
-- ============================================================
create table if not exists public.pos_cashiers (
  id bigint generated always as identity primary key,
  username text unique not null,
  pin_hash text not null,  -- salt$sha256(salt:pin)
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.pos_cashiers enable row level security;

create table if not exists public.pos_shifts (
  id bigint generated always as identity primary key,
  cashier_id bigint not null references public.pos_cashiers(id) on delete cascade,
  opening_cash numeric(12,2) not null default 0,
  actual_cash numeric(12,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.pos_shifts enable row level security;

create table if not exists public.pos_sessions (
  token text primary key,
  cashier_id bigint not null references public.pos_cashiers(id) on delete cascade,
  shift_id bigint references public.pos_shifts(id) on delete set null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.pos_sessions enable row level security;

create table if not exists public.pos_devices (
  id bigint generated always as identity primary key,
  name text not null,
  device_type text not null default 'printer',
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.pos_devices enable row level security;

-- ============================================================
-- 2) دوال مساعدة
-- ============================================================
create or replace function public.pos_hash_matches(p_stored text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salt text;
  v_expected text;
begin
  v_salt := split_part(p_stored, '$', 1);
  if v_salt = '' or p_stored = '' then return false; end if;
  v_expected := v_salt || '$' || encode(digest(v_salt || ':' || p_pin, 'sha256'), 'hex');
  return v_expected = p_stored;
end;
$$;

create or replace function public.pos_session_valid(p_token text)
returns table (ok boolean, cashier_id bigint, shift_id bigint, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.pos_sessions%rowtype;
begin
  select s.* into v_session
  from public.pos_sessions s
  join public.pos_cashiers c on c.id = s.cashier_id
  where s.token = p_token
    and s.revoked_at is null
    and s.created_at > now() - interval '12 hours'
    and c.active = true;

  if not found then
    return query select false, null::bigint, null::bigint, 'الجلسة غير صالحة'::text;
    return;
  end if;

  return query select true, v_session.cashier_id, v_session.shift_id, null::text;
end;
$$;

-- ============================================================
-- 3) RPCs
-- ============================================================

-- دخول الكاشير
create or replace function public.pos_cashier_login(
  p_username text,
  p_pin text,
  p_ip text default null,
  p_ua text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cashier public.pos_cashiers%rowtype;
  v_shift_id bigint;
  v_token text;
begin
  select * into v_cashier from public.pos_cashiers where username = p_username;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'اسم المستخدم غير موجود');
  end if;

  if not public.pos_hash_matches(v_cashier.pin_hash, p_pin) then
    return jsonb_build_object('ok', false, 'error', 'رقم PIN غير صحيح');
  end if;

  -- إنشاء شفت افتراضي مفتوح
  insert into public.pos_shifts (cashier_id, opening_cash)
  values (v_cashier.id, 0)
  returning id into v_shift_id;

  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.pos_sessions (token, cashier_id, shift_id, ip, user_agent)
  values (v_token, v_cashier.id, v_shift_id, p_ip, p_ua);

  return jsonb_build_object('ok', true, 'token', v_token, 'shift_id', v_shift_id,
                            'cashier_name', v_cashier.full_name);
end;
$$;

-- خروج الكاشير
create or replace function public.pos_logout(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pos_sessions set revoked_at = now() where token = p_token;
end;
$$;

-- الشفت الحالي
create or replace function public.pos_current_shift(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_shift public.pos_shifts%rowtype;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  select * into v_shift from public.pos_shifts where id = r.shift_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'لا يوجد شفت مفتوح'); end if;

  return jsonb_build_object('ok', true, 'shift', to_jsonb(v_shift));
end;
$$;

-- فتح شفت
create or replace function public.pos_open_shift(p_token text, p_opening_cash numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_shift_id bigint;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  insert into public.pos_shifts (cashier_id, opening_cash)
  values (r.cashier_id, p_opening_cash)
  returning id into v_shift_id;

  update public.pos_sessions set shift_id = v_shift_id where token = p_token;

  return jsonb_build_object('ok', true, 'shift_id', v_shift_id);
end;
$$;

-- إغلاق شفت
create or replace function public.pos_close_shift(p_token text, p_actual_cash numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  update public.pos_shifts
  set actual_cash = p_actual_cash, closed_at = now()
  where id = r.shift_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- إتمام عملية بيع
create or replace function public.pos_checkout_store(
  p_token text,
  p_items jsonb,
  p_total numeric,
  p_tax numeric,
  p_payment_method text,
  p_customer jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_order_id uuid;
  v_order_number text;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  insert into public.store_orders (
    user_id, customer_name, customer_phone, items, subtotal, tax, total,
    status, payment_status, payment_method, notes
  )
  values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    coalesce(p_customer->>'name', 'عميل نقدي'),
    coalesce(p_customer->>'phone', ''),
    p_items,
    p_total - p_tax,
    p_tax,
    p_total,
    'completed',
    'paid',
    coalesce(p_payment_method, 'cash'),
    'POS'
  )
  returning id, order_number into v_order_id, v_order_number;

  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'order_number', v_order_number);
end;
$$;

-- مرتجع
create or replace function public.pos_return_store(
  p_token text,
  p_order_id bigint,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  -- ملاحظة: p_order_id يأتي كـ bigint من الواجهة، لكن store_orders.id هو uuid.
  -- يُفضّل تمرير order_number أو uuid. هنا نعيد ok للتوافق.
  return jsonb_build_object('ok', true, 'note', 'يرجى تمرير order_number بدلاً من id الرقمي');
end;
$$;

-- الأجهزة
create or replace function public.pos_get_devices(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  return (
    select jsonb_build_object('ok', true, 'devices', coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb))
    from public.pos_devices d
  );
end;
$$;

create or replace function public.pos_save_device(
  p_token text,
  p_name text,
  p_device_type text,
  p_config jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_id bigint;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  insert into public.pos_devices (name, device_type, config)
  values (p_name, p_device_type, p_config)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ============================================================
-- 4) RLS
-- ============================================================
create policy pos_cashiers_no_direct on public.pos_cashiers for all to authenticated using (false) with check (false);
create policy pos_shifts_no_direct on public.pos_shifts for all to authenticated using (false) with check (false);
create policy pos_sessions_no_direct on public.pos_sessions for all to authenticated using (false) with check (false);
create policy pos_devices_no_direct on public.pos_devices for all to authenticated using (false) with check (false);

-- ============================================================
-- 5) منح الصلاحيات
-- ============================================================
grant execute on function public.pos_cashier_login(text, text, text, text) to anon;
grant execute on all functions in schema public
where routine_name like 'pos_%' to anon, authenticated;


-- ============================================================
-- 6) إكمال منطق الأعمال — إيصالات POS والمرتجعات والشفتات
-- ============================================================

-- 6.1) إيصالات POS
-- ------------------------------------------------------------
create table if not exists public.pos_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.store_orders(id) on delete set null,
  shift_id bigint references public.pos_shifts(id) on delete set null,
  cashier_id bigint references public.pos_cashiers(id) on delete set null,
  receipt_text text,
  printer_name text,
  printed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pos_receipts enable row level security;

create policy pos_receipts_no_direct on public.pos_receipts
for all to authenticated using (false) with check (false);

-- 6.2) معاملات POS (تفاصيل كل عملية داخل الشفت)
-- ------------------------------------------------------------
create table if not exists public.pos_transactions (
  id uuid primary key default gen_random_uuid(),
  shift_id bigint not null references public.pos_shifts(id) on delete cascade,
  order_id uuid references public.store_orders(id) on delete set null,
  type text not null check (type in ('sale','return','void','cash_in','cash_out')),
  amount numeric(12,2) not null default 0,
  payment_method text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.pos_transactions enable row level security;

create policy pos_transactions_no_direct on public.pos_transactions
for all to authenticated using (false) with check (false);

-- 6.3) تحديث دالة إتمام البيع لتسجيل الإيصال والمعاملة
-- ------------------------------------------------------------
create or replace function public.pos_checkout_store(
  p_token text,
  p_items jsonb,
  p_total numeric,
  p_tax numeric,
  p_payment_method text,
  p_customer jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_order_id uuid;
  v_order_number text;
  v_receipt_text text;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  insert into public.store_orders (
    user_id, customer_name, customer_phone, items, subtotal, tax, total,
    status, payment_status, payment_method, notes
  )
  values (
    '00000000-0000-0000-0000-000000000000'::uuid,
    coalesce(p_customer->>'name', 'عميل نقدي'),
    coalesce(p_customer->>'phone', ''),
    p_items,
    p_total - p_tax,
    p_tax,
    p_total,
    'completed',
    'paid',
    coalesce(p_payment_method, 'cash'),
    'POS'
  )
  returning id, order_number into v_order_id, v_order_number;

  -- تسجيل معاملة الشفت
  insert into public.pos_transactions (shift_id, order_id, type, amount, payment_method, notes)
  values (r.shift_id, v_order_id, 'sale', p_total, coalesce(p_payment_method, 'cash'), 'POS sale');

  -- بناء نص إيصال افتراضي
  v_receipt_text := 'درة فارس الشمال - POS' || E'\n'
    || 'رقم الطلب: ' || coalesce(v_order_number, v_order_id::text) || E'\n'
    || 'الكاشير: ' || r.cashier_id::text || E'\n'
    || 'التاريخ: ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || E'\n'
    || 'الإجمالي: ' || p_total || ' ر.س' || E'\n'
    || 'شكراً لتعاملكم';

  insert into public.pos_receipts (order_id, shift_id, cashier_id, receipt_text)
  values (v_order_id, r.shift_id, r.cashier_id, v_receipt_text);

  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'order_number', v_order_number, 'receipt', v_receipt_text);
end;
$$;

-- 6.4) مرتجع POS حقيقي (بـ order_number أو uuid)
-- ------------------------------------------------------------
create or replace function public.pos_return_store(
  p_token text,
  p_order_reference text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_order public.store_orders%rowtype;
  v_ref text := trim(coalesce(p_order_reference, ''));
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  if v_ref = '' then
    return jsonb_build_object('ok', false, 'error', 'يرجى تمرير رقم الطلب أو معرّف الطلب');
  end if;

  -- محاولة البحث بـ UUID أولاً
  if v_ref ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    select * into v_order from public.store_orders where id = v_ref::uuid;
  end if;

  -- إذا لم يُوجد، نبحث بـ order_number
  if not found then
    select * into v_order from public.store_orders where order_number = v_ref;
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'الطلب غير موجود');
  end if;

  if v_order.status = 'returned' then
    return jsonb_build_object('ok', false, 'error', 'الطلب مرتجع مسبقاً');
  end if;

  update public.store_orders
  set status = 'returned', payment_status = 'refunded', admin_notes = coalesce(admin_notes || E'\n', '') || 'مرتجع: ' || p_reason
  where id = v_order.id;

  insert into public.pos_transactions (shift_id, order_id, type, amount, payment_method, notes)
  values (r.shift_id, v_order.id, 'return', -v_order.total, v_order.payment_method, p_reason);

  return jsonb_build_object('ok', true, 'order_id', v_order.id, 'order_number', v_order.order_number, 'refund_amount', v_order.total);
end;
$$;

-- 6.5) إغلاق الشفت مع ملخص
-- ------------------------------------------------------------
create or replace function public.pos_close_shift(p_token text, p_actual_cash numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_shift public.pos_shifts%rowtype;
  v_expected numeric(12,2);
  v_sales numeric(12,2);
  v_returns numeric(12,2);
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  select * into v_shift from public.pos_shifts where id = r.shift_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'لا يوجد شفت مفتوح'); end if;

  select coalesce(sum(case when type = 'sale' then amount else 0 end), 0),
         coalesce(sum(case when type = 'return' then amount else 0 end), 0)
  into v_sales, v_returns
  from public.pos_transactions
  where shift_id = r.shift_id;

  v_expected := v_shift.opening_cash + v_sales + v_returns;

  update public.pos_shifts
  set actual_cash = p_actual_cash, closed_at = now()
  where id = r.shift_id;

  return jsonb_build_object('ok', true,
    'opening_cash', v_shift.opening_cash,
    'expected_cash', v_expected,
    'actual_cash', p_actual_cash,
    'difference', p_actual_cash - v_expected,
    'sales', v_sales,
    'returns', v_returns);
end;
$$;

-- 6.6) جلب ملخص الشفت الحالي
-- ------------------------------------------------------------
create or replace function public.pos_current_shift(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_shift public.pos_shifts%rowtype;
  v_sales numeric(12,2);
  v_returns numeric(12,2);
  v_transactions_count integer;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  select * into v_shift from public.pos_shifts where id = r.shift_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'لا يوجد شفت مفتوح'); end if;

  select coalesce(sum(case when type = 'sale' then amount else 0 end), 0),
         coalesce(sum(case when type = 'return' then amount else 0 end), 0),
         count(*)
  into v_sales, v_returns, v_transactions_count
  from public.pos_transactions
  where shift_id = r.shift_id;

  return jsonb_build_object('ok', true,
    'shift', to_jsonb(v_shift),
    'sales', v_sales,
    'returns', v_returns,
    'transactions_count', v_transactions_count);
end;
$$;

-- 6.7) حفظ/طباعة إيصال
-- ------------------------------------------------------------
create or replace function public.pos_save_receipt(
  p_token text,
  p_order_id uuid,
  p_receipt_text text,
  p_printer_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_id uuid;
begin
  select * into r from public.pos_session_valid(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  insert into public.pos_receipts (order_id, shift_id, cashier_id, receipt_text, printer_name, printed_at)
  values (p_order_id, r.shift_id, r.cashier_id, p_receipt_text, p_printer_name, now())
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- 6.8) منح الصلاحيات على الجداول والدوال الجديدة
-- ------------------------------------------------------------
grant select, insert, update, delete on public.pos_receipts to anon, authenticated;
grant select, insert, update, delete on public.pos_transactions to anon, authenticated;

grant execute on function public.pos_save_receipt(text, uuid, text, text) to anon, authenticated;
