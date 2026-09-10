import { SavedPin, InboxBooking } from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function req<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!API_BASE) return null; // no backend configured — caller falls back to local state
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // backend unreachable (offline, not deployed, etc.) — degrade gracefully
  }
}

export const backendConfigured = !!API_BASE;

export const api = {
  listPins: () => req<SavedPin[]>('/pins'),
  createPin: (pin: SavedPin) => req<SavedPin>('/pins', { method: 'POST', body: JSON.stringify(pin) }),
  deletePin: (id: string) => req<{ ok: true }>(`/pins/${id}`, { method: 'DELETE' }),

  listInbox: () => req<InboxBooking[]>('/inbox'),
  addBookingToDay: (id: string, day: number) =>
    req<{ ok: true }>(`/inbox/${id}/add-to-day`, { method: 'POST', body: JSON.stringify({ day }) }),

  /** Kicks off the backend's TikTok/IG parsing pipeline for a shared link. */
  analyzeShareUrl: (url: string) =>
    req<{ status: 'parsing' | 'duplicate' | 'saved'; pin?: SavedPin; duplicateOf?: SavedPin }>('/share/analyze', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
};

/**
 * Free, keyless address → lat/lng lookup via OpenStreetMap Nominatim, used
 * for the "matched on the map" step in Add Pin. Nominatim's usage policy
 * requires a descriptive User-Agent and no more than ~1 req/sec.
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'JapanTripApp/1.0 (personal trip planner)' } });
    if (!res.ok) return null;
    const json = await res.json();
    const first = json?.[0];
    if (!first) return null;
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon), displayName: first.display_name };
  } catch {
    return null;
  }
}
