import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoneyNav } from '../navigation/types';
import { useAppState } from '../store/AppState';
import { fetchFxRate } from '../services/currency';
import { COLORS, FONT_SERIF, FONT_SERIF_REGULAR } from '../theme';
import { Icon } from '../components/Icon';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
const QUICK_JPY = ['500', '1000', '3300', '10000'];
const QUICK_USD = ['5', '10', '25', '100'];

/** Groups the integer part but keeps a half-typed decimal ("1 234." / "12.5") intact. */
function formatEntry(raw: string): string {
  if (raw === '') return '0';
  const [int, dec] = raw.split('.');
  const grouped = Number(int || '0').toLocaleString('en-US');
  return raw.includes('.') ? `${grouped}.${dec ?? ''}` : grouped;
}

export default function ConverterScreen() {
  const navigation = useNavigation<MoneyNav>();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useAppState();

  useEffect(() => {
    fetchFxRate().then((r) => dispatch({ type: 'SET_FX', jpyPerUsd: r.jpyPerUsd, live: r.live }));
  }, []);

  const jpyFirst = state.converter.dir === 'jpy';
  const raw = parseFloat(state.converter.amount) || 0;
  const converted = jpyFirst ? raw / state.fxRate : raw * state.fxRate;

  const press = (k: string) => {
    dispatch({
      type: 'SET_CONVERTER',
      patch: {
        amount:
          k === '⌫'
            ? state.converter.amount.slice(0, -1) || '0'
            : k === '.'
            ? state.converter.amount.includes('.')
              ? state.converter.amount
              : state.converter.amount + '.'
            : (state.converter.amount === '0' ? k : state.converter.amount + k).slice(0, 9),
      },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="ArrowLeft" size={19} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.title}>Convert</Text>
        <Pressable
          onPress={() =>
            dispatch({
              type: 'SET_CONVERTER',
              patch: {
                dir: jpyFirst ? 'usd' : 'jpy',
                amount: converted > 0 ? String(jpyFirst ? converted.toFixed(2) : Math.round(converted)) : '0',
              },
            })
          }
          style={styles.flipBtn}
        >
          <Text style={styles.flipText}>{jpyFirst ? '¥ → $' : '$ → ¥'}</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>{jpyFirst ? 'Japanese yen' : 'US dollars'}</Text>
        <Text style={styles.fromValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {(jpyFirst ? '¥' : '$') + formatEntry(state.converter.amount)}
        </Text>
        <Text style={styles.label}>{jpyFirst ? 'US dollars' : 'Japanese yen'}</Text>
        <Text style={styles.toValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {(jpyFirst ? '$' : '¥') + converted.toLocaleString('en-US', { minimumFractionDigits: jpyFirst ? 2 : 0, maximumFractionDigits: jpyFirst ? 2 : 0 })}
        </Text>
        <Text style={styles.rateNote}>
          ¥{state.fxRate.toFixed(2)} = $1.00 · {state.fxLive ? 'live rate' : 'planning rate, offline'}
        </Text>
        <View style={styles.quickRow}>
          {(jpyFirst ? QUICK_JPY : QUICK_USD).map((a) => (
            <Pressable key={a} onPress={() => dispatch({ type: 'SET_CONVERTER', patch: { amount: a } })} style={styles.quickBtn}>
              <Text style={styles.quickText}>{(jpyFirst ? '¥' : '$') + Number(a).toLocaleString()}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.keypad, { paddingBottom: 10 + insets.bottom }]}>
        {KEYS.map((k) => (
          <Pressable key={k} onPress={() => press(k)} style={({ pressed }) => [styles.key, pressed && { backgroundColor: '#cbeeff' }]}>
            <Text style={styles.keyText}>{k}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
  flipBtn: { marginLeft: 'auto', borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 16, paddingVertical: 7, minHeight: 38, justifyContent: 'center' },
  flipText: { fontSize: 14, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  label: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  fromValue: { fontSize: 52, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink, marginTop: 2, marginBottom: 18, borderBottomWidth: 2, borderBottomColor: COLORS.ink, paddingBottom: 8 },
  toValue: { fontSize: 52, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.link, marginTop: 2, marginBottom: 14 },
  rateNote: { fontSize: 13, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  quickBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 2, paddingHorizontal: 13, paddingVertical: 9, minHeight: 40, justifyContent: 'center' },
  quickText: { fontSize: 14, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  keypad: { backgroundColor: COLORS.hover, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: { width: '31.5%', minHeight: 58, backgroundColor: COLORS.bg, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 23, fontWeight: '600', fontFamily: FONT_SERIF, color: COLORS.ink },
});
