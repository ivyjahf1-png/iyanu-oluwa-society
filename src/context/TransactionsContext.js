import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { fetchLedger, recordMemberEntry, isServerConfigured } from '../lib/ledger';

/**
 * TransactionsContext — the single audit trail for all member money movement.
 *
 * Every financial figure in the app (Total Savings, Loan Outstanding, Total
 * Paid, Statement ledger, Contribution history) is DERIVED from these records.
 * New members start with an empty ledger (₦0.00 everywhere) — no demo data.
 *
 * Transaction types:
 *  - contribution       (credit: coop dues / target savings)
 *  - deposit            (credit: wallet funding)
 *  - withdrawal         (debit: savings withdrawal)
 *  - loan_disbursement  (debit: loan paid out to member)
 *  - loan_repayment     (credit against outstanding loan)
 */
const TransactionsContext = createContext(null);
const STORAGE_KEY = '@ius_transactions';

export function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw) setTransactions(JSON.parse(raw));
      } catch (e) {
        // Corrupt payload — start empty rather than crash.
      }
      setHydrated(true);

      // ---- Phase 3: server ledger hydration (additive) ----
      // When Supabase is configured, the server ledger is authoritative:
      // merge it over the local cache (server rows win by id). When it is
      // unavailable, the local ledger continues to drive every figure.
      if (isServerConfigured()) {
        const serverRows = await fetchLedger();
        if (serverRows && serverRows.length >= 0) {
          setTransactions(prev => {
            const byId = new Map(prev.map(t => [t.id, t]));
            for (const row of serverRows) byId.set(row.id, row);
            const merged = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
            storage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
            return merged;
          });
        }
      }
    })();
  }, []);

  const persist = next => {
    setTransactions(next);
    storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  /** Record a real transaction. Returns the stored entry. */
  const addTransaction = tx => {
    // Offline/unconfirmed entries are recorded as PENDING and never counted in
    // official derived balances, mirroring the DB rule that pending -> approved
    // only on backend authorization. Online (server-backed) entries are 'approved'.
    const entry = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: isServerConfigured() ? 'approved' : 'pending',
      offline: !isServerConfigured(),
      type: tx.type,
      label: tx.label,
      amount: Number(tx.amount) || 0,
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
      reference: tx.reference || '',
    };
    persist([entry, ...transactions]);

    // ---- Phase 3: server write-through (best-effort, never blocks UX) ----
    // NOTE: contributions are NOT written through here any more — member
    // submissions are PENDING payments (0003) and only reach the ledger on
    // admin approval. Withdrawals keep the previous direct behaviour.
    if (isServerConfigured() && tx.type === 'withdrawal') {
      recordMemberEntry({
        type: tx.type,
        amount: entry.amount,
        reference: entry.reference,
        description: tx.label,
      }).catch(() => {});
    }
    return entry;
  };

  /* ---- Derived figures (audit-trail based) ---- */
  const sum = (types) =>
    transactions
      .filter(t => types.includes(t.type) && t.status !== 'pending')
      .reduce((s, t) => s + t.amount, 0);

  const totalSavings = sum(['contribution', 'deposit']) - sum(['withdrawal']);
  const totalContributions = sum(['contribution']);
  const loanDisbursed = sum(['loan_disbursement']);
  const totalPaid = sum(['loan_repayment']);
  const loanOutstanding = Math.max(0, loanDisbursed - totalPaid);
  const totalCredits = sum(['contribution', 'deposit', 'loan_repayment']);
  const totalDebits = sum(['withdrawal', 'loan_disbursement']);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        hydrated,
        addTransaction,
        totalSavings,
        totalContributions,
        loanOutstanding,
        totalPaid,
        loanDisbursed,
        totalCredits,
        totalDebits,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used inside <TransactionsProvider>');
  return ctx;
}