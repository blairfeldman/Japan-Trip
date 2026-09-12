import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../store/AppState';
import { useClock } from '../hooks/useClock';
import { DAYS } from '../data/trip';
import { eventsForDay } from '../data/itinerary';
import { dayTotalUsd } from '../data/budget';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { SectionLabel, Tag } from '../components/ui';
import { Icon } from '../components/Icon';
import { dateToDecimalHour, hourToLabel, isoDateOnly } from '../utils/time';
import { usd } from '../utils/format';

const HR0 = 7;
const HR1 = 23;
const PX = 60;
const CHIP_W = 46;
const CHIP_GAP = 4;

export default function DaysScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useAppState();
  const now = useClock();
  const day = DAYS[state.dayIdx];
  const stripRef = useRef<ScrollView | null>(null);
  const gridRef = useRef<ScrollView | null>(null);

  const events = useMemo(
    () =>
      [...eventsForDay(day.day), ...state.extraEvents.filter((e) => e.day === day.day)].sort(
        (a, b) => a.start - b.start
      ),
    [day.day, state.extraEvents]
  );

  const hours = [];
  for (let h = HR0; h <= HR1; h++) hours.push(h);

  const todayIso = isoDateOnly(now);
  const isToday = todayIso === day.date;
  const nowTop = (dateToDecimalHour(now) - HR0) * PX;
  const waiting = state.inbox.filter((b) => !b.addedToDay).length;

  // Keep the selected chip on screen — with 12 days the strip is wider than
  // the phone, so day 9 was off the right edge with no hint it was selected.
  useEffect(() => {
    stripRef.current?.scrollTo({ x: Math.max(0, state.dayIdx * (CHIP_W + CHIP_GAP) - CHIP_W * 2), animated: true });
  }, [state.dayIdx]);

  // Open the grid near the first thing happening rather than at 7am dead space.
  useEffect(() => {
    const anchor = isToday ? dateToDecimalHour(now) : events[0]?.start ?? HR0;
    gridRef.current?.scrollTo({ y: Math.max(0, (anchor - HR0 - 1) * PX), animated: false });
  }, [day.day]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <SectionLabel>{day.city}</SectionLabel>
            <Text style={styles.heading}>{day.heading}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Inbox')}
            style={({ pressed }) => [styles.inboxBtn, pressed && { backgroundColor: COLORS.hover }]}
          >
            <Icon name="EnvelopeSimple" size={21} color={COLORS.inkSoft} />
            {waiting > 0 && (
              <View style={styles.inboxBadge}>
                <Text style={styles.inboxBadgeText}>{waiting}</Text>
              </View>
            )}
          </Pressable>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cost}>{usd(dayTotalUsd(day.day, state.decisions), 0)}</Text>
            <Text style={styles.costSub}>both of you</Text>
          </View>
        </View>
        <ScrollView ref={stripRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {DAYS.map((d, i) => {
            const active = i === state.dayIdx;
            const today = d.date === todayIso;
            return (
              <Pressable
                key={d.day}
                onPress={() => dispatch({ type: 'SET_DAY', idx: i })}
                style={[styles.dayChip, active && styles.dayChipActive]}
              >
                <Text style={[styles.dow, active && styles.dowActive]}>{d.dow}</Text>
                <Text style={[styles.dom, active && styles.domActive]}>{d.dom}</Text>
                {today && <View style={[styles.todayDot, active && { backgroundColor: COLORS.bg }]} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        ref={gridRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 40 }}
      >
        <View style={{ position: 'relative', height: (HR1 - HR0 + 1) * PX, marginLeft: 56, marginRight: 16 }}>
          {hours.map((h, i) => (
            <View key={h} style={[styles.hourGridLine, { top: i * PX }]} />
          ))}
          {hours.map((h, i) => (
            <Text key={h} style={[styles.hourLabel, { top: i * PX - 8 }]}>
              {h === 12 ? 'noon' : hourToLabel(h)}
            </Text>
          ))}

          {events.map((e) => {
            const top = (e.start - HR0) * PX;
            const height = Math.max(30, (e.end - e.start) * PX - 4);
            const isTransit = e.cat === 'transit';
            const tight = height < 54;
            return (
              <Pressable
                key={e.id}
                onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
                style={({ pressed }) => [
                  styles.block,
                  { top, height, borderLeftColor: CATEGORY[e.cat].color, backgroundColor: isTransit ? '#f1efef' : '#fff' },
                  pressed && { backgroundColor: COLORS.hover },
                ]}
              >
                <Text style={[styles.blockTitle, { fontSize: tight ? 13.5 : 15, color: isTransit ? COLORS.inkMuted : COLORS.ink }]} numberOfLines={1}>
                  {e.title}
                </Text>
                {!tight && !!e.sub && (
                  <Text style={styles.blockSub} numberOfLines={1}>
                    {e.sub}
                  </Text>
                )}
                {!!e.tag && !tight && (
                  <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                    <Tag label={e.tag} />
                  </View>
                )}
              </Pressable>
            );
          })}

          {events.length === 0 && (
            <Text style={styles.emptyDay}>Nothing scheduled on this day yet.</Text>
          )}

          {isToday && nowTop >= 0 && nowTop <= (HR1 - HR0 + 1) * PX && (
            <View style={[styles.nowLine, { top: nowTop }]}>
              <View style={styles.nowDot} />
              <Text style={styles.nowLabel}>{hourToLabel(dateToDecimalHour(now))}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { borderBottomWidth: 1, borderBottomColor: COLORS.hairline },
  headerTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
  heading: { fontSize: 26, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink, marginTop: 3 },
  inboxBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  inboxBadge: {
    position: 'absolute', top: 4, right: 3, minWidth: 17, height: 17, borderRadius: 8.5, paddingHorizontal: 4,
    backgroundColor: COLORS.magenta, alignItems: 'center', justifyContent: 'center',
  },
  inboxBadgeText: { color: '#fff', fontSize: 10.5, fontWeight: '600' },
  cost: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  costSub: { fontSize: 11.5, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  strip: { paddingHorizontal: 20, paddingBottom: 10, gap: CHIP_GAP },
  dayChip: { width: CHIP_W, minHeight: 52, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  dayChipActive: { backgroundColor: COLORS.ink },
  dow: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.inkMuted, opacity: 0.7, fontFamily: FONT_SERIF_REGULAR },
  dowActive: { color: COLORS.bg },
  dom: { fontSize: 16, fontWeight: '600', color: COLORS.inkMuted, fontFamily: FONT_SERIF, marginTop: 1 },
  domActive: { color: COLORS.bg },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.magenta, marginTop: 3 },
  hourGridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#e6e3e3' },
  hourLabel: { position: 'absolute', left: -56, width: 46, textAlign: 'right', fontSize: 11.5, color: COLORS.labelFaint, fontFamily: FONT_SERIF_REGULAR },
  block: {
    position: 'absolute', left: 0, right: 0, borderLeftWidth: 3, borderRadius: 2, paddingHorizontal: 11, paddingVertical: 6,
    justifyContent: 'center', shadowColor: '#2d2b2b', shadowOpacity: 0.14, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  blockTitle: { fontWeight: '600', fontFamily: FONT_SERIF },
  blockSub: { fontSize: 12.5, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  emptyDay: { position: 'absolute', top: 4 * PX, left: 0, right: 0, textAlign: 'center', fontSize: 14, color: COLORS.labelFaint, fontFamily: FONT_SERIF_REGULAR },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: COLORS.magenta },
  nowDot: { position: 'absolute', left: -8, top: -5, width: 11, height: 11, borderRadius: 5.5, backgroundColor: COLORS.magenta },
  nowLabel: { position: 'absolute', left: -56, top: -9, width: 44, textAlign: 'right', fontSize: 11, fontWeight: '600', color: COLORS.magenta, fontFamily: FONT_SERIF },
});
