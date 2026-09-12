import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../store/AppState';
import { api, backendConfigured } from '../services/api';
import { findPinBySourceUrl } from '../services/backup';
import { describeSharedLink } from '../utils/shareLink';
import { parseSharedVideo, ParsedShare } from '../services/shareParse';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { PrimaryButton, SecondaryButton, CategoryDot } from '../components/ui';
import { Icon } from '../components/Icon';
import { Category, SavedPin } from '../types';

type Status = 'parsing' | 'no-backend' | 'duplicate' | 'saved' | 'error';

export default function ShareSheetScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { state, dispatch } = useAppState();
  const url: string = route.params?.url ?? '';
  const link = describeSharedLink(url);

  /**
   * PinDetail lives inside the Map tab's stack, not on the root stack this
   * modal sits on — `navigation.replace('PinDetail')` simply found no such
   * route. Go through the tab navigator instead.
   */
  function openPin(pinId: string) {
    // Navigating to Tabs pops this modal off the root stack on the way.
    navigation.navigate('Tabs', { screen: 'MapTab', params: { screen: 'PinDetail', params: { pinId } } });
  }

  const [status, setStatus] = useState<Status>('parsing');
  const [duplicateOf, setDuplicateOf] = useState<SavedPin | null>(null);
  const [savedPin, setSavedPin] = useState<SavedPin | null>(null);
  const [pickedCat, setPickedCat] = useState<Category>('food');
  const [parsed, setParsed] = useState<ParsedShare | null>(null);

  useEffect(() => {
    if (!backendConfigured) {
      // No parsing service, but we can still tell whether this exact clip is
      // already on a pin — that's the dedupe half, and it needs no server.
      const already = findPinBySourceUrl(state.pins, url);
      if (already) {
        setDuplicateOf(already);
        setStatus('duplicate');
        return;
      }
      // TikTok's oEmbed is public and keyless, so the caption (which usually
      // names the place) can still be read without any backend at all.
      let cancelled = false;
      parseSharedVideo(url).then((p) => {
        if (cancelled) return;
        setParsed(p);
        setStatus('no-backend');
      });
      return () => {
        cancelled = true;
      };
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
      <Text style={[styles.sourceLabel, { top: insets.top + 22 }]}>shared to Japan Trip</Text>
      <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
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
            {parsed ? (
              <>
                <Text style={styles.bodyText}>
                  Read the caption off this {link.platform} post. It usually names the place — check it, then add the
                  address on the next screen.
                </Text>
                <View style={styles.parsedCard}>
                  <Text style={styles.parsedName}>{parsed.suggestedName || '(no caption)'}</Text>
                  <Text style={styles.parsedMeta}>{parsed.handle}</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.bodyText}>
                  The place name couldn't be read out of this {link.platform} post
                  {link.platform === 'Instagram' ? " — Instagram doesn't allow it without an account" : ''}. Add it by
                  hand and the link stays attached to the pin — share it again, or save another video of the same
                  place, and it'll merge instead of making a second pin.
                </Text>
                <Text style={styles.linkLine} numberOfLines={2}>
                  {link.handle} · {url}
                </Text>
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <PrimaryButton
                label={parsed ? 'Add the address' : 'Add this pin by hand'}
                onPress={() =>
                  navigation.replace('AddPin', {
                    sourceUrl: url,
                    prefillName: parsed?.suggestedName,
                    handle: parsed?.handle,
                    thumbnailUrl: parsed?.thumbnailUrl,
                  })
                }
              />
              <SecondaryButton label="Cancel" onPress={() => navigation.goBack()} />
            </View>
          </View>
        )}

        {status === 'error' && (
          <View style={{ paddingVertical: 4 }}>
            <Text style={styles.bodyText}>Couldn't reach the parsing service. Try again, or add the pin by hand.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <PrimaryButton label="Add by hand" onPress={() => navigation.replace('AddPin', { sourceUrl: url })} />
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
    dispatch({
                    type: 'ADD_CLIP_TO_PIN',
                    pinId: duplicateOf.id,
                    clip: { handle: link.handle, caption: url, savedBy: 'B', savedAt: new Date().toISOString(), sourceUrl: url },
                  });
                  openPin(duplicateOf.id);
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
                <Pressable
                  key={k}
                  onPress={() => {
                    setPickedCat(k);
                    dispatch({ type: 'SET_PIN_CAT', pinId: savedPin.id, cat: k });
                  }}
                  style={[styles.catChip, pickedCat === k && styles.catChipActive]}
                >
                  <CategoryDot cat={k} size={8} />
                  <Text style={styles.catChipText}>{CATEGORY[k].label}</Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton label="View the pin" onPress={() => openPin(savedPin.id)} />
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
  parsedCard: { backgroundColor: '#fff', borderLeftWidth: 3, borderLeftColor: COLORS.accent, padding: 13, marginTop: 14 },
  parsedName: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  parsedMeta: { fontSize: 12.5, color: COLORS.label, marginTop: 3, fontFamily: FONT_SERIF_REGULAR },
  linkLine: { fontSize: 12, lineHeight: 17, color: COLORS.labelFaint, marginTop: 10, fontFamily: FONT_SERIF_REGULAR },
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
