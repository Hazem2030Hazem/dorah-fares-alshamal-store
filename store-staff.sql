-- ============================================================
-- درة فارس الشمال — نظام دخول الموظفين (Staff Portal)
-- شغّل هذا الملف من: Supabase Dashboard → SQL Editor → Run
--
-- ملاحظة: هذا الملف يُنشئ الجداول والدوال الأساسية. بعض دوال
-- التقارير والفوترة تحتاج إلى تفاصيل إضافية حسب احتياجات العمل.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1) جداول الموظفين والجلسات
-- ============================================================
create table if not exists public.staff_users (
  id bigint generated always as identity primary key,
  username text unique not null,
  password_hash text not null,  -- salt$sha256(salt:password)
  role text not null check (role in ('manager','accountant','biller','hr','viewer')),
  full_name text not null,
  active boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_users enable row level security;

-- الجدول الوحيد الذي يسمح للـ anon بالكتابة هو محاولات الدخول (من خلال الدالة فقط)
create table if not exists public.staff_sessions (
  token text primary key,
  staff_id bigint not null references public.staff_users(id) on delete cascade,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.staff_sessions enable row level security;

-- جدول سجل مراجعة الموظفين
create table if not exists public.staff_audit_log (
  id bigint generated always as identity primary key,
  staff_id bigint references public.staff_users(id) on delete set null,
  action text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.staff_audit_log enable row level security;

-- ============================================================
-- 2) دوال مساعدة
-- ============================================================
create or replace function public.staff_hash_matches(p_stored text, p_password text)
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
  v_expected := v_salt || '$' || encode(digest(v_salt || ':' || p_password, 'sha256'), 'hex');
  return v_expected = p_stored;
end;
$$;

create or replace function public.staff_can(p_role text, p_action text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return case p_role
    when 'manager'    then p_action = any(array['dashboard','orders','einvoice','vouchers','journal','expenses','reports','trial_balance','aging','payroll','audit'])
    when 'accountant' then p_action = any(array['vouchers','journal','expenses','reports','trial_balance','aging'])
    when 'biller'     then p_action = any(array['orders','einvoice'])
    when 'hr'         then p_action = any(array['payroll'])
    when 'viewer'     then p_action = any(array['reports'])
    else false
  end;
end;
$$;

create or replace function public.staff_session_role(p_token text)
returns table (ok boolean, role text, name text, username text, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.staff_users%rowtype;
begin
  select u.* into v_staff
  from public.staff_users u
  join public.staff_sessions s on s.staff_id = u.id
  where s.token = p_token
    and s.revoked_at is null
    and s.created_at > now() - interval '12 hours'
    and u.active = true;

  if not found then
    return query select false, null::text, null::text, null::text, 'الجلسة غير صالحة'::text;
    return;
  end if;

  if v_staff.locked_until is not null and v_staff.locked_until > now() then
    return query select false, null::text, null::text, null::text, ('الحساب مقفل حتى ' || v_staff.locked_until)::text;
    return;
  end if;

  return query select true, v_staff.role, v_staff.full_name, v_staff.username, null::text;
end;
$$;

-- ============================================================
-- 3) RPCs الأساسية
-- ============================================================

-- تسجيل دخول الموظف
create or replace function public.staff_login(
  p_username text,
  p_password text,
  p_ip text,
  p_ua text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.staff_users%rowtype;
  v_token text;
  v_remaining integer;
begin
  select * into v_user from public.staff_users where username = p_username;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'اسم المستخدم غير موجود');
  end if;

  if v_user.locked_until is not null and v_user.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'الحساب مقفل مؤقتاً');
  end if;

  if not public.staff_hash_matches(v_user.password_hash, p_password) then
    update public.staff_users
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '5 minutes' else locked_until end
    where id = v_user.id;
    v_remaining := greatest(0, 5 - (v_user.failed_attempts + 1));
    return jsonb_build_object('ok', false, 'error', 'كلمة المرور غير صحيحة', 'remaining', v_remaining);
  end if;

  -- نجاح
  update public.staff_users set failed_attempts = 0, locked_until = null where id = v_user.id;

  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.staff_sessions (token, staff_id, ip, user_agent)
  values (v_token, v_user.id, p_ip, p_ua);

  insert into public.staff_audit_log (staff_id, action, details)
  values (v_user.id, 'login', jsonb_build_object('ip', p_ip));

  return jsonb_build_object('ok', true, 'token', v_token, 'role', v_user.role,
                            'name', v_user.full_name, 'username', v_user.username);
end;
$$;

-- تسجيل خروج
create or replace function public.staff_logout(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.staff_sessions set revoked_at = now() where token = p_token;
end;
$$;

-- التحقق من الجلسة
create or replace function public.staff_validate(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if r.ok then
    return jsonb_build_object('ok', true, 'role', r.role, 'name', r.name, 'username', r.username);
  else
    return jsonb_build_object('ok', false, 'error', coalesce(r.error, 'الجلسة غير صالحة'));
  end if;
end;
$$;

-- قائمة الطلبات (للبiller/المدير)
create or replace function public.staff_list_orders(p_token text, p_limit integer default 60)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'orders') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  return (
    select jsonb_build_object('ok', true, 'orders', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'customer_name', o.customer_name,
        'customer_phone', o.customer_phone,
        'total', o.total,
        'status', o.status,
        'payment_status', o.payment_status,
        'created_at', o.created_at
      ) order by o.created_at desc
    ), '[]'::jsonb))
    from (
      select * from public.store_orders order by created_at desc limit p_limit
    ) o
  );
end;
$$;

-- تفاصيل طلب واحد
create or replace function public.staff_order_details(p_token text, p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_order public.store_orders%rowtype;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'orders') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  select * into v_order from public.store_orders where id = p_order_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'الطلب غير موجود');
  end if;

  return jsonb_build_object('ok', true, 'order', to_jsonb(v_order));
end;
$$;

-- قائمة العملاء/الكيانات
create or replace function public.staff_list_entities(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', 'الجلسة غير صالحة'); end if;

  return jsonb_build_object('ok', true, 'entities', '[]'::jsonb);
end;
$$;

-- سياق الفاتورة الإلكترونية
create or replace function public.staff_einvoice_context(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'einvoice') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'seller_name', 'شركة درة فارس الشمال',
                            'vat_number', '300000000000003', 'vat_rate', 0.15);
end;
$$;

-- حفظ فاتورة إلكترونية
create or replace function public.staff_save_einvoice(
  p_token text,
  p_order_id uuid,
  p_xml text,
  p_qr text,
  p_invoice_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'einvoice') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  -- يمكن ربطها بجدول zatca_log لاحقاً
  insert into public.zatca_log (invoice_number, total, tax, qr_code)
  values (p_invoice_number, 0, 0, p_qr);

  return jsonb_build_object('ok', true, 'id', gen_random_uuid());
end;
$$;

-- جلب فاتورة إلكترونية
create or replace function public.staff_get_einvoice(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'einvoice') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'einvoice', null);
end;
$$;

-- قائمة الفواتير الإلكترونية
create or replace function public.staff_list_einvoices(p_token text, p_today boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'einvoice') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'einvoices', '[]'::jsonb);
end;
$$;

-- سند قبض/صرف
create or replace function public.staff_voucher(
  p_token text,
  p_type text,
  p_amount numeric,
  p_party text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'vouchers') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'id', gen_random_uuid());
end;
$$;

create or replace function public.staff_list_vouchers(p_token text, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'vouchers') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'vouchers', '[]'::jsonb);
end;
$$;

-- قيد يدوي
create or replace function public.staff_post_journal(
  p_token text,
  p_memo text,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'journal') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- مصروفات
create or replace function public.staff_add_expense(
  p_token text,
  p_amount numeric,
  p_category text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'expenses') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'id', gen_random_uuid());
end;
$$;

create or replace function public.staff_list_expenses(p_token text, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'expenses') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'expenses', '[]'::jsonb);
end;
$$;

-- تقارير
create or replace function public.staff_report_daily(p_token text, p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_total numeric;
  v_count integer;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'reports') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  select coalesce(sum(total),0), count(*) into v_total, v_count
  from public.store_orders
  where date(created_at) = p_date;

  return jsonb_build_object('ok', true, 'total', v_total, 'count', v_count);
end;
$$;

create or replace function public.staff_report_trial_balance(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'trial_balance') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'rows', '[]'::jsonb);
end;
$$;

create or replace function public.staff_report_income(
  p_token text,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_total numeric;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'reports') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  select coalesce(sum(total),0) into v_total
  from public.store_orders
  where date(created_at) between p_from and p_to;

  return jsonb_build_object('ok', true, 'income', v_total);
end;
$$;

create or replace function public.staff_report_aging(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'aging') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'aging', '[]'::jsonb);
end;
$$;

-- لوحة المؤشرات
create or replace function public.staff_dashboard(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_today_total numeric;
  v_today_count integer;
  v_month_total numeric;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'dashboard') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  select coalesce(sum(total),0), count(*) into v_today_total, v_today_count
  from public.store_orders where date(created_at) = current_date;

  select coalesce(sum(total),0) into v_month_total
  from public.store_orders where date(created_at) >= date_trunc('month', current_date);

  return jsonb_build_object('ok', true,
    'today_total', v_today_total, 'today_count', v_today_count,
    'month_total', v_month_total);
end;
$$;

-- رواتب
create or replace function public.staff_list_payroll(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'payroll') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'payroll', '[]'::jsonb);
end;
$$;

-- سجل المراجعة
create or replace function public.staff_audit(p_token text, p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'audit') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  return (
    select jsonb_build_object('ok', true, 'rows', coalesce(jsonb_agg(
      jsonb_build_object('id', a.id, 'action', a.action, 'details', a.details, 'created_at', a.created_at)
      order by a.created_at desc
    ), '[]'::jsonb))
    from (select * from public.staff_audit_log order by created_at desc limit p_limit) a
  );
end;
$$;

-- ============================================================
-- 4) صلاحيات RLS
-- ============================================================
-- لا نسمح بالوصول المباشر من الواجهة؛ كل العمليات عبر RPCs
create policy staff_users_no_direct on public.staff_users for all to authenticated using (false) with check (false);
create policy staff_sessions_no_direct on public.staff_sessions for all to authenticated using (false) with check (false);
create policy staff_audit_log_admin on public.staff_audit_log for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 5) منح الصلاحيات
-- ============================================================
grant execute on function public.staff_login(text, text, text, text) to anon;
grant execute on function public.staff_logout(text) to anon, authenticated;
grant execute on function public.staff_validate(text) to anon, authenticated;
grant execute on function public.staff_session_role(text) to anon, authenticated;
grant execute on all functions in schema public
where routine_name like 'staff_%' to anon, authenticated;


-- ============================================================
-- 6) إكمال منطق الأعمال — الجداول والدوال المتقدمة
-- شغّل هذا القسم بعد القسم الأساسي إذا أردت تفعيل:
--   • الفواتير الإلكترونية والسجل
--   • الكيانات (عملاء/موردون)
--   • السندات والقيود والمصروفات والرواتب
--   • ميزان المراجعة و aged balance
-- ============================================================

-- 6.1) سجل زاتكا
-- ------------------------------------------------------------
create table if not exists public.zatca_log (
  id uuid primary key default gen_random_uuid(),
  invoice_number text,
  total numeric(12,2) default 0,
  tax numeric(12,2) default 0,
  qr_code text,
  xml_payload text,
  response jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.zatca_log enable row level security;

create policy zatca_log_admin_only on public.zatca_log
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 6.2) الفواتير الإلكترونية
-- ------------------------------------------------------------
create table if not exists public.einvoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.store_orders(id) on delete set null,
  invoice_number text unique,
  seller_name text not null default 'شركة درة فارس الشمال',
  vat_number text not null default '300000000000003',
  total numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  qr_code text,
  xml_payload text,
  status text not null default 'new' check (status in ('new','reported','cleared','failed','cancelled')),
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.einvoices enable row level security;

drop trigger if exists einvoices_set_updated_at on public.einvoices;
create trigger einvoices_set_updated_at
before update on public.einvoices
for each row execute function public.set_updated_at();

create policy einvoices_admin_only on public.einvoices
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 6.3) الكيانات (عملاء/موردون)
-- ------------------------------------------------------------
create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('customer','supplier','both')),
  name text not null,
  phone text,
  email text,
  vat_number text,
  cr_number text,
  address text,
  credit_limit numeric(12,2) default 0,
  balance numeric(12,2) default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entities enable row level security;

drop trigger if exists entities_set_updated_at on public.entities;
create trigger entities_set_updated_at
before update on public.entities
for each row execute function public.set_updated_at();

create policy entities_admin_only on public.entities
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 6.4) شجرة الحسابات
-- ------------------------------------------------------------
create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  parent_code text references public.chart_of_accounts(code) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.chart_of_accounts enable row level security;

create policy chart_of_accounts_admin_only on public.chart_of_accounts
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- حسابات افتراضية
insert into public.chart_of_accounts (code, name_ar, name_en, account_type)
values
  ('1000', 'النقدية', 'Cash', 'asset'),
  ('1100', 'المخزون', 'Inventory', 'asset'),
  ('1200', 'ذمم العملاء', 'Accounts Receivable', 'asset'),
  ('2000', 'ذمم الموردين', 'Accounts Payable', 'liability'),
  ('3000', 'رأس المال', 'Capital', 'equity'),
  ('4000', 'المبيعات', 'Sales', 'revenue'),
  ('4100', 'إيرادات الشحن', 'Shipping Revenue', 'revenue'),
  ('5000', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense'),
  ('6000', 'مصاريف التشغيل', 'Operating Expenses', 'expense'),
  ('6100', 'مصاريف الرواتب', 'Payroll Expenses', 'expense')
on conflict (code) do nothing;

-- 6.5) القيود اليومية
-- ------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_number text unique,
  memo text not null,
  source text,
  total_debit numeric(12,2) not null default 0,
  total_credit numeric(12,2) not null default 0,
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_code text not null references public.chart_of_accounts(code),
  debit numeric(12,2) not null default 0,
  credit numeric(12,2) not null default 0,
  description text
);

alter table public.journal_lines enable row level security;

create policy journal_entries_admin_only on public.journal_entries
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy journal_lines_admin_only on public.journal_lines
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 6.6) السندات (قبض/صرف)
-- ------------------------------------------------------------
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  voucher_number text unique,
  type text not null check (type in ('receipt','payment')),
  amount numeric(12,2) not null,
  party text not null,
  description text,
  account_code text references public.chart_of_accounts(code),
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.vouchers enable row level security;

create policy vouchers_admin_only on public.vouchers
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 6.7) المصروفات
-- ------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null,
  category text not null,
  description text,
  account_code text references public.chart_of_accounts(code) default '6000',
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy expenses_admin_only on public.expenses
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 6.8) الرواتب
-- ------------------------------------------------------------
create table if not exists public.payroll (
  id uuid primary key default gen_random_uuid(),
  staff_user_id bigint references public.staff_users(id) on delete set null,
  month date not null,
  basic_salary numeric(12,2) not null default 0,
  allowances numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  net_salary numeric(12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','approved','paid')),
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payroll enable row level security;

drop trigger if exists payroll_set_updated_at on public.payroll;
create trigger payroll_set_updated_at
before update on public.payroll
for each row execute function public.set_updated_at();

create policy payroll_admin_only on public.payroll
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================================
-- 7) تحديث دوال Staff لتستخدم الجداول الجديدة
-- ============================================================

-- قائمة الكيانات
-- ------------------------------------------------------------
create or replace function public.staff_list_entities(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', 'الجلسة غير صالحة'); end if;

  return (
    select jsonb_build_object('ok', true, 'entities', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'type', e.type,
        'name', e.name,
        'phone', e.phone,
        'email', e.email,
        'balance', e.balance,
        'is_active', e.is_active
      ) order by e.name
    ), '[]'::jsonb))
    from public.entities e
    where e.is_active = true
  );
end;
$$;

-- سياق الفاتورة الإلكترونية
-- ------------------------------------------------------------
create or replace function public.staff_einvoice_context(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'einvoice') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;
  return jsonb_build_object('ok', true, 'seller_name', 'شركة درة فارس الشمال',
                            'vat_number', '300000000000003', 'vat_rate', 0.15);
end;
$$;

-- حفظ فاتورة إلكترونية
-- ------------------------------------------------------------
create or replace function public.staff_save_einvoice(
  p_token text,
  p_order_id uuid,
  p_xml text,
  p_qr text,
  p_invoice_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_id uuid;
  v_total numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_order public.store_orders%rowtype;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'einvoice') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  if p_order_id is not null then
    select * into v_order from public.store_orders where id = p_order_id;
    if found then
      v_total := v_order.total;
      v_tax := v_order.tax;
    end if;
  end if;

  insert into public.einvoices (order_id, invoice_number, total, tax, qr_code, xml_payload, created_by)
  values (p_order_id, p_invoice_number, v_total, v_tax, p_qr, p_xml, null)
  returning id into v_id;

  insert into public.zatca_log (invoice_number, total, tax, qr_code, xml_payload)
  values (p_invoice_number, v_total, v_tax, p_qr, p_xml);

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- جلب فاتورة إلكترونية
-- ------------------------------------------------------------
create or replace function public.staff_get_einvoice(p_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_einvoice public.einvoices%rowtype;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'einvoice') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  select * into v_einvoice from public.einvoices where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'الفاتورة غير موجودة');
  end if;

  return jsonb_build_object('ok', true, 'einvoice', to_jsonb(v_einvoice));
end;
$$;

-- قائمة الفواتير الإلكترونية
-- ------------------------------------------------------------
create or replace function public.staff_list_einvoices(p_token text, p_today boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'einvoice') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  return (
    select jsonb_build_object('ok', true, 'einvoices', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'invoice_number', e.invoice_number,
        'order_id', e.order_id,
        'total', e.total,
        'tax', e.tax,
        'status', e.status,
        'created_at', e.created_at
      ) order by e.created_at desc
    ), '[]'::jsonb))
    from public.einvoices e
    where (not p_today or date(e.created_at) = current_date)
  );
end;
$$;

-- سند قبض/صرف
-- ------------------------------------------------------------
create or replace function public.staff_voucher(
  p_token text,
  p_type text,
  p_amount numeric,
  p_party text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_id uuid;
  v_num text;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'vouchers') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  v_num := 'VCH-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random()*100000)::text, 5, '0');

  insert into public.vouchers (voucher_number, type, amount, party, description, account_code, created_by)
  values (v_num, p_type, p_amount, p_party, p_description,
          case when p_type = 'receipt' then '1000' else '6000' end,
          null)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'voucher_number', v_num);
end;
$$;

-- قائمة السندات
-- ------------------------------------------------------------
create or replace function public.staff_list_vouchers(p_token text, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'vouchers') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  return (
    select jsonb_build_object('ok', true, 'vouchers', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'voucher_number', v.voucher_number,
        'type', v.type,
        'amount', v.amount,
        'party', v.party,
        'description', v.description,
        'created_at', v.created_at
      ) order by v.created_at desc
    ), '[]'::jsonb))
    from (select * from public.vouchers order by created_at desc limit p_limit) v
  );
end;
$$;

-- قيد يدوي
-- ------------------------------------------------------------
create or replace function public.staff_post_journal(
  p_token text,
  p_memo text,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_entry_id uuid;
  v_num text;
  v_total_debit numeric(12,2) := 0;
  v_total_credit numeric(12,2) := 0;
  v_line jsonb;
  v_debit numeric(12,2);
  v_credit numeric(12,2);
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'journal') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    return jsonb_build_object('ok', false, 'error', 'القيد يحتاج سطوراً');
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_total_debit := v_total_debit + coalesce((v_line->>'debit')::numeric, 0);
    v_total_credit := v_total_credit + coalesce((v_line->>'credit')::numeric, 0);
  end loop;

  if v_total_debit <> v_total_credit then
    return jsonb_build_object('ok', false, 'error', 'القيد غير متوازن');
  end if;

  v_num := 'JE-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random()*100000)::text, 5, '0');

  insert into public.journal_entries (entry_number, memo, total_debit, total_credit, created_by)
  values (v_num, p_memo, v_total_debit, v_total_credit, null)
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.journal_lines (entry_id, account_code, debit, credit, description)
    values (
      v_entry_id,
      v_line->>'account_code',
      coalesce((v_line->>'debit')::numeric, 0),
      coalesce((v_line->>'credit')::numeric, 0),
      v_line->>'description'
    );
  end loop;

  return jsonb_build_object('ok', true, 'id', v_entry_id, 'entry_number', v_num);
end;
$$;

-- مصروف
-- ------------------------------------------------------------
create or replace function public.staff_add_expense(
  p_token text,
  p_amount numeric,
  p_category text,
  p_description text
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
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'expenses') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  insert into public.expenses (amount, category, description, created_by)
  values (p_amount, p_category, p_description, null)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- قائمة المصروفات
-- ------------------------------------------------------------
create or replace function public.staff_list_expenses(p_token text, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'expenses') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  return (
    select jsonb_build_object('ok', true, 'expenses', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'amount', e.amount,
        'category', e.category,
        'description', e.description,
        'created_at', e.created_at
      ) order by e.created_at desc
    ), '[]'::jsonb))
    from (select * from public.expenses order by created_at desc limit p_limit) e
  );
end;
$$;

-- ميزان المراجعة
-- ------------------------------------------------------------
create or replace function public.staff_report_trial_balance(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'trial_balance') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  return (
    select jsonb_build_object('ok', true, 'rows', coalesce(jsonb_agg(
      jsonb_build_object(
        'code', a.code,
        'name', a.name_ar,
        'type', a.account_type,
        'debit', coalesce(b.debit, 0),
        'credit', coalesce(b.credit, 0),
        'balance', coalesce(b.debit, 0) - coalesce(b.credit, 0)
      ) order by a.code
    ), '[]'::jsonb))
    from public.chart_of_accounts a
    left join (
      select jl.account_code,
             sum(jl.debit) as debit,
             sum(jl.credit) as credit
      from public.journal_lines jl
      group by jl.account_code
    ) b on b.account_code = a.code
    where a.is_active = true
  );
end;
$$;

-- aging (ذمم العملاء)
-- ------------------------------------------------------------
create or replace function public.staff_report_aging(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'aging') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  return (
    select jsonb_build_object('ok', true, 'aging', coalesce(jsonb_agg(
      jsonb_build_object(
        'customer_name', o.customer_name,
        'customer_phone', o.customer_phone,
        'total', o.total,
        'status', o.status,
        'days_old', extract(day from now() - o.created_at)::int,
        'created_at', o.created_at
      ) order by o.created_at
    ), '[]'::jsonb))
    from public.store_orders o
    where o.payment_status in ('pending','review')
      and o.status not in ('cancelled')
  );
end;
$$;

-- الرواتب
-- ------------------------------------------------------------
create or replace function public.staff_list_payroll(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'payroll') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  return (
    select jsonb_build_object('ok', true, 'payroll', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'staff_name', u.full_name,
        'month', p.month,
        'basic_salary', p.basic_salary,
        'allowances', p.allowances,
        'deductions', p.deductions,
        'net_salary', p.net_salary,
        'status', p.status
      ) order by p.month desc, u.full_name
    ), '[]'::jsonb))
    from public.payroll p
    left join public.staff_users u on u.id = p.staff_user_id
  );
end;
$$;

-- ============================================================
-- 8) منح الصلاحيات على الجداول والدوال الجديدة
-- ============================================================
grant select, insert, update, delete on public.zatca_log to anon, authenticated;
grant select, insert, update, delete on public.einvoices to anon, authenticated;
grant select, insert, update, delete on public.entities to anon, authenticated;
grant select, insert, update, delete on public.chart_of_accounts to anon, authenticated;
grant select, insert, update, delete on public.journal_entries to anon, authenticated;
grant select, insert, update, delete on public.journal_lines to anon, authenticated;
grant select, insert, update, delete on public.vouchers to anon, authenticated;
grant select, insert, update, delete on public.expenses to anon, authenticated;
grant select, insert, update, delete on public.payroll to anon, authenticated;

-- ملاحظة: المنح على الدوال أعلاه تتم تلقائياً عبر `create or replace function`؛
-- لكن لضمان الصلاحيات نمنحها صراحةً:
grant execute on function public.staff_list_entities(text) to anon, authenticated;
grant execute on function public.staff_save_einvoice(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.staff_get_einvoice(text, uuid) to anon, authenticated;
grant execute on function public.staff_list_einvoices(text, boolean) to anon, authenticated;
grant execute on function public.staff_voucher(text, text, numeric, text, text) to anon, authenticated;
grant execute on function public.staff_list_vouchers(text, integer) to anon, authenticated;
grant execute on function public.staff_post_journal(text, text, jsonb) to anon, authenticated;
grant execute on function public.staff_add_expense(text, numeric, text, text) to anon, authenticated;
grant execute on function public.staff_list_expenses(text, integer) to anon, authenticated;
grant execute on function public.staff_report_trial_balance(text) to anon, authenticated;
grant execute on function public.staff_report_aging(text) to anon, authenticated;
grant execute on function public.staff_list_payroll(text) to anon, authenticated;
