-- ============================================================================
-- Standard Mutual Savings — Migration 0002: Financial Core
-- Server-authoritative ledger, loans, schedules, receipts, notifications,
-- audit log, and balance-write hardening. ADDITIVE — deploy: supabase db push
-- ============================================================================

-- 1. LEDGER_ENTRIES — append-only record of every money movement. Written
--    exclusively through security definer RPCs (no insert/update policies).
create table if not exists public.ledger_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  entry_type      text not null check (entry_type in (
                    'deposit', 'withdrawal', 'contribution',
                    'loan_disbursement', 'loan_repayment', 'fee', 'adjustment')),
  direction       text not null check (direction in ('credit', 'debit')),
  amount          numeric(14, 2) not null check (amount > 0),
  wallet_after    numeric(14, 2),
  category        text,
  reference       text,
  idempotency_key text unique,
  description     text,
  created_at      timestamptz not null default now()
);

create index if not exists ledger_user_created_idx
  on public.ledger_entries (user_id, created_at desc);
alter table public.ledger_entries enable row level security;

drop policy if exists "ledger_select_own" on public.ledger_entries;
create policy "ledger_select_own" on public.ledger_entries for select
  using (auth.uid() = user_id or public.is_admin());

-- 2. LOANS — lifecycle: pending -> approved -> disbursed -> repaid.
create table if not exists public.loans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  principal       numeric(14, 2) not null check (principal > 0),
  monthly_rate    numeric(6, 4) not null default 0.0250,
  tenure_months   int not null check (tenure_months between 1 and 36),
  total_repayable numeric(14, 2),
  amount_repaid   numeric(14, 2) not null default 0,
  status          text not null default 'pending' check (status in (
                    'pending', 'approved', 'rejected', 'disbursed', 'repaid', 'defaulted')),
  purpose         text,
  requested_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  disbursed_at    timestamptz,
  due_date        date,
  updated_at      timestamptz not null default now()
);

create index if not exists loans_user_idx on public.loans (user_id);
alter table public.loans enable row level security;

drop policy if exists "loans_select_own" on public.loans;
create policy "loans_select_own" on public.loans for select
  using (auth.uid() = user_id or public.is_admin());

-- 3. CONTRIBUTION_SCHEDULES — automatic contribution engine.
create table if not exists public.contribution_schedules (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles (id) on delete cascade,
  amount          numeric(14, 2) not null check (amount > 0),
  frequency       text not null default 'monthly' check (frequency in ('weekly', 'monthly')),
  auto_pay        boolean not null default true,
  active          boolean not null default true,
  next_due_date   date not null default current_date,
  last_charged_at timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.contribution_schedules enable row level security;
drop policy if exists "schedules_select_own" on public.contribution_schedules;
create policy "schedules_select_own" on public.contribution_schedules for select
  using (auth.uid() = user_id or public.is_admin());

-- 4. RECEIPTS — auto-issued on every approved deposit.
create table if not exists public.receipts (
  id             uuid primary key default gen_random_uuid(),
  deposit_id     uuid unique references public.deposits (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  receipt_number text not null unique,
  amount         numeric(14, 2) not null,
  entry_type     text not null default 'deposit',
  issued_at      timestamptz not null default now()
);

alter table public.receipts enable row level security;
drop policy if exists "receipts_select_own" on public.receipts;
create policy "receipts_select_own" on public.receipts for select
  using (auth.uid() = user_id or public.is_admin());

-- 5. NOTIFICATIONS — per-member feed written by server flows.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null default 'info',
  title      text not null,
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "notifications_mark_read_own" on public.notifications;
create policy "notifications_mark_read_own" on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. AUDIT_LOG — append-only record of privileged actions (admin-readable).
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  actor      uuid references auth.users (id) on delete set null,
  actor_role text not null default 'system',
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;
drop policy if exists "audit_admin_read" on public.audit_log;
create policy "audit_admin_read" on public.audit_log for select
  using (public.is_admin());

-- 7. PRIVATE_SETTINGS — gateway secrets moved OUT of member-readable
--    app_settings. No policies => only service_role / definer functions.
create table if not exists public.private_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- 8. DEPOSITS: category tag — 'wallet' (default) funds the wallet,
--    'contribution' books straight to savings on approval.
alter table public.deposits add column if not exists category text not null default 'wallet';

-- 9. CORE HELPERS — audit writer, notifier, single ledger writer.
create or replace function public.log_audit(
  p_action text, p_entity text, p_entity_id text default null, p_details jsonb default null
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_log (actor, actor_role, action, entity, entity_id, details)
  values (
    auth.uid(),
    case when public.is_admin() then 'admin'
         when auth.uid() is null then 'system' else 'member' end,
    p_action, p_entity, p_entity_id, p_details
  );
end;
$$;

create or replace function public.notify_user(
  p_user_id uuid, p_title text, p_body text, p_type text default 'info'
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, type)
  values (p_user_id, p_title, p_body, p_type);
end;
$$;

-- Single ledger writer. Idempotent on idempotency_key. Maintains the
-- wallet_after snapshot when the entry moves the wallet balance.
create or replace function public.post_ledger_entry(
  p_user_id uuid,
  p_entry_type text,
  p_direction text,            -- 'credit' = wallet in, 'debit' = wallet out
  p_amount numeric,
  p_category text default null,
  p_reference text default null,
  p_idempotency_key text default null,
  p_description text default null,
  p_move_wallet boolean default true
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_balance numeric(14, 2);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Ledger amount must be positive';
  end if;

  -- Idempotency: replay-safe for webhooks / retries.
  if p_idempotency_key is not null then
    select id into v_id from public.ledger_entries where idempotency_key = p_idempotency_key;
    if v_id is not null then return v_id; end if;
  end if;

  if p_move_wallet then
    if p_direction = 'credit' then
      update public.profiles
         set balance = balance + p_amount, updated_at = now()
       where id = p_user_id
      returning balance into v_balance;
    else
      update public.profiles
         set balance = balance - p_amount, updated_at = now()
       where id = p_user_id and balance >= p_amount
      returning balance into v_balance;
      if v_balance is null then
        raise exception 'Insufficient available balance';
      end if;
    end if;
  else
    select balance into v_balance from public.profiles where id = p_user_id;
  end if;

  insert into public.ledger_entries
    (user_id, entry_type, direction, amount, wallet_after, category, reference, idempotency_key, description)
  values
    (p_user_id, p_entry_type, p_direction, p_amount, v_balance, p_category, p_reference, p_idempotency_key, p_description)
  returning id into v_id;

  return v_id;
end;
$$;

-- 10. APPROVE / REJECT DEPOSIT — upgraded atomically: ledger entry, automatic
--     receipt, notification and audit. Respects deposits.category.
create or replace function public.approve_deposit(p_deposit_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_amount  numeric(14, 2);
  v_category text;
  v_ref text;
  v_entry uuid;
  v_receipt text;
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  select user_id, amount, coalesce(category, 'wallet'), reference_id
    into v_user_id, v_amount, v_category, v_ref
  from public.deposits
  where id = p_deposit_id and status = 'pending';

  if v_user_id is null then
    raise exception 'Deposit not found or already processed';
  end if;

  update public.deposits set status = 'successful' where id = p_deposit_id;

  v_entry := public.post_ledger_entry(
    v_user_id, v_category, 'credit', v_amount, v_category, v_ref,
    'deposit:' || p_deposit_id::text,
    case when v_category = 'contribution'
         then 'Co-op contribution (verified transfer)'
         else 'Wallet funding' end,
    (v_category <> 'contribution')
  );

  -- Automatic receipt
  select 'SMS-' || to_char(now(), 'YYYY') || '-' ||
         lpad((floor(random() * 900000) + 100000)::text, 6, '0')
    into v_receipt;
  insert into public.receipts (deposit_id, user_id, receipt_number, amount, entry_type)
  values (p_deposit_id, v_user_id, v_receipt, v_amount, v_category)
  on conflict (deposit_id) do nothing;

  perform public.notify_user(
    v_user_id, 'Payment confirmed',
    'Your payment of ₦' || to_char(v_amount, 'FM999,999,999.00') ||
    ' was verified. Receipt ' || v_receipt || '.', 'payment_success'
  );
  perform public.log_audit('deposit.approved', 'deposits', p_deposit_id::text,
    jsonb_build_object('user_id', v_user_id, 'amount', v_amount, 'category', v_category));
end;
$$;

create or replace function public.reject_deposit(p_deposit_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then raise exception 'Not authorised'; end if;

  select user_id into v_user_id from public.deposits where id = p_deposit_id and status = 'pending';
  if v_user_id is null then raise exception 'Deposit not found or already processed'; end if;

  update public.deposits set status = 'failed' where id = p_deposit_id and status = 'pending';
  perform public.notify_user(v_user_id, 'Payment could not be verified',
    'We could not verify your transfer. Please check the reference and try again.',
    'payment_failed');
  perform public.log_audit('deposit.rejected', 'deposits', p_deposit_id::text,
    jsonb_build_object('user_id', v_user_id));
end;
$$;

-- 11. MEMBER FLOWS
-- Generic wallet payment (availability enforced inside post_ledger_entry).
create or replace function public.pay_from_balance(
  p_amount numeric, p_category text default 'payment',
  p_reference text default null, p_description text default null
) returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not signed in'; end if;
  perform public.post_ledger_entry(
    v_user, 'adjustment', 'debit', p_amount, p_category, p_reference,
    coalesce(p_description, 'Wallet payment: ' || p_category)
  );
  return (select balance from public.profiles where id = v_user);
end;
$$;

-- Member-recorded entries for manual-proof flows:
--   contribution -> savings-only record (verified by admin later)
--   withdrawal   -> debits the wallet immediately (availability enforced)
create or replace function public.record_member_entry(
  p_entry_type text, p_amount numeric,
  p_reference text default null, p_description text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not signed in'; end if;
  if p_entry_type not in ('contribution', 'withdrawal') then
    raise exception 'Entry type not allowed for members';
  end if;

  return public.post_ledger_entry(
    v_user, p_entry_type,
    case when p_entry_type = 'withdrawal' then 'debit' else 'credit' end,
    p_amount,
    case when p_entry_type = 'withdrawal' then 'wallet' else 'savings' end,
    p_reference, p_description,
    (p_entry_type = 'withdrawal')
  );
end;
$$;

-- 12. AUTOMATIC CONTRIBUTION ENGINE
create or replace function public.upsert_contribution_schedule(
  p_amount numeric, p_frequency text, p_auto_pay boolean default true
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_next date;
begin
  if v_user is null then raise exception 'Not signed in'; end if;
  if p_frequency not in ('weekly', 'monthly') then raise exception 'Invalid frequency'; end if;

  if p_frequency = 'weekly' then
    v_next := current_date + 7;
  else
    v_next := (date_trunc('month', current_date) + interval '1 month')::date;
  end if;

  insert into public.contribution_schedules (user_id, amount, frequency, auto_pay, next_due_date)
  values (v_user, p_amount, p_frequency, p_auto_pay, v_next)
  on conflict (user_id) do update
    set amount = excluded.amount,
        frequency = excluded.frequency,
        auto_pay = excluded.auto_pay,
        active = true,
        next_due_date = excluded.next_due_date;

  perform public.log_audit('schedule.upserted', 'contribution_schedules', v_user::text,
    jsonb_build_object('amount', p_amount, 'frequency', p_frequency, 'auto_pay', p_auto_pay));
end;
$$;

create or replace function public.cancel_contribution_schedule()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.contribution_schedules set active = false where user_id = auth.uid();
  perform public.log_audit('schedule.cancelled', 'contribution_schedules', auth.uid()::text, null);
end;
$$;

-- Processes every due schedule. Schedule with pg_cron:
--   select cron.schedule('coop-contributions','0 6 * * *','select public.process_due_contributions();')
-- or call nightly from a scheduled Supabase Edge Function.
create or replace function public.process_due_contributions()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  v_count int := 0;
  v_balance numeric(14, 2);
begin
  for r in
    select * from public.contribution_schedules
    where active and auto_pay and next_due_date <= current_date
  loop
    select balance into v_balance from public.profiles where id = r.user_id;

    if v_balance >= r.amount then
      begin
        perform public.post_ledger_entry(
          r.user_id, 'contribution', 'debit', r.amount, 'auto_contribution',
          'auto:' || r.user_id::text || ':' || r.next_due_date::text,
          'Automatic ' || r.frequency || ' contribution'
        );
        v_count := v_count + 1;
        perform public.notify_user(r.user_id, 'Contribution paid',
          'Your automatic ' || r.frequency || ' contribution of ₦' ||
          to_char(r.amount, 'FM999,999,999.00') || ' was charged to your wallet.',
          'contribution');
      exception when others then
        perform public.notify_user(r.user_id, 'Contribution failed',
          'Automatic contribution could not be processed: ' || SQLERRM, 'contribution_failed');
      end;
    else
      perform public.notify_user(r.user_id, 'Fund your wallet',
        'Automatic contribution of ₦' || to_char(r.amount, 'FM999,999,999.00') ||
        ' is due but your wallet balance is too low.', 'contribution_reminder');
    end if;

    update public.contribution_schedules
       set last_charged_at = now(),
           next_due_date = case when r.frequency = 'weekly'
                                then r.next_due_date + 7
                                else (r.next_due_date + interval '1 month')::date end
     where id = r.id;
  end loop;

  perform public.log_audit('engine.processed', 'contribution_schedules', null,
    jsonb_build_object('processed', v_count));
  return v_count;
end;
$$;

-- 13. LOAN LIFECYCLE
create or replace function public.request_loan(
  p_amount numeric, p_tenure_months int, p_purpose text, p_monthly_rate numeric default 0.025
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_savings numeric;
  v_outstanding numeric;
  v_limit_mode text;
  v_limit_fixed numeric;
  v_limit_percent numeric;
  v_max numeric;
  v_loan uuid;
begin
  if v_user is null then raise exception 'Not signed in'; end if;

  -- Savings = contributions + deposits - withdrawals (server ledger).
  select coalesce(sum(case when entry_type in ('contribution', 'deposit') then amount else 0 end)
                - sum(case when entry_type = 'withdrawal' then amount else 0 end), 0)
    into v_savings
  from public.ledger_entries where user_id = v_user;

  select coalesce(sum(total_repayable - amount_repaid), 0) into v_outstanding
  from public.loans where user_id = v_user and status in ('approved', 'disbursed');
  if v_outstanding > 0 then raise exception 'You have an outstanding loan balance'; end if;

  -- Eligibility limit follows the admin-controlled app_settings rules.
  select
    coalesce((select value from public.app_settings where key = 'loan_limit_mode'), 'percent'),
    coalesce((select value::numeric from public.app_settings where key = 'loan_limit_fixed'), 0),
    coalesce((select value::numeric from public.app_settings where key = 'loan_limit_percent'), 200)
  into v_limit_mode, v_limit_fixed, v_limit_percent;

  v_max := case when v_limit_mode = 'fixed' then v_limit_fixed
                else round(v_savings * v_limit_percent / 100, 2) end;
  if p_amount > v_max then
    raise exception 'Above eligible limit of %', to_char(v_max, 'FM999,999,999.00');
  end if;

  insert into public.loans (user_id, principal, monthly_rate, tenure_months, purpose, total_repayable)
  values (v_user, p_amount, p_monthly_rate, p_tenure_months, p_purpose,
          round(p_amount * (1 + p_monthly_rate * p_tenure_months), 2))
  returning id into v_loan;

  perform public.log_audit('loan.requested', 'loans', v_loan::text,
    jsonb_build_object('amount', p_amount, 'tenure', p_tenure_months));
  return v_loan;
end;
$$;

create or replace function public.admin_review_loan(p_loan_id uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then raise exception 'Not authorised'; end if;
  select user_id into v_user_id from public.loans where id = p_loan_id and status = 'pending';
  if v_user_id is null then raise exception 'Loan not found or already reviewed'; end if;

  update public.loans
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_at = now()
   where id = p_loan_id;

  perform public.notify_user(v_user_id,
    case when p_approve then 'Loan approved' else 'Loan declined' end,
    case when p_approve then 'Your loan request has been approved and is awaiting disbursement.'
         else 'Unfortunately your loan request was declined.' end, 'loan_review');
  perform public.log_audit('loan.reviewed', 'loans', p_loan_id::text,
    jsonb_build_object('approved', p_approve));
end;
$$;

create or replace function public.disburse_loan(p_loan_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_principal numeric;
  v_total numeric;
  v_tenure int;
begin
  if not public.is_admin() then raise exception 'Not authorised'; end if;
  select user_id, principal, total_repayable, tenure_months
    into v_user_id, v_principal, v_total, v_tenure
  from public.loans where id = p_loan_id and status = 'approved';
  if v_user_id is null then raise exception 'Loan not found or not approved'; end if;

  perform public.post_ledger_entry(
    v_user_id, 'loan_disbursement', 'credit', v_principal, 'wallet',
    'loan:' || p_loan_id::text, 'loan_disb:' || p_loan_id::text, 'Loan disbursement'
  );

  update public.loans
     set status = 'disbursed',
         disbursed_at = now(),
         due_date = (current_date + (v_tenure || ' months')::interval)::date
   where id = p_loan_id;

  perform public.notify_user(v_user_id, 'Loan disbursed',
    '₦' || to_char(v_principal, 'FM999,999,999.00') ||
    ' has been credited to your wallet. Total repayable ₦' ||
    to_char(v_total, 'FM999,999,999.00') || '.', 'loan_disbursed');
  perform public.log_audit('loan.disbursed', 'loans', p_loan_id::text,
    jsonb_build_object('principal', v_principal));
end;
$$;

-- Member repays (fully or partially) from available wallet balance.
create or replace function public.repay_loan_from_wallet(p_loan_id uuid, p_amount numeric)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  v_loan public.loans;
  v_balance numeric;
begin
  select * into v_loan from public.loans
  where id = p_loan_id and user_id = auth.uid() and status = 'disbursed';
  if v_loan.user_id is null then raise exception 'Loan not found or not active'; end if;
  if p_amount <= 0 then raise exception 'Invalid repayment amount'; end if;
  if v_loan.amount_repaid + p_amount > v_loan.total_repayable then
    p_amount := v_loan.total_repayable - v_loan.amount_repaid;
  end if;

  perform public.post_ledger_entry(
    v_loan.user_id, 'loan_repayment', 'debit', p_amount, 'wallet',
    'loan:' || p_loan_id::text, null, 'Loan repayment'
  );

  update public.loans
     set amount_repaid = amount_repaid + p_amount,
         status = case when amount_repaid + p_amount >= total_repayable
                       then 'repaid' else 'disbursed' end,
         updated_at = now()
   where id = p_loan_id;

  select balance into v_balance from public.profiles where id = v_loan.user_id;
  perform public.notify_user(v_loan.user_id, 'Repayment received',
    '₦' || to_char(p_amount, 'FM999,999,999.00') || ' loan repayment recorded.', 'loan_repayment');
  perform public.log_audit('loan.repaid', 'loans', p_loan_id::text,
    jsonb_build_object('amount', p_amount));
  return v_balance;
end;
$$;

-- 14. RECONCILIATION — verify wallet balances match the ledger replay.
create or replace function public.reconcile_wallets()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  v_computed numeric;
  v_repaired int := 0;
begin
  if not public.is_admin() then raise exception 'Not authorised'; end if;

  for r in select id, balance from public.profiles
  loop
    select coalesce(sum(case when direction = 'credit' then amount else -amount end), 0)
      into v_computed
    from public.ledger_entries
    where user_id = r.id and wallet_after is not null;

    if v_computed <> r.balance then
      update public.profiles set balance = v_computed, updated_at = now() where id = r.id;
      perform public.log_audit('reconcile.repaired', 'profiles', r.id::text,
        jsonb_build_object('was', r.balance, 'now', v_computed));
      v_repaired := v_repaired + 1;
    end if;
  end loop;

  return v_repaired;
end;
$$;

-- 15. SECURITY HARDENING — members can never write their own balance/role
--     directly (0001 update policy remains for ordinary profile fields).
--     Service role (auth.uid() null) passes through.
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.balance is distinct from old.balance then
    raise exception 'Wallet balance can only be changed through verified transactions';
  end if;
  if new.role is distinct from old.role then
    raise exception 'Role changes require an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_columns on public.profiles;
create trigger guard_profile_columns
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- 16. GRANTS — members may execute their own flows only.
grant execute on function public.pay_from_balance(numeric, text, text, text) to authenticated;
grant execute on function public.record_member_entry(text, numeric, text, text) to authenticated;
grant execute on function public.upsert_contribution_schedule(numeric, text, boolean) to authenticated;
grant execute on function public.cancel_contribution_schedule() to authenticated;
grant execute on function public.request_loan(numeric, int, text, numeric) to authenticated;
grant execute on function public.repay_loan_from_wallet(uuid, numeric) to authenticated;
grant execute on function public.process_due_contributions() to authenticated;
