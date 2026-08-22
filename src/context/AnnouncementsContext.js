import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';

/**
 * Shared announcements store.
 * Admin posts land here and render instantly for every reader; each new post
 * also fires a push notification via expo-notifications.
 * Persisted locally so announcements survive restarts.
 */
const AnnouncementsContext = createContext(null);
const STORAGE_KEY = '@ius_announcements';

export function AnnouncementsProvider({ children }) {
  const [announcements, setAnnouncements] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw) setAnnouncements(JSON.parse(raw));
      } catch (e) {
        // Corrupt payload — start empty rather than crash.
      }
      setHydrated(true);
    })();
  }, []);

  const persist = next => {
    setAnnouncements(next);
    storage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
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

  return (
    <AnnouncementsContext.Provider
      value={{ announcements, addAnnouncement, removeAnnouncement, hydrated }}
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