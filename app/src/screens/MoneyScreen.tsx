import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../store/AppState';
import { useClock } from '../hooks/useClock';
import { DAYS, TRIP } from '../data/trip';
import { applyDecisions, BUDGET_ITEMS, tripTotals } from '../data/budget';
import { fetchFxRate } from '../services/currency';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { CategoryDot, DoubleRule, PrimaryButton, SecondaryButton, SectionLabel } from '../components/ui';
import { Icon } from '../components/Icon';
import { isoDateOnly } from '../utils/time';
import { usd, jpy } from '../utils/format';

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendItem}>{label}</Text>
    </View>
  );
}

export default function MoneyScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useAppState();
  const now = useClock();
  const day = DAYS[state.dayIdx];
  const isToday = day.date === isoDateOnly(now);

  // The Converter used to be the only screen that fetched a rate, so this one
  // sat on the ¥150 planning rate until you happened to open it.
  useEffect(() => {
    fetchFxRate().then((r) => dispatch({ type: 'SET_FX', jpyPerUsd: r.jpyPerUsd, live: r.live }));
  }, []);

  const totals = useMemo(() => tripTotals(state.decisions), [state.decisions]);

  const todayItems = useMemo(
    () => applyDecisions(BUDGET_ITEMS.filter((i) => i.day === day.day), state.decisions),
    [day.day, state.decisions]
  );
  const todayUsd = todayItems.reduce((s, i) => s + i.usd, 0);
  // Converted at the rate shown below rather than summed from the sheet's own
  // fixed ¥ column — otherwise the ¥ figure silently disagreed with the
  // "at ¥N to the dollar" line right under it, and ignored Book it / Skip.
  const todayJpy = todayUsd * state.fxRate;
  const jpyTotal = totals.total * state.fxRate;

  const decisionItems = useMemo(
    () => BUDGET_ITEMS.filter((i) => i.tag === 'Undecided' && !state.decisions[i.id]),
    [state.decisions]
  );

  const perTraveler = totals.total / TRIP.travelers.length;
  const pct = (n: number) => (totals.total > 0 ? (n / totals.total) * 100 : 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 40 }}>
      <View style={styles.headRow}>
        <Text style={styles.h2}>Money</Text>
        <Pressable onPress={() => navigation.navigate('Converter')} style={styles.convertBtn}>
          <Icon name="CurrencyJpy" size={16} color={COLORS.accent} />
          <Text style={styles.convertText}>Convert</Text>
        </Pressable>
      </View>
      <DoubleRule style={{ marginTop: 14, marginBottom: 20 }} />

      <SectionLabel>Trip total, {TRIP.travelers.length} travellers</SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6, marginBottom: 4 }}>
        <Text style={styles.bigTotal}>{usd(totals.total, 0)}</Text>
        <Text style={styles.bigTotalJpy}>{jpy(jpyTotal)}</Text>
      </View>
      <Text style={styles.perTravelerText}>
        {usd(perTraveler, 0)} each · at ¥{state.fxRate.toFixed(0)} to the dollar{state.fxLive ? '' : ' (planning rate)'}
      </Text>

      <View style={styles.barRow}>
        <View style={[styles.bar, { width: `${pct(totals.prepaid)}%`, backgroundColor: COLORS.accent }]} />
        <View style={[styles.bar, { width: `${pct(totals.payThere)}%`, backgroundColor: COLORS.prepaidTint }]} />
        <View style={[styles.bar, { width: `${pct(totals.undecided)}%`, backgroundColor: COLORS.undecidedTint }]} />
      </View>
      <View style={styles.legendRow}>
        <LegendItem color={COLORS.accent} label={`Prepaid ${usd(totals.prepaid, 0)}`} />
        <LegendItem color={COLORS.prepaidTint} label={`Pay there ${usd(totals.payThere, 0)}`} />
        <LegendItem color={COLORS.undecidedTint} label={`Undecided ${usd(totals.undecided, 0)}`} />
      </View>

      <SectionLabel style={{ marginBottom: 4 }}>
        {isToday ? 'Today' : `Day ${day.day}`} · {day.dow} {day.date.slice(5).replace('-', '/')}
      </SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9, marginBottom: 10 }}>
        <Text style={styles.todayTotal}>{usd(todayUsd)}</Text>
        <Text style={styles.todayTotalJpy}>{jpy(todayJpy)}</Text>
      </View>
      <View style={{ marginBottom: 26 }}>
        {todayItems.map((c) => (
          <View key={c.id} style={styles.costRow}>
            <CategoryDot cat={c.cat} size={10} />
            <View style={{ flex: 1 }}>
              <Text style={styles.costItem}>{c.item}</Text>
              <Text
                style={[
                  styles.costTagText,
                  { color: c.tag === 'Prepaid' ? COLORS.accentTintText : c.tag === 'Undecided' ? COLORS.magentaDeep : COLORS.payThereText },
                ]}
              >
                {c.tag.toUpperCase()}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.costUsd}>{usd(c.usd)}</Text>
              <Text style={styles.costJpy}>{jpy(c.usd * state.fxRate)}</Text>
            </View>
          </View>
        ))}
        {todayItems.length === 0 && <Text style={styles.emptyText}>Nothing costed for this day.</Text>}
        {todayItems.length > 0 && (
          <Text style={styles.dayHint}>Costs follow the day picked on the Days tab.</Text>
        )}
      </View>

      {decisionItems.length > 0 && (
        <>
          <SectionLabel style={{ marginBottom: 12 }}>Not booked yet · {decisionItems.length} decision{decisionItems.length > 1 ? 's' : ''}</SectionLabel>
          <View style={{ gap: 12 }}>
            {decisionItems.map((d) => {
              const dayMeta = DAYS.find((x) => x.day === d.day);
              return (
                <View key={d.id} style={styles.decisionCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <Text style={styles.decisionName}>{d.item}</Text>
                    <Text style={styles.decisionUsd}>{usd(d.usd, 0)}</Text>
                  </View>
                  <Text style={styles.decisionSub}>
                    Day {d.day} · {dayMeta?.dow} {dayMeta?.date.slice(5).replace('-', '/')} · {usd(d.perTraveler, 0)} each
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <PrimaryButton label="Book it" onPress={() => dispatch({ type: 'DECIDE_ITEM', id: d.id, decision: 'booked' })} />
                    <SecondaryButton label="Skip" onPress={() => dispatch({ type: 'DECIDE_ITEM', id: d.id, decision: 'skipped' })} />
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  h2: { fontSize: 31, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  convertBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 2, minHeight: 36 },
  convertText: { fontSize: 13.5, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  bigTotal: { fontSize: 42, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink, letterSpacing: -0.6 },
  bigTotalJpy: { fontSize: 17, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  perTravelerText: { fontSize: 13.5, color: COLORS.inkMuted, marginBottom: 14, fontFamily: FONT_SERIF_REGULAR },
  barRow: { flexDirection: 'row', height: 10, marginBottom: 8, borderRadius: 1, overflow: 'hidden' },
  bar: { height: '100%' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 26 },
  legendItem: { fontSize: 12.5, color: COLORS.inkMuted, fontFamily: FONT_SERIF_REGULAR },
  legendSwatch: { width: 8, height: 8, marginRight: 5 },
  todayTotal: { fontSize: 24, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  todayTotalJpy: { fontSize: 14, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  costRow: { flexDirection: 'row', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingVertical: 12 },
  costItem: { fontSize: 15.5, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  costTagText: { fontSize: 10, letterSpacing: 1, marginTop: 4, fontFamily: FONT_SERIF_REGULAR },
  costUsd: { fontSize: 15.5, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  costJpy: { fontSize: 12, color: COLORS.labelFaint, fontFamily: FONT_SERIF_REGULAR },
  dayHint: { fontSize: 12, color: COLORS.labelFaint, marginTop: 10, fontFamily: FONT_SERIF_REGULAR },
  emptyText: { fontSize: 14, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR, paddingVertical: 8 },
  decisionCard: { backgroundColor: '#fff', borderLeftWidth: 3, borderLeftColor: COLORS.undecidedBorder, padding: 15 },
  decisionName: { fontSize: 16.5, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink, flex: 1 },
  decisionUsd: { fontSize: 16.5, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  decisionSub: { fontSize: 13, color: COLORS.label, marginTop: 3, fontFamily: FONT_SERIF_REGULAR },
});
