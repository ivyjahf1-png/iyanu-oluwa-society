/**
 * Realtime sync — keeps shared data fresh across devices without a manual reload.
 *
 * Strategy (works with or without a live Supabase connection):
 *  1. A Supabase realtime channel per table, when the client supports it.
 *  2. A lightweight polling fallback (every 15s while the app is active) so
 *     admin posts propagate to all users even if realtime is unavailable.
 *  3. Listeners are notified with the changed table name; contexts re-hydrate.
 */
import { supabase } from '../lib/supabase';

const TABLES = ['announcements', 'banners', 'market_items', 'app_settings'];
let listeners = [];

export function onRemoteChange(cb) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}

function notify(table) {
  listeners.forEach((l) => { try { l(table); } catch (e) { /* never crash */ } });
}

let started = false;
export function startRealtimeSync() {
  if (started || !supabase) return;
  started = true;

  // 1. Realtime channels (Postgres changes)
  try {
    TABLES.forEach((table) => {
      supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => notify(table))
        .subscribe();
    });
  } catch (e) {
    console.warn('[realtime] channel setup failed, polling only:', e?.message);
  }

  // 2. Polling fallback — catches changes even without realtime enabled.
  setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return; // skip hidden web tabs
    TABLES.forEach((t) => notify(t));
  }, 15000);
}