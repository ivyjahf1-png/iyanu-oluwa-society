import React, { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { supabase } from '../lib/supabase';

/**
 * Shared announcements store — backed by the Supabase `announcements` table.
 *
 * - Admin posts are inserted into Supabase (optimistic local echo first).
 * - Every device subscribes to `supabase.channel('announcements')` so new
 *   posts appear INSTANTLY as in-app alert cards without any refresh.
 * - Local cache keeps announcements visible offline / across restarts.
 */
const AnnouncementsContext = createContext(null);
const STORAGE_KEY = '@ius_announcements';
const SEEN_KEY = '@ius_announcements_dismissed';

/** Map a Supabase row into the app's announcement shape.
 *  Mirrors the banner shape (title, message, imageUrl, isActive, createdAt)
 *  so announcements and banners are consumed identically by the dashboard. */
function mapRow(row) {
  return {
    id: String(row.id),
    title: row.title || '',
    message: row.message || '',
    author: row.author || 'Admin',
    imageUrl: row.image_url || row.imageUrl || null,
    // NULL is treated as active so legacy rows without the column still surface.
    active: row.is_active === undefined ? true : Boolean(row.is_active),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function AnnouncementsProvider({ children }) {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 1. Hydrate the local cache immediately (offline-first).
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (raw && !cancelled) setAnnouncements(JSON.parse(raw));
        const seenRaw = await storage.getItem(SEEN_KEY);
        if (seenRaw && !cancelled) setDismissedIds(JSON.parse(seenRaw));
      } catch (e) {
        // Corrupt payload — start empty rather than crash.
      }
      if (!cancelled) setHydrated(true);
    })();

    // 2. Pull the current server list once (source of truth).
    (async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && data && !cancelled) {
          const remote = data.map(mapRow);
          setAnnouncements(remote);
          storage.setItem(STORAGE_KEY, JSON.stringify(remote)).catch(() => {});
        }
      } catch (e) {
        console.warn('[announcements] initial fetch failed:', e?.message);
      }
    })();

    // 3. Realtime subscription — instant cross-device delivery.
    let channel;
    try {
      channel = supabase
        .channel('announcements')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'announcements' },
          (payload) => {
            if (!payload?.new || cancelled) return;
            const entry = mapRow(payload.new);
            setAnnouncements((prev) =>
              prev.some((a) => a.id === entry.id) ? prev : [entry, ...prev],
            );
          },
        )
        // UPDATE: admin toggles is_active or edits an announcement after it has
        // already been delivered — the row is replaced in place so the
        // activeAnnouncements filter recomputes live on every device.
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'announcements' },
          (payload) => {
            if (!payload?.new || cancelled) return;
            const entry = mapRow(payload.new);
            setAnnouncements((prev) =>
              prev.some((a) => a.id === entry.id)
                ? prev.map((a) => (a.id === entry.id ? entry : a))
                : [entry, ...prev],
            );
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'announcements' },
          (payload) => {
            const id = payload?.old?.id;
            if (id == null || cancelled) return;
            setAnnouncements((prev) => prev.filter((a) => a.id !== String(id)));
          },
        )
        .subscribe();
    } catch (e) {
      console.warn('[announcements] realtime unavailable:', e?.message);
    }

    return () => {
      cancelled = true;
      try { if (channel) supabase.removeChannel(channel); } catch (e) { /* noop */ }
    };
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
      imageUrl: announcement.imageUrl || announcement.image_uri || null,
      active: announcement.active !== false,
      createdAt: Date.now(),
    };
    persist([entry, ...announcements]);

    // Best-effort insert into Supabase — realtime fans it out to all members.
    (async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            title: entry.title,
            message: entry.message,
            author: entry.author,
            image_url: entry.imageUrl,
            is_active: entry.active,
            created_at: new Date(entry.createdAt).toISOString(),
          })
          .select()
          .single();
        if (!error && data) {
          const remote = mapRow(data);
          // Swap the temp local entry for the authoritative server row.
          const next = [remote, ...announcements.filter((a) => a.id !== entry.id)];
          persist(next);
        } else if (error) {
          console.warn('[announcements] insert failed:', error.message);
        }
      } catch (e) {
        console.warn('[announcements] insert error:', e?.message);
      }
    })();

    return entry;
  };

  const removeAnnouncement = id => {
    persist(announcements.filter(a => a.id !== id));
    // Best-effort remote delete (realtime DELETE event removes it elsewhere).
    supabase.from('announcements').delete().eq('id', id).then(
      ({ error }) => { if (error) console.warn('[announcements] delete failed:', error.message); },
    ).catch(() => {});
  };

  /** Member dismisses the drop-down banner; the announcement itself remains. */
  const dismissAnnouncement = id => {
    if (!dismissedIds.includes(id)) persistSeen([...dismissedIds, id]);
  };

  /** Announcements the member has not dismissed yet (newest first). */
  const unreadAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  /** Admins can toggle whether an announcement is live to members. */
  const updateAnnouncement = (id, updates) => {
    persist(announcements.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    if (updates.active !== undefined) {
      supabase
        .from('announcements')
        .update({ is_active: Boolean(updates.active) })
        .eq('id', id)
        .then(({ error }) => { if (error) console.warn('[announcements] update failed:', error.message); })
        .catch(() => {});
    }
  };

  /** Active = switched on AND not dismissed by this member (newest first).
   *  This is the is_active == true feed consumed by the dashboard + notification
   *  screens — kept in sync realtime via the INSERT/UPDATE/DELETE channels above. */
  const activeAnnouncements = announcements
    .filter((a) => a.active)
    .filter((a) => !dismissedIds.includes(a.id));

  return (
    <AnnouncementsContext.Provider
      value={{
        announcements,
        unreadAnnouncements,
        activeAnnouncements,
        dismissAnnouncement,
        addAnnouncement,
        updateAnnouncement,
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