import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAllSettings, saveSettings } from '../lib/supabase';
import { onRemoteChange } from '../lib/realtime';

/**
 * Global Cooperative Bank Account context — the SINGLE SOURCE OF TRUTH.
 *
 * - The Admin creates/updates details ONLY in the Admin Settings screen,
 *   which calls setBankDetails(); values persist locally (and best-effort to
 *   Supabase app_settings), surviving app restarts.
 * - Member screens (Fund Wallet, Repay Loan) consume read-only values here.
 * - No hard-coded bank data: unset fields stay empty so member screens can
 *   show clean "Not configured" placeholders.
 */
const EMPTY = { bankName: '', accountNumber: '', accountName: '' };

const BankContext = createContext({
  ...EMPTY,
  loaded: false,
  setBankDetails: () => {},
});

export function BankProvider({ children }) {
  const [bankDetails, setBankDetailsState] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);

  // Load persisted admin-configured details once on app start.
  useEffect(() => {
    (async () => {
      try {
        const s = await getAllSettings();
        setBankDetailsState({
          bankName: s?.coop_bank_name || '',
          accountNumber: s?.coop_account_number || '',
          accountName: s?.coop_account_name || '',
        });
      } catch (e) {
        // Keep empty defaults — never crash on load failure.
      } finally {
        setLoaded(true);
      }
    })();

    // Realtime: refresh when the admin updates settings on any device.
    return onRemoteChange(() => {
      (async () => {
        try {
          const s = await getAllSettings();
          setBankDetailsState({
            bankName: s?.coop_bank_name || '',
            accountNumber: s?.coop_account_number || '',
            accountName: s?.coop_account_name || '',
          });
        } catch (e) { /* keep current state */ }
      })();
    });
  }, []);

  /**
   * Update the cooperative bank account (Admin Settings only).
   * Persists immediately and reflects instantly across all member screens.
   */
  const setBankDetails = async (details) => {
    const next = {
      bankName: (details.bankName || '').trim(),
      accountNumber: (details.accountNumber || '').trim(),
      accountName: (details.accountName || '').trim(),
    };
    setBankDetailsState(next);
    try {
      await saveSettings({
        coop_bank_name: next.bankName,
        coop_account_number: next.accountNumber,
        coop_account_name: next.accountName,
      });
    } catch (e) {
      // Local state already updated; Supabase sync is best-effort.
    }
  };

  const value = { ...bankDetails, loaded, setBankDetails };

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBankDetails() {
  return useContext(BankContext);
}