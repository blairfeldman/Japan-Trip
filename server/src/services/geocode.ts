/** Free, keyless geocoding via OpenStreetMap Nominatim. Same source the app
 * uses client-side for the manual Add Pin flow, so results are consistent. */
export async function geocode(query: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'JapanTripServer/1.0 (personal trip planner)' } });
  if (!res.ok) return null;
  const json = (await res.json()) as any[];
  const first = json[0];
  if (!first) return null;
  return { lat: parseFloat(first.lat), lng: parseFloat(first.lon), displayName: first.display_name };
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
