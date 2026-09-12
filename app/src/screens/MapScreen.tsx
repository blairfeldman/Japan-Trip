import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../store/AppState';
import { DAYS, cityCoordsFor } from '../data/trip';
import { eventsForDay } from '../data/itinerary';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { CategoryDot } from '../components/ui';
import { Icon } from '../components/Icon';
import { getCurrentLocation, distanceMeters } from '../services/location';
import { canRenderMap } from '../env';

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useAppState();
  const mapRef = useRef<MapView | null>(null);
  const [query, setQuery] = useState('');
  const day = DAYS[state.dayIdx];
  const center = state.location ?? cityCoordsFor(day.city);

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        dispatch({ type: 'SET_LOCATION', location: loc });
        mapRef.current?.animateToRegion({ latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 400);
      }
    })();
  }, []);

  const activeCat = (cat: string) => !state.catFilters[cat as keyof typeof state.catFilters];

  const visiblePins = state.pins.filter((p) => activeCat(p.cat));
  const searched = query.trim()
    ? visiblePins.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : visiblePins;

  const stops = useMemo(
    () => eventsForDay(day.day).filter((e) => !!e.location),
    [day.day]
  );

  // Without a GPS fix there is no "within 1 km" — listing every pin under that
  // heading with a dash for distance just looked like the distances were broken.
  const nearby = useMemo(() => {
    if (!state.location) return [];
    const here = state.location;
    return visiblePins
      .map((p) => ({ pin: p, meters: distanceMeters(here, { lat: p.lat, lng: p.lng }) }))
      .filter((x) => x.meters <= 1000)
      .sort((a, b) => a.meters - b.meters)
      .slice(0, 3);
  }, [visiblePins, state.location]);

  const filters = [{ k: 'all', label: `All ${state.pins.length}` }, ...Object.keys(CATEGORY)
    .filter((k) => k !== 'transit')
    .map((k) => ({ k, label: CATEGORY[k as keyof typeof CATEGORY].label }))];

  return (
    <View style={styles.screen}>
      {!canRenderMap ? (
        <View style={[StyleSheet.absoluteFill, styles.noMap]}>
          <Icon name="MapTrifold" size={34} color={COLORS.labelFaint} />
          <Text style={styles.noMapTitle}>No Google Maps key in this build</Text>
          <Text style={styles.noMapBody}>
            Android refuses to draw the map without one, so it's switched off here rather than crashing the app.
            Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as an EAS environment variable and rebuild — see app/README.md.
            Everything else, including the saved places below, works without it.
          </Text>
        </View>
      ) : (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        // Only once a fix actually exists — asking for the blue dot without
        // granted location permission is its own crash on some devices.
        showsUserLocation={!!state.location}
        showsMyLocationButton={false}
      >
        {stops.length > 1 && (
          <Polyline
            coordinates={stops.map((s) => ({ latitude: s.location!.lat, longitude: s.location!.lng }))}
            strokeColor={COLORS.accent}
            strokeWidth={3}
            lineDashPattern={[1, 10]}
          />
        )}
        {searched.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.name} onPress={() => navigation.navigate('PinDetail', { pinId: p.id })}>
            <View style={[styles.savedDot, { backgroundColor: CATEGORY[p.cat].color }]} />
          </Marker>
        ))}
        {stops.map((s, i) => (
          <Marker key={s.id} coordinate={{ latitude: s.location!.lat, longitude: s.location!.lng }} title={s.title} onPress={() => navigation.navigate('EventDetail', { eventId: s.id })}>
            <View style={styles.stopPin}>
              <Text style={styles.stopPinText}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
      )}

      {state.offline && <View style={styles.offlineTint} pointerEvents="none" />}

      <View style={[styles.topBar, { top: insets.top + 14 }]}>
        <View style={styles.searchBar}>
          <Icon name="MagnifyingGlass" size={19} color={COLORS.label} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${state.pins.length} saved places`}
            placeholderTextColor={COLORS.labelFaint}
            style={styles.searchInput}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={{ marginTop: 11, overflow: 'visible' }}
        >
          {filters.map((f) => {
            const active = f.k === 'all' || activeCat(f.k);
            return (
              <Pressable
                key={f.k}
                onPress={() => (f.k === 'all' ? dispatch({ type: 'CLEAR_CAT_FILTERS' }) : dispatch({ type: 'TOGGLE_CAT_FILTER', cat: f.k as any }))}
                style={[styles.filterChip, { borderColor: active ? COLORS.ink : COLORS.border, backgroundColor: '#fff' }]}
              >
                {f.k !== 'all' && <CategoryDot cat={f.k as any} size={8} />}
                <Text style={[styles.filterText, { color: active ? COLORS.ink : COLORS.labelFaint }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.fabColumn, { bottom: 200 + insets.bottom }]}>
        <Pressable onPress={() => dispatch({ type: 'SET_OFFLINE', value: !state.offline })} style={styles.fab}>
          <Icon name="CloudSlash" size={20} color={state.offline ? COLORS.accent : COLORS.inkSoft} />
        </Pressable>
        <Pressable onPress={() => navigation.getParent()?.navigate('AddPin')} style={styles.fab}>
          <Icon name="Plus" size={20} color={COLORS.inkSoft} />
        </Pressable>
        <Pressable
          onPress={async () => {
            const loc = await getCurrentLocation();
            if (loc) {
              dispatch({ type: 'SET_LOCATION', location: loc });
              mapRef.current?.animateToRegion({ latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
            }
          }}
          style={styles.fab}
        >
          <Icon name="Crosshair" size={20} color={COLORS.accent} />
        </Pressable>
      </View>

      <View style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}>
        <View style={styles.grabber} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetLabel}>Within 1 km</Text>
          <Pressable onPress={() => navigation.getParent()?.navigate('DaysTab')}>
            <Text style={styles.sheetLink}>Today's route</Text>
          </Pressable>
        </View>
        {nearby.map(({ pin, meters }) => (
          <Pressable key={pin.id} onPress={() => navigation.navigate('PinDetail', { pinId: pin.id })} style={styles.sheetRow}>
            <CategoryDot cat={pin.cat} size={10} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{pin.name}</Text>
              <Text style={styles.sheetSub}>{pin.sub}</Text>
            </View>
            <Text style={styles.sheetDist}>{meters == null ? '—' : meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`}</Text>
          </Pressable>
        ))}
        {nearby.length === 0 && (
          <Text style={styles.emptyNearby}>
            {state.location ? 'No saved pins within 1 km right now.' : 'Waiting for a location fix…'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eceae4' },
  noMap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 10, backgroundColor: '#eceae4' },
  noMapTitle: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.inkSoft, textAlign: 'center' },
  noMapBody: { fontSize: 13, lineHeight: 19, color: COLORS.label, textAlign: 'center', fontFamily: FONT_SERIF_REGULAR },
  offlineTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(243,242,242,0.35)' },
  savedDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: '#fff' },
  stopPin: {
    width: 30, height: 30, backgroundColor: COLORS.accent, borderWidth: 2, borderColor: '#fff',
    borderTopLeftRadius: 15, borderTopRightRadius: 15, borderBottomRightRadius: 2, borderBottomLeftRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  stopPinText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: FONT_SERIF },
  topBar: { position: 'absolute', left: 16, right: 16, top: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 2, paddingHorizontal: 14, height: 50, shadowColor: '#2d2b2b', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  filterRow: { flexDirection: 'row', gap: 7, paddingRight: 16 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 2, paddingHorizontal: 11, paddingVertical: 7, minHeight: 34, shadowColor: '#2d2b2b', shadowOpacity: 0.14, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  filterText: { fontSize: 13, fontFamily: FONT_SERIF_REGULAR },
  fabColumn: { position: 'absolute', right: 16, bottom: 200, gap: 10 },
  fab: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#2d2b2b', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.bg, borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18, shadowColor: '#2d2b2b', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 6 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sheetLabel: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  sheetLink: { fontSize: 13, color: COLORS.link, fontFamily: FONT_SERIF_REGULAR },
  sheetRow: { flexDirection: 'row', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingVertical: 12 },
  sheetName: { fontSize: 15.5, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  sheetSub: { fontSize: 13, color: COLORS.label, marginTop: 1, fontFamily: FONT_SERIF_REGULAR },
  sheetDist: { fontSize: 13, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  emptyNearby: { fontSize: 13.5, color: COLORS.label, paddingVertical: 10, fontFamily: FONT_SERIF_REGULAR },
});
