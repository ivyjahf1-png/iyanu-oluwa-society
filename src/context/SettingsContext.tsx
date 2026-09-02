/**
 * User settings persistence — loads on app boot so notification prefs,
 * theme, language, and saved options survive reinstalls / device changes.
 *
 * Backed by public.user_settings (per the 0009 migration). When Supabase is
 * unconfigured it transparently falls back to AsyncStorage so the app still
 * works offline-first.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { SUPABASE_UNCONFIGURED, supabase } from '../lib/supabase';
import { storage } from '../lib/storage';

const SETTINGS_KEY = '@ius_user_settings';

interface UserSettings {
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  theme: string;
  language: string;
  security: Record<string, unknown>;
  saved_options: Record<string, unknown>;
}

const DEFAULTS: UserSettings = {
  notifications_enabled: true,
  email_notifications: true,
  push_notifications: true,
  theme: 'system',
  language: 'en',
  security: {},
  saved_options: {},
};

interface SettingsContextValue {
  settings: UserSettings;
  hydrated: boolean;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  // 1. Hydrate local cache immediately (offline-first).
  // 2. Then pull authoritative settings from Supabase (source of truth).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await storage.getItem(SETTINGS_KEY);
        if (raw && !cancelled) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch {
        // Corrupt payload — start from defaults.
      }

      if (!SUPABASE_UNCONFIGURED && supabase) {
        try {
          const { data, error } = await supabase.rpc('get_user_settings');
          if (!error && data && !cancelled) {
            const remote: UserSettings = {
              notifications_enabled: data.notifications_enabled ?? DEFAULTS.notifications_enabled,
              email_notifications: data.email_notifications ?? DEFAULTS.email_notifications,
              push_notifications: data.push_notifications ?? DEFAULTS.push_notifications,
              theme: data.theme ?? DEFAULTS.theme,
              language: data.language ?? DEFAULTS.language,
              security: (data.security as Record<string, unknown>) ?? DEFAULTS.security,
              saved_options: (data.saved_options as Record<string, unknown>) ?? DEFAULTS.saved_options,
            };
            setSettings(remote);
            storage.setItem(SETTINGS_KEY, JSON.stringify(remote)).catch(() => {});
          }
        } catch {
          // Network unavailable — keep the local cache.
        }
      }

      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Patch one or more settings. Writes to Supabase (optimistic local echo first).
  const updateSettings = async (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    storage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});

    if (!SUPABASE_UNCONFIGURED && supabase) {
      try {
        await supabase.rpc('upsert_user_settings', { p_settings: patch as unknown as object });
      } catch {
        // Will reconcile on next boot's Supabase pull.
      }
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, hydrated, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}