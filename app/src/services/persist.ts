import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, InboxBooking, ItineraryEvent, SavedPin } from '../types';

const KEY = 'jt.state.v1';

/**
 * The slice of app state that has to survive closing the app: everything the
 * two of you actually entered or decided. Live-but-refetchable things
 * (location, weather, the FX rate) are deliberately left out — they have
 * their own caches in `weather.ts` / `currency.ts` and would only go stale here.
 */
export interface PersistedState {
  pins: SavedPin[];
  inbox: InboxBooking[];
  extraEvents: ItineraryEvent[];
  decisions: Record<string, 'booked' | 'skipped'>;
  catFilters: Partial<Record<Category, boolean>>;
  converter: { amount: string; dir: 'jpy' | 'usd' };
}

export async function loadPersisted(): Promise<Partial<PersistedState> | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    // Corrupt or unreadable — fall back to seed data rather than refusing to start.
    return null;
  }
}

export async function savePersisted(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Out of space or storage unavailable; the in-memory session still works.
  }
}

export async function clearPersisted(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
