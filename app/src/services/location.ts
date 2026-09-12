import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { isExpoGo } from '../env';

export const PROXIMITY_TASK = 'jt-proximity-geofence';
export const PROXIMITY_RADIUS_M = 150;

export interface LatLng {
  lat: number;
  lng: number;
}

export async function requestForegroundPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function requestBackgroundPermission(): Promise<boolean> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<LatLng | null> {
  const has = await requestForegroundPermission();
  if (!has) return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Walking ETA in minutes. Uses a real Google Directions call when
 * EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is configured; otherwise falls back to a
 * straight-line distance / average walking speed (~4.6 km/h) estimate,
 * flagged so the UI can say "approx." like a real app does without a routing key.
 */
export async function walkingEtaMinutes(
  from: LatLng,
  to: LatLng
): Promise<{ minutes: number; exact: boolean }> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (key) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&mode=walking&key=${key}`;
      const res = await fetch(url);
      const json = await res.json();
      const seconds = json.routes?.[0]?.legs?.[0]?.duration?.value;
      if (seconds) return { minutes: Math.round(seconds / 60), exact: true };
    } catch {
      // fall through to the estimate below
    }
  }
  const meters = distanceMeters(from, to);
  const minutes = Math.max(1, Math.round(meters / 1000 / 4.6 * 60));
  return { minutes, exact: false };
}

export interface GeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
}

/** Android caps active geofences at 100, so the nearest pins win. */
export function buildGeofenceRegions(
  pins: { id: string; name: string; lat: number; lng: number }[]
): GeofenceRegion[] {
  return pins.slice(0, 100).map((p) => ({
    identifier: `${p.id}::${p.name}`,
    latitude: p.lat,
    longitude: p.lng,
    radius: PROXIMITY_RADIUS_M,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));
}

export async function startProximityGeofencing(regions: GeofenceRegion[]) {
  if (isExpoGo || regions.length === 0) return false;
  const bg = await requestBackgroundPermission();
  if (!bg) return false;
  await Location.startGeofencingAsync(PROXIMITY_TASK, regions);
  return true;
}

export async function stopProximityGeofencing() {
  const started = await Location.hasStartedGeofencingAsync(PROXIMITY_TASK);
  if (started) await Location.stopGeofencingAsync(PROXIMITY_TASK);
}

export { TaskManager };
