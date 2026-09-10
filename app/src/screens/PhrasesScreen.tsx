import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PHRASES, SITUATIONS } from '../data/phrases';
import { COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { DoubleRule } from '../components/ui';
import { Icon, IconName } from '../components/Icon';

export default function PhrasesScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SITUATIONS;
    return SITUATIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.sub.toLowerCase().includes(q) ||
        PHRASES.some((p) => p.situationId === s.id && (p.en.toLowerCase().includes(q) || p.romaji.toLowerCase().includes(q)))
    );
  }, [query]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={styles.h2}>Phrases</Text>
      <DoubleRule style={{ marginTop: 14, marginBottom: 18 }} />

      <View style={styles.searchBar}>
        <Icon name="MagnifyingGlass" size={18} color={COLORS.label} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${PHRASES.length} phrases`}
          placeholderTextColor={COLORS.labelFaint}
          style={styles.searchInput}
        />
      </View>

      {filtered.map((s) => {
        const count = PHRASES.filter((p) => p.situationId === s.id).length;
        return (
          <Pressable
            key={s.id}
            onPress={() => navigation.navigate('PhrasePractice', { situationId: s.id })}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: COLORS.hover }]}
          >
            <Icon name={s.icon as IconName} size={24} color={COLORS.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{s.label}</Text>
              <Text style={styles.rowSub}>{s.sub}</Text>
            </View>
            <Text style={styles.rowCount}>{count}</Text>
            <Icon name="CaretRight" size={16} color="#bab6b6" />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  h2: { fontSize: 31, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 12, height: 46, marginBottom: 22 },
  searchInput: { flex: 1, fontSize: 15.5, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingVertical: 15, minHeight: 56 },
  rowLabel: { fontSize: 17.5, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  rowSub: { fontSize: 13, color: COLORS.label, marginTop: 2, fontFamily: FONT_SERIF_REGULAR },
  rowCount: { fontSize: 13, color: COLORS.labelFaint, fontFamily: FONT_SERIF_REGULAR },
});
