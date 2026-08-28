import { useEffect, useState, useCallback } from 'react';
import {
  fetchAvailableBalance,
  payFromBalance,
  isServerConfigured,
} from '../lib/ledger';
import { supabase } from '../lib/supabase';

/**
 * useBalance — Phase 4 (available balance) + Phase 8 (pay from balance).
 *
 * Reads the server-authoritative wallet balance (profiles.balance) with a
 * Supabase Realtime subscription so cross-device updates appear instantly.
 * Returns `availableBalance: null` when the backend is not configured so
 * callers can fall back to existing local behaviour.
 */
export default function useBalance() {
  const [availableBalance, setAvailableBalance] = useState(null);
  const [loading, setLoading] = useState(isServerConfigured());

  useEffect(() => {
    if (!isServerConfigured()) return undefined;
    let channel;
    let cancelled = false;

    (async () => {
      const balance = await fetchAvailableBalance();
      if (!cancelled) {
        setAvailableBalance(balance);
        setLoading(false);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel(`balance-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          payload => {
            if (payload?.new?.balance != null) {
              setAvailableBalance(Number(payload.new.balance));
            }
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /** Phase 8: pay from available balance (server-enforced). */
  const pay = useCallback(async (amount, opts) => {
    const newBalance = await payFromBalance(amount, opts);
    setAvailableBalance(newBalance);
    return newBalance;
  }, []);

  return { availableBalance, loading, pay };
}
