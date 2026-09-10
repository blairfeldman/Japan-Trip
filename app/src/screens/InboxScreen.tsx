import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useAppState, inboxToEvent } from '../store/AppState';
import { TRIP, DAYS } from '../data/trip';
import { COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { DoubleRule, PrimaryButton, SecondaryButton, SectionLabel } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { api } from '../services/api';

export default function InboxScreen() {
  const navigation = useNavigation<any>();
  const { state, dispatch } = useAppState();
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDay, setManualDay] = useState(DAYS[state.dayIdx].day);

  const waiting = state.inbox.filter((b) => !b.addedToDay);

  async function copyEmail() {
    await Clipboard.setStringAsync(TRIP.inboxEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function addToDay(id: string, day: number) {
    const booking = state.inbox.find((b) => b.id === id);
    if (!booking) return;
    const event = inboxToEvent(booking, DAYS.find((d) => d.day === day)!.date);
    dispatch({ type: 'ADD_INBOX_TO_DAY', id, day, event });
    api.addBookingToDay(id, day);
    dispatch({ type: 'SET_DAY', idx: day - 1 });
    navigation.getParent()?.navigate('DaysTab');
  }

  function submitManual() {
    if (!manualTitle.trim()) return;
    dispatch({
      type: 'ADD_MANUAL_EVENT',
      event: {
        id: `manual-${Date.now()}`,
        day: manualDay,
        start: 12,
        end: 13,
        cat: 'sightseeing',
        title: manualTitle.trim(),
        sub: 'Added by hand',
        tag: 'Pay there',
      },
    });
    setManualTitle('');
    setShowForm(false);
    dispatch({ type: 'SET_DAY', idx: manualDay - 1 });
    navigation.getParent()?.navigate('DaysTab');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.h2}>Inbox</Text>
      <DoubleRule style={{ marginTop: 14, marginBottom: 18 }} />

      <View style={styles.emailCard}>
        <Icon name="EnvelopeSimple" size={20} color={COLORS.link} />
        <View style={{ flex: 1 }}>
          <Text style={styles.emailLabel}>Forward bookings to</Text>
          <Text style={styles.email}>{TRIP.inboxEmail}</Text>
        </View>
        <Pressable onPress={copyEmail} style={styles.copyBtn}>
          <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>

      <SectionLabel style={{ marginBottom: 12 }}>Waiting on you · {waiting.length}</SectionLabel>
      <View style={{ gap: 12, marginBottom: 24 }}>
        {waiting.map((i) => (
          <View key={i.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Icon name={i.icon as IconName} size={18} color={COLORS.label} />
              <Text style={styles.kind}>{i.kind}</Text>
              <View style={[styles.confBadge, { backgroundColor: i.confidence === 'Confident' ? COLORS.accentTintStrong : COLORS.payThereTint }]}>
                <Text style={[styles.confText, { color: i.confidence === 'Confident' ? COLORS.accentTintText : COLORS.payThereText }]}>{i.confidence}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{i.title}</Text>
            <Text style={styles.cardSub}>{i.sub}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <PrimaryButton label={`Add to Day ${i.day}`} onPress={() => addToDay(i.id, i.day)} />
              <SecondaryButton label="Edit" />
            </View>
          </View>
        ))}
        {waiting.length === 0 && <Text style={styles.emptyText}>Nothing waiting — forwarded bookings will show up here.</Text>}
      </View>

      {showForm ? (
        <View style={styles.card}>
          <SectionLabel style={{ marginBottom: 10 }}>Add a booking by hand</SectionLabel>
          <TextInput
            value={manualTitle}
            onChangeText={setManualTitle}
            placeholder="What is it?"
            placeholderTextColor={COLORS.labelFaint}
            style={styles.manualInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {DAYS.map((d) => (
              <Pressable key={d.day} onPress={() => setManualDay(d.day)} style={[styles.dayPick, manualDay === d.day && styles.dayPickActive]}>
                <Text style={[styles.dayPickText, manualDay === d.day && { color: '#fff' }]}>Day {d.day}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PrimaryButton label="Add" onPress={submitManual} />
            <SecondaryButton label="Cancel" onPress={() => setShowForm(false)} />
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setShowForm(true)} style={styles.addByHand}>
          <Icon name="Plus" size={18} color={COLORS.ink} />
          <Text style={styles.addByHandText}>Add a booking by hand</Text>
        </Pressable>
      )}
      <Text style={styles.footnote}>
        Tabelog doesn't publish an API, so restaurant reservations come in by forwarding the confirmation mail — or you add them here with the paid status yourself.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  h2: { fontSize: 31, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  emailCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.accentTint, padding: 14, marginBottom: 24 },
  emailLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  email: { fontSize: 16, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.accentTintText },
  copyBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 2, minHeight: 38, justifyContent: 'center' },
  copyText: { color: '#fff', fontSize: 13.5, fontFamily: FONT_SERIF_REGULAR },
  card: { backgroundColor: '#fff', padding: 15, shadowColor: '#2d2b2b', shadowOpacity: 0.14, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  kind: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  confBadge: { marginLeft: 'auto', paddingHorizontal: 7, paddingVertical: 3 },
  confText: { fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', fontFamily: FONT_SERIF_REGULAR },
  cardTitle: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  cardSub: { fontSize: 13.5, color: COLORS.label, marginTop: 3, lineHeight: 19, fontFamily: FONT_SERIF_REGULAR },
  emptyText: { fontSize: 14, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  addByHand: { minHeight: 48, borderWidth: 1, borderColor: COLORS.labelFaint, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addByHandText: { fontSize: 15, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  manualInput: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 8, fontSize: 16, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR, marginBottom: 14 },
  dayPick: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, marginRight: 6 },
  dayPickActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dayPickText: { fontSize: 13, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  footnote: { fontSize: 13, color: COLORS.label, lineHeight: 19, marginTop: 12, fontFamily: FONT_SERIF_REGULAR },
});
