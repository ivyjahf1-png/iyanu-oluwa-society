import React, { createContext, useContext, useMemo } from 'react';
import { useUser } from './UserContext';

/**
 * Global theme context — resolves the active palette from the member's
 * Profile Settings (Automatic / Light / Dark + brightness & contrast levels)
 * and exposes it so every screen can react instantly to changes.
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

export const ThemeContext = createContext({
  isDark: true,
  mode: 'dark',
  colors: { ...DARK },
});

export function ThemeProvider({ children }) {
  const { user } = useUser();
  const mode = user?.themeMode || 'light';

  // Automatic mode: ambient time of day decides light vs dark.
  // (Weather-API integration can replace this check later without
  //  changing any consumer.)
  let isDark = mode === 'dark';
  if (mode === 'automatic') {
    const hour = new Date().getHours();
    isDark = hour >= 18 || hour < 6;
  }

  const colors = useMemo(() => {
    if (isDark) {
      // darkContrast (0-100) deepens the dark surfaces as it rises.
      const c = user?.darkContrast ?? 60;
      const deep = Math.round(0x08 + ((0x0b - 0x08) * c) / 100);
      const bg = `#${deep.toString(16).padStart(2, '0')}2211`;
      return { ...DARK, background: bg };
    }
    // lightBrightness (0-100) dims the light background as it falls.
    const b = user?.lightBrightness ?? 100;
    const shade = Math.round((255 - b) * 0.12); // gentle dimming curve
    const dim = v => Math.max(0, v - shade);
    return {
      ...LIGHT,
      background: `rgb(${dim(244)}, ${dim(247)}, ${dim(245)})`,
      card: `rgb(${dim(255)}, ${dim(255)}, ${dim(255)})`,
    };
  }, [isDark, user?.darkContrast, user?.lightBrightness]);

  const value = useMemo(
    () => ({ isDark, mode, colors }),
    [isDark, mode, colors],
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
  };
  return ctx;
}