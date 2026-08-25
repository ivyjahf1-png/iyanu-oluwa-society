import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { supabase } from '../lib/supabase';

/**
 * BannerContext — promotional banner store (admin-created), backed by the
 * Supabase `promotional_banners` table.
 *
 * Two banner kinds:
 *   - full:  { title, description, category, imageUri, is_active }
 *   - photo: { imageUri, is_active }  (photo-only popup)
 *
 * Admin posts are inserted into Supabase with is_active: true and fan out to
 * all member devices in realtime. Banners are cached locally so they survive
 * restarts / offline use. Dismissal ("X") is PERSISTED per device so a member
 * can permanently hide a banner from their own screen.
 */
const BannerContext = createContext(null);
const STORAGE_KEY = '@ius_banners';
const DISMISSED_KEY = '@ius_banners_dismissed';

/** Map a promotional_banners row into the app's banner shape. */
function mapRow(row) {
  return {
    id: String(row.id),
    kind: row.kind === 'photo' ? 'photo' : row.kind === 'full' ? 'full' : (row.title || row.description ? 'full' : 'photo'),
    title: row.title || '',
    description: row.description || '',
    category: row.category || 'General Cooperative Benefit',
    imageUri: row.image_uri || row.imageUri || null,
    active: row.is_active !== undefined ? Boolean(row.is_active) : row.active !== false,
    durationHours: row.duration_hours || null,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function BannerProvider({ children }) {
  const [banners, setBanners] = useState([]);
  // Persisted dismissals — "X" hides a banner on THIS device for good.
  const [dismissedIds, setDismissedIds] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 1. Hydrate local caches immediately (offline-first).
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw && !cancelled) setBanners(JSON.parse(raw));
        const dismissedRaw = await storage.getItem(DISMISSED_KEY);
        if (dismissedRaw && !cancelled) setDismissedIds(JSON.parse(dismissedRaw));
      } catch (e) {
        // Corrupt payload — start empty rather than crash.
      }
      if (!cancelled) setHydrated(true);
    })();

    // 2. Pull the current server list once (source of truth).
    (async () => {
      try {
        const { data, error } = await supabase
          .from('promotional_banners')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data && !cancelled) {
          const remote = data.map(mapRow);
          setBanners(remote);
          storage.setItem(STORAGE_KEY, JSON.stringify(remote)).catch(() => {});
        }
      } catch (e) {
        console.warn('[banners] initial fetch failed:', e?.message);
      }
    })();

    // 3. Realtime subscription — instant cross-device delivery of new banners.
    let channel;
    try {
      channel = supabase
        .channel('promotional_banners')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'promotional_banners' },
          (payload) => {
            if (cancelled) return;
            if ((payload.event === 'INSERT' || payload.event === 'UPDATE') && payload.new) {
              const entry = mapRow(payload.new);
              setBanners((prev) => [entry, ...prev.filter((b) => b.id !== entry.id)]);
            } else if (payload.event === 'DELETE' && payload.old?.id != null) {
              const id = String(payload.old.id);
              setBanners((prev) => prev.filter((b) => b.id !== id));
            }
          },
        )
        .subscribe();
    } catch (e) {
      console.warn('[banners] realtime unavailable:', e?.message);
    }

    return () => {
      cancelled = true;
      try { if (channel) supabase.removeChannel(channel); } catch (e) { /* noop */ }
    };
  }, []);

  const persist = (next) => {
    setBanners(next);
    storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  /** Add a banner locally + insert into Supabase with is_active: true. */
  const addBanner = (banner) => {
    let expiresAt = null;
    if (banner.expiresAt) expiresAt = banner.expiresAt;
    else if (banner.durationHours) expiresAt = Date.now() + banner.durationHours * 3600 * 1000;
    else if (banner.durationDays) expiresAt = Date.now() + banner.durationDays * 24 * 3600 * 1000;

    const entry = {
      id: `b-${Date.now()}`,
      kind: banner.kind === 'photo' ? 'photo' : 'full',
      title: banner.title || '',
      description: banner.description || '',
      category: banner.category || 'General Cooperative Benefit',
      imageUri: banner.imageUri || null,
      active: banner.active !== false,
      durationHours: banner.durationHours || null,
      durationDays: banner.durationDays || null,
      expiresAt,
      createdAt: Date.now(),
    };
    persist([entry, ...banners]);

    // Best-effort Supabase insert — realtime fans it out to every device.
    (async () => {
      try {
        const { data, error } = await supabase
          .from('promotional_banners')
          .insert({
            kind: entry.kind,
            title: entry.title,
            description: entry.description,
            category: entry.category,
            image_uri: entry.imageUri,
            is_active: true,
            duration_hours: entry.durationHours,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          })
          .select()
          .single();
        if (!error && data) {
          const remote = mapRow(data);
          persist([remote, ...banners.filter((b) => b.id !== entry.id)]);
        } else if (error) {
          console.warn('[banners] insert failed:', error.message);
        }
      } catch (e) {
        console.warn('[banners] insert error:', e?.message);
      }
    })();

    return entry;
  };

  const updateBanner = (id, updates) => {
    persist(banners.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    // Best-effort remote toggle (e.g. deactivating a banner).
    if (updates.active !== undefined) {
      supabase
        .from('promotional_banners')
        .update({ is_active: Boolean(updates.active) })
        .eq('id', id)
        .then(({ error }) => { if (error) console.warn('[banners] update failed:', error.message); })
        .catch(() => {});
    }
  };

  const removeBanner = (id) => {
    persist(banners.filter((b) => b.id !== id));
    supabase.from('promotional_banners').delete().eq('id', id).then(
      ({ error }) => { if (error) console.warn('[banners] delete failed:', error.message); },
    ).catch(() => {});
  };

  const persistDismissed = (next) => {
    setDismissedIds(next);
    storage.setItem(DISMISSED_KEY, JSON.stringify(next)).catch(() => {});
  };

  /** Active = switched on AND still inside its admin-set display window. */
  const isLive = (b) => b.active && (!b.expiresAt || b.expiresAt > Date.now());

  const activeBanners = banners.filter(isLive);
  const visibleBanners = activeBanners.filter((b) => !dismissedIds.includes(b.id));

  /** "X" pressed → hide this banner PERMANENTLY on this device (persisted). */
  const dismissBannerForSession = (id) => {
    if (!dismissedIds.includes(id)) persistDismissed([...dismissedIds, id]);
  };

  return (
    <BannerContext.Provider
      value={{
        banners,
        activeBanners,
        visibleBanners,
        hydrated,
        addBanner,
        updateBanner,
        removeBanner,
        dismissBanner: dismissBannerForSession,
        isLive,
      }}
    >
      {children}
    </BannerContext.Provider>
  );
}

export function useBanners() {
  const ctx = useContext(BannerContext);
  if (!ctx) throw new Error('useBanners must be used inside <BannerProvider>');
  return ctx;
}