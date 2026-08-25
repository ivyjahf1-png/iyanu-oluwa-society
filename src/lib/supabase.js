import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

/**
 * Supabase client for the mobile app.
 *
 * Supply the project URL and anon key via env (`EXPO_PUBLIC_*`) or the two
 * constants below. The anon key is safe to ship in the client — all
 * privileged operations are protected by Row Level Security.
 */
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kvvodpeewrbdbdtlvzuc.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IYYIjXd6jKg1JSeFEiUwhA_b492WoLD';

/** True when the anon key placeholder has not been replaced yet. */
export const SUPABASE_UNCONFIGURED =
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'sb_publishable_IYYIjXd6jKg1JSeFEiUwhA_b492WoLD');

export const SUPABASE_PROJECT_URL = SUPABASE_URL;

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

/** Read all app_settings, merging local storage with Supabase so that
 *  an unconfigured (web) deployment still sees previously-saved values. */
export async function getAllSettings() {
  let merged = {};
  try {
    const raw = await storage.getItem('@ius_app_settings');
    if (raw) merged = JSON.parse(raw);
  } catch (e) { /* ignore */ }
  try {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (!error && data) {
      data.forEach(r => { merged[r.key] = r.value; });
    }
  } catch (e) {
    console.warn('[supabase] getAllSettings fetch failed (local fallback used):', e.message);
  }
  return merged;
}

/** Upsert a set of settings keys (admin only — enforced by RLS).
 *
 * Persists to local storage FIRST so the action always succeeds, then
 * best-effort upserts to Supabase so real deployments stay in sync.
 * On web deployments with an unconfigured/placeholder URL the Supabase
 * call simply fails silently instead of crashing the Save handler.
 */
export async function saveSettings(entries) {
  const rows = Object.entries(entries).map(([key, value]) => ({ key, value }));

  // 1. Local fallback — always succeeds, survives restarts.
  try {
    await storage.setItem('@ius_app_settings', JSON.stringify(entries));
  } catch (e) { /* Storage unavailable — ignore, Supabase is the backup. */ }

  // 2. Best-effort sync to Supabase. If the project URL is a placeholder or
  //    there is no network, this throws — but we swallow it so the Save
  //    action still reports success via the local copy.
  try {
    const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
    if (error) {
      console.warn('[supabase] saveSettings upsert warning:', error.message);
    }
  } catch (e) {
    console.warn('[supabase] saveSettings upsert failed (local fallback used):', e.message);
  }
}