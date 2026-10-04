alter table public.profiles alter column email drop not null;
revoke update (mobile) on public.profiles from authenticated;

do $$ begin
  create type public.donation_submission_status as enum ('PENDING', 'RECORDED', 'REJECTED');
exception when duplicate_object then null;
end $$;

create table if not exists public.donation_submissions (
  id uuid primary key default gen_random_uuid(),
  donor_name text not null check (length(trim(donor_name)) between 2 and 120),
  transaction_reference text not null check (length(trim(transaction_reference)) between 4 and 80),
  amount numeric(14, 2) not null check (amount > 0),
  status public.donation_submission_status not null default 'PENDING',
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists donation_submissions_reference_unique
  on public.donation_submissions (lower(trim(transaction_reference)));
create index if not exists donation_submissions_pending_created_idx
  on public.donation_submissions (created_at desc)
  where status = 'PENDING';

drop trigger if exists donation_submissions_touch_updated_at on public.donation_submissions;
create trigger donation_submissions_touch_updated_at before update on public.donation_submissions
  for each row execute procedure public.touch_updated_at();

alter table public.donation_submissions enable row level security;
revoke all on public.donation_submissions from anon, authenticated;
grant insert (donor_name, transaction_reference, amount) on public.donation_submissions to anon, authenticated;
grant select on public.donation_submissions to authenticated;

drop policy if exists donation_submissions_public_create on public.donation_submissions;
create policy donation_submissions_public_create on public.donation_submissions
  for insert to anon, authenticated
  with check (
    status = 'PENDING'
    and transaction_id is null
    and length(trim(donor_name)) between 2 and 120
    and length(trim(transaction_reference)) between 4 and 80
    and amount > 0
  );
drop policy if exists donation_submissions_admin_read on public.donation_submissions;
create policy donation_submissions_admin_read on public.donation_submissions
  for select to authenticated
  using (private.has_role(array['ADMIN'::public.app_role]));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  member_mobile text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'mobile'), ''),
    nullif(new.phone, '')
  );
begin
  insert into public.profiles (id, full_name, mobile, address, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'নতুন সদস্য'),
    member_mobile,
    nullif(trim(new.raw_user_meta_data ->> 'address'), ''),
    new.email,
    case when requested_role = 'COMMITTEE' then 'COMMITTEE'::public.app_role else 'MEMBER'::public.app_role end
  );
  return new;
end;
$$;

create or replace function public.record_donation_submission(
  submission_id uuid,
  income_category_id uuid,
  donation_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission public.donation_submissions%rowtype;
  new_transaction_id uuid;
begin
  if not private.has_role(array['ADMIN'::public.app_role]) then
    raise exception 'অনুমতি নেই' using errcode = '42501';
  end if;

  select * into submission
  from public.donation_submissions
  where id = submission_id and status = 'PENDING'
  for update;
  if not found then
    raise exception 'অপেক্ষমাণ অনুদানের আবেদন পাওয়া যায়নি' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.transaction_categories
    where id = income_category_id and type = 'INCOME' and is_active
  ) then
    raise exception 'সক্রিয় জমার খাত নির্বাচন করুন' using errcode = '22023';
  end if;

  insert into public.transactions (
    transaction_type, amount, category_id, donor_or_recipient, description,
    transaction_date, created_by
  ) values (
    'INCOME', submission.amount, income_category_id, submission.donor_name,
    'বিকাশ অনুদান · ট্রানজেকশন আইডি: ' || submission.transaction_reference,
    donation_date, auth.uid()
  )
  returning id into new_transaction_id;

  update public.donation_submissions
  set status = 'RECORDED', transaction_id = new_transaction_id, updated_at = now()
  where id = submission.id;

  return new_transaction_id;
end;
$$;

create or replace function public.reject_donation_submission(submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_role(array['ADMIN'::public.app_role]) then
    raise exception 'অনুমতি নেই' using errcode = '42501';
  end if;

  update public.donation_submissions
  set status = 'REJECTED', updated_at = now()
  where id = submission_id and status = 'PENDING';

  if not found then
    raise exception 'অপেক্ষমাণ অনুদানের আবেদন পাওয়া যায়নি' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.record_donation_submission(uuid, uuid, date) from public, anon;
revoke all on function public.reject_donation_submission(uuid) from public, anon;
grant execute on function public.record_donation_submission(uuid, uuid, date) to authenticated;
grant execute on function public.reject_donation_submission(uuid) to authenticated;
