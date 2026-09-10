import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppState } from '../store/AppState';
import { useClock } from '../hooks/useClock';
import { DAYS } from '../data/trip';
import { eventsForDay } from '../data/itinerary';
import { dayTotalUsd } from '../data/budget';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { SectionLabel, Tag } from '../components/ui';
import { dateToDecimalHour, hourToLabel, isoDateOnly } from '../utils/time';
import { usd } from '../utils/format';

const HR0 = 7;
const HR1 = 23;
const PX = 60;

export default function DaysScreen() {
  const navigation = useNavigation<any>();
  const { state, dispatch } = useAppState();
  const now = useClock();
  const day = DAYS[state.dayIdx];

  const events = useMemo(
    () =>
      [...eventsForDay(day.day), ...state.extraEvents.filter((e) => e.day === day.day)].sort(
        (a, b) => a.start - b.start
      ),
    [day.day, state.extraEvents]
  );

  const hours = [];
  for (let h = HR0; h <= HR1; h++) hours.push(h);

  const isToday = isoDateOnly(now) === day.date;
  const nowTop = (dateToDecimalHour(now) - HR0) * PX;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <SectionLabel>{day.city}</SectionLabel>
            <Text style={styles.heading}>{day.heading}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cost}>{usd(dayTotalUsd(day.day), 0)}</Text>
            <Text style={styles.costSub}>both of you</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {DAYS.map((d, i) => {
            const active = i === state.dayIdx;
            return (
              <Pressable key={d.day} onPress={() => dispatch({ type: 'SET_DAY', idx: i })} style={[styles.dayChip, active && styles.dayChipActive]}>
                <Text style={[styles.dow, active && styles.dowActive]}>{d.dow}</Text>
                <Text style={[styles.dom, active && styles.domActive]}>{d.dom}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 10, paddingBottom: 40 }}>
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
                {!tight && (
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

          {isToday && (
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
  header: { paddingTop: 12, borderBottomWidth: 1, borderBottomColor: COLORS.hairline },
  headerTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  heading: { fontSize: 26, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink, marginTop: 3 },
  cost: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  costSub: { fontSize: 11.5, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  strip: { paddingHorizontal: 20, paddingBottom: 10, gap: 4 },
  dayChip: { width: 46, minHeight: 52, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  dayChipActive: { backgroundColor: COLORS.ink },
  dow: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.inkMuted, opacity: 0.7, fontFamily: FONT_SERIF_REGULAR },
  dowActive: { color: COLORS.bg },
  dom: { fontSize: 16, fontWeight: '600', color: COLORS.inkMuted, fontFamily: FONT_SERIF, marginTop: 1 },
  domActive: { color: COLORS.bg },
  hourGridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#e6e3e3' },
  hourLabel: { position: 'absolute', left: -56, width: 46, textAlign: 'right', fontSize: 11.5, color: COLORS.labelFaint, fontFamily: FONT_SERIF_REGULAR },
  block: {
    position: 'absolute', left: 0, right: 0, borderLeftWidth: 3, borderRadius: 2, paddingHorizontal: 11, paddingVertical: 6,
    justifyContent: 'center', shadowColor: '#2d2b2b', shadowOpacity: 0.14, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  blockTitle: { fontWeight: '600', fontFamily: FONT_SERIF },
  blockSub: { fontSize: 12.5, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: COLORS.magenta },
  nowDot: { position: 'absolute', left: -8, top: -5, width: 11, height: 11, borderRadius: 5.5, backgroundColor: COLORS.magenta },
  nowLabel: { position: 'absolute', left: -56, top: -9, width: 44, textAlign: 'right', fontSize: 11, fontWeight: '600', color: COLORS.magenta, fontFamily: FONT_SERIF },
});
