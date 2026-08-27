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
  background: '#0B1612',
  card: '#12241D',
  border: '#1A382B',
  text: '#FFFFFF',
  muted: '#A0B0A8',
  primary: '#00C875',
  accentText: '#A7F3D0',
};

/**
 * Five member-selectable color schemes. Each only overrides `primary` and
 * `accentText` over the active light/dark palette — never the surface or text
 * colors, so Light/Dark and Automatic modes keep working as before.
 */
export const COLOR_SCHEMES = {
  emerald: { name: 'Emerald', primary: '#00C875', accentText: '#A7F3D0' },
  midnight: { name: 'Midnight', primary: '#60A5FA', accentText: '#93C5FD' },
  silver: { name: 'Silver', primary: '#CBD5E1', accentText: '#E2E8F0' },
  bronze: { name: 'Bronze', primary: '#CD7B2E', accentText: '#F5E0C3' },
  amethyst: { name: 'Amethyst', primary: '#A78BFA', accentText: '#C4B5FD' },
};

/**
 * Three member-selectable APP PALETTES (surface + text + accent, not just the
 * accent tint like COLOR_SCHEMES above). Applied additively over the legacy
 * light/dark engine:
 *   - emerald    → classic Dark Emerald surfaces (default, unchanged behaviour)
 *   - pitchblack → true black OLED surfaces (#000000) with high-contrast text
 *   - white      → designer crisp-white light surfaces
 */
export const APP_PALETTES = {
  emerald: {
    name: 'Dark Emerald',
    icon: '🌲',
    background: '#0B1612',
    card: '#12241D',
    border: '#1A382B',
    text: '#FFFFFF',
    muted: '#A0B0A8',
    primary: '#00C875',
    accentText: '#A7F3D0',
    isDark: true,
  },
  pitchblack: {
    name: 'Pitch Black',
    icon: '🖤',
    background: '#000000',
    card: '#121212',
    border: '#222222',
    text: '#FFFFFF',
    muted: '#999999',
    primary: '#00C875',
    accentText: '#A7F3D0',
    isDark: true,
  },
  white: {
    name: 'Designer Light',
    icon: '☀️',
    background: '#F8F9FA',
    card: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    muted: '#4B5563',
    primary: '#00B16A',
    accentText: '#065F46',
    isDark: false,
  },
};

const COLOR_SCHEME_CACHE_KEY = '@user_color_scheme';
const APP_PALETTE_CACHE_KEY = '@user_app_palette';

export const ThemeContext = createContext({
  isDark: true,
  mode: 'dark',
  colors: { ...DARK },
  colorScheme: 'emerald',
  appPalette: 'emerald',
  appPalettes: APP_PALETTES,
  setAppPalette: () => {},
});

export function ThemeProvider({ children }) {
  const { user } = useUser();
  // 'dark' is the default so first-run users land on Dark Emerald (the app's
  // signature palette). Users who explicitly saved 'light'/'automatic' keep it.
  const mode = user?.themeMode || 'dark';

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

  // APP PALETTE state — 'emerald' | 'pitchblack' | 'white'. Persisted so the
  // choice survives restarts; updates here re-render every consumer instantly.
  const [appPalette, setAppPaletteState] = useState(user?.appPalette || 'emerald');
  useEffect(() => {
    (async () => {
      try {
        const pref = await AsyncStorage.getItem(APP_PALETTE_CACHE_KEY);
        if ((Object.keys(APP_PALETTES)).includes(pref)) {
          setAppPaletteState(pref);
        }
      } catch (e) {
        // no-op: default Dark Emerald stays active
      }
    })();
  }, []);

  const setAppPalette = async (name) => {
    if (!Object.keys(APP_PALETTES).includes(name)) return;
    setAppPaletteState(name);
    try {
      await AsyncStorage.setItem(APP_PALETTE_CACHE_KEY, name);
    } catch (e) {
      console.warn('Could not persist app palette preference:', e);
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
    let paletteColors;
    if (isDark) {
      // darkContrast (0-100) deepens the dark surfaces as it rises.
      const c = user?.darkContrast ?? 60;
      const deep = Math.round(0x06 + ((0x0c - 0x06) * c) / 100);
      const bg = `#${deep.toString(16).padStart(2, '0')}1612`;
      paletteColors = { ...DARK, background: bg, primary: scheme.primary, accentText: scheme.accentText };
    } else {
      // lightBrightness (0-100) dims the light background as it falls.
      const b = user?.lightBrightness ?? 100;
      const shade = Math.round((255 - b) * 0.12); // gentle dimming curve
      const dim = v => Math.max(0, v - shade);
      paletteColors = {
        ...LIGHT,
        background: `rgb(${dim(244)}, ${dim(247)}, ${dim(245)})`,
        card: `rgb(${dim(255)}, ${dim(255)}, ${dim(255)})`,
        primary: scheme.primary,
        accentText: scheme.accentText,
      };
    }

    // The selected APP PALETTE overrides full surface/text/accent tokens
    // (high-contrast values per theme), keeping every consumer legible.
    const palette = APP_PALETTES[appPalette];
    if (palette && appPalette !== 'emerald') {
      return { ...paletteColors, ...palette, primary: palette.primary, accentText: palette.accentText };
    }
    return paletteColors;
  }, [isDark, user?.darkContrast, user?.lightBrightness, colorScheme, appPalette]);

  // Pitch Black stays dark; Designer Light forces light chrome globally.
  const paletteIsDark = APP_PALETTES[appPalette]?.isDark ?? true;
  const effectiveIsDark = appPalette === 'emerald' ? isDark : paletteIsDark;

  const value = useMemo(
    () => ({
      isDark: effectiveIsDark,
      mode,
      colors,
      colorScheme,
      setColorScheme: setColorSchemePref,
      appPalette,
      appPalettes: APP_PALETTES,
      setAppPalette,
    }),
    [effectiveIsDark, mode, colors, colorScheme, appPalette],
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
    appPalette: 'emerald',
    appPalettes: APP_PALETTES,
    setAppPalette: () => {},
  };
  return ctx;
}