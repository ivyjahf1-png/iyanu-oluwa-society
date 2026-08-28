import { supabase, SUPABASE_UNCONFIGURED } from './supabase';
import { storage } from './storage';

/**
 * ledger.js — server-authoritative financial service (Phases 3–8, 11–12).
 *
 * Every function degrades gracefully: when Supabase is not configured the
 * caller falls back to the local (AsyncStorage) ledger so existing behaviour
 * is preserved exactly.
 *
 * Server ledger rows map onto the shape consumed by TransactionsContext:
 *   { id, type, label, amount, date, createdAt, reference }
 */

const SERVER_LEDGER_KEY = '@ius_server_ledger_cache';

export const isServerConfigured = () => !SUPABASE_UNCONFIGURED && !!supabase;

/** Map a ledger_entries row to the local transaction shape. */
export function mapLedgerRow(row) {
  return {
    id: row.id,
    type: row.entry_type,
    label: row.description || (row.category ? row.category.replace(/_/g, ' ') : 'Transaction'),
    amount: Number(row.amount) || 0,
    date: (row.created_at || '').slice(0, 10),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    reference: row.reference || '',
    direction: row.direction,
  };
}

/** Fetch the member's server ledger (most recent first). */
export async function fetchLedger(limit = 500) {
  if (!isServerConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('id, entry_type, direction, amount, category, reference, description, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return null;
    const mapped = (data || []).map(mapLedgerRow);
    storage.setItem(SERVER_LEDGER_KEY, JSON.stringify(mapped)).catch(() => {});
    return mapped;
  } catch (e) {
    return null;
  }
}

/** Cached ledger (offline / before first fetch resolves). */
export async function getCachedLedger() {
  try {
    const raw = await storage.getItem(SERVER_LEDGER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/** Write-through a locally-recorded entry (manual proof flows). */
export async function recordMemberEntry({ type, amount, reference, description }) {
  if (!isServerConfigured()) return false;
  try {
    const { error } = await supabase.rpc('record_member_entry', {
      p_entry_type: type,
      p_amount: Number(amount),
      p_reference: reference || null,
      p_description: description || null,
    });
    return !error;
  } catch (e) {
    return false;
  }
}

/* ---- Phase 4 / Phase 8: available balance + pay from balance ---- */

export async function fetchAvailableBalance() {
  if (!isServerConfigured()) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();
    if (error || !data) return null;
    return Number(data.balance) || 0;
  } catch (e) {
    return null;
  }
}

export async function payFromBalance(amount, { category, reference, description } = {}) {
  if (!isServerConfigured()) throw new Error('Server not configured');
  const { data, error } = await supabase.rpc('pay_from_balance', {
    p_amount: Number(amount),
    p_category: category || 'payment',
    p_reference: reference || null,
    p_description: description || null,
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

/* ---- Phase 5: automatic contribution engine ---- */

export async function saveContributionSchedule(amount, frequency, autoPay = true) {
  if (!isServerConfigured()) return false;
  const { error } = await supabase.rpc('upsert_contribution_schedule', {
    p_amount: Number(amount),
    p_frequency: frequency,
    p_auto_pay: autoPay,
  });
  return !error;
}

export async function cancelContributionSchedule() {
  if (!isServerConfigured()) return false;
  const { error } = await supabase.rpc('cancel_contribution_schedule');
  return !error;
}

export async function fetchContributionSchedule() {
  if (!isServerConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('contribution_schedules')
      .select('*')
      .eq('active', true)
      .maybeSingle();
    return error ? null : data;
  } catch (e) {
    return null;
  }
}

/* ---- Phase 6: savings (server-derived) ---- */

export async function fetchSavingsSummary() {
  if (!isServerConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('entry_type, amount');
    if (error) return null;
    const sum = types =>
      (data || []).filter(r => types.includes(r.entry_type))
        .reduce((s, r) => s + Number(r.amount), 0);
    return {
      totalSavings: sum(['contribution', 'deposit']) - sum(['withdrawal']),
      totalContributions: sum(['contribution']),
      totalDeposits: sum(['deposit']),
      totalWithdrawals: sum(['withdrawal']),
    };
  } catch (e) {
    return null;
  }
}

/* ---- Phase 7: loans ---- */

export async function requestLoan({ amount, tenureMonths, purpose, monthlyRate }) {
  if (!isServerConfigured()) throw new Error('Server not configured');
  const { data, error } = await supabase.rpc('request_loan', {
    p_amount: Number(amount),
    p_tenure_months: Number(tenureMonths),
    p_purpose: purpose,
    p_monthly_rate: monthlyRate ?? 0.025,
  });
  if (error) throw new Error(error.message);
  return data; // loan id
}

export async function fetchMyLoans() {
  if (!isServerConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .order('requested_at', { ascending: false });
    return error ? [] : data || [];
  } catch (e) {
    return [];
  }
}

export async function repayLoanFromWallet(loanId, amount) {
  if (!isServerConfigured()) throw new Error('Server not configured');
  const { data, error } = await supabase.rpc('repay_loan_from_wallet', {
    p_loan_id: loanId,
    p_amount: Number(amount),
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

/** Admin: review + disburse. */
export async function adminReviewLoan(loanId, approve) {
  const { error } = await supabase.rpc('admin_review_loan', {
    p_loan_id: loanId,
    p_approve: approve,
  });
  if (error) throw new Error(error.message);
}

export async function adminDisburseLoan(loanId) {
  const { error } = await supabase.rpc('disburse_loan', { p_loan_id: loanId });
  if (error) throw new Error(error.message);
}

/* ---- Phase 9: reconciliation (admin) ---- */

export async function reconcileWallets() {
  const { data, error } = await supabase.rpc('reconcile_wallets');
  if (error) throw new Error(error.message);
  return Number(data) || 0;
}

/* ---- Phase 10: receipts ---- */

export async function fetchMyReceipts(limit = 50) {
  if (!isServerConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('issued_at', { ascending: false })
      .limit(limit);
    return error ? [] : data || [];
  } catch (e) {
    return [];
  }
}

/* ---- Phase 12: notifications ---- */

export async function fetchNotifications(limit = 50) {
  if (!isServerConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return error ? [] : data || [];
  } catch (e) {
    return [];
  }
}

export async function markNotificationRead(id) {
  if (!isServerConfigured()) return;
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

/* ---- Pending payments + secure approval workflow (Phase 4/5) ---- */

/**
 * Member submits a payment for verification. PENDING rows never affect
 * balances — the ledger is written only inside approve_payment.
 */
export async function submitPayment({ txType, amount, loanId, reference, proofUrl }) {
  if (!isServerConfigured()) return null;
  const { data, error } = await supabase.rpc('submit_payment', {
    p_tx_type: txType,
    p_amount: Number(amount),
    p_loan_id: loanId || null,
    p_reference: reference || null,
    p_proof_url: proofUrl || null,
  });
  if (error) throw new Error(error.message);
  return data; // pending payment id
}

/** Member's own pending payment submissions. */
export async function fetchMyPayments() {
  if (!isServerConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('pending_payments')
      .select('*')
      .order('created_at', { ascending: false });
    return error ? [] : data || [];
  } catch (e) {
    return [];
  }
}

/* ---- Admin: secure approval workflow (Phase 4) ---- */

export async function fetchPendingPayments() {
  try {
    const { data, error } = await supabase
      .from('pending_payments')
      .select('id, user_id, tx_type, amount, reference, status, created_at, profiles(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    return error ? [] : data || [];
  } catch (e) {
    return [];
  }
}

/**
 * Admin APPROVE — everything (authorization, pending check, ledger, loan
 * update, receipt, audit) happens in ONE backend transaction. The returned
 * JSONB carries authoritative figures; Expo never calculates balances.
 */
export async function approvePayment(paymentId) {
  const { data, error } = await supabase.rpc('approve_payment', {
    p_payment_id: paymentId,
  });
  if (error) throw new Error(error.message);
  return data; // { status, wallet_balance, receipt_number, ... }
}

/** Authoritative member financial snapshot straight from the backend. */
export async function fetchFinancialSummary(userId) {
  if (!isServerConfigured()) return null;
  try {
    const { data, error } = await supabase.rpc('get_member_financial_summary', {
      p_user_id: userId || null,
    });
    return error ? null : data;
  } catch (e) {
    return null;
  }
}


export async function fetchAuditLog(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return error ? [] : data || [];
  } catch (e) {
    return [];
  }
}
