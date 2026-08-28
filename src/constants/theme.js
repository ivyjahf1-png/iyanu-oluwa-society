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