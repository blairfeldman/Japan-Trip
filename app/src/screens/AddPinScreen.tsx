import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootNav, RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../store/AppState';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { Icon } from '../components/Icon';
import { CategoryDot } from '../components/ui';
import { Category, SavedPin } from '../types';
import { findPlaces, PlaceMatch } from '../services/api';
import { findSamePlace } from '../services/backup';
import { describeSharedLink } from '../utils/shareLink';
import { newId } from '../utils/id';
import { TRIP } from '../data/trip';

export default function AddPinScreen() {
  const navigation = useNavigation<RootNav>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'AddPin'>>();
  const { state, dispatch } = useAppState();

  // Set when this form was opened from a shared TikTok/Instagram link.
  const shared = route.params?.sourceUrl ? describeSharedLink(route.params.sourceUrl) : null;
  const [name, setName] = useState(route.params?.prefillName ?? '');
  // Seeded with the suggested name when there's no address to start from:
  // arriving from a shared video, the place's name is the thing you'd type
  // in anyway, and one tap on search turns it into a location.
  const [address, setAddress] = useState(route.params?.prefillAddress ?? route.params?.prefillName ?? '');
  const [matched, setMatched] = useState<PlaceMatch | null>(null);
  // More than one thing can answer to "Hokoku-ji Temple", so the choice is
  // yours rather than the first result's.
  const [candidates, setCandidates] = useState<PlaceMatch[] | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [cat, setCat] = useState<Category>('food');
  const [note, setNote] = useState('');
  const [visible, setVisible] = useState(true);
  const me = TRIP.travelers.find((t) => t.initial === state.me) ?? TRIP.travelers[0];

  // Previewed before saving so "Save" is never a surprise merge.
  const willMerge = useMemo(() => {
    if (!matched) return undefined;
    return findSamePlace(state.pins, {
      id: '',
      name: name.trim(),
      cat,
      address: matched.address ?? '',
      lat: matched.lat,
      lng: matched.lng,
      sub: '',
      who: state.me,
      clips: [],
      createdAt: new Date().toISOString(),
    });
  }, [matched, state.pins, name, cat]);

  async function runSearch() {
    if (!address.trim()) return;
    setGeocoding(true);
    setMatched(null);
    const found = await findPlaces(address);
    setCandidates(found);
    // One answer needs no menu.
    if (found.length === 1) choose(found[0]);
    setGeocoding(false);
  }

  function choose(place: PlaceMatch) {
    setMatched(place);
    setCandidates(null);
    // A landmark search knows the venue's proper name; borrow it when the
    // name field is still empty rather than leaving you to retype it.
    if (!name.trim() && place.name) setName(place.name);
  }

  function onSave() {
    if (!name.trim() || !matched) return;
    const clips: SavedPin['clips'] = shared
      ? [
          {
            handle: route.params?.handle ?? shared.handle,
            caption: name.trim(),
            savedBy: state.me,
            savedAt: new Date().toISOString(),
            sourceUrl: shared.url,
            thumbnailUrl: route.params?.thumbnailUrl,
          },
        ]
      : [];
    const pin: SavedPin = {
      id: newId('p'),
      name: name.trim(),
      cat,
      address: matched.address ?? '',
      lat: matched.lat,
      lng: matched.lng,
      sub: note.trim() || CATEGORY[cat].label,
      who: visible ? 'both' : state.me,
      note: note.trim() || undefined,
      clips,
      createdAt: new Date().toISOString(),
    };

    // Same dedupe rule the backup merge uses: if this place is already pinned,
    // hang the new clip off it instead of creating a second pin for it.
    const existing = findSamePlace(state.pins, pin);
    if (existing) {
      if (clips.length) dispatch({ type: 'ADD_CLIP_TO_PIN', pinId: existing.id, clip: clips[0] });
      navigation.goBack();
      return;
    }

    // No direct call: the pin is saved locally and the next sync pass pushes
    // it, so saving works identically with the backend down or absent.
    dispatch({ type: 'ADD_PIN', pin });
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
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Icon name="X" size={19} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.title}>New pin</Text>
        <Pressable onPress={onSave} disabled={!name.trim() || !matched} style={[styles.saveBtn, (!name.trim() || !matched) && { opacity: 0.4 }]}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      {shared && (
        <View style={styles.sharedCard}>
          <Icon name="PlayCircle" size={17} color={COLORS.accent} />
          <Text style={styles.sharedText} numberOfLines={2}>
            From {shared.platform} · {route.params?.handle ?? shared.handle} — the link stays attached to this pin.
          </Text>
        </View>
      )}

      <Text style={styles.label}>Place</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Place name" placeholderTextColor={COLORS.labelFaint} style={styles.placeInput} />

      <Text style={styles.label}>Where</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={address}
          onChangeText={(v) => {
            setAddress(v);
            setMatched(null);
            setCandidates(null);
          }}
          returnKeyType="search"
          onSubmitEditing={runSearch}
          placeholder="Name, landmark or address"
          placeholderTextColor={COLORS.labelFaint}
          style={[styles.addressInput, { flex: 1 }]}
        />
        <Pressable onPress={runSearch} disabled={!address.trim() || geocoding} style={styles.searchBtn}>
          <Icon name="MagnifyingGlass" size={18} color={address.trim() ? '#fff' : COLORS.labelFaint} />
        </Pressable>
      </View>

      {candidates !== null && candidates.length > 0 && (
        <View style={styles.candidates}>
          {candidates.map((p, i) => (
            <Pressable
              key={p.google_place_id ?? `${p.lat},${p.lng},${i}`}
              onPress={() => choose(p)}
              style={({ pressed }) => [styles.candidateRow, pressed && { backgroundColor: COLORS.hover }]}
            >
              <Icon name="MapPin" size={15} color={COLORS.link} />
              <View style={{ flex: 1 }}>
                <Text style={styles.candidateName}>{p.name ?? 'Unnamed place'}</Text>
                {!!p.address && (
                  <Text style={styles.candidateAddr} numberOfLines={2}>
                    {p.address}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.matchRow}>
        <Icon
          name="MapPin"
          size={15}
          color={matched ? COLORS.link : candidates?.length === 0 ? COLORS.magentaDeep : COLORS.labelFaint}
        />
        <Text
          style={[
            styles.matchText,
            { color: matched ? COLORS.link : candidates?.length === 0 ? COLORS.magentaDeep : COLORS.labelFaint },
          ]}
        >
          {geocoding
            ? 'Looking it up…'
            : matched
            ? `Matched · ${matched.address ?? `${matched.lat.toFixed(4)}, ${matched.lng.toFixed(4)}`}`
            : candidates === null
            ? 'Search for the place by name, or paste its address'
            : candidates.length === 0
            ? "Nothing found — try the name with its city, or a nearby landmark."
            : 'Pick the right one'}
        </Text>
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipsRow}>
        {(Object.keys(CATEGORY) as Category[]).filter((k) => k !== 'transit').map((k) => {
          const active = cat === k;
          return (
            <Pressable key={k} onPress={() => setCat(k)} style={[styles.chip, active && styles.chipActive]}>
              <CategoryDot cat={k} size={8} />
              <Text style={[styles.chipText, active && { fontWeight: '600' }]}>{CATEGORY[k].label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Note</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="What made you save this?"
        placeholderTextColor={COLORS.labelFaint}
        multiline
        style={styles.noteInput}
      />

      {matched && willMerge && (
        <Text style={styles.mergeNote}>
          {willMerge.name} is already pinned at this address — saving adds {shared ? 'this clip' : 'your note'} to it
          instead of making a second pin.
        </Text>
      )}

      {/*
        This sets who the pin is filed under, not who can see it: once the
        backend is configured everything syncs to the phone you both read.
        Labelled accordingly rather than promising a privacy setting there
        isn't one of.
      */}
      <View style={styles.visRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{me.initial}</Text>
        </View>
        <Text style={styles.visLabel}>Save as both of ours</Text>
        <Switch value={visible} onValueChange={setVisible} trackColor={{ true: COLORS.accent, false: COLORS.border }} />
      </View>
      <Text style={styles.visHint}>
        {visible ? 'Filed as a place for the two of you.' : `Filed as ${me.name}'s find.`}
      </Text>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  saveBtn: { marginLeft: 'auto', backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 2, minHeight: 40, justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 14.5, fontWeight: '600', fontFamily: FONT_SERIF },
  label: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.label, marginBottom: 6, fontFamily: FONT_SERIF_REGULAR },
  placeInput: { borderBottomWidth: 2, borderBottomColor: COLORS.ink, paddingVertical: 8, fontSize: 20, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink, marginBottom: 22 },
  searchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  searchBtn: { width: 46, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  candidates: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff', marginTop: 8 },
  candidateRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.hairline },
  candidateName: { fontSize: 15, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  candidateAddr: { fontSize: 12.5, lineHeight: 17, color: COLORS.label, marginTop: 2, fontFamily: FONT_SERIF_REGULAR },
  addressInput: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 8, fontSize: 16, color: COLORS.inkMuted, fontFamily: FONT_SERIF_REGULAR, marginBottom: 8 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  matchText: { fontSize: 13, fontFamily: FONT_SERIF_REGULAR, flex: 1 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 24 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8, minHeight: 38 },
  chipActive: { borderColor: COLORS.ink, backgroundColor: COLORS.hover },
  chipText: { fontSize: 13.5, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  noteInput: { borderWidth: 1, borderColor: COLORS.border, padding: 12, minHeight: 86, fontSize: 15.5, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR, marginBottom: 24, textAlignVertical: 'top' },
  sharedCard: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: COLORS.accentTint, padding: 11, marginBottom: 20 },
  sharedText: { flex: 1, fontSize: 13, lineHeight: 18, color: COLORS.accentTintText, fontFamily: FONT_SERIF_REGULAR },
  mergeNote: { fontSize: 13, lineHeight: 18, color: COLORS.magentaDeep, marginTop: -10, marginBottom: 20, fontFamily: FONT_SERIF_REGULAR },
  visRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingTop: 16 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.link, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  visHint: { fontSize: 12, color: COLORS.labelFaint, marginTop: 6, fontFamily: FONT_SERIF_REGULAR },
  visLabel: { flex: 1, fontSize: 15, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
});
