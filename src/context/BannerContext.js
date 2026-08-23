import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { onRemoteChange } from '../lib/realtime';

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

export function BannerProvider({ children }) {
  const [banners, setBanners] = useState([]);
  // "X" hides a banner for the CURRENT SESSION only — on the next app launch
  // an unexpired banner is shown again until its duration window completes.
  const [sessionDismissed, setSessionDismissed] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw) setBanners(JSON.parse(raw));
      } catch (e) {
        // Corrupt payload — start empty rather than crash.
      }
      setHydrated(true);
    })();
  }, []);

  // Realtime: re-hydrate when admin creates/updates banners on any device.
  useEffect(() => onRemoteChange(() => {
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw) setBanners(JSON.parse(raw));
      } catch (e) { /* keep current state */ }
    })();
  }), []);

  const persist = (next) => {
    setBanners(next);
    storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  /** Add a banner with an optional admin-set display window. */
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
    return entry;
  };

  const updateBanner = (id, updates) => {
    persist(banners.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removeBanner = (id) => persist(banners.filter((b) => b.id !== id));

  /** Active = switched on AND still inside its admin-set display window. */
  const isLive = (b) => b.active && (!b.expiresAt || b.expiresAt > Date.now());

  const activeBanners = banners.filter(isLive);
  const visibleBanners = activeBanners.filter((b) => !sessionDismissed.includes(b.id));

  /** "X" pressed → hide for this session only; reappears next launch. */
  const dismissBannerForSession = (id) => {
    if (!sessionDismissed.includes(id)) setSessionDismissed([...sessionDismissed, id]);
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