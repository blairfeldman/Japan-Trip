import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { CATEGORY, COLORS, FONT_SERIF, FONT_SERIF_REGULAR, SHADOW_SM, tagColors } from '../theme';
import { Category } from '../types';

export function CategoryDot({ cat, size = 10 }: { cat: Category; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: CATEGORY[cat].color, flexShrink: 0 }}
    />
  );
}

export function Tag({ label }: { label: string }) {
  if (!label) return null;
  const c = tagColors(label);
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      <Text style={[styles.tagText, { color: c.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function DoubleRule({ style }: { style?: ViewStyle }) {
  return (
    <View style={style}>
      <View style={{ height: 1, backgroundColor: COLORS.ink }} />
      <View style={{ height: 3, backgroundColor: COLORS.ink, marginTop: 2 }} />
    </View>
  );
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        style,
        pressed && { backgroundColor: COLORS.accentActive },
        disabled && { opacity: 0.5 },
      ]}
    >
      {icon}
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryBtn, style, pressed && { backgroundColor: COLORS.hover }]}
    >
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ initial, color, size = 26, overlap = false }: { initial: string; color: string; size?: number; overlap?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: overlap ? -14 : 0,
      }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.42, fontWeight: '600' }}>{initial}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: { fontSize: 10, letterSpacing: 1, fontFamily: FONT_SERIF, fontWeight: '600' },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.label,
    fontFamily: FONT_SERIF_REGULAR,
  },
  h2: {
    fontSize: 31,
    fontWeight: '600',
    fontFamily: FONT_SERIF,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: FONT_SERIF },
  secondaryBtn: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 15, color: COLORS.ink, fontFamily: FONT_SERIF_REGULAR },
  card: {
    backgroundColor: COLORS.card,
    ...SHADOW_SM,
  },
});
