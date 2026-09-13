import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WeatherNow {
  now: number;
  low: number;
  high: number;
  condition: string;
  icon: 'CloudRain' | 'Cloud' | 'Sun' | 'CloudSun' | 'CloudSnow';
  fetchedAt: string;
}

const CACHE_KEY = 'jt.weather.cache.v1';

// WMO weather codes -> a short label + icon, used by Open-Meteo.
function describeCode(code: number): { condition: string; icon: WeatherNow['icon'] } {
  if (code === 0) return { condition: 'clear', icon: 'Sun' };
  if ([1, 2].includes(code)) return { condition: 'partly cloudy', icon: 'CloudSun' };
  if (code === 3) return { condition: 'overcast', icon: 'Cloud' };
  if ([45, 48].includes(code)) return { condition: 'fog', icon: 'Cloud' };
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'drizzle', icon: 'CloudRain' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'rain', icon: 'CloudRain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'snow', icon: 'CloudSnow' };
  if ([95, 96, 99].includes(code)) return { condition: 'thunderstorms', icon: 'CloudRain' };
  return { condition: 'light rain', icon: 'CloudRain' };
}

/**
 * Live current + today's low/high in Fahrenheit from Open-Meteo — free,
 * keyless, takes lat/long directly (matches what the design chat settled on).
 */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherNow> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`weather http ${res.status}`);
    const json = await res.json();
    const { condition, icon } = describeCode(json.current?.weather_code ?? 3);
    const result: WeatherNow = {
      now: Math.round(json.current?.temperature_2m ?? 0),
      low: Math.round(json.daily?.temperature_2m_min?.[0] ?? 0),
      high: Math.round(json.daily?.temperature_2m_max?.[0] ?? 0),
      condition,
      icon,
      fetchedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result));
    return result;
  } catch (err) {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
    throw err;
  }
}
