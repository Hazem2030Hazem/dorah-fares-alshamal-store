-- ============================================================
-- درة فارس الشمال — جداول اللوحة المتقدمة
-- (سجل التدقيق + سجل فوترة ZATCA + سجل مزامنة أفاقي)
--
-- طريقة التنفيذ:
--   1) افتح Supabase Dashboard ← مشروعك
--   2) SQL Editor ← New query
--   3) الصق محتوى هذا الملف كاملاً ثم اضغط Run
--   4) آمن لإعادة التشغيل (IF NOT EXISTS + drop policy if exists)
-- ============================================================

-- ============================================================
-- 1) audit_log — سجل التدقيق لعمليات لوحة الإدارة
--    (تسجيل دخول، إضافة/تعديل/حذف منتج، حفظ إعدادات، تصدير/استيراد CSV...)
-- ============================================================
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

alter table public.audit_log add column if not exists action text;
alter table public.audit_log add column if not exists details text;
alter table public.audit_log add column if not exists created_at timestamptz default now();

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_anon on public.audit_log;
create policy audit_log_select_admin on public.audit_log
for select to authenticated
using (public.is_admin());

drop policy if exists audit_log_insert_anon on public.audit_log;
create policy audit_log_insert_admin on public.audit_log
for insert to authenticated
with check (public.is_admin());

-- ============================================================
-- 2) zatca_log — سجل توليد رموز QR للفوترة الإلكترونية (TLV Base64)
-- ============================================================
create table if not exists public.zatca_log (
  id bigint generated always as identity primary key,
  invoice_number text,
  total numeric(12,2),
  tax numeric(12,2),
  qr_code text,
  created_at timestamptz not null default now()
);

alter table public.zatca_log add column if not exists invoice_number text;
alter table public.zatca_log add column if not exists total numeric(12,2);
alter table public.zatca_log add column if not exists tax numeric(12,2);
alter table public.zatca_log add column if not exists qr_code text;
alter table public.zatca_log add column if not exists created_at timestamptz default now();

create index if not exists zatca_log_created_at_idx on public.zatca_log (created_at desc);

alter table public.zatca_log enable row level security;

drop policy if exists zatca_log_select_anon on public.zatca_log;
create policy zatca_log_select_admin on public.zatca_log
for select to authenticated
using (public.is_admin());

drop policy if exists zatca_log_insert_anon on public.zatca_log;
create policy zatca_log_insert_admin on public.zatca_log
for insert to authenticated
with check (public.is_admin());

-- ============================================================
-- 3) afaky_sync_log — سجل عمليات المزامنة مع نظام أفاقي
-- ============================================================
create table if not exists public.afaky_sync_log (
  id bigint generated always as identity primary key,
  mode text,                              -- api / database / csv / webhook / email
  direction text not null default 'export', -- export / import
  records_count integer default 0,
  status text not null default 'success',   -- success / failed
  message text,
  created_at timestamptz not null default now()
);

alter table public.afaky_sync_log add column if not exists mode text;
alter table public.afaky_sync_log add column if not exists direction text default 'export';
alter table public.afaky_sync_log add column if not exists records_count integer default 0;
alter table public.afaky_sync_log add column if not exists status text default 'success';
alter table public.afaky_sync_log add column if not exists message text;
alter table public.afaky_sync_log add column if not exists created_at timestamptz default now();

create index if not exists afaky_sync_log_created_at_idx on public.afaky_sync_log (created_at desc);

alter table public.afaky_sync_log enable row level security;

drop policy if exists afaky_sync_log_select_anon on public.afaky_sync_log;
create policy afaky_sync_log_select_admin on public.afaky_sync_log
for select to authenticated
using (public.is_admin());

drop policy if exists afaky_sync_log_insert_anon on public.afaky_sync_log;
create policy afaky_sync_log_insert_admin on public.afaky_sync_log
for insert to authenticated
with check (public.is_admin());

-- ============================================================
-- ملاحظة: لوحة الإدارة تتعامل مع هذه الجداول بشكل صامت —
-- لو لم يتم تنفيذ هذا الملف لن تنكسر اللوحة، لكن لن تُحفظ السجلات.
-- ============================================================
