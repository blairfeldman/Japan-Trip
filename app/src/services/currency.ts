import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRIP } from '../data/trip';

const CACHE_KEY = 'jt.fx.cache.v1';

export interface FxRate {
  jpyPerUsd: number;
  fetchedAt: string;
  live: boolean;
}

/**
 * Live JPY/USD rate from frankfurter.app — free, keyless, ECB-sourced daily
 * rates. Falls back to the trip sheet's planning rate (¥150/$1) if offline.
 */
export async function fetchFxRate(): Promise<FxRate> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=JPY');
    if (!res.ok) throw new Error(`fx http ${res.status}`);
    const json = await res.json();
    const rate = json.rates?.JPY;
    if (!rate) throw new Error('no JPY rate in response');
    const result: FxRate = { jpyPerUsd: rate, fetchedAt: new Date().toISOString(), live: true };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result));
    return result;
  } catch (err) {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) return { ...JSON.parse(cached), live: false };
    return { jpyPerUsd: TRIP.exchangeRateFallback, fetchedAt: new Date().toISOString(), live: false };
  }
}
