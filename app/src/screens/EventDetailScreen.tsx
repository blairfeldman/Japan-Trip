import React, { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { CommonNav, CommonStackParamList } from '../navigation/types';
import { useAppState } from '../store/AppState';
import { resolveEvent, isEdited } from '../services/schedule';
import { DAYS, TRIP } from '../data/trip';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { Avatar, PrimaryButton, SecondaryButton, Tag } from '../components/ui';
import { PlaceholderBanner } from '../components/PlaceholderBanner';
import { Icon } from '../components/Icon';
import { hourToClock } from '../utils/time';

export default function EventDetailScreen() {
  const navigation = useNavigation<CommonNav>();
  const route = useRoute<RouteProp<CommonStackParamList, 'EventDetail'>>();
  const { state } = useAppState();
  const eventId: string = route.params?.eventId;

  const event = useMemo(
    () => resolveEvent(eventId, state.extraEvents, state.eventEdits),
    [eventId, state.extraEvents, state.eventEdits]
  );

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>That booking isn't in the itinerary anymore.</Text>
      </View>
    );
  }

  const day = DAYS.find((d) => d.day === event.day);
  const durationMin = Math.round((event.end - event.start) * 60);
  const durationLabel = durationMin >= 60 ? `${Math.floor(durationMin / 60)}h ${durationMin % 60 ? `${durationMin % 60}m` : ''}`.trim() : `${durationMin}m`;

  const facts: { k: string; v: string }[] = [];
  if (event.booking?.confirmation) facts.push({ k: 'Confirmation', v: event.booking.confirmation });
  if (event.booking?.seatCar) facts.push({ k: 'Seat / car', v: event.booking.seatCar });
  if (event.booking?.paidUsd) facts.push({ k: 'Paid', v: event.booking.paidUsd });
  if (event.booking?.perPersonUsd) facts.push({ k: 'Per person', v: event.booking.perPersonUsd });
  if (event.booking?.cancelBy) facts.push({ k: 'Cancel by', v: event.booking.cancelBy });
  if (event.booking?.reserved) facts.push({ k: 'Reserved', v: event.booking.reserved });

  const mapsQuery = event.location ? encodeURIComponent(`${event.location.name}, ${event.location.address}`) : '';

  return (
    <ScrollView style={styles.screen}>
      <PlaceholderBanner caption={event.photoCaption ?? `${CATEGORY[event.cat].label.toLowerCase()} photo`} onBack={() => navigation.goBack()} />
      <View style={{ padding: 20, paddingTop: 18, paddingBottom: 40 }}>
        <View style={styles.metaRow}>
          <View style={[styles.dot, { backgroundColor: CATEGORY[event.cat].color }]} />
          <Text style={styles.metaLabel}>
            {CATEGORY[event.cat].label} · Day {event.day}
          </Text>
          {!!event.tag && <Tag label={event.tag} />}
        </View>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.subhead}>
          {day?.dow} {day?.date.slice(5).replace('-', '/')} · {hourToClock(event.start)}
          {event.end !== event.start ? `–${hourToClock(event.end)}` : ''} · {durationLabel}
        </Text>

        {event.location && (
          <View style={styles.locationCard}>
            <Icon name="MapPin" size={18} color={COLORS.labelFaint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationName}>{event.location.name}</Text>
              <Text style={styles.locationAddr}>{event.location.address}</Text>
            </View>
          </View>
        )}

        {facts.length > 0 && (
          <View style={styles.factGrid}>
            {facts.map((f) => (
              <View key={f.k} style={styles.factCell}>
                <Text style={styles.factK}>{f.k.toUpperCase()}</Text>
                <Text style={styles.factV}>{f.v}</Text>
              </View>
            ))}
          </View>
        )}

        {event.booking?.reserved === 'Forwarded booking' && (
          <View style={styles.noteRow}>
            <Icon name="EnvelopeSimpleOpen" size={17} color={COLORS.labelFaint} />
            <Text style={styles.noteText}>
              Parsed from a confirmation forwarded to <Text style={{ color: COLORS.link }}>{TRIP.inboxEmail}</Text>.
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 22, marginTop: 4 }}>
          <PrimaryButton
            label={event.location ? 'Open in Maps' : 'No location on this one'}
            icon={event.location ? <Icon name="MapPinLine" size={17} color="#fff" /> : undefined}
            disabled={!event.location}
            onPress={() => {
              if (!event.location) return;
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`);
            }}
          />
          <SecondaryButton label="Edit" onPress={() => navigation.navigate('EditEvent', { eventId: event.id })} />
        </View>
        {isEdited(event.id, state.eventEdits) && (
          <Text style={styles.editedNote}>You've changed this from the original itinerary.</Text>
        )}

        <View style={styles.travelersRow}>
          {TRIP.travelers.map((t, i) => (
            <Avatar key={t.initial} initial={t.initial} color={t.color} overlap={i > 0} />
          ))}
          <Text style={styles.travelersText}>
            {event.booking?.seatCar ? `Seats ${event.booking.seatCar.split('·').pop()?.trim()}, both travellers` : 'Both travellers'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  notFound: { fontFamily: FONT_SERIF_REGULAR, color: COLORS.label },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  metaLabel: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.label, fontFamily: FONT_SERIF_REGULAR, flex: 1 },
  title: { fontSize: 29, lineHeight: 34, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink, marginBottom: 4, letterSpacing: -0.3 },
  subhead: { fontSize: 15, color: COLORS.inkMuted, marginBottom: 20, fontFamily: FONT_SERIF_REGULAR },
  locationCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 20 },
  locationName: { fontSize: 15.5, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  locationAddr: { fontSize: 13.5, color: COLORS.label, marginTop: 2, fontFamily: FONT_SERIF_REGULAR },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, marginHorizontal: -1 },
  factCell: { width: '50%', paddingVertical: 12, paddingRight: 10, borderTopWidth: 1, borderTopColor: COLORS.hairline },
  factK: { fontSize: 11, letterSpacing: 1.2, color: COLORS.label, marginBottom: 3, fontFamily: FONT_SERIF_REGULAR },
  factV: { fontSize: 16, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  noteRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 22 },
  noteText: { flex: 1, fontSize: 13, color: COLORS.label, lineHeight: 19, fontFamily: FONT_SERIF_REGULAR },
  editedNote: { fontSize: 12.5, color: COLORS.label, marginTop: -14, marginBottom: 20, fontFamily: FONT_SERIF_REGULAR },
  travelersRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.hairline },
  travelersText: { fontSize: 13, color: COLORS.label, marginLeft: 4, fontFamily: FONT_SERIF_REGULAR },
});
