import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppState } from '../store/AppState';
import { api, backendConfigured } from '../services/api';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { PrimaryButton, SecondaryButton, CategoryDot } from '../components/ui';
import { Icon } from '../components/Icon';
import { Category, SavedPin } from '../types';

type Status = 'parsing' | 'no-backend' | 'duplicate' | 'saved' | 'error';

export default function ShareSheetScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { dispatch } = useAppState();
  const url: string = route.params?.url ?? '';

  const [status, setStatus] = useState<Status>('parsing');
  const [duplicateOf, setDuplicateOf] = useState<SavedPin | null>(null);
  const [savedPin, setSavedPin] = useState<SavedPin | null>(null);
  const [pickedCat, setPickedCat] = useState<Category>('food');

  useEffect(() => {
    if (!backendConfigured) {
      setStatus('no-backend');
      return;
    }
    api.analyzeShareUrl(url).then((res) => {
      if (!res) {
        setStatus('error');
        return;
      }
      if (res.status === 'duplicate' && res.duplicateOf) {
        setDuplicateOf(res.duplicateOf);
        setStatus('duplicate');
      } else if (res.status === 'saved' && res.pin) {
        setSavedPin(res.pin);
        setPickedCat(res.pin.cat);
        dispatch({ type: 'ADD_PIN', pin: res.pin });
        setStatus('saved');
      } else {
        setStatus('error');
      }
    });
  }, [url]);

  return (
    <View style={styles.screen}>
      <Text style={styles.sourceLabel}>shared to Japan Trip</Text>
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.headRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>日</Text>
          </View>
          <Text style={styles.headTitle}>Save to Japan Trip</Text>
        </View>

        {status === 'parsing' && (
          <View style={{ paddingVertical: 8 }}>
            <View style={styles.parsingRow}>
              <ActivityIndicator color={COLORS.accent} />
              <View>
                <Text style={styles.parsingTitle}>Finding the place in this video</Text>
                <Text style={styles.parsingSub}>Reading caption, on-screen text and the pinned comment</Text>
              </View>
            </View>
          </View>
        )}

        {status === 'no-backend' && (
          <View style={{ paddingVertical: 4 }}>
            <Text style={styles.bodyText}>
              No parsing backend is configured yet, so this link can't be read automatically. Add the pin by hand instead —
              it'll be ready to dedupe automatically next time you share the same place.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <PrimaryButton label="Add this pin by hand" onPress={() => navigation.replace('AddPin', {})} />
              <SecondaryButton label="Cancel" onPress={() => navigation.goBack()} />
            </View>
          </View>
        )}

        {status === 'error' && (
          <View style={{ paddingVertical: 4 }}>
            <Text style={styles.bodyText}>Couldn't reach the parsing service. Try again, or add the pin by hand.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <PrimaryButton label="Add by hand" onPress={() => navigation.replace('AddPin', {})} />
              <SecondaryButton label="Close" onPress={() => navigation.goBack()} />
            </View>
          </View>
        )}

        {status === 'duplicate' && duplicateOf && (
          <View style={{ paddingVertical: 2 }}>
            <View style={styles.dupeCallout}>
              <Text style={styles.dupeLabel}>Already saved</Text>
              <Text style={styles.dupeText}>
                <Text style={{ fontWeight: '600' }}>{duplicateOf.name}</Text> is already pinned. Same address, so this won't make a second pin.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 18 }}>
              <CategoryDot cat={duplicateOf.cat} size={11} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dupeName}>{duplicateOf.name}</Text>
                <Text style={styles.dupeAddr}>{CATEGORY[duplicateOf.cat].label} · {duplicateOf.address}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <PrimaryButton
                label="Add this clip to the pin"
                onPress={() => {
                  dispatch({ type: 'ADD_CLIP_TO_PIN', pinId: duplicateOf.id, clip: { handle: '@shared', caption: url, savedBy: 'B', savedAt: new Date().toISOString(), sourceUrl: url } });
                  navigation.replace('PinDetail', { pinId: duplicateOf.id });
                }}
              />
              <SecondaryButton label="Keep both" onPress={() => navigation.goBack()} />
            </View>
          </View>
        )}

        {status === 'saved' && savedPin && (
          <View style={{ paddingVertical: 2 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <View style={styles.checkBadge}>
                <Icon name="Check" size={19} color="#fff" />
              </View>
              <View>
                <Text style={styles.savedTitle}>Pinned to {savedPin.address.split(',').slice(-2)[0]?.trim() || 'your trip'}</Text>
                <Text style={styles.savedSub}>New pin saved</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
              {(Object.keys(CATEGORY) as Category[]).filter((k) => k !== 'transit').map((k) => (
                <Pressable key={k} onPress={() => setPickedCat(k)} style={[styles.catChip, pickedCat === k && styles.catChipActive]}>
                  <CategoryDot cat={k} size={8} />
                  <Text style={styles.catChipText}>{CATEGORY[k].label}</Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton label="View the pin" onPress={() => navigation.replace('PinDetail', { pinId: savedPin.id })} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#201e1d', justifyContent: 'flex-end' },
  sourceLabel: { position: 'absolute', top: 22, left: 0, right: 0, textAlign: 'center', color: '#9b9797', fontSize: 13 },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20, paddingTop: 10 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  badge: { width: 34, height: 34, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: COLORS.bg, fontSize: 15, fontWeight: '600' },
  headTitle: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  parsingRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 20 },
  parsingTitle: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  parsingSub: { fontSize: 13.5, color: COLORS.label, marginTop: 2, fontFamily: FONT_SERIF_REGULAR },
  bodyText: { fontSize: 14.5, lineHeight: 21, color: COLORS.inkMuted, fontFamily: FONT_SERIF_REGULAR },
  dupeCallout: { backgroundColor: COLORS.magentaTint, borderLeftWidth: 3, borderLeftColor: COLORS.magenta, padding: 13, marginBottom: 16 },
  dupeLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.magentaDeep, marginBottom: 5, fontFamily: FONT_SERIF_REGULAR },
  dupeText: { fontSize: 15, lineHeight: 21, color: COLORS.inkSoft, fontFamily: FONT_SERIF_REGULAR },
  dupeName: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  dupeAddr: { fontSize: 13.5, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  checkBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  savedTitle: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  savedSub: { fontSize: 13.5, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8, minHeight: 38 },
  catChipActive: { borderColor: COLORS.ink, backgroundColor: COLORS.hover },
  catChipText: { fontSize: 13.5, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
});
