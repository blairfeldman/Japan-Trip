import React, { useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { CommonNav, CommonStackParamList } from '../navigation/types';
import { useAppState } from '../store/AppState';
import { Person } from '../types';
import { TRIP } from '../data/trip';
import { SHARE_PREFIX } from '../services/sync';
import { DAYS } from '../data/trip';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { PrimaryButton, SecondaryButton } from '../components/ui';
import { PlaceholderBanner } from '../components/PlaceholderBanner';
import { Icon, IconName } from '../components/Icon';

/** "once by Blair from @tokyoeats, once by Yev from @ramenhunter" */
function describeClips(clips: { handle: string; savedBy: Person }[]): string {
  return clips.map((c) => `once by ${c.savedBy === 'B' ? 'Blair' : 'Yev'} from ${c.handle}`).join(', ');
}

export default function PinDetailScreen() {
  const navigation = useNavigation<CommonNav>();
  const route = useRoute<RouteProp<CommonStackParamList, 'PinDetail'>>();
  const { state, dispatch } = useAppState();
  const [added, setAdded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pin = useMemo(() => state.pins.find((p) => p.id === route.params?.pinId), [state.pins, route.params?.pinId]);

  if (!pin) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>That pin isn't saved anymore.</Text>
      </View>
    );
  }

  const facts: { icon: IconName; v: string }[] = [
    { icon: 'MapPin', v: pin.address },
    ...(pin.hours ? [{ icon: 'Clock' as const, v: pin.hours }] : []),
    ...(pin.note ? [{ icon: 'CalendarCheck' as const, v: pin.note }] : []),
    ...(pin.price ? [{ icon: 'Coins' as const, v: pin.price }] : []),
  ];

  const latest = pin.clips[pin.clips.length - 1];
  const sharedFromLink = pin.id.startsWith(SHARE_PREFIX);
  const cover = pin.clips.map((c) => c.thumbnailUrl).filter(Boolean)[0];

  return (
    <ScrollView style={styles.screen}>
      <PlaceholderBanner
        height={190}
        caption={cover ? undefined : 'no cover frame saved'}
        imageUrl={cover}
        onBack={() => navigation.goBack()}
      />
      <View style={{ padding: 20, paddingTop: 18, paddingBottom: 40 }}>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: CATEGORY[pin.cat].color }]} />
          <Text style={styles.metaLabel}>{CATEGORY[pin.cat].label} · {pin.address.split(',').slice(-1)[0].trim()}</Text>
        </View>
        <Text style={styles.title}>{pin.name}</Text>
        <Text style={styles.subhead}>{pin.sub}</Text>

        {!!pin.needsReview && (
          <View style={styles.reviewCallout}>
            <Icon name="MapPinLine" size={17} color={COLORS.magentaDeep} />
            <Text style={styles.reviewText}>{pin.needsReview}</Text>
          </View>
        )}

        {pin.clips.length > 1 && (
          <View style={styles.dupeCallout}>
            <Text style={styles.dupeLabel}>Merged duplicate</Text>
            <Text style={styles.dupeText}>
              Shared {pin.clips.length} times — {describeClips(pin.clips)}. Same address, so it stayed one pin.
            </Text>
          </View>
        )}

        <View style={{ marginBottom: 20 }}>
          {facts.map((f, i) => (
            <View key={i} style={styles.factRow}>
              <Icon name={f.icon} size={19} color={COLORS.labelFaint} />
              <Text style={styles.factText}>{f.v}</Text>
            </View>
          ))}
        </View>

        {latest && (
          <Pressable
            disabled={!latest.sourceUrl}
            onPress={() => latest.sourceUrl && Linking.openURL(latest.sourceUrl)}
            style={({ pressed }) => [styles.clipCard, pressed && { backgroundColor: COLORS.hover }]}
          >
            {latest.thumbnailUrl ? (
              <Image source={{ uri: latest.thumbnailUrl }} style={styles.clipThumb} resizeMode="cover" />
            ) : (
              <View style={styles.clipThumb} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.clipHandle}>{latest.handle}</Text>
              <Text style={styles.clipCaption} numberOfLines={2}>
                "{latest.caption}"
              </Text>
            </View>
            {!!latest.sourceUrl && <Icon name="PlayCircle" size={26} color={COLORS.accent} />}
          </Pressable>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PrimaryButton
            label="Directions"
            icon={<Icon name="NavigationArrow" size={17} color="#fff" />}
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.address)}`)}
          />
          <SecondaryButton
            label={added ? `On day ${DAYS[state.dayIdx].day}` : `Add to day ${DAYS[state.dayIdx].day}`}
            onPress={() => {
              if (added) {
                navigation.getParent()?.navigate('DaysTab');
                return;
              }
              const day = DAYS[state.dayIdx];
              dispatch({
                type: 'ADD_MANUAL_EVENT',
                event: {
                  id: `pin-${pin.id}-d${day.day}`,
                  day: day.day,
                  start: 12,
                  end: 13,
                  cat: pin.cat,
                  title: pin.name,
                  sub: pin.sub || 'Added from a saved pin',
                  tag: '',
                  location: { name: pin.name, address: pin.address, lat: pin.lat, lng: pin.lng },
                },
              });
              setAdded(true);
            }}
          />
        </View>

        <View style={styles.dangerZone}>
          {confirmDelete ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <PrimaryButton
                  label="Yes, remove it"
                  style={{ backgroundColor: COLORS.magentaDeep }}
                  onPress={() => {
                    dispatch({ type: 'DELETE_PIN', pinId: pin.id });
                    navigation.goBack();
                  }}
                />
                <SecondaryButton label="Keep" onPress={() => setConfirmDelete(false)} />
              </View>
              <Text style={styles.dangerNote}>
                {sharedFromLink
                  ? 'This also clears what the server read out of the video, so sharing the link again starts fresh.'
                  : 'It goes from both phones on the next sync.'}
              </Text>
            </>
          ) : (
            <>
              <SecondaryButton label="Remove this pin" onPress={() => setConfirmDelete(true)} />
              <Text style={styles.dangerNote}>
                Removing it here removes it from {TRIP.travelers.find((t) => t.initial !== state.me)?.name ?? 'the other phone'}'s
                too. Anything already added to a day stays where it is.
              </Text>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  notFound: { fontFamily: FONT_SERIF_REGULAR, color: COLORS.label },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  metaLabel: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  title: { fontSize: 29, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink, marginBottom: 4, letterSpacing: -0.3 },
  subhead: { fontSize: 15, color: COLORS.inkMuted, marginBottom: 18, fontFamily: FONT_SERIF_REGULAR },
  reviewCallout: {
    flexDirection: 'row', gap: 9, alignItems: 'flex-start',
    backgroundColor: COLORS.magentaTint, borderLeftWidth: 3, borderLeftColor: COLORS.magenta,
    padding: 12, marginTop: 14,
  },
  reviewText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: COLORS.inkSoft, fontFamily: FONT_SERIF_REGULAR },
  dupeCallout: { backgroundColor: COLORS.magentaTint, borderLeftWidth: 3, borderLeftColor: COLORS.magenta, padding: 13, marginBottom: 20 },
  dupeLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.magentaDeep, marginBottom: 5, fontFamily: FONT_SERIF_REGULAR },
  dupeText: { fontSize: 14.5, lineHeight: 20, color: COLORS.inkSoft, fontFamily: FONT_SERIF_REGULAR },
  dangerZone: { borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingTop: 20, marginTop: 26 },
  dangerNote: { fontSize: 12, color: COLORS.labelFaint, lineHeight: 17, marginTop: 10, fontFamily: FONT_SERIF_REGULAR },
  factRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingVertical: 12, alignItems: 'flex-start' },
  factText: { flex: 1, fontSize: 15.5, lineHeight: 20, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  clipCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', padding: 14, marginBottom: 20 },
  clipThumb: { width: 52, height: 66, backgroundColor: '#eae7e7' },
  clipHandle: { fontSize: 14.5, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  clipCaption: { fontSize: 13, color: COLORS.label, marginTop: 2, fontFamily: FONT_SERIF_REGULAR },
});
