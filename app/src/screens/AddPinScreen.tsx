import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../store/AppState';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { Icon } from '../components/Icon';
import { CategoryDot } from '../components/ui';
import { Category, SavedPin } from '../types';
import { geocodeAddress, api } from '../services/api';
import { TRIP } from '../data/trip';

export default function AddPinScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { dispatch } = useAppState();

  const [name, setName] = useState(route.params?.prefillName ?? '');
  const [address, setAddress] = useState(route.params?.prefillAddress ?? '');
  const [matched, setMatched] = useState<{ lat: number; lng: number; displayName: string } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [cat, setCat] = useState<Category>('food');
  const [note, setNote] = useState('');
  const [visible, setVisible] = useState(true);

  async function onAddressBlur() {
    if (!address.trim()) return;
    setGeocoding(true);
    const result = await geocodeAddress(address);
    setMatched(result);
    setNotFound(!result);
    setGeocoding(false);
  }

  function onSave() {
    if (!name.trim() || !matched) return;
    const pin: SavedPin = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      cat,
      address: matched.displayName,
      lat: matched.lat,
      lng: matched.lng,
      sub: note.trim() || CATEGORY[cat].label,
      who: visible ? 'both' : 'B',
      note: note.trim() || undefined,
      clips: [],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_PIN', pin });
    api.createPin(pin);
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

      <Text style={styles.label}>Place</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Place name" placeholderTextColor={COLORS.labelFaint} style={styles.placeInput} />

      <Text style={styles.label}>Address</Text>
      <TextInput
        value={address}
        onChangeText={(v) => {
          setAddress(v);
          setMatched(null);
          setNotFound(false);
        }}
        returnKeyType="search"
        onSubmitEditing={onAddressBlur}
        onBlur={onAddressBlur}
        placeholder="Street address"
        placeholderTextColor={COLORS.labelFaint}
        style={styles.addressInput}
      />
      <View style={styles.matchRow}>
        <Icon name="MapPin" size={15} color={matched ? COLORS.link : notFound ? COLORS.magentaDeep : COLORS.labelFaint} />
        <Text style={[styles.matchText, { color: matched ? COLORS.link : notFound ? COLORS.magentaDeep : COLORS.labelFaint }]}>
          {geocoding
            ? 'Matching on the map…'
            : matched
            ? `Matched · ${matched.displayName}`
            : notFound
            ? "Couldn't find that address — try adding the city, or a nearby landmark."
            : 'Enter an address to match it on the map'}
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

      <View style={styles.visRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{TRIP.travelers[0].initial}</Text>
        </View>
        <Text style={styles.visLabel}>Visible to {TRIP.travelers[1]?.name ?? 'trip partner'}</Text>
        <Switch value={visible} onValueChange={setVisible} trackColor={{ true: COLORS.accent, false: COLORS.border }} />
      </View>
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
  addressInput: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 8, fontSize: 16, color: COLORS.inkMuted, fontFamily: FONT_SERIF_REGULAR, marginBottom: 8 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  matchText: { fontSize: 13, fontFamily: FONT_SERIF_REGULAR, flex: 1 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 24 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8, minHeight: 38 },
  chipActive: { borderColor: COLORS.ink, backgroundColor: COLORS.hover },
  chipText: { fontSize: 13.5, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  noteInput: { borderWidth: 1, borderColor: COLORS.border, padding: 12, minHeight: 86, fontSize: 15.5, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR, marginBottom: 24, textAlignVertical: 'top' },
  visRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingTop: 16 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.link, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  visLabel: { flex: 1, fontSize: 15, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
});
