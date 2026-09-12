import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { phrasesFor, SITUATIONS } from '../data/phrases';
import { Phrase } from '../types';
import { COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { Icon } from '../components/Icon';
import { playPractice, speakShort, stopSpeaking, PracticePlayback } from '../services/speech';

export default function PhrasePracticeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const situationId: string = route.params?.situationId;
  const situation = SITUATIONS.find((s) => s.id === situationId);
  const phrases = phrasesFor(situationId);

  const [featured, setFeatured] = useState<Phrase>(phrases[0]);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [wordIdx, setWordIdx] = useState(-1);
  const playback = useRef<PracticePlayback | null>(null);

  useEffect(() => {
    setFeatured(phrases[0]);
    return () => playback.current?.stop();
  }, [situationId]);

  useFocusEffect(
    React.useCallback(
      () => () => {
        playback.current?.stop();
        stopSpeaking();
        setPlaying(false);
        setWordIdx(-1);
      },
      []
    )
  );

  const words = featured.romaji.split(' ');

  function togglePlay() {
    if (playing) {
      playback.current?.stop();
      setPlaying(false);
      setWordIdx(-1);
      return;
    }
    setPlaying(true);
    playback.current = playPractice(featured.kana, words, {
      slow,
      onWord: setWordIdx,
      onDone: () => setPlaying(false),
    });
  }

  function pick(p: Phrase) {
    playback.current?.stop();
    setPlaying(false);
    setWordIdx(-1);
    setFeatured(p);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="ArrowLeft" size={19} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.title}>{situation?.label}</Text>
      </View>

      <View style={styles.practiceCard}>
        <Text style={styles.practiceLabel}>Now practising</Text>
        <Text style={styles.practiceEn}>{featured.en}</Text>
        <View style={styles.wordsRow}>
          {words.map((w, i) => (
            <Text key={i} style={[styles.word, wordIdx === i && { color: COLORS.magenta }]}>
              {w}
            </Text>
          ))}
        </View>
        <Text style={styles.kana}>{featured.kana}</Text>

        <View style={styles.controlsRow}>
          <Pressable onPress={togglePlay} style={styles.playBtn}>
            <Icon name={playing ? 'Pause' : 'Play'} size={25} color="#fff" />
          </Pressable>
          <View style={styles.waveRow}>
            {Array.from({ length: 26 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  { backgroundColor: playing ? COLORS.accent : COLORS.border, height: 20 + 14 * Math.abs(Math.sin(i * 1.7)) },
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={() => setSlow((s) => !s)}
            style={[styles.slowBtn, slow && { borderColor: COLORS.accent, backgroundColor: COLORS.accentTintStrong }]}
          >
            <Text style={[styles.slowText, slow && { color: COLORS.accentTintText }]}>{slow ? '0.6×' : '1×'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        {phrases.map((p) => (
          <Pressable key={p.id} onPress={() => pick(p)} style={styles.phraseRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.phraseEn}>{p.en}</Text>
              <Text style={styles.phraseRomaji}>{p.romaji}</Text>
              <Text style={styles.phraseKana}>{p.kana}</Text>
            </View>
            <Pressable onPress={() => speakShort(p.kana)} style={styles.speakBtn}>
              <Icon name="SpeakerHigh" size={19} color={COLORS.accent} />
            </Pressable>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  practiceCard: { margin: 20, backgroundColor: '#fff', borderLeftWidth: 3, borderLeftColor: COLORS.accent, padding: 18, shadowColor: '#2d2b2b', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  practiceLabel: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.label, marginBottom: 10, fontFamily: FONT_SERIF_REGULAR },
  practiceEn: { fontSize: 15, color: COLORS.inkMuted, marginBottom: 10, fontFamily: FONT_SERIF_REGULAR },
  wordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 6 },
  word: { fontSize: 27, lineHeight: 34, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  kana: { fontSize: 19, color: COLORS.inkSoft, marginBottom: 18, fontFamily: FONT_SERIF_REGULAR },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  waveRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 34 },
  waveBar: { flex: 1, borderRadius: 1 },
  slowBtn: { minHeight: 44, minWidth: 56, borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  slowText: { fontSize: 15, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  phraseRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: COLORS.hairline, paddingVertical: 14 },
  phraseEn: { fontSize: 14, color: COLORS.label, marginBottom: 3, fontFamily: FONT_SERIF_REGULAR },
  phraseRomaji: { fontSize: 19, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  phraseKana: { fontSize: 16, color: COLORS.inkSoft, marginTop: 2, fontFamily: FONT_SERIF_REGULAR },
  speakBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
});
