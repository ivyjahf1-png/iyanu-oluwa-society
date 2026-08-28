import React, { createContext, useContext, useMemo } from 'react';
import { ThemeProvider as AppThemeProvider, useTheme } from '../theme/ThemeContext';
import { themes, THEME_OPTIONS } from '../theme/colors';

/**
 * ThemeContext — backwards-compatible adapter over the canonical theme system
 * in src/theme. The app now has exactly FOUR themes: darkEmerald (default),
 * pitchBlack, designerLight, and automatic (follows the system scheme in real
 * time). All prior duplicated palettes/schemes are removed — see src/theme.
 *
 * Exposed API (kept for existing consumers):
 *   - ThemeProvider / useAppTheme
 *   - colors / isDark / mode
 *   - colorScheme / setColorScheme (legacy alias -> setTheme)
 *   - appPalette / appPalettes / setAppPalette (legacy alias -> setTheme)
 */

export const ThemeContext = createContext({
  isDark: true,
  mode: 'dark',
  colors: { ...themes.darkEmerald },
  colorScheme: 'darkEmerald',
  setColorScheme: () => {},
  appPalette: 'darkEmerald',
  appPalettes: THEME_OPTIONS,
  setAppPalette: () => {},
});

/** Resolved AppColors mapped to the legacy token names some screens rely on. */
function toLegacyColors(c) {
  return {
    background: c.background,
    card: c.card,
    border: c.border,
    text: c.text,
    muted: c.textSecondary,
    primary: c.primary,
    accentText: c.textSecondary,
  };
}

export function ThemeProvider({ children }) {
  return (
    <AppThemeProvider>
      <ThemeBridge>{children}</ThemeBridge>
    </AppThemeProvider>
  );
}

/** Bridge: publish the live (resolved) theme through the legacy context value. */
export function ThemeBridge({ children }) {
  const { themeName, resolvedName, colors, isDark, setTheme } = useTheme();
  const value = useMemo(
    () => ({
      isDark,
      mode: isDark ? 'dark' : 'light',
      colors: { ...themes[resolvedName], ...toLegacyColors(colors) },
      colorScheme: themeName,
      setColorScheme: setTheme,
      appPalette: themeName,
      appPalettes: THEME_OPTIONS,
      setAppPalette: setTheme,
    }),
    [themeName, resolvedName, colors, isDark, setTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * useAppTheme — reads the live legacy context value (populated by ThemeBridge
 * from the canonical theme), so every consumer re-renders instantly when a
 * theme changes. Falls back to Dark Emerald if used outside a provider.
 */
export function useAppTheme() {
  const legacy = useContext(ThemeContext);
  if (legacy && legacy.setAppPalette) return legacy;
  return {
    isDark: true,
    mode: 'dark',
    colors: { ...themes.darkEmerald },
    colorScheme: 'darkEmerald',
    setColorScheme: () => {},
    appPalette: 'darkEmerald',
    appPalettes: THEME_OPTIONS,
    setAppPalette: () => {},
  };
}

/** Legacy exports kept so direct importers (ProfileSettings) keep working. */
export const APP_PALETTES = {
  darkEmerald: { name: 'Dark Emerald', icon: '🌲', ...themes.darkEmerald, isDark: true },
  pitchBlack: { name: 'Pitch Black', icon: '🖤', ...themes.pitchBlack, isDark: true },
  designerLight: { name: 'Designer Light', icon: '☀️', ...themes.designerLight, isDark: false },
};

export const COLOR_SCHEMES = {
  darkEmerald: { name: 'Dark Emerald', primary: themes.darkEmerald.primary, accentText: themes.darkEmerald.textSecondary },
  pitchBlack: { name: 'Pitch Black', primary: themes.pitchBlack.primary, accentText: themes.pitchBlack.textSecondary },
  designerLight: { name: 'Designer Light', primary: themes.designerLight.primary, accentText: themes.designerLight.textSecondary },
  automatic: { name: 'Automatic', primary: themes.darkEmerald.primary, accentText: themes.darkEmerald.textSecondary },
}