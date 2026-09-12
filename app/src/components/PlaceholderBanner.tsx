import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { COLORS, FONT_SERIF_REGULAR } from '../theme';
import { Icon } from './Icon';

/**
 * Honest "no photo" placeholder — a diagonal-hatch swatch, the same visual
 * language the prototype used for photo slots it didn't have real images
 * for. This is where a real cover photo (from the pin's TikTok clip, or a
 * booking confirmation image) would render once the backend has one.
 */
export function PlaceholderBanner({
  height = 190,
  caption,
  onBack,
}: {
  height?: number;
  caption?: string;
  onBack?: () => void;
}) {
  // The banner runs to the very top of the screen under edge-to-edge, so the
  // back button has to clear the status bar itself.
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height: height + insets.top, backgroundColor: '#eae7e7', position: 'relative' }}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="hatch" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
            <Rect width="12" height="12" fill="#eae7e7" />
            <Line x1="0" y1="0" x2="0" y2="12" stroke="#dedbdb" strokeWidth="6" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hatch)" />
      </Svg>
      {onBack && (
        <Pressable onPress={onBack} style={[styles.back, { top: insets.top + 14 }]} hitSlop={6}>
          <Icon name="ArrowLeft" size={19} color={COLORS.ink} />
        </Pressable>
      )}
      {caption && (
        <View style={styles.captionWrap}>
          <Text style={styles.caption}>{caption}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute', left: 14, top: 14, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(243,242,242,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  captionWrap: {
    position: 'absolute', left: 16, bottom: 16, backgroundColor: 'rgba(243,242,242,0.9)',
    paddingHorizontal: 8, paddingVertical: 3,
  },
  caption: { fontSize: 11, color: COLORS.label, fontFamily: FONT_SERIF_REGULAR },
});
