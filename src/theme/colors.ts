export type ThemeName =
  | 'darkEmerald'
  | 'pitchBlack'
  | 'designerLight'
  | 'automatic';

export interface AppColors {
  background: string;
  card: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryDark: string;
  border: string;
  success: string;
  danger: string;
  warning: string;
  icon: string;
  tabBar: string;
  tabBarInactive: string;
  inputBackground: string;
  overlay: string;
}

export type ResolvableThemeName = Exclude<ThemeName, 'automatic'>;

export const themes: Record<ResolvableThemeName, AppColors> = {
  darkEmerald: {
    background: '#061D15',
    card: '#0C2B20',
    surface: '#123D2E',
    text: '#FFFFFF',
    textSecondary: '#88B0A0',
    primary: '#00D084',
    primaryDark: '#00A844',
    border: '#174233',
    success: '#00D084',
    danger: '#FF5252',
    warning: '#FFB300',
    icon: '#88B0A0',
    tabBar: '#061D15',
    tabBarInactive: '#6B8A7E',
    inputBackground: '#09241A',
    overlay: 'rgba(0,0,0,0.6)',
  },
  pitchBlack: {
    background: '#000000',
    card: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    primary: '#00D084',
    primaryDark: '#00A844',
    border: '#262626',
    success: '#00D084',
    danger: '#FF5252',
    warning: '#FFB300',
    icon: '#A0A0A0',
    tabBar: '#000000',
    tabBarInactive: '#666666',
    inputBackground: '#181818',
    overlay: 'rgba(0,0,0,0.7)',
  },
  designerLight: {
    background: '#F4F6F8',
    card: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    primary: '#00D084',
    primaryDark: '#00A844',
    border: '#E2E8F0',
    success: '#00D084',
    danger: '#FF5252',
    warning: '#FFB300',
    icon: '#64748B',
    tabBar: '#FFFFFF',
    tabBarInactive: '#8A9E96',
    inputBackground: '#EDF1F5',
    overlay: 'rgba(0,0,0,0.4)',
  },
};

/** Display metadata per theme (used by the ThemeSelector). */
export const THEME_OPTIONS: {
  id: ThemeName;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    id: 'darkEmerald',
    label: 'Dark Emerald',
    description: 'Deep green dark mode styling.',
    icon: '🌲',
  },
  {
    id: 'pitchBlack',
    label: 'Pitch Black',
    description: 'True black for AMOLED screens.',
    icon: '🖤',
  },
  {
    id: 'designerLight',
    label: 'Designer Light',
    description: 'Clean, bright interface styling.',
    icon: '☀️',
  },
  {
    id: 'automatic',
    label: 'Automatic',
    description: 'Switches between Light/Dark based on system settings.',
    icon: '✨',
  },
];

/** Resolve the automatic option against the current system color scheme. */
export function resolveThemeName(
  themeName: ThemeName,
  systemScheme: 'light' | 'dark' | null | undefined,
): ResolvableThemeName {
  if (themeName !== 'automatic') return themeName;
  return systemScheme === 'dark' ? 'darkEmerald' : 'designerLight';
}