-- ============================================================
-- درة فارس الشمال — إعداد نظام الحسابات والطلبات والمدفوعات والتقييمات
-- شغّل هذا الملف من: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1) المستخدمون والملفات الشخصية
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role text default 'customer';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- إنشاء ملف شخصي تلقائياً عند تسجيل مستخدم جديد
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- تحديث updated_at تلقائياً
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- صلاحية الأدمن بدون كسر RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- منع المستخدم العادي من رفع نفسه إلى admin
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() يكون NULL عند التنفيذ من SQL Editor أو Service Role، ونسمح حينها بتعيين أول أدمن
  if auth.uid() is not null and old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_role_escalation();

-- ============================================================
-- 2) العناوين
-- ============================================================
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'المنزل',
  city text not null,
  district text,
  street text,
  building text,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.addresses add column if not exists label text default 'المنزل';
alter table public.addresses add column if not exists district text;
alter table public.addresses add column if not exists street text;
alter table public.addresses add column if not exists building text;
alter table public.addresses add column if not exists notes text;
alter table public.addresses add column if not exists is_default boolean default false;
alter table public.addresses add column if not exists created_at timestamptz default now();
alter table public.addresses add column if not exists updated_at timestamptz default now();

drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

-- جعل العنوان الجديد الافتراضي الوحيد عند اختيار is_default
create or replace function public.ensure_single_default_address()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.addresses
    set is_default = false
    where user_id = new.user_id and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists addresses_single_default on public.addresses;
create trigger addresses_single_default
before insert or update on public.addresses
for each row execute function public.ensure_single_default_address();

-- ============================================================
-- 3) طلبات المنتجات
-- ============================================================
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'new' check (status in ('new','review','processing','shipped','delivered','completed','cancelled')),
  payment_method text not null default 'bank_transfer',
  payment_status text not null default 'pending' check (payment_status in ('pending','review','paid','rejected','refunded')),
  payment_reference text,
  payment_gateway text,
  payment_transaction_id text,
  receipt_path text,
  notes text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists order_number text;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists address jsonb;
alter table public.orders add column if not exists items jsonb default '[]'::jsonb;
alter table public.orders add column if not exists subtotal numeric(12,2) default 0;
alter table public.orders add column if not exists discount numeric(12,2) default 0;
alter table public.orders add column if not exists tax numeric(12,2) default 0;
alter table public.orders add column if not exists total numeric(12,2) default 0;
alter table public.orders add column if not exists status text default 'new';
alter table public.orders add column if not exists payment_method text default 'bank_transfer';
alter table public.orders add column if not exists payment_status text default 'pending';
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_gateway text;
alter table public.orders add column if not exists payment_transaction_id text;
alter table public.orders add column if not exists receipt_path text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists admin_notes text;
alter table public.orders add column if not exists created_at timestamptz default now();
alter table public.orders add column if not exists updated_at timestamptz default now();

create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number = 'DF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_generate_number on public.orders;
create trigger orders_generate_number
before insert on public.orders
for each row execute function public.generate_order_number();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- ============================================================
-- 4) طلبات الخدمات
-- ============================================================
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_type text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  city text,
  address text,
  description text not null,
  preferred_date date,
  status text not null default 'new' check (status in ('new','contacted','inspection','in_progress','completed','cancelled')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_requests add column if not exists customer_email text;
alter table public.service_requests add column if not exists city text;
alter table public.service_requests add column if not exists address text;
alter table public.service_requests add column if not exists preferred_date date;
alter table public.service_requests add column if not exists status text default 'new';
alter table public.service_requests add column if not exists admin_notes text;
alter table public.service_requests add column if not exists created_at timestamptz default now();
alter table public.service_requests add column if not exists updated_at timestamptz default now();

drop trigger if exists service_requests_set_updated_at on public.service_requests;
create trigger service_requests_set_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

-- ============================================================
-- 5) رسائل التواصل
-- ============================================================
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  phone text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new','read','replied','archived')),
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.contact_messages add column if not exists user_id uuid;
alter table public.contact_messages add column if not exists subject text;
alter table public.contact_messages add column if not exists status text default 'new';
alter table public.contact_messages add column if not exists reply text;
alter table public.contact_messages add column if not exists replied_at timestamptz;
alter table public.contact_messages add column if not exists created_at timestamptz default now();

-- ============================================================
-- 6) إيصالات الدفع
-- ============================================================
create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  file_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_receipts add column if not exists status text default 'pending';
alter table public.payment_receipts add column if not exists admin_notes text;
alter table public.payment_receipts add column if not exists reviewed_by uuid;
alter table public.payment_receipts add column if not exists reviewed_at timestamptz;
alter table public.payment_receipts add column if not exists created_at timestamptz default now();

-- ربط الإيصال بالطلب بأمان من حساب العميل نفسه
create or replace function public.attach_payment_receipt(p_order_id uuid, p_file_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set receipt_path = p_file_path,
      payment_status = 'review'
  where id = p_order_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Order not found or does not belong to current user';
  end if;
end;
$$;

revoke all on function public.attach_payment_receipt(uuid, text) from public;
grant execute on function public.attach_payment_receipt(uuid, text) to authenticated;

-- ============================================================
-- 7) توسيع جدول التقييمات الحالي للتقييم الموثق
-- ============================================================
create table if not exists public.reviews (
  id bigint generated by default as identity primary key,
  name text,
  product text,
  text text,
  rating integer default 5,
  date text,
  created_at timestamptz default now()
);

alter table public.reviews add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.reviews add column if not exists product_id integer;
alter table public.reviews add column if not exists order_id uuid references public.orders(id) on delete set null;
alter table public.reviews add column if not exists verified_purchase boolean not null default false;
alter table public.reviews add column if not exists status text default 'pending';
alter table public.reviews add column if not exists updated_at timestamptz default now();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- ============================================================
-- 8) تفعيل RLS والسياسات
-- ============================================================
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.service_requests enable row level security;
alter table public.contact_messages enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.reviews enable row level security;

-- إزالة أي سياسات قديمة على هذه الجداول حتى لا تتعارض مع نظام الحسابات الجديد
DO $$
declare
  pol record;
begin
  for pol in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','addresses','orders','service_requests','contact_messages','payment_receipts','reviews')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- profiles
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- addresses
drop policy if exists addresses_select_own_or_admin on public.addresses;
create policy addresses_select_own_or_admin on public.addresses
for select to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists addresses_insert_own on public.addresses;
create policy addresses_insert_own on public.addresses
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists addresses_update_own_or_admin on public.addresses;
create policy addresses_update_own_or_admin on public.addresses
for update to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists addresses_delete_own_or_admin on public.addresses;
create policy addresses_delete_own_or_admin on public.addresses
for delete to authenticated
using (auth.uid() = user_id or public.is_admin());

-- orders
drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin on public.orders
for select to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists orders_delete_admin on public.orders;
create policy orders_delete_admin on public.orders
for delete to authenticated
using (public.is_admin());

-- service_requests
drop policy if exists service_requests_select_own_or_admin on public.service_requests;
create policy service_requests_select_own_or_admin on public.service_requests
for select to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists service_requests_insert_own on public.service_requests;
create policy service_requests_insert_own on public.service_requests
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists service_requests_update_admin on public.service_requests;
create policy service_requests_update_admin on public.service_requests
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists service_requests_delete_admin on public.service_requests;
create policy service_requests_delete_admin on public.service_requests
for delete to authenticated
using (public.is_admin());

-- contact_messages
drop policy if exists contact_insert_public on public.contact_messages;
create policy contact_insert_public on public.contact_messages
for insert to anon, authenticated
with check (user_id is null or auth.uid() = user_id);

drop policy if exists contact_select_admin_or_owner on public.contact_messages;
create policy contact_select_admin_or_owner on public.contact_messages
for select to authenticated
using (public.is_admin() or (user_id is not null and auth.uid() = user_id));

drop policy if exists contact_update_admin on public.contact_messages;
create policy contact_update_admin on public.contact_messages
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists contact_delete_admin on public.contact_messages;
create policy contact_delete_admin on public.contact_messages
for delete to authenticated
using (public.is_admin());

-- payment_receipts
drop policy if exists receipts_select_own_or_admin on public.payment_receipts;
create policy receipts_select_own_or_admin on public.payment_receipts
for select to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists receipts_insert_own on public.payment_receipts;
create policy receipts_insert_own on public.payment_receipts
for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.orders
    where id = order_id and user_id = auth.uid()
  )
);

drop policy if exists receipts_update_admin on public.payment_receipts;
create policy receipts_update_admin on public.payment_receipts
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists receipts_delete_admin on public.payment_receipts;
create policy receipts_delete_admin on public.payment_receipts
for delete to authenticated
using (public.is_admin());

-- reviews
drop policy if exists reviews_public_select on public.reviews;
create policy reviews_public_select on public.reviews
for select to anon, authenticated
using (coalesce(status, 'published') in ('published','approved') or public.is_admin());

drop policy if exists reviews_insert_authenticated on public.reviews;
create policy reviews_insert_authenticated on public.reviews
for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    order_id is null
    or exists (
      select 1 from public.orders
      where id = order_id
        and user_id = auth.uid()
        and status in ('delivered','completed')
    )
  )
);

drop policy if exists reviews_update_admin on public.reviews;
create policy reviews_update_admin on public.reviews
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists reviews_delete_admin on public.reviews;
create policy reviews_delete_admin on public.reviews
for delete to authenticated
using (public.is_admin());

-- ============================================================
-- 9) Storage — bucket خاص لإيصالات الدفع
-- ============================================================
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do update set public = false;

drop policy if exists receipts_storage_upload_own on storage.objects;
create policy receipts_storage_upload_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists receipts_storage_read_own_or_admin on storage.objects;
create policy receipts_storage_read_own_or_admin on storage.objects
for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists receipts_storage_update_admin on storage.objects;
create policy receipts_storage_update_admin on storage.objects
for update to authenticated
using (bucket_id = 'payment-receipts' and public.is_admin())
with check (bucket_id = 'payment-receipts' and public.is_admin());

drop policy if exists receipts_storage_delete_admin on storage.objects;
create policy receipts_storage_delete_admin on storage.objects
for delete to authenticated
using (bucket_id = 'payment-receipts' and public.is_admin());

-- ============================================================
-- 10) بعد تشغيل الملف — أنشئ حساب الأدمن ثم حوّله إلى admin
-- ============================================================
-- من Supabase: Authentication → Users → Add user
-- أنشئ حساب الأدمن بالبريد وكلمة المرور، ثم ضع UUID الخاص به هنا:
-- update public.profiles set role = 'admin' where id = 'ضع-UUID-الأدمن-هنا';

-- ملاحظة مهمة: لتسجيل العملاء بسرعة من الموقع:
-- Authentication → Providers → Email → فعّل Email
-- ويُفضّل أثناء البداية إيقاف Confirm email حتى يدخل المستخدم مباشرة.
