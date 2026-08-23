import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';

/**
 * BannerContext — promotional banner store (admin-created, cooperative-only).
 *
 * Two banner kinds:
 *   - full:  { title, description, category, imageUri, active }
 *   - photo: { imageUri, active }  (photo-only popup)
 *
 * Persisted locally so banners survive restarts. The user dashboard shows a
 * dismissible popup for the currently active banner and auto-rotates every 2h.
 */
const BannerContext = createContext(null);
const STORAGE_KEY = '@ius_banners';
const DISMISSED_KEY = '@ius_banners_dismissed';

export function BannerProvider({ children }) {
  const [banners, setBanners] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw) setBanners(JSON.parse(raw));
        const dRaw = await storage.getItem(DISMISSED_KEY);
        if (dRaw) setDismissedIds(JSON.parse(dRaw));
      } catch (e) {
        // Corrupt payload — start empty rather than crash.
      }
      setHydrated(true);
    })();
  }, []);

  const persist = (next) => {
    setBanners(next);
    storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };
  const persistDismissed = (next) => {
    setDismissedIds(next);
    storage.setItem(DISMISSED_KEY, JSON.stringify(next)).catch(() => {});
  };

  /** Add a banner (full or photo-only). Returns the stored entry. */
  const addBanner = (banner) => {
    const entry = {
      id: `b-${Date.now()}`,
      kind: banner.kind === 'photo' ? 'photo' : 'full',
      title: banner.title || '',
      description: banner.description || '',
      category: banner.category || 'General Cooperative Benefit',
      imageUri: banner.imageUri || null,
      active: banner.active !== false,
      createdAt: Date.now(),
    };
    persist([entry, ...banners]);
    return entry;
  };

  const updateBanner = (id, updates) => {
    persist(banners.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removeBanner = (id) => persist(banners.filter((b) => b.id !== id));

  /** All active banners (for admin to see which are live). */
  const activeBanners = banners.filter((b) => b.active);

  /** The banner currently shown to users — excludes ones the user dismissed. */
  const visibleBanners = activeBanners.filter((b) => !dismissedIds.includes(b.id));

  /** Dismiss the currently-shown popup banner. */
  const dismissBanner = (id) => {
    if (!dismissedIds.includes(id)) persistDismissed([...dismissedIds, id]);
  };

  /** Clear dismissed history so banners can be shown again. */
  const resetDismissals = () => persistDismissed([]);

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
        dismissBanner,
        resetDismissals,
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