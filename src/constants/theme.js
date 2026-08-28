export const COLORS = {
  // Main body — ultra-light soft mint-grey
  background: '#F4F7F5',
  // Content cards — pure white with subtle borders
  cardBg: '#FFFFFF',
  cardBorder: '#E5E7EB',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  emeraldAccent: '#10B981',
  emeraldDark: '#059669',
  // Bottom navigation — deep dark forest green
  navBorder: '#0A1C14',
  navBg: '#06130D',
  // Soft green icon containers
  iconBg: '#D1FAE5',
  inputBg: '#FFFFFF',
  placeholder: '#94A3B8',
  // Feature icon badge system (soft pastel containers + deep icon colors)
  badgeEmeraldContainer: '#D1FAE5',
  badgeEmeraldIcon: '#047857',
  badgeBlueContainer: '#DBEAFE',
  badgeBlueIcon: '#1D4ED8',
  badgeBronzeContainer: '#FFEDD5',
  badgeBronzeIcon: '#C2410C',
  badgePurpleContainer: '#EDE9FE',
  badgePurpleIcon: '#7C3AED',
  // Dashboard (HomeScreen) surfaces & text
  pageBg: '#F4F7F5',
  cardSurface: '#FFFFFF',
  cardSurfaceSoft: '#D1FAE5',
  iconSurface: '#D1FAE5',
  cardBorderSoft: '#E5E7EB',
  mintAccent: '#10B981',
  textFaint: '#64748B',
  textDim: '#6B7280',
  textSoft: '#334155',
  textLight: '#475569',
  textSilver: '#334155',
  accentGreen: '#059669',
  accentBlue: '#2563EB',
  accentPurple: '#9333EA',
  addFundDeep: '#10B981',
};

export const GRADIENTS = {
  // Dark emerald gradient for hero / balance cards
  metallicCard: ['#132A20', '#0A1A13'],
  greenBtn: ['#10B981', '#059669'],
  blueBtn: ['#38BDF8', '#1E3A8A'],
  orangeBtn: ['#F97316', '#78350F'],
  purpleBtn: ['#A855F7', '#4C1D95'],
  // Dashboard (HomeScreen) multi-stop gradients — dark emerald hero
  metallicDashboard: ['#1A3327', '#132A20', '#0E211A', '#0A1A13'],
  greenService: ['#10B981', '#047857'],
  blueService: ['#4F86F7', '#1D4ED8'],
  orangeService: ['#D97706', '#78350F'],
  purpleService: ['#8B5CF6', '#4C1D95'],
};

/**
 * Auth flow palette (Welcome / Sign Up / Sign In).
 * Kept separate so the dark "cooperative" onboarding aesthetic is isolated
 * and easy to evolve without touching the main app theme.
 */
export const AUTH_COLORS = {
  background: '#06130D',
  backgroundAlt: '#0A1C14',
  primary: '#10B981', // solid mint accent
  secondaryBorder: '#10B981', // mint accent for outlined buttons / logo rings
  secondaryFill: 'rgba(16, 185, 129, 0.12)',
  inputBg: 'rgba(13, 42, 32, 0.55)',
  inputBorder: '#1E3A30',
  textPrimary: '#FFFFFF',
  textSecondary: '#A7F3D0',
  placeholder: '#5B7A6B',
  cardBorder: '#17332A',
};

export const AUTH_GRADIENTS = {
  screen: ['#06130D', '#0A1C14'],
  greenBtn: ['#10B981', '#059669'],
};

/* ==========================================================================
   RUNTIME THEME BRIDGE
   Some screens (and inline JSX color reads) still reference the static
   COLORS object. To make the WHOLE app follow the active theme, the
   canonical ThemeProvider (src/theme/ThemeContext.tsx) calls
   syncStaticTheme() whenever the resolved theme changes, mutating COLORS
   in place. Inline reads therefore always reflect the current theme.
   (Module-level StyleSheet.create values are baked at import time and are
   handled per-screen; inline reads are covered universally by this bridge.)
   ========================================================================== */

/** Light-mode palette for the static layer (mirrors designerLight). */
export const STATIC_LIGHT_COLORS = {
  background: '#F4F7F5',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  emeraldAccent: '#10B981',
  emeraldDark: '#059669',
  navBorder: '#E2E8F0',
  navBg: '#FFFFFF',
  iconBg: '#D1FAE5',
  inputBg: '#FFFFFF',
  placeholder: '#94A3B8',
  pageBg: '#F4F6F8',
  cardSurface: '#FFFFFF',
  cardSurfaceSoft: '#D1FAE5',
  iconSurface: '#D1FAE5',
  cardBorderSoft: '#E2E8F0',
  textFaint: '#64748B',
  textDim: '#6B7280',
  textSoft: '#334155',
  textLight: '#475569',
  textSilver: '#334155',
};

/** Dark-mode palette for the static layer (mirrors darkEmerald). */
export const STATIC_DARK_COLORS = {
  background: '#061D15',
  cardBg: '#0C2B20',
  cardBorder: '#174233',
  textPrimary: '#FFFFFF',
  textSecondary: '#88B0A0',
  emeraldAccent: '#00D084',
  emeraldDark: '#00A844',
  navBorder: '#174233',
  navBg: '#061D15',
  iconBg: '#123D2E',
  inputBg: '#09241A',
  placeholder: '#6B8A7E',
  pageBg: '#061D15',
  cardSurface: '#0C2B20',
  cardSurfaceSoft: '#123D2E',
  iconSurface: '#123D2E',
  cardBorderSoft: '#174233',
  textFaint: '#88B0A0',
  textDim: '#88B0A0',
  textSoft: '#C9E2D8',
  textLight: '#A7C6B9',
  textSilver: '#C9E2D8',
};

/**
 * Mutate the exported COLORS (and friends) so every static reference
 * follows the active theme. Called by the canonical ThemeProvider on
 * every resolved-theme change with the exact resolved palette.
 */
export function syncStaticTheme(isDark, colors) {
  if (colors) {
    // Map the canonical runtime palette onto the static token names for
    // exact per-theme fidelity (darkEmerald vs pitchBlack vs light).
    Object.assign(COLORS, {
      background: colors.background,
      pageBg: colors.background,
      cardBg: colors.card,
      cardSurface: colors.card,
      cardBorder: colors.border,
      cardBorderSoft: colors.border,
      textPrimary: colors.text,
      textSecondary: colors.textSecondary,
      textFaint: colors.textSecondary,
      textDim: colors.textSecondary,
      textSoft: colors.text,
      textLight: colors.textSecondary,
      textSilver: colors.text,
      emeraldAccent: colors.primary,
      emeraldDark: colors.primaryDark,
      iconBg: colors.surface,
      iconSurface: colors.surface,
      inputBg: colors.inputBackground,
      placeholder: colors.textSecondary,
      navBg: colors.tabBar,
      navBorder: colors.border,
      cardSurfaceSoft: colors.surface,
    });
  } else {
    const src = isDark ? STATIC_DARK_COLORS : STATIC_LIGHT_COLORS;
    Object.assign(COLORS, src);
  }
  // Accent gradients work on both modes; the hero gradient is dark-only
  // styling, so swap it for a light-friendly pair in light mode.
  if (isDark) {
    GRADIENTS.metallicCard = ['#132A20', '#0A1A13'];
    GRADIENTS.metallicDashboard = ['#1A3327', '#132A20', '#0E211A', '#0A1A13'];
  } else {
    GRADIENTS.metallicCard = ['#10B981', '#059669'];
    GRADIENTS.metallicDashboard = ['#D1FAE5', '#A7F3D0', '#D1FAE5', '#ECFDF5'];
  }
}

/* ==========================================================================
   SEMANTIC DESIGN TOKENS — strict light/dark theme pairs (WCAG AAA).
   Single source of truth for the semantic color contract. Consumers map
   these onto the runtime theme (src/theme/colors.ts) via useTheme().
   ==========================================================================
   Tokens:
     background   — app / screen background
     cardBg       — card & container surface
     textPrimary  — primary readable text
     textSecondary— secondary / description text (still AAA on background)
     textMuted    — labels, placeholders, hints
     inputBg      — form input backgrounds
     inputText    — text typed into inputs / placeholders
     accent       — brand emerald (shared across modes)
   ========================================================================== */
export const THEME_TOKENS = {
  dark: {
    background: '#0A0F0D',
    cardBg: '#141E19',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    inputBg: '#1E2A24',
    inputText: '#FFFFFF',
    accent: '#00D06C',
  },
  light: {
    background: '#F8FAF9',
    cardBg: '#FFFFFF',
    textPrimary: '#0D1512',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    inputBg: '#F3F4F6',
    inputText: '#0D1512',
    accent: '#00D06C',
  },
};

/**
 * Resolve a static style layer to the correct semantic token set.
 * Pass the runtime `isDark` flag from useTheme() and it returns the
 * appropriate light/dark token object (or the requested explicit mode).
 */
export function resolveThemeTokens(mode) {
  return mode === 'dark' ? THEME_TOKENS.dark : THEME_TOKENS.light;
}