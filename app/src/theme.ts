import { Category } from './types';

// Converted from the prototype's oklch(0.55 …) category hues to sRGB hex,
// since RN's style engine doesn't reliably parse oklch() across platforms.
export const CATEGORY: Record<Category, { label: string; color: string }> = {
  ramen: { label: 'Ramen', color: '#bd4334' },
  sushi: { label: 'Sushi', color: '#b53c7f' },
  matcha: { label: 'Matcha', color: '#3f842e' },
  food: { label: 'Other food', color: '#9d6400' },
  shopping: { label: 'Shopping', color: '#8854bb' },
  hotel: { label: 'Hotel', color: '#1f74bf' },
  sightseeing: { label: 'Sightseeing', color: '#008585' },
  transit: { label: 'Transit', color: '#7d7979' },
};

export const COLORS = {
  bg: '#f3f2f2',
  bgCanvas: '#dedbd7',
  ink: '#201e1d',
  inkSoft: '#444141',
  inkMuted: '#605d5d',
  label: '#7d7979',
  labelFaint: '#9b9797',
  hairline: '#e2dfdf',
  border: '#d7d3d3',
  card: '#ffffff',
  hover: '#eae7e7',
  link: '#006786',
  linkHover: '#0088b0',
  accent: '#0088b0',
  accentHover: '#1186ac',
  accentActive: '#006786',
  accentTint: '#e9f8ff',
  accentTintStrong: '#cbeeff',
  accentTintText: '#004961',
  magenta: '#d6006c',
  magentaDeep: '#aa0b56',
  magentaTint: '#fff1f4',
  payThereTint: '#ffdee6',
  payThereText: '#790e3d',
  undecidedTint: '#ffc0d0',
  undecidedBorder: '#ff90b1',
  prepaidTint: '#99e0ff',
  gpsBlue: '#1a73e8',
};

export const FONT_SERIF = 'SourceSerif4_600SemiBold';
export const FONT_SERIF_REGULAR = 'SourceSerif4_400Regular';

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const RADIUS = { sm: 2, md: 8, lg: 14 };

export const SHADOW_CARD = {
  shadowColor: '#2d2b2b',
  shadowOpacity: 0.16,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
};

export const SHADOW_SM = {
  shadowColor: '#2d2b2b',
  shadowOpacity: 0.14,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};

export function tagColors(tag: string): { bg: string; text: string } {
  if (tag === 'Prepaid') return { bg: COLORS.accentTintStrong, text: COLORS.accentTintText };
  if (tag === 'Undecided') return { bg: COLORS.undecidedTint, text: COLORS.payThereText };
  return { bg: COLORS.payThereTint, text: COLORS.payThereText };
}
