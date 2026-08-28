# Financial Architecture — Phases 2–15

All work is **additive code**. Nothing has been applied to the live Supabase project.

## Deploy checklist (you run these)

```bash
# 1. Apply the financial core schema (ledger, loans, schedules, receipts,
#    notifications, audit_log, private_settings, RPCs, balance guard)
supabase db push

# 2. Move gateway secrets out of member-readable app_settings (SQL console):
insert into public.private_settings (key, value)
select key, value from public.app_settings
where key in ('flutterwave_secret_key', 'flutterwave_secret_hash')
on conflict (key) do update set value = excluded.value;
update public.app_settings set value = '' where key in ('flutterwave_secret_key');

# 3. Redeploy the webhook (now verifies payments server-side):
supabase functions deploy flutterwave-webhook

# 4. Schedule the automatic contribution engine (pg_cron):
create extension if not exists pg_cron;
select cron.schedule('coop-contributions', '0 6 * * *',
  'select public.process_due_contributions();');

# 5. Apply the SECURE APPROVAL WORKFLOW:
supabase db push   # applies migrations 0002 + 0003_financial_core / pending_payments
```

## What each phase delivered

| Phase | Deliverable |
|---|---|
| 2 | `supabase/migrations/0002_financial_core.sql` — append-only `ledger_entries`, `loans`, `contribution_schedules`, `receipts`, `notifications`, `audit_log`, `private_settings`; atomic `post_ledger_entry` (idempotent, availability-enforced); upgraded `approve_deposit`/`reject_deposit`; trigger preventing members writing their own `balance`/`role` |
| 3 | `src/lib/ledger.js` + `TransactionsContext` server hydration & write-through (public API unchanged; local fallback intact) |
| 4 | `src/hooks/useBalance.js` — real-time `profiles.balance` via Postgres change subscription |
| 5 | `contribution_schedules` + `process_due_contributions()` engine; schedule saved on contribution submission |
| 6 | `fetchSavingsSummary()` — server-derived savings figures |
| 7 | Loan lifecycle RPCs (`request_loan`, `admin_review_loan`, `disburse_loan`, `repay_loan_from_wallet`); RequestLoanScreen submits to server |
| 8 | `pay_from_balance` + "Pay from Available Balance" on RepayLoanScreen |
| 9 | Webhook verifies payments directly with Flutterwave; `reconcile_wallets()` repairs drift |
| 10 | Automatic receipt (`receipts` table) issued inside `approve_deposit`; notification carries the receipt number |
| 11 | Statements keep working from TransactionsContext — now fed by the server ledger |
| 12 | `notifications` table + `notify_user()` on every server flow; `fetchNotifications` / `markNotificationRead` in `src/lib/ledger.js` |
| 13 | Reconcile button in Admin Deposits (admin dashboard) |
| 14 | `audit_log` records every privileged action; `fetchAuditLog()` for admin dashboards |
| 15 | Regression matrix below |

## Secure approval workflow (migration 0003)

**Pending-first model.** Member submissions (contribution, savings_deposit,
loan_repayment, withdrawal) now create `pending_payments` rows via
`submit_payment`. **PENDING rows never affect balances** — the ledger is
written only inside `approve_payment`.

**Atomic `approve_payment(payment_id)`** — one Postgres transaction:
1. Authenticated + admin authorization (`is_admin()`).
2. Transaction exists + belongs to this cooperative's membership.
3. Still `pending` → flip to `approved` (row-locked, double-tap safe).
4. Type/amount taken from the OFFICIAL record, never the client payload.
5. Contribution → savings ledger; savings deposit → wallet ledger.
   Loan repayment → verifies loan ownership/eligibility, caps at official
   outstanding, recalcs loan balance, posts ledger.
6. Issued `issue_receipt` (idempotent; failure does NOT reverse the commit —
   it's audit-logged and retried safely).
7. Notification + audit entry + returns authoritative JSONB
   (`wallet_balance`, `receipt_number`).

Receipts are 80mm thermal-style, generated from authoritative records via the
existing `expo-print` + `expo-sharing`, and opened from each statement row.

## Regression test matrix (run after `supabase db push`)

1. **Unconfigured fallback** — with Supabase env removed, every screen behaves exactly as before (local ledger).
2. **Ledger write-through** — submit a contribution: local entry appears instantly; `ledger_entries` row appears server-side.
3. **Balance guard** — as a member, attempt `update profiles set balance = 999999` via the API: must fail with "Wallet balance can only be changed…".
4. **Manual deposit flow** — member submits manual deposit → admin approves → wallet balance increments, ledger entry created, receipt issued, notification delivered, audit row written.
5. **Webhook idempotency** — replay the same Flutterwave webhook twice: only one credit (idempotency key `deposit:<id>`).
6. **Underpayment** — webhook amount < deposit amount → deposit marked failed, no credit.
7. **Contribution engine** — insert a due schedule with funded wallet → `process_due_contributions()` debits wallet, advances `next_due_date`; unfunded wallet → reminder notification, schedule advances.
8. **Loan lifecycle** — request → admin approve → disburse (wallet credited) → repay from wallet (wallet debited, loan completes at `total_repayable`).
9. **Loan eligibility** — request above admin limit or with an outstanding loan → server rejects.
10. **Reconciliation** — tamper `profiles.balance` as service role → run reconcile from Admin Deposits → balance repaired + audit row.

## Known, deliberate limitations

- HomeScreen's displayed figures were left untouched (per approval scope); `useBalance` is ready to wire in when you want live balances on the dashboard.
- Member wallet payments post as `adjustment` ledger entries — visible in the ledger list but not part of the legacy local derived totals.
- BVN is intentionally **not** persisted (PII); it stays client-side only as before.
