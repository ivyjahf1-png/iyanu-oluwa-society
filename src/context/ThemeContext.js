import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useUser } from './UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Global theme context — resolves the active palette from the member's
 * Profile Settings (Automatic / Light / Dark + brightness & contrast levels)
 * and exposes it so every screen can react instantly to changes.
 *
 * Color schemes (Emerald / Midnight / Silver / Bronze / Amethyst) are layered
 * on top of the light|dark mode without displacing it: they only tint the
 * `primary` and `accentText` channels, so Automatic/Light/Dark fallback behaviour
 * is 100% unchanged for existing consumers.
 */
const LIGHT = {
  background: '#F4F7F5',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#0B2211',
  muted: '#6B7280',
  primary: '#4CAF50',
  accentText: '#A7F3D0',
};

const DARK = {
  background: '#0B2211',
  card: '#0F2A19',
  border: '#1C4A2E',
  text: '#FFFFFF',
  muted: '#9CB8A6',
  primary: '#4CAF50',
  accentText: '#A7F3D0',
};

/**
 * Five member-selectable color schemes. Each only overrides `primary` and
 * `accentText` over the active light/dark palette — never the surface or text
 * colors, so Light/Dark and Automatic modes keep working as before.
 */
export const COLOR_SCHEMES = {
  emerald: { name: 'Emerald', primary: '#10B981', accentText: '#A7F3D0' },
  midnight: { name: 'Midnight', primary: '#60A5FA', accentText: '#93C5FD' },
  silver: { name: 'Silver', primary: '#CBD5E1', accentText: '#E2E8F0' },
  bronze: { name: 'Bronze', primary: '#CD7B2E', accentText: '#F5E0C3' },
  amethyst: { name: 'Amethyst', primary: '#A78BFA', accentText: '#C4B5FD' },
};

const COLOR_SCHEME_CACHE_KEY = '@user_color_scheme';

export const ThemeContext = createContext({
  isDark: true,
  mode: 'dark',
  colors: { ...DARK },
  colorScheme: 'emerald',
});

export function ThemeProvider({ children }) {
  const { user } = useUser();
  const mode = user?.themeMode || 'light';

  // Color scheme state — initialised from the persisted preference, falling
  // back to 'emerald'. Persisted separately so it survives across sessions
  // independent of the (server-synced) light/dark mode.
  const [colorScheme, setColorScheme] = useState(user?.colorScheme || 'emerald');
  useEffect(() => {
    (async () => {
      try {
        const pref = await AsyncStorage.getItem(COLOR_SCHEME_CACHE_KEY);
        if ((Object.keys(COLOR_SCHEMES)).includes(pref)) {
          setColorScheme(pref);
        }
      } catch (e) {
        // no-op: default emerald stays active
      }
    })();
  }, []);

  const setColorSchemePref = async (name) => {
    if (!Object.keys(COLOR_SCHEMES).includes(name)) return;
    setColorScheme(name);
    try {
      await AsyncStorage.setItem(COLOR_SCHEME_CACHE_KEY, name);
    } catch (e) {
      console.warn('Could not persist color scheme preference:', e);
    }
  };

  // Automatic mode: ambient time of day decides light vs dark.
  // (Weather-API integration can replace this check later without
  //  changing any consumer.)
  let isDark = mode === 'dark';
  if (mode === 'automatic') {
    const hour = new Date().getHours();
    isDark = hour >= 18 || hour < 6;
  }

  const colors = useMemo(() => {
    const scheme = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.emerald;
    if (isDark) {
      // darkContrast (0-100) deepens the dark surfaces as it rises.
      const c = user?.darkContrast ?? 60;
      const deep = Math.round(0x08 + ((0x0b - 0x08) * c) / 100);
      const bg = `#${deep.toString(16).padStart(2, '0')}2211`;
      return { ...DARK, background: bg, primary: scheme.primary, accentText: scheme.accentText };
    }
    // lightBrightness (0-100) dims the light background as it falls.
    const b = user?.lightBrightness ?? 100;
    const shade = Math.round((255 - b) * 0.12); // gentle dimming curve
    const dim = v => Math.max(0, v - shade);
    return {
      ...LIGHT,
      background: `rgb(${dim(244)}, ${dim(247)}, ${dim(245)})`,
      card: `rgb(${dim(255)}, ${dim(255)}, ${dim(255)})`,
      primary: scheme.primary,
      accentText: scheme.accentText,
    };
  }, [isDark, user?.darkContrast, user?.lightBrightness, colorScheme]);

  const value = useMemo(
    () => ({ isDark, mode, colors, colorScheme, setColorScheme: setColorSchemePref }),
    [isDark, mode, colors, colorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  // Default context value guarantees `colors` is never undefined, even if a
  // consumer renders outside the provider.
  const ctx = useContext(ThemeContext) || {
    isDark: true,
    mode: 'dark',
    colors: { ...DARK },
    colorScheme: 'emerald',
    setColorScheme: () => {},
  };
  return ctx;
}