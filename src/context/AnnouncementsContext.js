import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { onRemoteChange } from '../lib/realtime';

/**
 * Shared announcements store.
 * Admin posts land here and render instantly for every reader; each new post
 * also fires a push notification via expo-notifications.
 * Persisted locally so announcements survive restarts.
 */
const AnnouncementsContext = createContext(null);
const STORAGE_KEY = '@ius_announcements';
const SEEN_KEY = '@ius_announcements_dismissed';

export function AnnouncementsProvider({ children }) {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw) setAnnouncements(JSON.parse(raw));
        const seenRaw = await storage.getItem(SEEN_KEY);
        if (seenRaw) setDismissedIds(JSON.parse(seenRaw));
      } catch (e) {
        // Corrupt payload — start empty rather than crash.
      }
      setHydrated(true);
    })();

    // Realtime: re-hydrate when an admin posts/updates remotely (any device).
    return onRemoteChange(() => {
      (async () => {
        try {
          const raw = await storage.getItem(STORAGE_KEY);
          if (raw) setAnnouncements(JSON.parse(raw));
        } catch (e) { /* keep current state */ }
      })();
    });
  }, []);

  const persist = next => {
    setAnnouncements(next);
    storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const persistSeen = next => {
    setDismissedIds(next);
    storage.setItem(SEEN_KEY, JSON.stringify(next)).catch(() => {});
  };

  const addAnnouncement = announcement => {
    const entry = {
      id: `a-${Date.now()}`,
      title: announcement.title,
      message: announcement.message,
      author: announcement.author || 'Admin',
      createdAt: Date.now(),
    };
    persist([entry, ...announcements]);
    return entry;
  };

  const removeAnnouncement = id => {
    persist(announcements.filter(a => a.id !== id));
  };

  /** Member dismisses the drop-down banner; the announcement itself remains. */
  const dismissAnnouncement = id => {
    if (!dismissedIds.includes(id)) persistSeen([...dismissedIds, id]);
  };

  /** Announcements the member has not dismissed yet (newest first). */
  const unreadAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  return (
    <AnnouncementsContext.Provider
      value={{
        announcements,
        unreadAnnouncements,
        dismissAnnouncement,
        addAnnouncement,
        removeAnnouncement,
        hydrated,
      }}
    >
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements() {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx) throw new Error('useAnnouncements must be used inside <AnnouncementsProvider>');
  return ctx;
}