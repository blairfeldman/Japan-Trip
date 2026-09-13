import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootNav, RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../store/AppState';
import { api, syncConfigured, RemoteItem } from '../services/api';
import { findPinBySourceUrl } from '../services/backup';
import { pinFromShareRow } from '../services/sync';
import { describeSharedLink } from '../utils/shareLink';
import { parseSharedVideo, ParsedShare } from '../services/shareParse';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { PrimaryButton, SecondaryButton, CategoryDot } from '../components/ui';
import { Icon } from '../components/Icon';
import { SavedPin } from '../types';

type Status = 'parsing' | 'no-backend' | 'duplicate' | 'server-pinned' | 'server-review' | 'server-slow';

export default function ShareSheetScreen() {
  const navigation = useNavigation<RootNav>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'ShareSheet'>>();
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
  const [parsed, setParsed] = useState<ParsedShare | null>(null);
  const [remote, setRemote] = useState<RemoteItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Already on a pin? That needs neither backend nor network.
    const already = findPinBySourceUrl(state.pins, url);
    if (already) {
      setDuplicateOf(already);
      setStatus('duplicate');
      return;
    }

    (async () => {
      if (syncConfigured) {
        // The server reads the post properly — caption, then a model for the
        // place, then a real geocode. It answers at once with a pending row and
        // fills it in behind the scenes, so poll briefly rather than holding
        // the share sheet open for the whole pipeline.
        const created = await api.analyzeShareUrl(url, '', state.me);
        if (cancelled) return;
        if (created) {
          for (let i = 0; i < 12; i++) {
            const latest = await api.getItem(created.id);
            if (cancelled) return;
            if (latest && latest.status !== 'pending') {
              setRemote(latest);
              // Pin it here rather than waiting for a sync pass. The row is
              // already in hand, and "Done" drops you back on a map that
              // ought to have the place on it — a sync only runs on the next
              // foreground or a few seconds after some other local change,
              // which reads as nothing having happened.
              //
              // The id is derived from the row, so when sync does pull the
              // same row it merges onto this pin instead of adding a second.
              const pin = pinFromShareRow(latest);
              if (pin && !state.pins.some((p) => p.id === pin.id)) {
                dispatch({ type: 'ADD_PIN', pin });
              }
              setStatus(pin ? 'server-pinned' : 'server-review');
              return;
            }
            await new Promise((r) => setTimeout(r, 1500));
          }
          if (cancelled) return;
          // Still working. It reaches the phone on the next sync either way.
          setStatus('server-slow');
          return;
        }
        // Backend unreachable — carry on with the on-device path below.
      }

      // No backend, or it didn't answer: read what the caption alone gives us.
      const parsedShare = await parseSharedVideo(url);
      if (cancelled) return;
      setParsed(parsedShare);
      setStatus('no-backend');
    })();

    return () => {
      cancelled = true;
    };
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
              <View style={{ flex: 1 }}>
                <Text style={styles.parsingTitle}>Finding the place in this video</Text>
                <Text style={styles.parsingSub}>
                  {syncConfigured ? 'Reading the caption, then looking the place up on the map' : 'Reading the caption'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {(status === 'server-pinned' || status === 'server-review') && remote && (
          <View style={{ paddingVertical: 2 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <View style={[styles.checkBadge, status === 'server-review' && { backgroundColor: COLORS.magentaDeep }]}>
                <Icon name={status === 'server-pinned' ? 'Check' : 'MapPin'} size={19} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedTitle}>
                  {remote.body?.extraction?.place_name ?? remote.body?.place?.name ?? 'Saved'}
                </Text>
                <Text style={styles.savedSub}>
                  {remote.body?.place?.address ?? 'Saved, but not placed on the map'}
                </Text>
              </View>
            </View>
            {!!remote.body?.recommendation && (
              <Text style={styles.bodyText}>"{remote.body.recommendation}"</Text>
            )}
            {!!remote.body?.review_reason && (
              <Text style={styles.reviewNote}>{remote.body.review_reason}</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <PrimaryButton label="Done" onPress={() => navigation.goBack()} />
              <SecondaryButton label="Add by hand" onPress={() => navigation.replace('AddPin', { sourceUrl: url })} />
            </View>
          </View>
        )}

        {status === 'server-slow' && (
          <View style={{ paddingVertical: 4 }}>
            <Text style={styles.bodyText}>
              Saved, and still being read. It'll appear on the map on the next sync — no need to wait here.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <PrimaryButton label="Done" onPress={() => navigation.goBack()} />
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
                  The place name couldn't be read out of this {link.platform} post — it may be private, or the
                  caption may not name anywhere. Add it by hand and the link stays attached to the pin — share it
                  again, or save another video of the same place, and it'll merge instead of making a second pin.
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
                    clip: { handle: link.handle, caption: url, savedBy: state.me, savedAt: new Date().toISOString(), sourceUrl: url },
                  });
                  openPin(duplicateOf.id);
                }}
              />
              <SecondaryButton label="Keep both" onPress={() => navigation.goBack()} />
            </View>
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
  reviewNote: { fontSize: 13, lineHeight: 18, color: COLORS.magentaDeep, marginTop: 12, fontFamily: FONT_SERIF_REGULAR },
  linkLine: { fontSize: 12, lineHeight: 17, color: COLORS.labelFaint, marginTop: 10, fontFamily: FONT_SERIF_REGULAR },
  dupeCallout: { backgroundColor: COLORS.magentaTint, borderLeftWidth: 3, borderLeftColor: COLORS.magenta, padding: 13, marginBottom: 16 },
  dupeLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.magentaDeep, marginBottom: 5, fontFamily: FONT_SERIF_REGULAR },
  dupeText: { fontSize: 15, lineHeight: 21, color: COLORS.inkSoft, fontFamily: FONT_SERIF_REGULAR },
  dupeName: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  dupeAddr: { fontSize: 13.5, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  checkBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  savedTitle: { fontSize: 17, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  savedSub: { fontSize: 13.5, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
});
