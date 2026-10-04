create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('ADMIN', 'COMMITTEE', 'MEMBER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_type as enum ('INCOME', 'EXPENSE');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  mobile text,
  address text,
  email text not null,
  profile_photo_url text,
  role public.app_role not null default 'MEMBER',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.transaction_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, type)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type public.transaction_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  category_id uuid references public.transaction_categories(id) on delete restrict,
  donor_or_recipient text not null,
  description text,
  transaction_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  image_url text,
  author_id uuid not null references public.profiles(id) on delete restrict,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.committee_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  position text not null,
  display_order integer not null default 0,
  bio text,
  photo_url text,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace view public.public_profiles
with (security_barrier = true)
as
select distinct p.id, p.full_name
from public.profiles p
where exists (select 1 from public.notices n where n.author_id = p.id)
   or exists (
     select 1 from public.committee_members cm
     where cm.profile_id = p.id and cm.is_current
   );

create index if not exists transactions_date_idx on public.transactions (transaction_date desc);
create index if not exists transactions_type_idx on public.transactions (transaction_type);
create index if not exists notices_pinned_created_idx on public.notices (is_pinned desc, created_at desc);
create index if not exists committee_current_order_idx on public.committee_members (is_current, display_order);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.has_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role = any (allowed_roles)
  );
$$;

create or replace function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.is_active
  limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, full_name, mobile, address, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'নতুন সদস্য'),
    nullif(trim(new.raw_user_meta_data ->> 'mobile'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'address'), ''),
    new.email,
    case when requested_role = 'COMMITTEE' then 'COMMITTEE'::public.app_role else 'MEMBER'::public.app_role end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_member_access(
  target_profile_id uuid,
  target_role public.app_role,
  target_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role(array['ADMIN'::public.app_role]) then
    raise exception 'অনুমতি নেই' using errcode = '42501';
  end if;
  if target_role = 'ADMIN' then
    raise exception 'অ্যাডমিনের ভূমিকা এই পর্দা থেকে পরিবর্তন করা যাবে না' using errcode = '22023';
  end if;
  if exists (select 1 from public.profiles where id = target_profile_id and role = 'ADMIN') then
    raise exception 'অ্যাডমিনের ভূমিকা এই পর্দা থেকে পরিবর্তন করা যাবে না' using errcode = '22023';
  end if;
  update public.profiles
  set role = target_role, is_active = target_is_active, updated_at = now()
  where id = target_profile_id;
  if not found then
    raise exception 'সদস্য পাওয়া যায়নি' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.get_financial_summary()
returns table (income_total numeric, expense_total numeric, current_balance numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum(t.amount) filter (where t.transaction_type = 'INCOME'), 0),
    coalesce(sum(t.amount) filter (where t.transaction_type = 'EXPENSE'), 0),
    coalesce(sum(t.amount) filter (where t.transaction_type = 'INCOME'), 0)
      - coalesce(sum(t.amount) filter (where t.transaction_type = 'EXPENSE'), 0)
  from public.transactions t;
$$;

create or replace function public.write_financial_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    case when tg_op = 'INSERT' then 'CREATE' else 'UPDATE' end,
    'transactions',
    new.id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new)
  );
  return null;
end;
$$;

drop trigger if exists transactions_audit_log on public.transactions;
create trigger transactions_audit_log
  after insert or update on public.transactions
  for each row execute procedure public.write_financial_audit_log();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute procedure public.touch_updated_at();
drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at before update on public.transactions
  for each row execute procedure public.touch_updated_at();
drop trigger if exists notices_touch_updated_at on public.notices;
create trigger notices_touch_updated_at before update on public.notices
  for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.transaction_categories enable row level security;
alter table public.transactions enable row level security;
alter table public.notices enable row level security;
alter table public.committee_members enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_read_own_or_admin on public.profiles;
create policy profiles_read_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.has_role(array['ADMIN'::public.app_role]));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and is_active)
  with check (id = (select auth.uid()) and is_active and role = private.current_role());

drop policy if exists categories_read_public on public.transaction_categories;
create policy categories_read_public on public.transaction_categories
  for select to anon, authenticated using (is_active or private.has_role(array['ADMIN'::public.app_role]));
drop policy if exists categories_admin_manage on public.transaction_categories;
create policy categories_admin_manage on public.transaction_categories
  for all to authenticated
  using (private.has_role(array['ADMIN'::public.app_role]))
  with check (private.has_role(array['ADMIN'::public.app_role]));

drop policy if exists transactions_read_public on public.transactions;
create policy transactions_read_public on public.transactions
  for select to anon, authenticated using (true);
drop policy if exists transactions_admin_insert on public.transactions;
create policy transactions_admin_insert on public.transactions
  for insert to authenticated
  with check (private.has_role(array['ADMIN'::public.app_role]) and created_by = (select auth.uid()));
drop policy if exists transactions_admin_update on public.transactions;
create policy transactions_admin_update on public.transactions
  for update to authenticated
  using (private.has_role(array['ADMIN'::public.app_role]))
  with check (private.has_role(array['ADMIN'::public.app_role]));

drop policy if exists notices_read_public on public.notices;
create policy notices_read_public on public.notices
  for select to anon, authenticated using (true);
drop policy if exists notices_insert_staff on public.notices;
create policy notices_insert_staff on public.notices
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and is_pinned = false
    and private.has_role(array['ADMIN'::public.app_role, 'COMMITTEE'::public.app_role])
  );
drop policy if exists notices_admin_update on public.notices;
create policy notices_admin_update on public.notices
  for update to authenticated
  using (private.has_role(array['ADMIN'::public.app_role]))
  with check (private.has_role(array['ADMIN'::public.app_role]));
drop policy if exists notices_committee_update_own on public.notices;
create policy notices_committee_update_own on public.notices
  for update to authenticated
  using (author_id = (select auth.uid()) and not is_pinned and private.has_role(array['COMMITTEE'::public.app_role]))
  with check (author_id = (select auth.uid()) and not is_pinned and private.has_role(array['COMMITTEE'::public.app_role]));
drop policy if exists notices_admin_delete on public.notices;
create policy notices_admin_delete on public.notices
  for delete to authenticated using (private.has_role(array['ADMIN'::public.app_role]));
drop policy if exists notices_committee_delete_own on public.notices;
create policy notices_committee_delete_own on public.notices
  for delete to authenticated using (author_id = (select auth.uid()) and not is_pinned and private.has_role(array['COMMITTEE'::public.app_role]));

drop policy if exists committee_read_public on public.committee_members;
create policy committee_read_public on public.committee_members
  for select to anon, authenticated using (is_current or private.has_role(array['ADMIN'::public.app_role]));
drop policy if exists committee_admin_manage on public.committee_members;
create policy committee_admin_manage on public.committee_members
  for all to authenticated
  using (private.has_role(array['ADMIN'::public.app_role]))
  with check (private.has_role(array['ADMIN'::public.app_role]));

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated using (private.has_role(array['ADMIN'::public.app_role]));

revoke all on public.profiles, public.transaction_categories, public.transactions,
  public.notices, public.committee_members, public.audit_logs from anon, authenticated;

grant select (id, full_name) on public.profiles to anon;
grant select (id, full_name, mobile, address, email, profile_photo_url, role, is_active, created_at, updated_at)
  on public.profiles to authenticated;
grant update (full_name, mobile, address, profile_photo_url) on public.profiles to authenticated;
grant select on public.transaction_categories, public.transactions, public.notices, public.committee_members to anon, authenticated;
grant insert, update, delete on public.transaction_categories to authenticated;
grant insert, update on public.transactions to authenticated;
grant insert, update, delete on public.notices to authenticated;
grant insert, update, delete on public.committee_members to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.public_profiles to anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.has_role(public.app_role[]) to anon, authenticated;
grant execute on function private.current_role() to authenticated;
grant execute on function public.set_member_access(uuid, public.app_role, boolean) to authenticated;
grant execute on function public.get_financial_summary() to anon, authenticated;

insert into public.transaction_categories (name, type) values
  ('চিকিৎসা সহায়তা', 'EXPENSE'),
  ('মসজিদের টাইলস বাবদ', 'EXPENSE'),
  ('শিক্ষা বৃত্তি', 'EXPENSE'),
  ('SSC পাশ প্রণোদনা', 'EXPENSE'),
  ('প্রণোদনা বৃত্তি', 'EXPENSE'),
  ('হিসাব সমন্বয়', 'EXPENSE'),
  ('অন্যান্য', 'EXPENSE'),
  ('সদস্য অনুদান', 'INCOME'),
  ('সদস্য চাঁদা', 'INCOME'),
  ('অন্যান্য জমা', 'INCOME')
on conflict (name, type) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-photos', 'profile-photos', false, 2097152, array['image/jpeg', 'image/png']),
  ('notice-images', 'notice-images', true, 2097152, array['image/jpeg', 'image/png']),
  ('committee-photos', 'committee-photos', true, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists public_can_view_foundation_images on storage.objects;
create policy public_can_view_foundation_images on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('notice-images', 'committee-photos'));
drop policy if exists users_view_own_profile_photo on storage.objects;
create policy users_view_own_profile_photo on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.has_role(array['ADMIN'::public.app_role])
    )
  );
drop policy if exists users_upload_own_profile_photo on storage.objects;
create policy users_upload_own_profile_photo on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists staff_upload_notice_image on storage.objects;
create policy staff_upload_notice_image on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'notice-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.has_role(array['ADMIN'::public.app_role, 'COMMITTEE'::public.app_role])
  );
drop policy if exists admin_upload_committee_photo on storage.objects;
create policy admin_upload_committee_photo on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'committee-photos'
    and private.has_role(array['ADMIN'::public.app_role])
  );
drop policy if exists users_update_own_uploads on storage.objects;
create policy users_update_own_uploads on storage.objects
  for update to authenticated
  using (
    bucket_id in ('profile-photos', 'notice-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('profile-photos', 'notice-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists admins_delete_foundation_images on storage.objects;
create policy admins_delete_foundation_images on storage.objects
  for delete to authenticated
  using (
    private.has_role(array['ADMIN'::public.app_role])
    or (
      bucket_id in ('profile-photos', 'notice-images')
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
  );
