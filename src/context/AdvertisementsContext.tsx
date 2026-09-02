/**
 * Advertisements real-time store — backed by the Supabase `advertisements`
 * table. Admin-created ad banners fan out to member screens instantly.
 *
 * - Hydrates from Supabase on mount
 * - Subscribes to postgres_changes INSERT/UPDATE/DELETE for live sync
 * - Falls back to empty when Supabase is unconfigured
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { SUPABASE_UNCONFIGURED, supabase } from '../lib/supabase';

const AdvertisementsContext = createContext(null);

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function mapRow(row) {
  return {
    id: String(row.id),
    title: row.title || '',
    body: row.body || '',
    imageUrl: row.image_url || null,
    category: row.category || 'general',
    isActive: row.is_active !== false,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function AdvertisementsProvider({ children }) {
  const [ads, setAds] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let channel;

    // 1. Pull current active ads (within 90-day window).
    (async () => {
      if (SUPABASE_UNCONFIGURED || !supabase) {
        if (!cancelled) setHydrated(true);
        return;
      }
      try {
        const cutoff = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
        const { data, error } = await supabase
          .from('advertisements')
          .select('*')
          .eq('is_active', true)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data && !cancelled) setAds(data.map(mapRow));
      } catch {
        // Network unavailable — start empty.
      }
      if (!cancelled) setHydrated(true);
    })();

    // 2. Realtime subscription — instant cross-device delivery.
    try {
      channel = supabase
        .channel('advertisements')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'advertisements' },
          (payload) => {
            if (!payload?.new || cancelled) return;
            const entry = mapRow(payload.new);
            if (!entry.isActive) return;
            setAds((prev) =>
              prev.some((a) => a.id === entry.id) ? prev : [entry, ...prev],
            );
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'advertisements' },
          (payload) => {
            if (!payload?.new || cancelled) return;
            const entry = mapRow(payload.new);
            setAds((prev) => {
              const idx = prev.findIndex((a) => a.id === entry.id);
              if (idx === -1) {
                return entry.isActive ? [entry, ...prev] : prev;
              }
              if (!entry.isActive) return prev.filter((a) => a.id !== entry.id);
              const next = [...prev];
              next[idx] = entry;
              return next;
            });
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'advertisements' },
          (payload) => {
            if (!payload?.old || cancelled) return;
            setAds((prev) => prev.filter((a) => a.id !== String(payload.old.id)));
          },
        )
        .subscribe();
    } catch {
      // Realtime unavailable — keep the initial pull.
    }

    return () => {
      cancelled = true;
      try { if (channel) supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, []);

  const activeAds = ads.filter((a) => a.isActive);

  return (
    <AdvertisementsContext.Provider value={{ ads: activeAds, allAds: ads, hydrated }}>
      {children}
    </AdvertisementsContext.Provider>
  );
}

export function useAdvertisements() {
  const ctx = useContext(AdvertisementsContext);
  if (!ctx) throw new Error('useAdvertisements must be used inside <AdvertisementsProvider>');
  return ctx;
}