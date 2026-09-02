import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { onRemoteChange } from '../lib/realtime';
import { SUPABASE_UNCONFIGURED, supabase } from '../lib/supabase';

/**
 * Shared marketplace inventory.
 * The Admin Marketplace Dashboard writes items here; the user-facing
 * Marketplace feed reads them — so new uploads render instantly.
 * Persisted locally with AsyncStorage + Supabase marketplace_posts table
 * for cross-device real-time sync.
 */
const MarketItemsContext = createContext(null);
const STORAGE_KEY = '@ius_market_items';
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function MarketItemsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch (e) {
        // Corrupt storage — start empty.
      }

      // Pull from Supabase (source of truth) — active posts within 90 days.
      if (!SUPABASE_UNCONFIGURED && supabase) {
        try {
          const cutoff = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
          const { data, error } = await supabase
            .from('marketplace_posts')
            .select('*')
            .eq('is_active', true)
            .gte('created_at', cutoff)
            .order('created_at', { ascending: false })
            .limit(100);
          if (!error && data) {
            const remote = data.map((r) => ({
              id: String(r.id),
              title: r.title || '',
              description: r.description || '',
              price: r.price || '',
              location: r.location || '',
              category: r.category || 'general',
              imageUri: r.image_url || null,
              createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
            }));
            setItems(remote);
            storage.setItem(STORAGE_KEY, JSON.stringify(remote)).catch(() => {});
          }
        } catch {
          // Network unavailable — keep local cache.
        }
      }

      setHydrated(true);
    })();

    // Realtime: re-hydrate when admin uploads/edits items on any device.
    const offRemote = onRemoteChange(() => {
      (async () => {
        try {
          const raw = await storage.getItem(STORAGE_KEY);
          if (raw) setItems(JSON.parse(raw));
        } catch (e) { /* keep current state */ }
      })();
    });

    // Supabase realtime subscription for marketplace_posts.
    let channel;
    try {
      if (!SUPABASE_UNCONFIGURED && supabase) {
        channel = supabase
          .channel('marketplace_posts')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'marketplace_posts' },
            (payload) => {
              if (!payload?.new) return;
              const entry = {
                id: String(payload.new.id),
                title: payload.new.title || '',
                description: payload.new.description || '',
                price: payload.new.price || '',
                location: payload.new.location || '',
                category: payload.new.category || 'general',
                imageUri: payload.new.image_url || null,
                createdAt: payload.new.created_at
                  ? new Date(payload.new.created_at).getTime()
                  : Date.now(),
              };
              setItems((prev) =>
                prev.some((i) => i.id === entry.id) ? prev : [entry, ...prev],
              );
            },
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'marketplace_posts' },
            (payload) => {
              if (!payload?.old) return;
              setItems((prev) => prev.filter((i) => i.id !== String(payload.old.id)));
            },
          )
          .subscribe();
      }
    } catch {
      // Realtime unavailable.
    }

    return () => {
      offRemote();
      try { if (channel) supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, []);

    const persist = next => {
    setItems(next);
    storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const addItem = item => {
    const entry = {
      id: `m-${Date.now()}`,
      title: item.title,
      description: item.description || '',
      price: item.price,
      location: item.location || '',
      category: item.category || 'General',
      imageUri: item.imageUri || null,
      createdAt: Date.now(),
    };
    persist([entry, ...items]);

    // Best-effort Supabase write — realtime fans it out to all members.
    if (!SUPABASE_UNCONFIGURED && supabase) {
      supabase
        .rpc('save_marketplace_post', {
          p_title: entry.title,
          p_description: entry.description,
          p_price: entry.price,
          p_location: entry.location,
          p_category: entry.category,
          p_image_url: entry.imageUri,
        })
        .then(({ data }) => {
          if (data) {
            const serverEntry = { ...entry, id: String(data.id) };
            setItems((prev) => [serverEntry, ...prev.filter((i) => i.id !== entry.id)]);
          }
        })
        .catch(() => {});
    }

    return entry;
  };

  const removeItem = id => {
    persist(items.filter(i => i.id !== id));
    if (!SUPABASE_UNCONFIGURED && supabase) {
      supabase.from('marketplace_posts').delete().eq('id', id).then(() => {}).catch(() => {});
    }
  };

  const updateItem = (id, updates) => {
    persist(items.map(i => (i.id === id ? { ...i, ...updates } : i)));
    if (!SUPABASE_UNCONFIGURED && supabase) {
      supabase
        .from('marketplace_posts')
        .update({ title: updates.title, description: updates.description, price: updates.price, location: updates.location })
        .eq('id', id)
        .then(() => {})
        .catch(() => {});
    }
  };

  return (
    <MarketItemsContext.Provider value={{ items, addItem, removeItem, updateItem, hydrated }}>
      {children}
    </MarketItemsContext.Provider>
  );
}

export function useMarketItems() {
  const ctx = useContext(MarketItemsContext);
  if (!ctx) throw new Error('useMarketItems must be used inside <MarketItemsProvider>');
  return ctx;
}