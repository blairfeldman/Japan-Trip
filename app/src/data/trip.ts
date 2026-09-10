export const TRIP = {
  name: 'Japan Trip',
  travelers: [
    { initial: 'B', name: 'Blair', color: '#006786' },
    { initial: 'Y', name: 'Yev', color: '#aa0b56' },
  ],
  start: '2026-09-25',
  end: '2026-10-06',
  cities: ['Tokyo', 'Hakone', 'Kyoto', 'Osaka'],
  exchangeRateFallback: 150, // JPY per $1, used until a live rate loads
  inboxEmail: 'japan@trip.mail',
};

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Tokyo: { lat: 35.6812, lng: 139.7671 },
  Hakone: { lat: 35.2323, lng: 139.1064 },
  Kyoto: { lat: 35.0116, lng: 135.7681 },
  Osaka: { lat: 34.6937, lng: 135.5023 },
};

export interface DayMeta {
  day: number; // 1-12
  date: string; // ISO yyyy-mm-dd
  dow: string; // 'Thu'
  dom: string; // '25'
  city: string;
  theme: string;
  heading: string; // 'Day 1 · Fri 9/25'
}

export const DAYS: DayMeta[] = [
  { day: 1, date: '2026-09-25', dow: 'Fri', dom: '25', city: 'Tokyo', theme: 'Arrival', heading: 'Day 1 · Fri 9/25' },
  { day: 2, date: '2026-09-26', dow: 'Sat', dom: '26', city: 'Tokyo', theme: 'Market + Food & Workshop Tour', heading: 'Day 2 · Sat 9/26' },
  { day: 3, date: '2026-09-27', dow: 'Sun', dom: '27', city: 'Tokyo', theme: 'Shibuya + Ginza + Art + Omakase', heading: 'Day 3 · Sun 9/27' },
  { day: 4, date: '2026-09-28', dow: 'Mon', dom: '28', city: 'Tokyo', theme: 'DisneySea', heading: 'Day 4 · Mon 9/28' },
  { day: 5, date: '2026-09-29', dow: 'Tue', dom: '29', city: 'Hakone', theme: 'Hakone (1 night)', heading: 'Day 5 · Tue 9/29' },
  { day: 6, date: '2026-09-30', dow: 'Wed', dom: '30', city: 'Hakone → Kyoto', theme: 'Travel to Kyoto + Nintendo Museum', heading: 'Day 6 · Wed 9/30' },
  { day: 7, date: '2026-10-01', dow: 'Thu', dom: '1', city: 'Kyoto', theme: 'Kyoto Highlights', heading: 'Day 7 · Thu 10/1' },
  { day: 8, date: '2026-10-02', dow: 'Fri', dom: '2', city: 'Kyoto', theme: 'Tea Ceremony + Craft + Market', heading: 'Day 8 · Fri 10/2' },
  { day: 9, date: '2026-10-03', dow: 'Sat', dom: '3', city: 'Kyoto → Osaka', theme: 'Travel to Osaka', heading: 'Day 9 · Sat 10/3' },
  { day: 10, date: '2026-10-04', dow: 'Sun', dom: '4', city: 'Osaka', theme: 'Universal Studios Japan', heading: 'Day 10 · Sun 10/4' },
  { day: 11, date: '2026-10-05', dow: 'Mon', dom: '5', city: 'Osaka', theme: 'Osaka', heading: 'Day 11 · Mon 10/5' },
  { day: 12, date: '2026-10-06', dow: 'Tue', dom: '6', city: 'Osaka + Departure', theme: 'Osaka + Departure', heading: 'Day 12 · Tue 10/6' },
];

export function cityCoordsFor(city: string): { lat: number; lng: number } {
  if (CITY_COORDS[city]) return CITY_COORDS[city];
  const match = Object.keys(CITY_COORDS).find((k) => city.includes(k));
  return match ? CITY_COORDS[match] : CITY_COORDS.Tokyo;
}

export function dayMetaForDate(dateIso: string): DayMeta | undefined {
  return DAYS.find((d) => d.date === dateIso);
}
