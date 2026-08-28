-- ============================================================================
-- Migration 0003: Pending payments + secure approval workflow + receipts
-- ADDITIVE. Deploy with: supabase db push
--
-- Guarantees:
--   * A PENDING payment never affects official balances (ledger is written
--     only inside approve_payment).
--   * approve_payment is ONE atomic database transaction: status check,
--     ledger entry, loan update, receipt, notification, audit — all-or-nothing.
--   * Double approval is impossible: the pending->processed check shares the
--     same transaction (second request raises 'already processed').
--   * Receipt failure does NOT reverse the financial commit: the receipt is
--     attempted post-commit and retried safely via issue_receipt.
-- ============================================================================

-- 1. PENDING PAYMENTS — member submissions awaiting admin approval.
create table if not exists public.pending_payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  tx_type     text not null check (tx_type in (
                'contribution', 'savings_deposit', 'loan_repayment', 'withdrawal')),
  amount      numeric(14, 2) not null check (amount > 0),
  loan_id     uuid references public.loans (id) on delete set null,
  reference   text,
  proof_url   text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'failed')),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists pending_payments_status_idx on public.pending_payments (status, created_at);
create index if not exists pending_payments_user_idx on public.pending_payments (user_id, created_at desc);

alter table public.pending_payments enable row level security;

drop policy if exists "pending_select_own" on public.pending_payments;
create policy "pending_select_own" on public.pending_payments for select
  using (auth.uid() = user_id or public.is_admin());

-- Members may CREATE pending rows for themselves only, and can never change
-- amount/type/status afterwards (no member update policy exists; the only
-- update policy below is admin-only, used for rejections).
drop policy if exists "pending_insert_own" on public.pending_payments;
create policy "pending_insert_own" on public.pending_payments for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "pending_admin_update" on public.pending_payments;
create policy "pending_admin_update" on public.pending_payments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. RECEIPTS: link to pending payments + approval metadata.
alter table public.receipts add column if not exists payment_id uuid references public.pending_payments (id);
alter table public.receipts add column if not exists approved_by uuid references auth.users (id);
alter table public.receipts add column if not exists cooperative text not null default 'Standard Mutual Savings';
create unique index if not exists receipts_payment_unique on public.receipts (payment_id) where payment_id is not null;

-- 3. MEMBER: submit a payment for verification (PENDING — no balance effect).
create or replace function public.submit_payment(
  p_tx_type text,
  p_amount numeric,
  p_loan_id uuid default null,
  p_reference text default null,
  p_proof_url text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_loan public.loans;
  v_id uuid;
begin
  if v_user is null then raise exception 'Not signed in'; end if;
  if p_tx_type not in ('contribution', 'savings_deposit', 'loan_repayment', 'withdrawal') then
    raise exception 'Unsupported transaction type';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;

  -- Loan repayments are validated against the OFFICIAL loan record only.
  if p_tx_type = 'loan_repayment' then
    select * into v_loan from public.loans
    where id = p_loan_id and user_id = v_user and status = 'disbursed';
    if v_loan.user_id is null then
      raise exception 'Loan not found or not eligible for repayment';
    end if;
  end if;

  insert into public.pending_payments (user_id, tx_type, amount, loan_id, reference, proof_url)
  values (v_user, p_tx_type, p_amount, p_loan_id, p_reference, p_proof_url)
  returning id into v_id;

  perform public.log_audit('payment.submitted', 'pending_payments', v_id::text,
    jsonb_build_object('tx_type', p_tx_type, 'amount', p_amount));
  return v_id;
end;
$$;

-- 4. RETRYABLE receipt issuance (idempotent) — declared before approval so
--    approve_payment can reference it. Receipt failure never reverses the
--    financial commit.
create or replace function public.issue_receipt(p_payment_id uuid, p_admin uuid default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_payment public.pending_payments;
  v_receipt text;
begin
  select * into v_payment from public.pending_payments where id = p_payment_id and status = 'approved';
  if v_payment.user_id is null then raise exception 'Approved transaction not found'; end if;

  -- Idempotent: an existing receipt wins.
  select receipt_number into v_receipt from public.receipts where payment_id = p_payment_id;
  if v_receipt is not null then return v_receipt; end if;

  select 'SMS-' || to_char(now(), 'YYYY') || '-' ||
         lpad((floor(random() * 900000) + 100000)::text, 6, '0')
    into v_receipt;

  insert into public.receipts
    (payment_id, user_id, receipt_number, amount, entry_type, approved_by)
  values
    (p_payment_id, v_payment.user_id, v_receipt, v_payment.amount, v_payment.tx_type,
     coalesce(p_admin, v_payment.approved_by));

  perform public.notify_user(v_payment.user_id, 'Receipt ready',
    'Receipt ' || v_receipt || ' is available for your approved ' ||
    replace(v_payment.tx_type, '_', ' ') || '.', 'receipt');

  perform public.log_audit('receipt.issued', 'receipts', v_receipt,
    jsonb_build_object('payment_id', p_payment_id::text));
  return v_receipt;
end;
$$;

-- 5. ADMIN: THE secure approval workflow (one atomic transaction).
create or replace function public.approve_payment(p_payment_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_payment public.pending_payments;
  v_loan public.loans;
  v_entry uuid;
  v_receipt text;
  v_wallet_after numeric;
begin
  -- (1) authenticated + (2) admin authorization
  if v_admin is null then raise exception 'Not authenticated'; end if;
  if not public.is_admin() then raise exception 'Not authorised'; end if;

  -- (3)/(4) transaction exists + belongs to this cooperative's membership
  select * into v_payment from public.pending_payments where id = p_payment_id;
  if v_payment.user_id is null then raise exception 'Transaction not found'; end if;
  if not exists (select 1 from public.profiles where id = v_payment.user_id) then
    raise exception 'Transaction does not belong to this cooperative';
  end if;

  -- (5)/(6) still pending, not already processed. The status flip below is
  -- part of this same transaction, so concurrent/double requests lose here.
  if v_payment.status <> 'pending' then
    raise exception 'Transaction already processed';
  end if;

  -- (7) validate amount from the official record (never the client payload)
  if v_payment.amount is null or v_payment.amount <= 0 then
    raise exception 'Invalid transaction amount';
  end if;

  -- (8)-(12) atomically approve + post financial records + history.
  update public.pending_payments
     set status = 'approved', approved_by = v_admin, approved_at = now()
   where id = p_payment_id and status = 'pending'
  returning * into v_payment;

  if v_payment.id is null then
    raise exception 'Transaction already processed';
  end if;

  if v_payment.tx_type = 'contribution' then
    -- Contributions go to savings; they never move the wallet balance.
    v_entry := public.post_ledger_entry(
      v_payment.user_id, 'contribution', 'credit', v_payment.amount, 'savings',
      v_payment.reference, 'pending:' || p_payment_id::text,
      'Co-op contribution (approved)', false);

  elsif v_payment.tx_type = 'savings_deposit' then
    v_entry := public.post_ledger_entry(
      v_payment.user_id, 'deposit', 'credit', v_payment.amount, 'wallet',
      v_payment.reference, 'pending:' || p_payment_id::text,
      'Savings deposit (approved)', true);

  elsif v_payment.tx_type = 'loan_repayment' then
    -- Official loan record is the source of truth: ownership + eligibility.
    select * into v_loan from public.loans
    where id = v_payment.loan_id and user_id = v_payment.user_id and status = 'disbursed';
    if v_loan.user_id is null then
      raise exception 'Loan not eligible for repayment';
    end if;
    if v_payment.amount > (v_loan.total_repayable - v_loan.amount_repaid) then
      raise exception 'Repayment exceeds outstanding loan balance';
    end if;

    v_entry := public.post_ledger_entry(
      v_payment.user_id, 'loan_repayment', 'credit', v_payment.amount, 'savings',
      coalesce(v_payment.reference, 'loan:' || v_loan.id::text),
      'pending:' || p_payment_id::text,
      'Loan repayment (approved)', false);

    update public.loans
       set amount_repaid = amount_repaid + v_payment.amount,
           status = case when amount_repaid + v_payment.amount >= total_repayable
                         then 'repaid' else 'disbursed' end,
           updated_at = now()
     where id = v_loan.id;

    perform public.notify_user(v_payment.user_id, 'Loan repayment approved',
      '₦' || to_char(v_payment.amount, 'FM999,999,999.00') || ' repayment recorded.', 'loan_repayment');

  elsif v_payment.tx_type = 'withdrawal' then
    v_entry := public.post_ledger_entry(
      v_payment.user_id, 'withdrawal', 'debit', v_payment.amount, 'wallet',
      v_payment.reference, 'pending:' || p_payment_id::text,
      'Withdrawal (approved)', true);
  end if;

  select balance into v_wallet_after from public.profiles where id = v_payment.user_id;

  -- (13) receipt — attempted inside the transaction, but a failure here is
  -- caught and audit-logged WITHOUT reversing the financial commit; the
  -- receipt is retried safely through issue_receipt.
  begin
    v_receipt := public.issue_receipt(p_payment_id, v_admin);
  exception when others then
    perform public.log_audit('receipt.generation_failed', 'pending_payments',
      p_payment_id::text, jsonb_build_object('error', SQLERRM));
    v_receipt := null;
  end;

  perform public.log_audit('payment.approved', 'pending_payments', p_payment_id::text,
    jsonb_build_object('admin', v_admin, 'tx_type', v_payment.tx_type,
                       'amount', v_payment.amount, 'ledger_entry', v_entry));

  -- (14) authoritative result for Expo
  return jsonb_build_object(
    'payment_id', p_payment_id,
    'tx_type', v_payment.tx_type,
    'amount', v_payment.amount,
    'status', 'approved',
    'approved_at', v_payment.approved_at,
    'wallet_balance', v_wallet_after,
    'receipt_number', v_receipt
  );
end;
$$;

-- 6. Authoritative member financial snapshot (returned after approval).
create or replace function public.get_member_financial_summary(p_user_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v jsonb;
begin
  if v_user is null then raise exception 'Not signed in'; end if;
  if v_user <> auth.uid() and not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  select jsonb_build_object(
    'wallet_balance', (select balance from public.profiles where id = v_user),
    'total_savings', coalesce((select sum(case when entry_type in ('contribution','deposit') then amount
                                              when entry_type = 'withdrawal' then -amount else 0 end)
                               from public.ledger_entries where user_id = v_user), 0),
    'loan_outstanding', coalesce((select sum(total_repayable - amount_repaid) from public.loans
                                  where user_id = v_user and status in ('approved','disbursed')), 0)
  ) into v;
  return v;
end;
$$;

grant execute on function public.submit_payment(text, numeric, uuid, text, text) to authenticated;
grant execute on function public.approve_payment(uuid) to authenticated;
grant execute on function public.issue_receipt(uuid, uuid) to authenticated;
grant execute on function public.get_member_financial_summary(uuid) to authenticated;
