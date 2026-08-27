import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
} from 'lucide-react-native';
import { useAppTheme } from '../context/ThemeContext';

/**
 * Returns the current local time-of-day classification.
 *
 *   - Morning   (5:00 AM – 11:59 AM)  → "Good morning"
 *   - Afternoon (12:00 PM – 4:59 PM)  → "Good afternoon"
 *   - Evening   (5:00 PM – 4:59 AM)   → "Good evening"
 *
 * Computed from `new Date().getHours()` so the greeting always reflects the
 * device's local clock. Recalculated on every render (cheap) so the app stays
 * accurate if it remains open across an hour boundary.
 */
export function useTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { hour, period: 'morning', greeting: 'Good morning', isDay: true };
  }
  if (hour >= 12 && hour < 17) {
    return { hour, period: 'afternoon', greeting: 'Good afternoon', isDay: true };
  }
  return { hour, period: 'evening', greeting: 'Good evening', isDay: false };
}

/**
 * Renders a time-of-day-aware greeting with a Sun / Moon icon indicator that
 * toggles based on the current hour (day → Sun, night → Moon).
 *
 * `textStyle` lets callers re-use their own typography (e.g. the dashboard
 * header style) so the greeting blends into existing layouts.
 *
 * ADDITIVE: pass `weather` (from useLiveEnvironment) to upgrade the plain
 * sun/moon marker into a live weather indicator — condition icon plus a
 * subtle temperature chip. When `weather` is null/undefined (permission
 * denied, offline, or still loading) behaviour is exactly as before.
 */
const WEATHER_ICONS = {
  sun: { Icon: Sun, tint: '#FBBF24' },
  moon: { Icon: Moon, tint: '#93C5FD' },
  cloud: { Icon: Cloud, tint: '#CBD5E1' },
  'cloud-sun': { Icon: CloudSun, tint: '#FBBF24' },
  'cloud-moon': { Icon: CloudMoon, tint: '#93C5FD' },
  rain: { Icon: CloudRain, tint: '#60A5FA' },
  snow: { Icon: CloudSnow, tint: '#BAE6FD' },
  fog: { Icon: CloudFog, tint: '#CBD5E1' },
  storm: { Icon: CloudLightning, tint: '#C4B5FD' },
};

export default function Greeting({ textStyle, iconColor, showIcon = true, weather }) {
  const { greeting, isDay } = useTimeOfDay();
  const { isDark: themeIsDark } = useAppTheme();
  // Theme-aware fallbacks so the component stays fully legible in every palette
  // (Dark Emerald / Pitch Black / Designer White). Callers that pass their own
  // `textStyle` (e.g. the dashboard header) keep their original typography.
  const fallbackText = textStyle ? undefined : themeIsDark ? '#FFFFFF' : '#111827';
  const iconTint = isDay ? '#FBBF24' : '#93C5FD'; // amber sun / soft-blue moon

  // Live weather override — only when real conditions are available.
  const wx = weather && WEATHER_ICONS[weather.icon] ? weather : null;
  const WxIcon = wx ? WEATHER_ICONS[wx.icon].Icon : isDay ? Sun : Moon;
  const wxTint = wx ? WEATHER_ICONS[wx.icon].tint : iconTint;

  return (
    <View style={styles.row}>
      {showIcon && (
        <View style={styles.iconWrap}>
          <WxIcon size={18} color={iconColor || wxTint} />
        </View>
      )}
      <Text style={[styles.text, !!fallbackText && { color: fallbackText }, textStyle]}>
        {greeting},
      </Text>
      {wx && typeof wx.temperature === 'number' ? (
        <View
          style={[
            styles.weatherChip,
            !themeIsDark && {
              backgroundColor: 'rgba(17, 24, 39, 0.08)',
              borderColor: 'rgba(17, 24, 39, 0.15)',
            },
          ]}
        >
          <Text
            style={[
              styles.weatherChipText,
              !themeIsDark && { color: '#374151' },
            ]}
          >
            {wx.temperature}°
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  weatherChip: {
    marginLeft: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  weatherChipText: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
});
