import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

/**
 * Supabase client for the mobile app.
 *
 * Supply the project URL and anon key via app.json `extra` or the two
 * constants below. The anon key is safe to ship in the client — all
 * privileged operations are protected by Row Level Security.
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR-ANON-KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Read a single key from the app_settings table. */
export async function getSetting(key) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error) throw error;
  return data?.value ?? null;
}

/** Read all app_settings as a { key: value } map. */
export async function getAllSettings() {
  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error) throw error;
  return Object.fromEntries((data || []).map(r => [r.key, r.value]));
}

/** Upsert a set of settings keys (admin only — enforced by RLS). */
export async function saveSettings(entries) {
  const rows = Object.entries(entries).map(([key, value]) => ({ key, value }));
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
}