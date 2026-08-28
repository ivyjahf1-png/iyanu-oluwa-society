import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../lib/storage';
import {
  themes,
  resolveThemeName,
  ThemeName,
  ResolvableThemeName,
  AppColors,
} from './colors';
// Static-layer bridge: keeps the legacy COLORS object in sync so every
// screen referencing it (inline reads) follows the active theme.
import { syncStaticTheme } from '../constants/theme';

const STORAGE_KEY = '@ius_theme_name';

export interface ThemeContextValue {
  /** Raw user preference ('automatic' possible). */
  themeName: ThemeName;
  /** Resolved concrete palette (never 'automatic'). */
  resolvedName: ResolvableThemeName;
  /** Resolved colors for the active theme. */
  colors: AppColors;
  /** True when the resolved theme uses a dark background. */
  isDark: boolean;
  /** System scheme ('light' | 'dark' | null). */
  systemScheme: 'light' | 'dark' | null;
  /** Set + persist the user's chosen theme. */
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>('darkEmerald');

  // Restore the persisted preference once on mount.
  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.getItem(STORAGE_KEY);
        if (
          saved === 'darkEmerald' ||
          saved === 'pitchBlack' ||
          saved === 'designerLight' ||
          saved === 'automatic'
        ) {
          setThemeName(saved);
        }
      } catch (e) {
        // Keep default — never crash on storage failure.
      }
    })();
  }, []);

  const setTheme = useCallback(async (name: ThemeName) => {
    setThemeName(name);
    try {
      await storage.setItem(STORAGE_KEY, name);
    } catch (e) {
      // Preference applied for the session; persistence is best-effort.
    }
  }, []);

  // Automatic follows the system color scheme in real time.
  const resolvedName: ResolvableThemeName = resolveThemeName(themeName, systemScheme);
  const colors: AppColors = themes[resolvedName];
  const isDark = resolvedName !== 'designerLight';

  // Push the resolved theme into the static palette layer so screens
  // referencing COLORS (constants/theme) follow the active theme too.
  syncStaticTheme(isDark, colors);

  const value = useMemo(
    () => ({
      themeName,
      resolvedName,
      colors,
      isDark,
      systemScheme,
      setTheme,
    }),
    [themeName, resolvedName, colors, isDark, systemScheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so consumers render even outside the provider.
    const fallback: ResolvableThemeName = 'darkEmerald';
    return {
      themeName: 'darkEmerald',
      resolvedName: fallback,
      colors: themes[fallback],
      isDark: true,
      systemScheme: null,
      setTheme: () => {},
    };
  }
  return ctx;
}