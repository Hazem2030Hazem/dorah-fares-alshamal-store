-- ============================================================
-- درة فارس الشمال — إكمال الجداول المفقودة الأساسية
--
-- الجداول التالية يتوقّعها كود الواجهة (admin-*.js / site-settings.js)
-- لكنها غير موجودة في ملف إعداد-نظام-الحسابات-والطلبات.sql الأساسي.
--
-- يجب تشغيل هذا الملف بعد:
--   إعداد-نظام-الحسابات-والطلبات.sql
--
-- طريقة التشغيل:
--   Supabase Dashboard → SQL Editor → New query → copy/paste → Run
-- ============================================================

-- ============================================================
-- 1) إعدادات الموقع العامة
-- ============================================================
create table if not exists public.site_settings (
  id integer primary key default 1,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- الجميع يقرأ؛ الأدمن فقط يعدّل
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
for select to anon, authenticated using (true);

drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- صف افتراضي
insert into public.site_settings (id, settings) values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- ============================================================
-- 2) المنتجات
-- ============================================================
create table if not exists public.store_products (
  id integer generated always as identity primary key,
  barcode text,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  old_price numeric(12,2),
  stock integer not null default 0,
  category text not null default 'general',
  badge text,
  image text,
  rating numeric(2,1) default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_products enable row level security;

drop trigger if exists store_products_set_updated_at on public.store_products;
create trigger store_products_set_updated_at
before update on public.store_products
for each row execute function public.set_updated_at();

create index if not exists idx_store_products_category on public.store_products(category);
create index if not exists idx_store_products_barcode on public.store_products(barcode);
create index if not exists idx_store_products_is_active on public.store_products(is_active);

-- الجميع يقرأ المنتجات النشطة؛ الأدمن يقرأ/يكتب/يحذف الكل
drop policy if exists store_products_public_select on public.store_products;
create policy store_products_public_select on public.store_products
for select to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists store_products_admin_all on public.store_products;
create policy store_products_admin_all on public.store_products
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 3) عناصر الصفحات (hero banners، محتوى مخصص)
-- ============================================================
create table if not exists public.site_items (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_items enable row level security;

drop trigger if exists site_items_set_updated_at on public.site_items;
create trigger site_items_set_updated_at
before update on public.site_items
for each row execute function public.set_updated_at();

create index if not exists idx_site_items_section on public.site_items(section_key);

drop policy if exists site_items_public_select on public.site_items;
create policy site_items_public_select on public.site_items
for select to anon, authenticated using (is_active = true);

drop policy if exists site_items_admin_all on public.site_items;
create policy site_items_admin_all on public.site_items
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 4) الحسابات البنكية للشركة
-- ============================================================
create table if not exists public.company_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_name text,
  account_number text not null,
  iban text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_bank_accounts enable row level security;

drop trigger if exists company_bank_accounts_set_updated_at on public.company_bank_accounts;
create trigger company_bank_accounts_set_updated_at
before update on public.company_bank_accounts
for each row execute function public.set_updated_at();

create index if not exists idx_company_bank_accounts_sort on public.company_bank_accounts(sort_order);

drop policy if exists company_bank_accounts_public_select on public.company_bank_accounts;
create policy company_bank_accounts_public_select on public.company_bank_accounts
for select to anon, authenticated using (is_active = true);

drop policy if exists company_bank_accounts_admin_all on public.company_bank_accounts;
create policy company_bank_accounts_admin_all on public.company_bank_accounts
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 5) طرق الدفع
-- ============================================================
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text default '💳',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_methods enable row level security;

drop trigger if exists payment_methods_set_updated_at on public.payment_methods;
create trigger payment_methods_set_updated_at
before update on public.payment_methods
for each row execute function public.set_updated_at();

create index if not exists idx_payment_methods_sort on public.payment_methods(sort_order);

drop policy if exists payment_methods_public_select on public.payment_methods;
create policy payment_methods_public_select on public.payment_methods
for select to anon, authenticated using (is_active = true);

drop policy if exists payment_methods_admin_all on public.payment_methods;
create policy payment_methods_admin_all on public.payment_methods
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- طريقة دفع افتراضية: التحويل البنكي
insert into public.payment_methods (name, icon, sort_order, is_active)
values ('تحويل بنكي', '🏦', 1, true)
on conflict do nothing;

-- ============================================================
-- 6) أسعار الشحن
-- ============================================================
create table if not exists public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  from_city text,
  to_city text not null,
  weight_kg numeric(8,2),
  price_sar numeric(12,2) not null default 0,
  estimated_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipping_rates enable row level security;

drop trigger if exists shipping_rates_set_updated_at on public.shipping_rates;
create trigger shipping_rates_set_updated_at
before update on public.shipping_rates
for each row execute function public.set_updated_at();

drop policy if exists shipping_rates_public_select on public.shipping_rates;
create policy shipping_rates_public_select on public.shipping_rates
for select to anon, authenticated using (true);

drop policy if exists shipping_rates_admin_all on public.shipping_rates;
create policy shipping_rates_admin_all on public.shipping_rates
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 7) سجل المراجعة (audit logs)
-- ============================================================
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  action text not null,
  details text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_created_by on public.audit_logs(created_by);

drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select on public.audit_logs
for select to authenticated using (public.is_admin());

drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert on public.audit_logs
for insert to authenticated with check (public.is_admin());

-- ============================================================
-- 8) الموظفون (invited staff — للأدمن)
-- ============================================================
create table if not exists public.staff_members (
  id bigint generated always as identity primary key,
  email text unique not null,
  status text not null default 'pending' check (status in ('pending','active')),
  invited_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

drop trigger if exists staff_members_set_updated_at on public.staff_members;
create trigger staff_members_set_updated_at
before update on public.staff_members
for each row execute function public.set_updated_at();

drop policy if exists staff_members_admin_all on public.staff_members;
create policy staff_members_admin_all on public.staff_members
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 9) منح الصلاحيات
-- ============================================================
grant select on public.site_settings to anon, authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;

grant select on public.store_products to anon, authenticated;
grant select, insert, update, delete on public.store_products to authenticated;

grant select on public.site_items to anon, authenticated;
grant select, insert, update, delete on public.site_items to authenticated;

grant select on public.company_bank_accounts to anon, authenticated;
grant select, insert, update, delete on public.company_bank_accounts to authenticated;

grant select on public.payment_methods to anon, authenticated;
grant select, insert, update, delete on public.payment_methods to authenticated;

grant select on public.shipping_rates to anon, authenticated;
grant select, insert, update, delete on public.shipping_rates to authenticated;

grant select, insert on public.audit_logs to authenticated;

grant select, insert, update, delete on public.staff_members to authenticated;

-- ============================================================
-- ملاحظة: RLS policies تتحكّم فعلياً في الصلاحيات؛
-- المنح أعلاه ضرورية لكن RLS تمنع غير الأدمن من التعديل.
-- ============================================================
