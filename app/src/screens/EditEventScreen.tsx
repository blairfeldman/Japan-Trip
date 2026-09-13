import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../store/AppState';
import { DAYS } from '../data/trip';
import { Category, ItineraryEvent, Tag } from '../types';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { CategoryDot, PrimaryButton, SecondaryButton, SectionLabel } from '../components/ui';
import { Icon } from '../components/Icon';
import { formatClock, isSeedEvent, parseClock, resolveEvent, seedEvent } from '../services/schedule';
import { newId } from '../utils/id';

const TAGS: { value: Tag; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'Prepaid', label: 'Prepaid' },
  { value: 'Pay there', label: 'Pay there' },
  { value: 'Undecided', label: 'Undecided' },
];

/**
 * Edit one entry in a day. Entries that came from the itinerary aren't
 * overwritten — the change is stored as a patch against them, so "Reset" can
 * always put back what the spreadsheet said. See services/schedule.ts.
 */
export default function EditEventScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { state, dispatch } = useAppState();

  const eventId: string | undefined = route.params?.eventId;
  const newDay: number | undefined = route.params?.day;

  const existing = useMemo(
    () => (eventId ? resolveEvent(eventId, state.extraEvents, state.eventEdits) : undefined),
    [eventId, state.extraEvents, state.eventEdits]
  );

  const blank: ItineraryEvent = {
    id: '',
    day: newDay ?? DAYS[state.dayIdx].day,
    start: 12,
    end: 13,
    cat: 'sightseeing',
    title: '',
    sub: '',
    tag: '',
  };
  const base = existing ?? blank;
  const isNew = !eventId;

  const [title, setTitle] = useState(base.title);
  const [sub, setSub] = useState(base.sub);
  const [startText, setStartText] = useState(formatClock(base.start));
  const [endText, setEndText] = useState(formatClock(base.end));
  const [cat, setCat] = useState<Category>(base.cat);
  const [tag, setTag] = useState<Tag>(base.tag);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const start = parseClock(startText);
  const end = parseClock(endText);
  const timeError =
    start === undefined
      ? 'Start time should look like 09:30.'
      : end === undefined
      ? 'End time should look like 09:30.'
      : end < start
      ? 'The end is before the start.'
      : null;
  const canSave = title.trim().length > 0 && !timeError;

  // Only offered for entries that came from the itinerary, or ones that have
  // actually been changed — otherwise there's nothing to go back to.
  const original = eventId ? seedEvent(eventId) : undefined;
  const edit = eventId ? state.eventEdits[eventId] : undefined;
  const canReset = !!original && !!edit;

  function onSave() {
    if (!canSave || start === undefined || end === undefined) return;
    const patch = { title: title.trim(), sub: sub.trim(), start, end, cat, tag };

    if (isNew) {
      dispatch({
        type: 'ADD_MANUAL_EVENT',
        event: { ...blank, ...patch, id: newId('event') },
      });
    } else {
      dispatch({ type: 'EDIT_EVENT', id: eventId!, original: seedEvent(eventId!) ?? base, patch });
    }
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={6}>
            <Icon name="X" size={19} color={COLORS.ink} />
          </Pressable>
          <Text style={styles.title}>{isNew ? 'New entry' : 'Edit entry'}</Text>
          <Pressable onPress={onSave} disabled={!canSave} style={[styles.saveBtn, !canSave && { opacity: 0.4 }]}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>

        {!isNew && isSeedEvent(eventId!) && (
          <Text style={styles.seedNote}>
            From the itinerary. Your change is kept separately, so you can put the original back at any time.
          </Text>
        )}

        <Text style={styles.label}>What</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Dinner at…"
          placeholderTextColor={COLORS.labelFaint}
          style={styles.titleInput}
        />

        <Text style={styles.label}>Note</Text>
        <TextInput
          value={sub}
          onChangeText={setSub}
          placeholder="Anything worth remembering"
          placeholderTextColor={COLORS.labelFaint}
          multiline
          style={styles.noteInput}
        />

        <Text style={styles.label}>Time</Text>
        <View style={styles.timeRow}>
          <TextInput value={startText} onChangeText={setStartText} placeholder="09:30" placeholderTextColor={COLORS.labelFaint} style={styles.timeInput} />
          <Text style={styles.timeDash}>→</Text>
          <TextInput value={endText} onChangeText={setEndText} placeholder="11:00" placeholderTextColor={COLORS.labelFaint} style={styles.timeInput} />
        </View>
        {timeError ? (
          <Text style={styles.timeError}>{timeError}</Text>
        ) : (
          <Text style={styles.timeHint}>24-hour clock. The day grid runs 7am to 11pm.</Text>
        )}

        <Text style={[styles.label, { marginTop: 22 }]}>Category</Text>
        <View style={styles.chipsRow}>
          {(Object.keys(CATEGORY) as Category[]).map((k) => (
            <Pressable key={k} onPress={() => setCat(k)} style={[styles.chip, cat === k && styles.chipActive]}>
              <CategoryDot cat={k} size={8} />
              <Text style={[styles.chipText, cat === k && { fontWeight: '600' }]}>{CATEGORY[k].label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Cost</Text>
        <View style={styles.chipsRow}>
          {TAGS.map((t) => (
            <Pressable key={t.label} onPress={() => setTag(t.value)} style={[styles.chip, tag === t.value && styles.chipActive]}>
              <Text style={[styles.chipText, tag === t.value && { fontWeight: '600' }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {!isNew && (
          <View style={styles.dangerZone}>
            {canReset && (
              <SecondaryButton
                label="Put the original back"
                style={{ marginBottom: 10 }}
                onPress={() => {
                  dispatch({ type: 'RESTORE_EVENT', id: eventId! });
                  navigation.goBack();
                }}
              />
            )}
            {confirmDelete ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PrimaryButton
                  label="Yes, remove it"
                  style={{ backgroundColor: COLORS.magentaDeep }}
                  onPress={() => {
                    dispatch({ type: 'DELETE_EVENT', id: eventId! });
                    navigation.goBack();
                  }}
                />
                <SecondaryButton label="Keep" onPress={() => setConfirmDelete(false)} />
              </View>
            ) : (
              <SecondaryButton label="Remove from this day" onPress={() => setConfirmDelete(true)} />
            )}
            <Text style={styles.dangerNote}>
              {isSeedEvent(eventId!)
                ? 'Removing hides it from the day. It can be put back here later.'
                : 'This entry was added by you, so removing it clears it from the day.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconBtn: { width: 40, height: 40, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  saveBtn: { marginLeft: 'auto', backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 2, minHeight: 40, justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 14.5, fontWeight: '600', fontFamily: FONT_SERIF },
  seedNote: { fontSize: 12.5, color: COLORS.label, lineHeight: 18, marginBottom: 20, fontFamily: FONT_SERIF_REGULAR },
  label: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.label, marginBottom: 6, fontFamily: FONT_SERIF_REGULAR },
  titleInput: { borderBottomWidth: 2, borderBottomColor: COLORS.ink, paddingVertical: 8, fontSize: 20, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink, marginBottom: 22 },
  noteInput: { borderWidth: 1, borderColor: COLORS.border, padding: 11, minHeight: 64, fontSize: 15, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR, marginBottom: 22, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 12, fontSize: 18, fontFamily: FONT_SERIF, color: COLORS.ink, textAlign: 'center' },
  timeDash: { fontSize: 16, color: COLORS.label },
  timeHint: { fontSize: 12, color: COLORS.labelFaint, marginTop: 7, fontFamily: FONT_SERIF_REGULAR },
  timeError: { fontSize: 12.5, color: COLORS.magentaDeep, marginTop: 7, fontFamily: FONT_SERIF_REGULAR },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 22 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8, minHeight: 38 },
  chipActive: { borderColor: COLORS.ink, backgroundColor: COLORS.hover },
  chipText: { fontSize: 13.5, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  dangerZone: { borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingTop: 20, marginTop: 4 },
  dangerNote: { fontSize: 12, color: COLORS.labelFaint, lineHeight: 17, marginTop: 10, fontFamily: FONT_SERIF_REGULAR },
});
