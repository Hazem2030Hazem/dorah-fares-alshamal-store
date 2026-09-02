-- ============================================================
-- درة فارس الشمال — نظام دخول الموظفين (Staff Portal) v2
-- محسّن: ربط created_by + إدارة مستخدمين + indexes + RLS
-- شغّل هذا الملف من: Supabase Dashboard → SQL Editor → Run
--
-- يجب تشغيل هذا الملف بعد:
--   إعداد-نظام-الحسابات-والطلبات.sql
-- ثم تشغيل:
--   store-pos.sql
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

drop trigger if exists staff_users_set_updated_at on public.staff_users;
create trigger staff_users_set_updated_at
before update on public.staff_users
for each row execute function public.set_updated_at();

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

-- indexes أساسية
create index if not exists idx_staff_users_username on public.staff_users(username);
create index if not exists idx_staff_users_role on public.staff_users(role);
create index if not exists idx_staff_sessions_token on public.staff_sessions(token);
create index if not exists idx_staff_sessions_staff_id on public.staff_sessions(staff_id);
create index if not exists idx_staff_audit_staff_id on public.staff_audit_log(staff_id);
create index if not exists idx_staff_audit_created_at on public.staff_audit_log(created_at desc);

-- ============================================================
-- 2) دوال مساعدة
-- ============================================================
create or replace function public.staff_hash_password(p_password text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salt text;
begin
  v_salt := encode(gen_random_bytes(8), 'hex');
  return v_salt || '$' || encode(digest(v_salt || ':' || p_password, 'sha256'), 'hex');
end;
$$;

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
    when 'manager'    then p_action = any(array['dashboard','orders','einvoice','vouchers','journal','expenses','reports','trial_balance','aging','payroll','audit','staff_management'])
    when 'accountant' then p_action = any(array['vouchers','journal','expenses','reports','trial_balance','aging'])
    when 'biller'     then p_action = any(array['orders','einvoice'])
    when 'hr'         then p_action = any(array['payroll'])
    when 'viewer'     then p_action = any(array['reports'])
    else false
  end;
end;
$$;

create or replace function public.staff_session_role(p_token text)
returns table (ok boolean, staff_id bigint, role text, name text, username text, error text)
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
    return query select false, null::bigint, null::text, null::text, null::text, 'الجلسة غير صالحة'::text;
    return;
  end if;

  if v_staff.locked_until is not null and v_staff.locked_until > now() then
    return query select false, null::bigint, null::text, null::text, null::text, ('الحساب مقفل حتى ' || v_staff.locked_until)::text;
    return;
  end if;

  return query select true, v_staff.id, v_staff.role, v_staff.full_name, v_staff.username, null::text;
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
  values (v_user.id, 'login', jsonb_build_object('ip', p_ip, 'ua', p_ua));

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

-- تسجيل خروج من كل الجلسات
create or replace function public.staff_logout_all(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  update public.staff_sessions
  set revoked_at = now()
  where staff_id = r.staff_id and revoked_at is null;

  return jsonb_build_object('ok', true);
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

-- تغيير كلمة المرور
create or replace function public.staff_change_password(
  p_token text,
  p_old_password text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_user public.staff_users%rowtype;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok then return jsonb_build_object('ok', false, 'error', r.error); end if;

  if length(coalesce(p_new_password, '')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
  end if;

  select * into v_user from public.staff_users where id = r.staff_id;
  if not public.staff_hash_matches(v_user.password_hash, p_old_password) then
    return jsonb_build_object('ok', false, 'error', 'كلمة المرور الحالية غير صحيحة');
  end if;

  update public.staff_users
  set password_hash = public.staff_hash_password(p_new_password)
  where id = r.staff_id;

  -- إلغاء كل الجلسات ما عدا الحالية
  update public.staff_sessions
  set revoked_at = now()
  where staff_id = r.staff_id and token <> p_token and revoked_at is null;

  insert into public.staff_audit_log (staff_id, action, details)
  values (r.staff_id, 'change_password', jsonb_build_object());

  return jsonb_build_object('ok', true);
end;
$$;

-- إدارة المستخدمين (للمدير فقط)
create or replace function public.staff_create_user(
  p_token text,
  p_username text,
  p_password text,
  p_role text,
  p_full_name text
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
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'staff_management') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  if length(coalesce(p_password, '')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  end if;

  insert into public.staff_users (username, password_hash, role, full_name)
  values (p_username, public.staff_hash_password(p_password), p_role, p_full_name)
  returning id into v_id;

  insert into public.staff_audit_log (staff_id, action, details)
  values (r.staff_id, 'create_user', jsonb_build_object('new_user_id', v_id, 'username', p_username, 'role', p_role));

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'اسم المستخدم مستخدم مسبقاً');
end;
$$;

create or replace function public.staff_toggle_active(
  p_token text,
  p_username text,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_user public.staff_users%rowtype;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'staff_management') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  select * into v_user from public.staff_users where username = p_username;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'المستخدم غير موجود');
  end if;

  if v_user.id = r.staff_id and not p_active then
    return jsonb_build_object('ok', false, 'error', 'لا يمكنك تعطيل حسابك');
  end if;

  update public.staff_users
  set active = p_active, failed_attempts = 0, locked_until = null
  where id = v_user.id;

  -- إلغاء جلسات المستخدم إذا تم تعطيله
  if not p_active then
    update public.staff_sessions set revoked_at = now() where staff_id = v_user.id and revoked_at is null;
  end if;

  insert into public.staff_audit_log (staff_id, action, details)
  values (r.staff_id, 'toggle_active', jsonb_build_object('target', p_username, 'active', p_active));

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.staff_list_users(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.staff_session_role(p_token);
  if not r.ok or not public.staff_can(r.role, 'staff_management') then
    return jsonb_build_object('ok', false, 'error', 'لا تملك الصلاحية');
  end if;

  return (
    select jsonb_build_object('ok', true, 'users', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'username', u.username,
        'role', u.role,
        'full_name', u.full_name,
        'active', u.active,
        'locked_until', u.locked_until,
        'created_at', u.created_at
      ) order by u.created_at desc
    ), '[]'::jsonb))
    from public.staff_users u
  );
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
  values (p_order_id, p_invoice_number, v_total, v_tax, p_qr, p_xml, r.staff_id)
  returning id into v_id;

  insert into public.zatca_log (invoice_number, total, tax, qr_code, xml_payload)
  values (p_invoice_number, v_total, v_tax, p_qr, p_xml);

  return jsonb_build_object('ok', true, 'id', v_id);
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
          r.staff_id)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'voucher_number', v_num);
end;
$$;

-- قائمة السندات
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
  values (v_num, p_memo, v_total_debit, v_total_credit, r.staff_id)
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
  values (p_amount, p_category, p_description, r.staff_id)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- قائمة المصروفات
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
      jsonb_build_object(
        'id', a.id,
        'staff_name', u.full_name,
        'action', a.action,
        'details', a.details,
        'created_at', a.created_at
      ) order by a.created_at desc
    ), '[]'::jsonb))
    from (select * from public.staff_audit_log order by created_at desc limit p_limit) a
    left join public.staff_users u on u.id = a.staff_id
  );
end;
$$;

-- ============================================================
-- 4) الجداول والدوال المتقدمة (المالية والمحاسبية)
-- ============================================================

-- 4.1) سجل زاتكا
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

-- indexes
create index if not exists idx_zatca_invoice_number on public.zatca_log(invoice_number);
create index if not exists idx_zatca_created_at on public.zatca_log(created_at desc);

-- 4.2) الفواتير الإلكترونية
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

create index if not exists idx_einvoices_order_id on public.einvoices(order_id);
create index if not exists idx_einvoices_invoice_number on public.einvoices(invoice_number);
create index if not exists idx_einvoices_created_by on public.einvoices(created_by);

-- 4.3) الكيانات (عملاء/موردون)
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

create index if not exists idx_entities_name on public.entities(name);
create index if not exists idx_entities_phone on public.entities(phone);

-- 4.4) شجرة الحسابات
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

-- 4.5) القيود اليومية
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

create index if not exists idx_journal_entries_entry_number on public.journal_entries(entry_number);
create index if not exists idx_journal_lines_entry_id on public.journal_lines(entry_id);
create index if not exists idx_journal_lines_account_code on public.journal_lines(account_code);

-- 4.6) السندات (قبض/صرف)
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

create index if not exists idx_vouchers_voucher_number on public.vouchers(voucher_number);
create index if not exists idx_vouchers_created_by on public.vouchers(created_by);

-- 4.7) المصروفات
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

create index if not exists idx_expenses_category on public.expenses(category);
create index if not exists idx_expenses_created_by on public.expenses(created_by);

-- 4.8) الرواتب
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

create index if not exists idx_payroll_month on public.payroll(month);
create index if not exists idx_payroll_staff_user_id on public.payroll(staff_user_id);

-- ============================================================
-- 5) صلاحيات RLS
-- ============================================================
-- لا نسمح بالوصول المباشر من الواجهة؛ كل العمليات عبر RPCs
create policy staff_users_no_direct on public.staff_users for all to authenticated using (false) with check (false);
create policy staff_sessions_no_direct on public.staff_sessions for all to authenticated using (false) with check (false);
create policy staff_audit_log_admin on public.staff_audit_log for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 6) منح الصلاحيات
-- ============================================================
grant execute on function public.staff_login(text, text, text, text) to anon;
grant execute on function public.staff_logout(text) to anon, authenticated;
grant execute on function public.staff_logout_all(text) to anon, authenticated;
grant execute on function public.staff_validate(text) to anon, authenticated;
grant execute on function public.staff_session_role(text) to anon, authenticated;
grant execute on function public.staff_change_password(text, text, text) to anon, authenticated;
grant execute on function public.staff_create_user(text, text, text, text, text) to anon, authenticated;
grant execute on function public.staff_toggle_active(text, text, boolean) to anon, authenticated;
grant execute on function public.staff_list_users(text) to anon, authenticated;
grant execute on all functions in schema public
where routine_name like 'staff_%' to anon, authenticated;

-- الجداول تُدار عبر RLS + RPCs فقط؛ لا نمنح صلاحيات مباشرة واسعة
-- (تم إزالة grant select/insert/update/delete المفرط من النسخة السابقة)

-- ============================================================
-- 7) مستخدم admin أولي (اختياري - مُعطّل افتراضياً)
-- ============================================================
-- غيّر false → true لو حابب يتعمل auto-create لحساب مدير.
-- بعد التفعيل، غيّر كلمة المرور من Staff Portal.
do $$
begin
  if false and not exists (select 1 from public.staff_users where username = 'admin') then
    insert into public.staff_users (username, password_hash, role, full_name, active)
    values ('admin', public.staff_hash_password('Admin1234!'), 'manager', 'مدير النظام', true);
  end if;
end;
$$;

-- ============================================================
-- ملاحظات أمان مهمة
-- ============================================================
-- • كلمة المرور الافتراضية للـ admin (لو فعّلتها) يجب تغييرها فوراً.
-- • لا تشغّل هذا الملف مرتين على نفس قاعدة البيانات إلا إذا استخدمت
--   create or replace / if not exists (وهو كذلك بالفعل).
-- • RLS policy تمنع الوصول المباشر؛ كل التفاعل يتم عبر RPCs.
