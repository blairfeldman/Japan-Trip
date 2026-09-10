import { SavedPin } from '../types';

export const SEED_PINS: SavedPin[] = [
  {
    id: 'p-kikanbo', name: 'Kikanbo 鬼金棒', cat: 'ramen',
    address: '2-10-9 Kajicho, Chiyoda', lat: 35.6969, lng: 139.7679,
    sub: 'Karashibi miso ramen · queue 20–40 min · cash + IC', who: 'both',
    hours: 'Open 11:00–21:30 · closed Sundays', price: '¥1,100 · cash and IC only',
    note: 'Fits Day 3 — you’re in Ginza that evening, 12 min away',
    clips: [
      { handle: '@tokyoramenwalk', caption: 'the spicy numbing one everyone lines up for', savedBy: 'Y', savedAt: '2026-08-12' },
      { handle: '@notanotherfoodie', caption: 'karashibi miso is worth the wait', savedBy: 'B', savedAt: '2026-08-30' },
    ],
    createdAt: '2026-08-12',
  },
  {
    id: 'p-kurasu', name: 'Kurasu Kyoto', cat: 'matcha',
    address: 'Kiyamachi-dori, Nakagyo Ward, Kyoto', lat: 35.0116, lng: 135.7681,
    sub: 'Coffee · opens 8:00', who: 'B',
    hours: 'Opens 8:00 daily',
    clips: [{ handle: '@kyotocoffee', caption: 'best pour-over near Kiyamachi', savedBy: 'B', savedAt: '2026-08-20' }],
    createdAt: '2026-08-20',
  },
  {
    id: 'p-nishiki', name: 'Nishiki Market', cat: 'food',
    address: 'Nishikikoji-dori, Nakagyo Ward, Kyoto', lat: 35.0050, lng: 135.7649,
    sub: 'Food street', who: 'B',
    clips: [{ handle: '@japaneats', caption: 'Kyoto’s kitchen — go hungry', savedBy: 'B', savedAt: '2026-08-18' }],
    createdAt: '2026-08-18',
  },
  {
    id: 'p-komehyo-kyoto', name: 'Komehyo Kyoto', cat: 'shopping',
    address: 'Shijo-dori, Shimogyo Ward, Kyoto', lat: 35.0037, lng: 135.7681,
    sub: 'Resale', who: 'Y',
    clips: [{ handle: '@vintagejp', caption: 'Hermès floor is upstairs', savedBy: 'Y', savedAt: '2026-08-22' }],
    createdAt: '2026-08-22',
  },
  {
    id: 'p-sushi-matsumoto', name: 'Sushi Matsumoto', cat: 'sushi',
    address: 'Nakagyo Ward, Kyoto', lat: 35.0045, lng: 135.7700,
    sub: 'Omakase', who: 'B',
    clips: [{ handle: '@omakasejapan', caption: 'reserve two weeks out, worth it', savedBy: 'B', savedAt: '2026-08-25' }],
    createdAt: '2026-08-25',
  },
  {
    id: 'p-ippodo', name: 'Ippodo Tea', cat: 'matcha',
    address: 'Teramachi-dori, Nakagyo Ward, Kyoto', lat: 35.0111, lng: 135.7654,
    sub: 'Tearoom', who: 'Y',
    clips: [{ handle: '@matchadiaries', caption: 'the tasting flight is worth it', savedBy: 'Y', savedAt: '2026-08-27' }],
    createdAt: '2026-08-27',
  },
  {
    id: 'p-flippers', name: "Flipper's Shibuya", cat: 'food',
    address: 'Shibuya City, Tokyo', lat: 35.6595, lng: 139.7004,
    sub: 'Soufflé pancakes', who: 'B',
    clips: [{ handle: '@tokyobrunch', caption: 'miracle pancake course, get there early', savedBy: 'B', savedAt: '2026-08-05' }],
    createdAt: '2026-08-05',
  },
  {
    id: 'p-vintageqoo', name: 'Vintage Qoo Tokyo', cat: 'shopping',
    address: 'Colonnade Jingumae, Shibuya', lat: 35.6690, lng: 139.7115,
    sub: 'Chanel basement floor', who: 'Y',
    clips: [{ handle: '@resaletokyo', caption: '2,000 vintage Chanel pieces in the basement', savedBy: 'Y', savedAt: '2026-08-08' }],
    createdAt: '2026-08-08',
  },
];
