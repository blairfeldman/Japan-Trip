import { API_BASE_URL, API_TOKEN, syncConfigured } from '../env';

/**
 * Thin client for `backend/`. Every call returns null rather than throwing on
 * a transport failure: the app is local-first, so an unreachable or
 * unconfigured backend has to be an ordinary, quiet state — not an error path
 * the UI has to handle.
 */

export { syncConfigured };

/** One record as the server stores it. `body` holds our own record shape. */
export interface RemoteItem {
  id: string;
  seq: number;
  kind: string;
  body: any;
  author: string;
  status: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface ItemPage {
  items: RemoteItem[];
  next_seq: number;
  has_more: boolean;
}

const TIMEOUT_MS = 15000;

interface ReqOptions {
  /**
   * Treat a 404 as success. Only for DELETE: a row that isn't there is the
   * state we were asking for, and retrying forever against a row that was
   * never pushed — a pin saved and removed while offline — is not.
   */
  missingIsFine?: boolean;
}

async function req<T>(path: string, init?: RequestInit, opts: ReqOptions = {}): Promise<T | null> {
  if (!syncConfigured) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
        ...(init?.headers ?? {}),
      },
    });
    if (res.status === 404 && opts.missingIsFine) return {} as T;
    if (!res.ok) return null;
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch {
    // Offline, timed out, DNS gone, backend asleep — all the same to the app.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: () => req<{ status: string; extraction: boolean; geocoding: boolean }>('/health'),

  /** One page of changes after `sinceSeq`. Caller loops while `has_more`. */
  listItems: (sinceSeq: number, limit = 500) =>
    req<ItemPage>(`/items?since_seq=${sinceSeq}&limit=${limit}`),

  getItem: (id: string) => req<RemoteItem>(`/items/${encodeURIComponent(id)}`),

  /** Upsert. Safe to repeat — a retry over flaky mobile data can't duplicate. */
  putItem: (item: { id: string; kind: string; body: unknown; author: string }) =>
    req<RemoteItem>('/items', { method: 'POST', body: JSON.stringify(item) }),

  /** Soft-deletes, leaving a tombstone the other phone picks up. */
  deleteItem: (id: string) =>
    req<{}>(`/items/${encodeURIComponent(id)}`, { method: 'DELETE' }, { missingIsFine: true }),

  /** Hands a shared link to the extraction pipeline. Returns a pending row. */
  analyzeShareUrl: (url: string, sharedText: string, author: string) =>
    req<RemoteItem>('/share', { method: 'POST', body: JSON.stringify({ url, shared_text: sharedText, author }) }),

  /** Reads a confirmation with Claude. Null when no key is configured (503). */
  parseBooking: (text: string) =>
    req<{
      kind: string; title: string; sub: string; date: string | null;
      time: string | null; confirmation: string | null; prepaid: boolean; confidence: string;
    }>('/parse-booking', { method: 'POST', body: JSON.stringify({ text }) }),
};

/**
 * Free, keyless address → lat/lng lookup via OpenStreetMap Nominatim, used
 * for the "matched on the map" step in Add Pin. Nominatim's usage policy
 * requires a descriptive User-Agent and no more than ~1 req/sec.
 *
 * Kept even with a backend: this runs on the phone and needs no key, so Add
 * Pin keeps working when the backend is unreachable.
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
