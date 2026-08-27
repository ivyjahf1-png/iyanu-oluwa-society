export const COLORS = {
  background: '#0B1612',
  cardBg: '#12241D',
  cardBorder: '#1A382B',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0B0A8',
  emeraldAccent: '#00C875',
  emeraldDark: '#00B16A',
  navBorder: '#12241D',
  navBg: '#05140E',
  iconBg: '#162E25',
  inputBg: '#0D1E18',
  placeholder: '#4E6C5C',
  // Feature icon badge system
  badgeEmeraldContainer: '#0E3A2C',
  badgeEmeraldIcon: '#00C875',
  badgeBlueContainer: '#1D303E',
  badgeBlueIcon: '#38BDF8',
  badgeBronzeContainer: '#3E2718',
  badgeBronzeIcon: '#F97316',
  badgePurpleContainer: '#2A1E3E',
  badgePurpleIcon: '#A855F7',
  // Dashboard (HomeScreen) surfaces & text
  pageBg: '#07120E',
  cardSurface: '#0F1E1A',
  cardSurfaceSoft: '#162924',
  iconSurface: '#12221D',
  cardBorderSoft: '#172C27',
  mintAccent: '#00D084',
  textFaint: '#94A3B8',
  textDim: '#64748B',
  textSoft: '#E2E8F0',
  textLight: '#CBD5E1',
  textSilver: '#D1D5DB',
  accentGreen: '#059669',
  accentBlue: '#2563EB',
  accentPurple: '#9333EA',
  addFundDeep: '#005F4B',
};

export const GRADIENTS = {
  metallicCard: ['#162E25', '#0B1612'],
  greenBtn: ['#00B16A', '#00C875'],
  blueBtn: ['#38BDF8', '#1E3A8A'],
  orangeBtn: ['#F97316', '#78350F'],
  purpleBtn: ['#A855F7', '#4C1D95'],
  // Dashboard (HomeScreen) multi-stop gradients
  metallicDashboard: ['#182B26', '#354B45', '#95A7A1', '#213530'],
  greenService: ['#008767', '#00382B'],
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
  background: '#0B1612',
  backgroundAlt: '#12241D',
  primary: '#00C875', // solid emerald accent
  secondaryBorder: '#00C875', // mint accent for outlined buttons / logo rings
  secondaryFill: 'rgba(0, 200, 117, 0.12)',
  inputBg: 'rgba(13, 30, 23, 0.55)',
  inputBorder: '#1E3A30',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0B0A8',
  placeholder: '#55776A',
  cardBorder: '#1A382B',
};

export const AUTH_GRADIENTS = {
  screen: ['#0B1612', '#1E3A30'],
  greenBtn: ['#00B16A', '#00C875'],
};