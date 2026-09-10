import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppState } from '../store/AppState';
import { useClock } from '../hooks/useClock';
import { DAYS, cityCoordsFor, dayMetaForDate, TRIP } from '../data/trip';
import { eventsForDay } from '../data/itinerary';
import { ItineraryEvent } from '../types';
import { fetchWeather } from '../services/weather';
import { getCurrentLocation, distanceMeters, walkingEtaMinutes } from '../services/location';
import { scheduleLeaveByNotification, requestNotificationPermission } from '../services/notifications';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { Card, CategoryDot, DoubleRule, PrimaryButton, SecondaryButton, SectionLabel, Tag } from '../components/ui';
import { Icon } from '../components/Icon';
import { isoDateOnly, dateToDecimalHour, hourToClock, combineDateAndHour } from '../utils/time';

function useTripPhase(now: Date) {
  const todayIso = isoDateOnly(now);
  const meta = dayMetaForDate(todayIso);
  if (meta) return { phase: 'during' as const, meta };
  const first = DAYS[0];
  const last = DAYS[DAYS.length - 1];
  if (todayIso < first.date) return { phase: 'before' as const, meta: first };
  return { phase: 'after' as const, meta: last };
}

export default function NowScreen() {
  const navigation = useNavigation<any>();
  const { state, dispatch } = useAppState();
  const now = useClock();
  const { phase, meta } = useTripPhase(now);
  const dayEvents = useMemo(
    () =>
      [...eventsForDay(meta.day), ...state.extraEvents.filter((e) => e.day === meta.day)].sort(
        (a, b) => a.start - b.start
      ),
    [meta.day, state.extraEvents]
  );

  const currentHour = phase === 'during' ? dateToDecimalHour(now) : phase === 'before' ? 0 : 24;
  const nextEvent = dayEvents.find((e) => e.start > currentHour - 0.01);
  const upNext = nextEvent ? dayEvents.filter((e) => e.start > nextEvent.start).slice(0, 3) : [];

  const [leaveMinutes, setLeaveMinutes] = useState<number | null>(null);
  const [travelExact, setTravelExact] = useState(false);
  const [weather, setWeather] = useState(state.weatherByDay[meta.date] ?? null);

  useEffect(() => {
    (async () => {
      const coords = cityCoordsFor(meta.city);
      try {
        const w = await fetchWeather(coords.lat, coords.lng);
        setWeather(w);
        dispatch({ type: 'SET_WEATHER', dateIso: meta.date, weather: w });
      } catch {
        // offline with nothing cached yet — leave weather blank rather than fake data
      }
    })();
  }, [meta.date]);

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) dispatch({ type: 'SET_LOCATION', location: loc });
    })();
  }, []);

  useEffect(() => {
    if (!nextEvent || phase !== 'during') {
      setLeaveMinutes(null);
      return;
    }
    (async () => {
      const eventTime = combineDateAndHour(meta.date, nextEvent.start);
      if (nextEvent.location && state.location) {
        const { minutes, exact } = await walkingEtaMinutes(state.location, {
          lat: nextEvent.location.lat,
          lng: nextEvent.location.lng,
        });
        setTravelExact(exact);
        const leaveBy = new Date(eventTime.getTime() - (minutes + 7) * 60000);
        setLeaveMinutes(Math.round((leaveBy.getTime() - now.getTime()) / 60000));
        requestNotificationPermission().then((ok) => {
          if (ok) scheduleLeaveByNotification({ id: `leave-${nextEvent.id}`, title: `Leave in a few minutes`, body: `Head to ${nextEvent.title} — ${minutes} min away`, fireAt: leaveBy });
        });
      } else {
        setTravelExact(false);
        const leaveBy = new Date(eventTime.getTime() - 15 * 60000);
        setLeaveMinutes(Math.round((leaveBy.getTime() - now.getTime()) / 60000));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextEvent?.id, state.location, phase]);

  const snoozedActive = state.snoozedUntil != null && state.snoozedUntil > Date.now();
  const displayLeave = snoozedActive ? Math.round((state.snoozedUntil! - Date.now()) / 60000) : leaveMinutes;

  const nearby = useMemo(() => {
    const withDist = state.pins.map((p) => ({
      pin: p,
      meters: state.location ? distanceMeters(state.location, { lat: p.lat, lng: p.lng }) : null,
    }));
    withDist.sort((a, b) => (a.meters ?? 1e9) - (b.meters ?? 1e9));
    return withDist.slice(0, 3);
  }, [state.pins, state.location]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <SectionLabel>
            {phase === 'during' ? `Day ${meta.day} of 12 · ${meta.dow} ${meta.date.slice(5).replace('-', '/')}` : phase === 'before' ? 'Before the trip' : 'Trip complete'}
          </SectionLabel>
          <Text style={styles.h1}>{meta.city}</Text>
        </View>
        {weather && (
          <View style={{ alignItems: 'flex-end', paddingTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
              <Text style={styles.wLow}>{weather.low}°</Text>
              <Text style={styles.wNow}>{weather.now}°</Text>
              <Text style={styles.wLow}>{weather.high}°</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Icon name="CloudRain" size={13} color={COLORS.label} />
              <Text style={styles.wCond}>{weather.condition}</Text>
            </View>
          </View>
        )}
      </View>

      <DoubleRule style={{ marginTop: 16, marginBottom: 20 }} />

      {phase === 'before' && (
        <Card style={{ padding: 18, marginBottom: 22, borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
          <SectionLabel style={{ color: COLORS.accentTintText, marginBottom: 10 }}>Countdown</SectionLabel>
          <Text style={styles.heroTitle}>
            {Math.max(0, Math.ceil((new Date(DAYS[0].date).getTime() - now.getTime()) / 86400000))} days until Tokyo
          </Text>
          <Text style={styles.heroSub}>Day 1 opens with arrival at Narita and check-in at Hotel Gracery Shinjuku.</Text>
        </Card>
      )}

      {phase === 'during' && nextEvent && (
        <Card style={{ padding: 18, marginBottom: 22, borderLeftWidth: 3, borderLeftColor: COLORS.magenta }}>
          <View style={styles.pulseRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseLabel}>
              {displayLeave == null ? 'Calculating…' : displayLeave <= 0 ? 'Leave now' : `Leave in ${displayLeave} min`}
            </Text>
          </View>
          <Text style={styles.heroTitle}>Head to {nextEvent.title}</Text>
          <Text style={styles.heroSub}>
            {nextEvent.sub}
            {leaveMinutes != null && !travelExact ? ' · walking time is an estimate' : ''}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(6, Math.min(100, snoozedActive ? 42 : 68))}%` },
              ]}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PrimaryButton
              label="Directions"
              icon={<Icon name="NavigationArrow" size={17} color="#fff" />}
              onPress={() => navigation.getParent()?.navigate('MapTab')}
            />
            <SecondaryButton
              label={snoozedActive ? 'Snoozed' : 'Snooze 10'}
              onPress={() => dispatch({ type: 'SNOOZE_LEAVE_BY', minutes: 10 })}
            />
          </View>
        </Card>
      )}

      {phase === 'during' && !nextEvent && (
        <Card style={{ padding: 18, marginBottom: 22, borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
          <SectionLabel style={{ marginBottom: 8 }}>That's today</SectionLabel>
          <Text style={styles.heroTitle}>Nothing else planned</Text>
          <Text style={styles.heroSub}>Check tomorrow's plan on the Days tab, or explore saved pins nearby.</Text>
        </Card>
      )}

      {upNext.length > 0 && (
        <>
          <SectionLabel style={{ marginBottom: 12 }}>Then today</SectionLabel>
          <View style={{ marginBottom: 26 }}>
            {upNext.map((e: ItineraryEvent) => (
              <Pressable
                key={e.id}
                onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
                style={({ pressed }) => [styles.rowItem, pressed && { backgroundColor: COLORS.hover }]}
              >
                <Text style={styles.rowTime}>{hourToClock(e.start)}</Text>
                <View style={[styles.rowRule, { backgroundColor: CATEGORY[e.cat].color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{e.title}</Text>
                  <Text style={styles.rowSub}>{e.sub}</Text>
                </View>
                {!!e.tag && <Tag label={e.tag} />}
              </Pressable>
            ))}
          </View>
        </>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionLabel>Saved nearby</SectionLabel>
        <Pressable onPress={() => navigation.getParent()?.navigate('MapTab' as never)}>
          <Text style={styles.seeAll}>See all {state.pins.length}</Text>
        </Pressable>
      </View>
      <View>
        {nearby.map(({ pin, meters }) => (
          <Pressable
            key={pin.id}
            onPress={() => navigation.navigate('PinDetail', { pinId: pin.id })}
            style={({ pressed }) => [styles.rowItem, pressed && { backgroundColor: COLORS.hover }]}
          >
            <CategoryDot cat={pin.cat} size={11} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{pin.name}</Text>
              <Text style={styles.rowSub}>{pin.sub}</Text>
            </View>
            <Text style={styles.rowDist}>{meters == null ? '—' : meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  h1: { fontFamily: FONT_SERIF, fontSize: 31, fontWeight: '600', color: COLORS.ink, marginTop: 4, letterSpacing: -0.3 },
  wLow: { fontSize: 14, color: COLORS.labelFaint, fontFamily: FONT_SERIF_REGULAR },
  wNow: { fontSize: 26, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  wCond: { fontSize: 11.5, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  pulseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.magenta },
  pulseLabel: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.magentaDeep, fontFamily: FONT_SERIF_REGULAR },
  heroTitle: { fontSize: 24, fontWeight: '600', fontFamily: FONT_SERIF, marginBottom: 6, color: COLORS.ink },
  heroSub: { fontSize: 14.5, color: COLORS.inkMuted, lineHeight: 20, marginBottom: 14, fontFamily: FONT_SERIF_REGULAR },
  progressTrack: { height: 6, backgroundColor: '#eae7e7', borderRadius: 3, overflow: 'hidden', marginBottom: 14 },
  progressFill: { height: '100%', backgroundColor: COLORS.magenta },
  rowItem: { flexDirection: 'row', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingVertical: 13 },
  rowTime: { fontSize: 14, fontWeight: '600', width: 52, fontFamily: FONT_SERIF },
  rowRule: { width: 3, alignSelf: 'stretch', borderRadius: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  rowSub: { fontSize: 13, color: COLORS.label, marginTop: 2, fontFamily: FONT_SERIF_REGULAR },
  rowDist: { fontSize: 13, color: COLORS.label, width: 52, textAlign: 'right', fontFamily: FONT_SERIF_REGULAR },
  seeAll: { fontSize: 13, color: COLORS.link, fontFamily: FONT_SERIF_REGULAR },
});
