import React, { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppState } from '../store/AppState';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { PrimaryButton, SecondaryButton } from '../components/ui';
import { PlaceholderBanner } from '../components/PlaceholderBanner';
import { Icon } from '../components/Icon';

export default function PinDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { state } = useAppState();
  const pin = useMemo(() => state.pins.find((p) => p.id === route.params?.pinId), [state.pins, route.params?.pinId]);

  if (!pin) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>That pin isn't saved anymore.</Text>
      </View>
    );
  }

  const facts: { icon: any; v: string }[] = [
    { icon: 'MapPin', v: pin.address },
    ...(pin.hours ? [{ icon: 'Clock' as const, v: pin.hours }] : []),
    ...(pin.note ? [{ icon: 'CalendarCheck' as const, v: pin.note }] : []),
    ...(pin.price ? [{ icon: 'Coins' as const, v: pin.price }] : []),
  ];

  const latest = pin.clips[pin.clips.length - 1];

  return (
    <ScrollView style={styles.screen}>
      <PlaceholderBanner height={190} caption="TikTok cover frame" onBack={() => navigation.goBack()} />
      <View style={{ padding: 20, paddingTop: 18 }}>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: CATEGORY[pin.cat].color }]} />
          <Text style={styles.metaLabel}>{CATEGORY[pin.cat].label} · {pin.address.split(',').slice(-1)[0].trim()}</Text>
        </View>
        <Text style={styles.title}>{pin.name}</Text>
        <Text style={styles.subhead}>{pin.sub}</Text>

        {pin.clips.length > 1 && (
          <View style={styles.dupeCallout}>
            <Text style={styles.dupeLabel}>Merged duplicate</Text>
            <Text style={styles.dupeText}>
              Shared {pin.clips.length} times — {pin.clips.map((c) => `once by ${c.savedBy === 'B' ? 'Blair' : 'Yev'} from `).join('')}
              {pin.clips.map((c) => c.handle).join(', ')}. Same address, so it stayed one pin.
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
          <View style={styles.clipCard}>
            <View style={styles.clipThumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.clipHandle}>{latest.handle}</Text>
              <Text style={styles.clipCaption} numberOfLines={2}>
                "{latest.caption}"
              </Text>
            </View>
            <Icon name="PlayCircle" size={26} color={COLORS.accent} />
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <PrimaryButton
            label="Directions"
            icon={<Icon name="NavigationArrow" size={17} color="#fff" />}
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.address)}`)}
          />
          <SecondaryButton label="Add to a day" onPress={() => navigation.getParent()?.navigate('DaysTab')} />
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
  dupeCallout: { backgroundColor: COLORS.magentaTint, borderLeftWidth: 3, borderLeftColor: COLORS.magenta, padding: 13, marginBottom: 20 },
  dupeLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.magentaDeep, marginBottom: 5, fontFamily: FONT_SERIF_REGULAR },
  dupeText: { fontSize: 14.5, lineHeight: 20, color: COLORS.inkSoft, fontFamily: FONT_SERIF_REGULAR },
  factRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingVertical: 12, alignItems: 'flex-start' },
  factText: { flex: 1, fontSize: 15.5, lineHeight: 20, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  clipCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', padding: 14, marginBottom: 20 },
  clipThumb: { width: 52, height: 66, backgroundColor: '#eae7e7' },
  clipHandle: { fontSize: 14.5, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  clipCaption: { fontSize: 13, color: COLORS.label, marginTop: 2, fontFamily: FONT_SERIF_REGULAR },
});
