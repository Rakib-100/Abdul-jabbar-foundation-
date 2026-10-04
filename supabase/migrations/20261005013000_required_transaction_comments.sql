alter table public.transactions
  add constraint transactions_description_required
  check (
    description is not null
    and length(trim(description)) between 3 and 700
  ) not valid;

drop function if exists public.record_donation_submission(uuid, uuid, date);

create or replace function public.record_donation_submission(
  submission_id uuid,
  income_category_id uuid,
  donation_date date default null,
  transaction_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission public.donation_submissions%rowtype;
  new_transaction_id uuid;
  cleaned_comment text := trim(coalesce(transaction_comment, ''));
begin
  if not private.has_role(array['ADMIN'::public.app_role]) then
    raise exception 'অনুমতি নেই' using errcode = '42501';
  end if;
  if length(cleaned_comment) not between 3 and 500 then
    raise exception 'লেনদেনের তথ্য ৩ থেকে ৫০০ অক্ষরের মধ্যে লিখুন' using errcode = '22023';
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
    'বিকাশ অনুদান · ট্রানজেকশন আইডি: ' || submission.transaction_reference
      || ' · ' || cleaned_comment,
    donation_date, auth.uid()
  )
  returning id into new_transaction_id;

  update public.donation_submissions
  set status = 'RECORDED', transaction_id = new_transaction_id, updated_at = now()
  where id = submission.id;

  return new_transaction_id;
end;
$$;

revoke all on function public.record_donation_submission(uuid, uuid, date, text) from public, anon;
grant execute on function public.record_donation_submission(uuid, uuid, date, text) to authenticated;
