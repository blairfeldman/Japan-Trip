import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DaysNav, DaysStackParamList } from '../navigation/types';
import * as Clipboard from 'expo-clipboard';
import { useAppState, syncedFrom } from '../store/AppState';
import { exportAndShare, pickBackup } from '../services/backupFile';
import { mergeSynced, isEmptySummary, MergeSummary } from '../services/backup';
import { useSync } from '../hooks/useSync';
import { TRIP, DAYS } from '../data/trip';
import { COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { DoubleRule, PrimaryButton, ScreenTitle, SecondaryButton, SectionLabel } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { Person } from '../types';
import { newId } from '../utils/id';
import { parseBookingText, bookingToEvent, inboxToEvent, parseBookingWithModel, ParsedBooking } from '../services/bookingParse';
import { syncConfigured } from '../services/api';

/** Plain-English summary of what an import actually changed. */
function describeMerge(s: MergeSummary): string {
  if (isEmptySummary(s)) return 'Nothing new in that file — everything in it was already here.';
  const parts: string[] = [];
  if (s.newPins) parts.push(`${s.newPins} new pin${s.newPins === 1 ? '' : 's'}`);
  if (s.mergedPins) parts.push(`${s.mergedPins} duplicate${s.mergedPins === 1 ? '' : 's'} merged`);
  if (s.newClips) parts.push(`${s.newClips} new clip${s.newClips === 1 ? '' : 's'}`);
  if (s.newEvents) parts.push(`${s.newEvents} plan item${s.newEvents === 1 ? '' : 's'}`);
  if (s.newDecisions) parts.push(`${s.newDecisions} budget decision${s.newDecisions === 1 ? '' : 's'}`);
  // Without this, a file whose only news is edited day-plan entries counted as
  // "not empty" and then described itself as "Merged: ."
  if (s.newEdits) parts.push(`${s.newEdits} changed plan ${s.newEdits === 1 ? 'entry' : 'entries'}`);
  return `Merged: ${parts.join(', ')}.`;
}

export default function InboxScreen() {
  const navigation = useNavigation<DaysNav>();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useAppState();
  const [copied, setCopied] = useState(false);
  const route = useRoute<RouteProp<DaysStackParamList, 'Inbox'>>();
  // Text shared in from a mail app lands here pre-filled.
  const [showForm, setShowForm] = useState(!!route.params?.sharedText);
  const [manualText, setManualText] = useState<string>(route.params?.sharedText ?? '');
  const [manualDay, setManualDay] = useState(DAYS[state.dayIdx].day);
  // Offline parse first, always: it's instant and keeps the preview live as
  // you type. The model only runs when you ask, since it's a network round
  // trip and most confirmations don't need it.
  const offlineBooking: ParsedBooking | null = useMemo(() => parseBookingText(manualText), [manualText]);
  const [smartBooking, setSmartBooking] = useState<ParsedBooking | null>(null);
  const [reading, setReading] = useState(false);
  const parsedBooking = smartBooking ?? offlineBooking;

  async function readWithModel() {
    setReading(true);
    try {
      const better = await parseBookingWithModel(manualText);
      if (better) {
        setSmartBooking(better);
        if (better.day) {
          setDayTouched(true);
          setManualDay(better.day);
        }
      }
    } finally {
      setReading(false);
    }
  }

  // Follow the date found in the confirmation, until you override it.
  const [dayTouched, setDayTouched] = useState(false);
  useEffect(() => {
    if (!dayTouched && parsedBooking?.day) setManualDay(parsedBooking.day);
  }, [parsedBooking?.day, dayTouched]);
  // Which booking has its day-picker open, if any.
  const [reassigning, setReassigning] = useState<string | null>(null);
  const sync = useSync();
  const [busy, setBusy] = useState<null | 'export' | 'import'>(null);
  const [backupNote, setBackupNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function onExport() {
    setBusy('export');
    setBackupNote(null);
    try {
      await exportAndShare(syncedFrom(state));
    } catch (e: any) {
      setBackupNote({ ok: false, text: e?.message ?? "Couldn't write the backup file." });
    } finally {
      setBusy(null);
    }
  }

  async function onImport() {
    setBusy('import');
    setBackupNote(null);
    try {
      const backup = await pickBackup();
      if (!backup) return; // picker dismissed
      const { state: merged, summary } = mergeSynced(syncedFrom(state), backup.state);
      dispatch({ type: 'APPLY_MERGED', merged });
      setBackupNote({ ok: true, text: describeMerge(summary) });
    } catch (e: any) {
      setBackupNote({ ok: false, text: e?.message ?? "Couldn't read that file." });
    } finally {
      setBusy(null);
    }
  }

  const waiting = state.inbox.filter((b) => !b.addedToDay);


  async function copyEmail() {
    await Clipboard.setStringAsync(TRIP.inboxEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function addToDay(id: string, day: number) {
    const booking = state.inbox.find((b) => b.id === id);
    if (!booking) return;
    const event = inboxToEvent(booking, day);
    dispatch({ type: 'ADD_INBOX_TO_DAY', id, day, event });
    dispatch({ type: 'SET_DAY', idx: day - 1 });
    setReassigning(null);
    navigation.navigate('Days');
  }

  function submitManual() {
    if (!parsedBooking) return;
    dispatch({ type: 'ADD_MANUAL_EVENT', event: bookingToEvent(parsedBooking, manualDay, newId('booking')) });
    setManualText('');
    setDayTouched(false);
    setShowForm(false);
    dispatch({ type: 'SET_DAY', idx: manualDay - 1 });
    navigation.navigate('Days');
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Icon name="ArrowLeft" size={20} color={COLORS.ink} />
        </Pressable>
        <ScreenTitle>Inbox</ScreenTitle>
      </View>
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
      {!syncConfigured && (
        <Text style={styles.setupNote}>
          {TRIP.inboxEmail} is a placeholder — nothing receives mail there. Paste or share the confirmation
          instead; it does the same job on the phone.
        </Text>
      )}

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
              <SecondaryButton
                label={reassigning === i.id ? 'Cancel' : 'Other day'}
                onPress={() => setReassigning(reassigning === i.id ? null : i.id)}
              />
            </View>
            {reassigning === i.id && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {DAYS.map((d) => (
                  <Pressable key={d.day} onPress={() => addToDay(i.id, d.day)} style={styles.dayPick}>
                    <Text style={styles.dayPickText}>Day {d.day}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        ))}
        {waiting.length === 0 && <Text style={styles.emptyText}>Nothing waiting — forwarded bookings will show up here.</Text>}
      </View>

      {showForm ? (
        <View style={styles.card}>
          <SectionLabel style={{ marginBottom: 6 }}>Paste a confirmation</SectionLabel>
          <Text style={styles.pasteHint}>
            Paste the whole confirmation email — or share it straight from your mail app. The date, time and
            confirmation number are read out of it here on the phone.
          </Text>
          <TextInput
            value={manualText}
            onChangeText={(t) => {
              setManualText(t);
              setSmartBooking(null);
            }}
            placeholder={'Subject: Your JAL booking\nJAL 8 KIX to SFO\nTue Oct 6, 17:45\nConfirmation: WQ8T2M'}
            placeholderTextColor={COLORS.labelFaint}
            multiline
            style={styles.pasteInput}
          />

          {parsedBooking && sync.configured && !smartBooking && (
            <Pressable onPress={readWithModel} disabled={reading} style={styles.readBetter}>
              <Icon name="MagnifyingGlass" size={15} color={COLORS.link} />
              <Text style={styles.readBetterText}>
                {reading ? 'Reading it…' : "Read it properly — better with Japanese, or an odd layout"}
              </Text>
            </Pressable>
          )}

          {parsedBooking && (
            <View style={styles.parsedBooking}>
              <View style={styles.cardHead}>
                <Icon name={parsedBooking.kind === 'Flight' ? 'AirplaneTakeoff' : parsedBooking.kind === 'Train' ? 'TrainRegional' : parsedBooking.kind === 'Restaurant' ? 'ForkKnife' : parsedBooking.kind === 'Hotel' ? 'Bathtub' : 'CalendarCheck'} size={17} color={COLORS.label} />
                <Text style={styles.kind}>{parsedBooking.kind}</Text>
                <View style={[styles.confBadge, { backgroundColor: parsedBooking.confidence === 'Confident' ? COLORS.accentTintStrong : COLORS.payThereTint }]}>
                  <Text style={[styles.confText, { color: parsedBooking.confidence === 'Confident' ? COLORS.accentTintText : COLORS.payThereText }]}>{parsedBooking.confidence}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{parsedBooking.title}</Text>
              <Text style={styles.cardSub}>{parsedBooking.sub}</Text>
              {!!smartBooking && <Text style={styles.smartNote}>Read by the model.</Text>}
              {!parsedBooking.day && (
                <Text style={styles.pasteWarn}>No trip date found in that text — pick the day yourself below.</Text>
              )}
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 14 }}>
            {DAYS.map((d) => (
              <Pressable
                key={d.day}
                onPress={() => {
                  setDayTouched(true);
                  setManualDay(d.day);
                }}
                style={[styles.dayPick, manualDay === d.day && styles.dayPickActive]}
              >
                <Text style={[styles.dayPickText, manualDay === d.day && { color: '#fff' }]}>Day {d.day}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PrimaryButton label={`Add to Day ${manualDay}`} disabled={!parsedBooking} onPress={submitManual} />
            <SecondaryButton
              label="Cancel"
              onPress={() => {
                setManualText('');
                setDayTouched(false);
                setShowForm(false);
              }}
            />
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setShowForm(true)} style={styles.addByHand}>
          <Icon name="Plus" size={18} color={COLORS.ink} />
          <Text style={styles.addByHandText}>Paste or add a booking</Text>
        </Pressable>
      )}
      <Text style={styles.footnote}>
        Forwarding to {TRIP.inboxEmail} isn't wired up — receiving mail needs a domain and an inbound-email
        provider. Pasting or sharing the confirmation does the same job on the phone — and Tabelog has no public
        API either way, so its reservations always arrive as text.
      </Text>

      <DoubleRule style={{ marginTop: 26, marginBottom: 18 }} />

      <SectionLabel style={{ marginBottom: 8 }}>This phone</SectionLabel>
      <Text style={styles.backupBlurb}>
        Both of you install the same app, so it can't tell on its own. This is what new pins are filed under.
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 22 }}>
        {TRIP.travelers.map((t) => (
          <Pressable
            key={t.initial}
            onPress={() => dispatch({ type: 'SET_ME', me: t.initial as Person })}
            style={[styles.meChip, state.me === t.initial && { borderColor: COLORS.ink, backgroundColor: COLORS.hover }]}
          >
            <View style={[styles.meDot, { backgroundColor: t.color }]}>
              <Text style={styles.meDotText}>{t.initial}</Text>
            </View>
            <Text style={[styles.meName, state.me === t.initial && { fontWeight: '600' }]}>{t.name}</Text>
          </Pressable>
        ))}
      </View>

      {sync.configured && (
        <>
          <SectionLabel style={{ marginBottom: 8 }}>Sync</SectionLabel>
          <Text style={styles.backupBlurb}>
            Pins, day plans and decisions sync with {TRIP.travelers[1]?.name ?? 'the other phone'} automatically —
            when the app opens and a few seconds after you change something.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 22 }}>
            <SecondaryButton label={sync.busy ? 'Syncing…' : 'Sync now'} onPress={() => sync.sync()} />
            {!!sync.status && (
              <Text style={[styles.syncStatus, { color: sync.last?.ok ? COLORS.label : COLORS.magentaDeep }]}>
                {sync.status}
              </Text>
            )}
          </View>
        </>
      )}

      <SectionLabel style={{ marginBottom: 10 }}>Backup & merge</SectionLabel>
      <Text style={styles.backupBlurb}>
        {sync.configured
          ? 'A file you can keep yourself, independent of the backend — worth one before reinstalling. Importing merges, it never overwrites. Also how you share with'
          : 'Saved pins and day plans live on this phone only. Back them up before reinstalling, and swap files with'}
        {' '}{TRIP.travelers[1]?.name ?? 'your trip partner'}{sync.configured ? '.' : " to combine what you've both saved — importing merges, it never overwrites."}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <PrimaryButton
          label={busy === 'export' ? 'Preparing…' : 'Back up / send'}
          disabled={busy !== null}
          icon={<Icon name="DownloadSimple" size={17} color="#fff" />}
          onPress={onExport}
        />
        <SecondaryButton label={busy === 'import' ? 'Reading…' : 'Import'} onPress={onImport} />
      </View>
      {backupNote && (
        <Text style={[styles.backupNote, { color: backupNote.ok ? COLORS.accentTintText : COLORS.magentaDeep }]}>
          {backupNote.text}
        </Text>
      )}
      <Text style={styles.backupCounts}>
        {state.pins.length} pins · {state.extraEvents.length} added plan {state.extraEvents.length === 1 ? 'item' : 'items'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 38, height: 38, marginLeft: -9, alignItems: 'center', justifyContent: 'center' },
  meChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 9, minHeight: 40 },
  meDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  meDotText: { color: '#fff', fontSize: 11, fontWeight: '600', fontFamily: FONT_SERIF },
  meName: { fontSize: 14, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  setupNote: { fontSize: 12.5, color: COLORS.label, lineHeight: 18, marginTop: -14, marginBottom: 24, fontFamily: FONT_SERIF_REGULAR },
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
  pasteHint: { fontSize: 12.5, color: COLORS.label, lineHeight: 18, marginBottom: 10, fontFamily: FONT_SERIF_REGULAR },
  pasteInput: { borderWidth: 1, borderColor: COLORS.border, padding: 11, minHeight: 110, fontSize: 14.5, lineHeight: 20, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR, textAlignVertical: 'top' },
  parsedBooking: { borderLeftWidth: 3, borderLeftColor: COLORS.accent, backgroundColor: COLORS.accentTint, padding: 12, marginTop: 14 },
  readBetter: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10, marginTop: 4 },
  readBetterText: { flex: 1, fontSize: 13, color: COLORS.link, fontFamily: FONT_SERIF_REGULAR },
  smartNote: { fontSize: 12, color: COLORS.accentTintText, marginTop: 6, fontFamily: FONT_SERIF_REGULAR },
  pasteWarn: { fontSize: 12.5, color: COLORS.magentaDeep, marginTop: 8, lineHeight: 17, fontFamily: FONT_SERIF_REGULAR },
  dayPick: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, marginRight: 6 },
  dayPickActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dayPickText: { fontSize: 13, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  backupBlurb: { fontSize: 13.5, color: COLORS.inkMuted, lineHeight: 19, fontFamily: FONT_SERIF_REGULAR },
  syncStatus: { flex: 1, fontSize: 12.5, lineHeight: 17, fontFamily: FONT_SERIF_REGULAR },
  backupNote: { fontSize: 13, lineHeight: 18, marginTop: 12, fontFamily: FONT_SERIF_REGULAR },
  backupCounts: { fontSize: 12, color: COLORS.labelFaint, marginTop: 12, fontFamily: FONT_SERIF_REGULAR },
  footnote: { fontSize: 13, color: COLORS.label, lineHeight: 19, marginTop: 12, fontFamily: FONT_SERIF_REGULAR },
});
