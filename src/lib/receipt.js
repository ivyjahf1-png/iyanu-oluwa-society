import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
import { isServerConfigured } from './ledger';

/**
 * receipt.js — Phase 7/8: thermal-roll receipts generated from AUTHORITATIVE
 * backend records (receipts + pending_payments + profiles). Nothing is
 * computed on the client except display formatting.
 */

export async function fetchReceiptByReference(reference) {
  if (!isServerConfigured() || !reference) return null;
  try {
    // Step 1: find the approved payment with this reference.
    const { data: payment, error: payErr } = await supabase
      .from('pending_payments')
      .select('id, user_id, tx_type, reference, approved_at, status')
      .eq('reference', reference)
      .eq('status', 'approved')
      .maybeSingle();
    if (payErr || !payment) return null;
    // Step 2: its receipt (authoritative record).
    const { data: receipt, error: recErr } = await supabase
      .from('receipts')
      .select('*, profiles(full_name)')
      .eq('payment_id', payment.id)
      .maybeSingle();
    if (recErr || !receipt) return null;
    return { ...receipt, pending_payments: payment };
  } catch (e) {
    return null;
  }
}

const TYPE_LABELS = {
  contribution: 'CONTRIBUTION',
  savings_deposit: 'SAVINGS DEPOSIT',
  loan_repayment: 'LOAN REPAYMENT',
  withdrawal: 'WITHDRAWAL',
  deposit: 'WALLET FUNDING',
};

const fmt = n =>
  `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** 80mm thermal/roll receipt — monospace, dashed rules, centered header. */
export function buildThermalHtml(r) {
  const type = TYPE_LABELS[r.entry_type] || String(r.entry_type || 'RECEIPT').toUpperCase();
  const approvedAt = r.pending_payments?.approved_at;
  return `
<html><head><meta charset="utf-8" /><style>
  @page { margin: 0; size: 80mm auto; }
  body { font-family: 'Courier New', monospace; width: 76mm; margin: 0 auto;
         padding: 8px 4px; color: #111; font-size: 11px; }
  .center { text-align: center; }
  .logo { width: 42px; height: 42px; margin: 0 auto 4px; }
  .name { font-size: 14px; font-weight: bold; letter-spacing: 1px; }
  .sub  { font-size: 9px; color: #444; }
  .dashed { border-top: 1px dashed #111; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .label { color: #444; }
  .amount { font-size: 16px; font-weight: bold; text-align: center; margin: 6px 0; }
  .status { text-align: center; font-weight: bold; letter-spacing: 2px;
            border: 1px solid #111; padding: 2px 0; margin: 6px 0; }
  .foot { text-align: center; font-size: 9px; color: #444; margin-top: 8px; }
</style></head><body>
  <div class="center">
    <div class="name">STANDARD MUTUAL SAVINGS</div>
    <div class="sub">Cooperative Society — Official Receipt</div>
  </div>
  <div class="dashed"></div>
  <div class="row"><span class="label">Receipt No</span><span>${r.receipt_number || '—'}</span></div>
  <div class="row"><span class="label">Type</span><span>${type}</span></div>
  <div class="row"><span class="label">Member</span><span>${r.profiles?.full_name || 'Member'}</span></div>
  <div class="row"><span class="label">Member ID</span><span>${String(r.user_id || '').slice(0, 8)}</span></div>
  <div class="row"><span class="label">Reference</span><span>${r.pending_payments?.reference || '—'}</span></div>
  <div class="row"><span class="label">Date</span><span>${r.issued_at ? new Date(r.issued_at).toLocaleString() : ''}</span></div>
  ${approvedAt ? `<div class="row"><span class="label">Approved</span><span>${new Date(approvedAt).toLocaleString()}</span></div>` : ''}
  <div class="dashed"></div>
  <div class="center label">AMOUNT PAID</div>
  <div class="amount">${fmt(r.amount)}</div>
  <div class="status">APPROVED</div>
  ${r.wallet_after != null ? `<div class="row"><span class="label">Wallet Balance</span><span>${fmt(r.wallet_after)}</span></div>` : ''}
  <div class="dashed"></div>
  <div class="foot">This receipt was generated from the cooperative's<br/>authoritative financial records.<br/>Verified by an authorized administrator.</div>
</body></html>`;
}

/** Print (and optionally share) the receipt. Returns the temp file URI. */
export async function generateReceiptPdf(receiptData, { share = true } = {}) {
  const html = buildThermalHtml(receiptData);
  const { uri } = await Print.printToFileAsync({ html });
  if (share && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share receipt',
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}
