/**
 * useLiveEnvironment — additive, non-breaking live environment hook.
 *
 * Provides everything the dashboard greeting needs to feel "alive":
 *   1. Time Sync      — local system clock, re-ticked every 30s so the
 *                       greeting flips ("Good morning/afternoon/evening")
 *                       without a manual refresh.
 *   2. Live Weather   — device location via expo-location (foreground
 *                       permission) + current conditions from the free
 *                       Open-Meteo API (no API key required).
 *
 * Every field degrades gracefully: if permission is denied, the network
 * fails, or expo-location is unavailable, the hook still returns valid
 * time data and `weather: null` — callers simply skip the weather chip.
 */
import { useEffect, useRef, useState } from 'react';

/** Classify the local hour into a greeting period. */
function classifyHour(hour) {
  if (hour >= 5 && hour < 12) return { period: 'morning', greeting: 'Good morning', sunUp: true };
  if (hour >= 12 && hour < 17) return { period: 'afternoon', greeting: 'Good afternoon', sunUp: true };
  return { period: 'evening', greeting: 'Good evening', sunUp: false };
}

/**
 * Map an Open-Meteo WMO weathercode to a friendly label + icon kind.
 * Icon kinds: 'sun' | 'moon' | 'cloud' | 'cloud-moon' | 'rain' | 'snow' | 'fog' | 'storm'
 */
export function describeWeather(code, isDay) {
  if (code === 0) return isDay ? { label: 'Clear', icon: 'sun' } : { label: 'Clear', icon: 'moon' };
  if (code === 1 || code === 2)
    return isDay ? { label: 'Partly cloudy', icon: 'cloud-sun' } : { label: 'Partly cloudy', icon: 'cloud-moon' };
  if (code === 3) return { label: 'Cloudy', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Foggy', icon: 'fog' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Rain', icon: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', icon: 'snow' };
  if (code >= 95) return { label: 'Storm', icon: 'storm' };
  return { label: 'Fair', icon: isDay ? 'sun' : 'moon' };
}

export default function useLiveEnvironment() {
  // ---- Time sync (ticks every 30s; cheap re-render keeps greeting fresh) ----
  const [clock, setClock] = useState(() => classifyHour(new Date().getHours()));
  useEffect(() => {
    const tick = () => setClock(classifyHour(new Date().getHours()));
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // ---- Location + weather ----
  const [weather, setWeather] = useState(null); // { temperature, label, icon, isDay }
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [locationGranted, setLocationGranted] = useState(null); // null = unknown
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      let Location;
      try {
        // Lazy require so a missing native module can never crash the app.
        Location = require('expo-location');
      } catch (e) {
        if (mounted.current) setWeatherLoading(false);
        return;
      }

      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!mounted.current) return;
        if (!perm || perm.granted !== true) {
          setLocationGranted(false);
          setWeatherLoading(false);
          return;
        }
        setLocationGranted(true);

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted.current || !pos?.coords) {
          if (mounted.current) setWeatherLoading(false);
          return;
        }
        const { latitude, longitude } = pos.coords;

        // Open-Meteo: free, keyless current-conditions endpoint.
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
          `&longitude=${longitude}&current_weather=true`;
        const res = await fetch(url);
        if (!mounted.current) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const cw = data?.current_weather;
        if (!cw) throw new Error('No current_weather payload');

        const isDay = cw.is_day !== 0;
        const desc = describeWeather(cw.weathercode ?? -1, isDay);
        setWeather({
          temperature: Math.round(cw.temperature),
          label: desc.label,
          icon: desc.icon,
          isDay,
        });
      } catch (e) {
        console.log('[useLiveEnvironment] weather skipped:', e?.message || e);
      } finally {
        if (mounted.current) setWeatherLoading(false);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  return {
    ...clock,               // period, greeting, sunUp
    hour: new Date().getHours(),
    isDay: clock.sunUp,
    weather,                // null until fetched / on failure
    weatherLoading,
    locationGranted,
  };
}
