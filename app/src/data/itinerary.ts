import { ItineraryEvent } from '../types';

// Hand-built from the real itinerary sheet's day-by-day prose plus the exact
// booked confirmations called out in its Notes. Only Day 6 in the original
// prototype had a populated hour grid — this fills in all 12 days.
// Times without an explicit booking are reasonable estimates derived from
// the sheet's own morning/afternoon/evening structure, not invented facts.
export const ITINERARY: ItineraryEvent[] = [
  // ── Day 1 · Fri 9/25 — Arrival ────────────────────────────
  { id: 'd1-land', day: 1, start: 16.5, end: 17.25, cat: 'transit', title: 'Land at Narita, clear immigration', sub: 'NRT · get an IC card at the counter', tag: '',
    location: { name: 'Narita International Airport', address: '1-1 Furugome, Narita, Chiba', lat: 35.7719, lng: 140.3929 } },
  { id: 'd1-transfer', day: 1, start: 17.25, end: 18.25, cat: 'transit', title: 'Transfer to Shinjuku', sub: 'Narita Express or Limousine Bus · ~60 min', tag: 'Pay there' },
  { id: 'd1-checkin', day: 1, start: 18.25, end: 18.75, cat: 'hotel', title: 'Check in, Hotel Gracery Shinjuku', sub: 'Night 1 of 4', tag: 'Prepaid',
    location: { name: 'Hotel Gracery Shinjuku', address: '1-19-1 Kabukicho, Shinjuku', lat: 35.6952, lng: 139.7028 } },
  { id: 'd1-dinner', day: 1, start: 19.5, end: 21.0, cat: 'food', title: 'Ramen or izakaya near the hotel', sub: 'Easy dinner, early night', tag: 'Pay there' },

  // ── Day 2 · Sat 9/26 — Market + Private Food & Workshop Tour ─
  { id: 'd2-tsukiji', day: 2, start: 8.5, end: 10.5, cat: 'food', title: 'Tsukiji Fish Market food & walking tour', sub: 'Travel Japan Together · meet 3-chōme-11-8 Tsukiji', tag: 'Prepaid',
    location: { name: 'Tsukiji Outer Market', address: '3-chōme-11-8 Tsukiji, Chuo City', lat: 35.6654, lng: 139.7707 },
    booking: { confirmation: 'Airbnb Experience', reserved: 'Booked & paid' } },
  { id: 'd2-subway1', day: 2, start: 10.5, end: 11.0, cat: 'transit', title: 'Subway back to Shinjuku', sub: '~25–30 min', tag: '' },
  { id: 'd2-komehyo', day: 2, start: 11.0, end: 13.5, cat: 'shopping', title: 'Komehyo Shinjuku', sub: 'Chanel / Burberry hunting · opens 11:00', tag: '',
    location: { name: 'Komehyo Shinjuku', address: '3-19-2 Shinjuku', lat: 35.6928, lng: 139.7038 } },
  { id: 'd2-tour', day: 2, start: 14.0, end: 22.0, cat: 'sightseeing', title: 'Private tour with Toshiyuki D.', sub: 'GoWithGuide · Nakamise food, Senso-ji, Ameshin candy workshop, okonomiyaki dinner, izakaya · ends 10pm', tag: 'Prepaid',
    location: { name: 'Senso-ji, Asakusa', address: '2-3-1 Asakusa, Taito City', lat: 35.7148, lng: 139.7967 },
    booking: { confirmation: 'GoWithGuide · Toshiyuki D.', reserved: 'Booked & paid' } },

  // ── Day 3 · Sun 9/27 — Shibuya + Ginza + Art + Omakase ─────
  { id: 'd3-pancakes', day: 3, start: 8.0, end: 9.0, cat: 'food', title: "Flipper's Shibuya", sub: 'Fluffy soufflé pancake breakfast', tag: 'Pay there',
    location: { name: "Flipper's Shibuya", address: 'Shibuya City', lat: 35.6595, lng: 139.7004 } },
  { id: 'd3-crossing', day: 3, start: 9.0, end: 9.75, cat: 'sightseeing', title: 'Shibuya Crossing + Hachiko', sub: 'Then walk to Omotesando', tag: '' },
  { id: 'd3-vintage', day: 3, start: 11.5, end: 13.0, cat: 'shopping', title: 'Vintage Qoo Tokyo', sub: 'Omotesando · Chanel basement floor, opens 11:30', tag: '',
    location: { name: 'Vintage Qoo Tokyo', address: 'Colonnade Jingumae B1F-2F, 5-2-6 Jingumae, Shibuya', lat: 35.6690, lng: 139.7115 } },
  { id: 'd3-transit1', day: 3, start: 13.0, end: 13.4, cat: 'transit', title: 'Subway to Azabudai Hills', sub: '~20–25 min', tag: '' },
  { id: 'd3-teamlab', day: 3, start: 14.0, end: 17.0, cat: 'sightseeing', title: 'teamLab Borderless', sub: 'Azabudai Hills · timed entry', tag: 'Pay there',
    location: { name: 'teamLab Borderless', address: 'Azabudai Hills, Minato City', lat: 35.6627, lng: 139.7402 } },
  { id: 'd3-transit2', day: 3, start: 17.0, end: 17.3, cat: 'transit', title: 'Subway to Ginza', sub: '~15–20 min', tag: '' },
  { id: 'd3-ginza', day: 3, start: 17.3, end: 19.75, cat: 'shopping', title: 'Ginza vintage & designer resale', sub: 'Brand Off, Komehyo, Allu, Casanova Vintage', tag: '',
    location: { name: 'Ginza', address: 'Ginza, Chuo City', lat: 35.6717, lng: 139.7650 } },
  { id: 'd3-sushi', day: 3, start: 20.0, end: 21.5, cat: 'sushi', title: 'Sushi Itsutsu omakase dinner', sub: 'Ginza · ¥12,100/person', tag: 'Prepaid',
    location: { name: 'Sushi Itsutsu', address: 'Ginza, Chuo City', lat: 35.6716, lng: 139.7660 },
    booking: { paidUsd: '$161.33', perPersonUsd: '$80.67', reserved: 'Confirmed 8:00pm' } },

  // ── Day 4 · Mon 9/28 — DisneySea ────────────────────────────
  { id: 'd4-transit1', day: 4, start: 7.25, end: 8.0, cat: 'transit', title: 'Transport to Maihama', sub: 'JR / monorail', tag: 'Pay there' },
  { id: 'd4-early', day: 4, start: 8.0, end: 12.0, cat: 'sightseeing', title: 'Early entry, DisneySea rides & attractions', sub: '1-day ticket', tag: 'Pay there',
    location: { name: 'Tokyo DisneySea', address: '1-13 Maihama, Urayasu, Chiba', lat: 35.6267, lng: 139.8850 } },
  { id: 'd4-mid', day: 4, start: 12.0, end: 17.5, cat: 'sightseeing', title: 'Rides & attractions continue', sub: '', tag: '' },
  { id: 'd4-dinner', day: 4, start: 17.5, end: 18.5, cat: 'food', title: 'In-park dinner', sub: '', tag: 'Pay there' },
  { id: 'd4-show', day: 4, start: 18.5, end: 21.0, cat: 'sightseeing', title: 'Nighttime water show', sub: '', tag: '' },

  // ── Day 5 · Tue 9/29 — Hakone (1 night) ─────────────────────
  { id: 'd5-checkout', day: 5, start: 11.0, end: 12.0, cat: 'hotel', title: 'Check out, head to Shinjuku Station', sub: 'Hotel Gracery Shinjuku', tag: '' },
  { id: 'd5-romancecar', day: 5, start: 12.33, end: 13.78, cat: 'transit', title: 'Odakyu Romancecar "Hakone 25" (EXE6)', sub: 'Shinjuku → Hakone-Yumoto · Car 1, seats 8C/8D', tag: 'Prepaid',
    location: { name: 'Hakone-Yumoto Station', address: 'Yumoto, Hakone, Kanagawa', lat: 35.2323, lng: 139.1064 },
    booking: { confirmation: 'Booking #00008', seatCar: 'Car 1 · 8C, 8D', reserved: 'Booked' } },
  { id: 'd5-lunch', day: 5, start: 13.83, end: 14.5, cat: 'food', title: 'Lunch en route', sub: '', tag: 'Pay there' },
  { id: 'd5-owakudani', day: 5, start: 14.5, end: 16.0, cat: 'sightseeing', title: 'Owakudani volcanic valley + ropeway', sub: 'Hakone Free Pass', tag: 'Pay there',
    location: { name: 'Owakudani', address: 'Sengokuhara, Hakone, Kanagawa', lat: 35.2436, lng: 139.0197 } },
  { id: 'd5-museum', day: 5, start: 16.0, end: 17.5, cat: 'sightseeing', title: 'Hakone Open-Air Museum', sub: 'Covered by Free Pass', tag: '',
    location: { name: 'Hakone Open-Air Museum', address: '1121 Ninotaira, Hakone, Kanagawa', lat: 35.2422, lng: 139.0522 } },
  { id: 'd5-checkin', day: 5, start: 18.0, end: 18.5, cat: 'hotel', title: 'Check into Gora Kadan', sub: '', tag: 'Prepaid',
    location: { name: 'Gora Kadan', address: '1300 Gora, Hakone, Kanagawa', lat: 35.2426, lng: 139.0503 } },
  { id: 'd5-kaiseki', day: 5, start: 19.0, end: 20.5, cat: 'hotel', title: 'Kaiseki dinner, in-ryokan', sub: 'Included in the room rate', tag: '' },
  { id: 'd5-onsen', day: 5, start: 21.0, end: 21.75, cat: 'hotel', title: 'Evening onsen soak', sub: '', tag: '' },

  // ── Day 6 · Wed 9/30 — Travel to Kyoto + Nintendo Museum ────
  { id: 'bkfst', day: 6, start: 7.5, end: 8.75, cat: 'hotel', title: 'Kaiseki breakfast, in-room', sub: 'Gora Kadan · checkout 11:00', tag: 'Prepaid' },
  { id: 't1', day: 6, start: 8.75, end: 9.4, cat: 'transit', title: 'Bus to Togendai', sub: 'Hakone Tozan · 35 min', tag: '' },
  { id: 'ashi', day: 6, start: 9.4, end: 10.75, cat: 'sightseeing', title: 'Lake Ashi cruise + floating torii', sub: 'Hakone Free Pass covers it · 6 min walk', tag: 'Prepaid' },
  { id: 't2', day: 6, start: 11.0, end: 11.6, cat: 'transit', title: 'Back to Gora, grab bags → Odawara', sub: 'Leave 11:35 · 25 min', tag: '' },
  { id: 'shink', day: 6, start: 12.1, end: 14.2, cat: 'transit', title: 'HIKARI 641 → Kyoto', sub: 'Car 10, seats 12-D/E · 12:07', tag: 'Prepaid',
    location: { name: 'Kyoto Station', address: 'Karasuma-dori, Kyoto', lat: 34.9858, lng: 135.7588 },
    booking: { confirmation: 'SMS-4471902', seatCar: '10 · 12-D, 12-E', paidUsd: '$202.00', perPersonUsd: '$101.00', cancelBy: 'Sept 30, 12:00', reserved: 'Aug 14' } },
  { id: 'ckin', day: 6, start: 14.5, end: 15.25, cat: 'hotel', title: 'Check in, Akari Kyoto Gion', sub: '46-7 Bishamon-cho · drop bags', tag: 'Prepaid',
    location: { name: 'Akari Kyoto Gion', address: '46-7 Bishamon-cho, Gion, Kyoto', lat: 35.0037, lng: 135.7745 } },
  { id: 't3', day: 6, start: 15.25, end: 16.0, cat: 'transit', title: 'Kintetsu to Ogura', sub: '40 min + 8 min walk', tag: '' },
  { id: 'nint', day: 6, start: 16.0, end: 19.5, cat: 'sightseeing', title: 'Nintendo Museum, Uji', sub: '4:00pm timed entry · ¥3,300 pp', tag: 'Prepaid',
    location: { name: 'Nintendo Museum', address: '8 Kamitoba, Uji, Kyoto', lat: 34.8983, lng: 135.8072 },
    booking: { reserved: 'Direct purchase · not lottery' } },
  { id: 'dinner', day: 6, start: 20.0, end: 21.25, cat: 'food', title: 'Dinner back in Kyoto', sub: 'Pontocho or near the station', tag: 'Pay there' },

  // ── Day 7 · Thu 10/1 — Kyoto Highlights ─────────────────────
  { id: 'd7-fushimi', day: 7, start: 7.5, end: 9.0, cat: 'sightseeing', title: 'Fushimi Inari Shrine', sub: 'Early, to beat crowds and heat', tag: '',
    location: { name: 'Fushimi Inari Taisha', address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto', lat: 34.9671, lng: 135.7727 } },
  { id: 'd7-transit', day: 7, start: 9.5, end: 10.25, cat: 'transit', title: 'Travel to Higashiyama', sub: '', tag: '' },
  { id: 'd7-kiyomizu', day: 7, start: 10.25, end: 12.5, cat: 'sightseeing', title: 'Kiyomizu-dera + Higashiyama district', sub: 'Ninenzaka / Sannenzaka on the way down', tag: 'Pay there',
    location: { name: 'Kiyomizu-dera', address: '1 Kiyomizu, Higashiyama Ward, Kyoto', lat: 34.9948, lng: 135.7850 } },
  { id: 'd7-lunch', day: 7, start: 12.5, end: 13.5, cat: 'food', title: 'Lunch in Higashiyama', sub: '', tag: 'Pay there' },
  { id: 'd7-dinner', day: 7, start: 19.0, end: 20.5, cat: 'food', title: 'Dinner in Gion or Pontocho', sub: 'Easy walk back to the hotel', tag: 'Pay there' },

  // ── Day 8 · Fri 10/2 — Tea Ceremony + Craft + Market ────────
  { id: 'd8-tea', day: 8, start: 11.0, end: 13.25, cat: 'matcha', title: 'Traditional tea ceremony with matcha', sub: 'Japan Wonder Travel · meet Yamato Town, 5F', tag: 'Prepaid',
    location: { name: 'Yamato Town', address: 'Kyoto', lat: 35.0037, lng: 135.7700 },
    booking: { confirmation: 'Airbnb Experience', reserved: 'Booked & paid' } },
  { id: 'd8-chopsticks', day: 8, start: 14.0, end: 15.5, cat: 'sightseeing', title: 'Chopstick-making workshop', sub: 'With engraving', tag: 'Pay there' },
  { id: 'd8-nishiki', day: 8, start: 18.0, end: 20.0, cat: 'food', title: 'Nishiki Market food crawl', sub: '', tag: 'Pay there',
    location: { name: 'Nishiki Market', address: 'Nishikikoji-dori, Nakagyo Ward, Kyoto', lat: 35.0050, lng: 135.7649 } },

  // ── Day 9 · Sat 10/3 — Travel to Osaka ──────────────────────
  { id: 'd9-checkout', day: 9, start: 10.5, end: 11.5, cat: 'transit', title: 'Kyoto checkout, JR Special Rapid to Osaka', sub: '~29 min', tag: 'Pay there' },
  { id: 'd9-checkin', day: 9, start: 12.0, end: 12.5, cat: 'hotel', title: 'Check into Mercure Tokyu Stay Namba', sub: 'Night 1 of 3', tag: 'Prepaid',
    location: { name: 'Mercure Tokyu Stay Osaka Namba', address: 'Namba, Chuo Ward, Osaka', lat: 34.6656, lng: 135.5008 } },
  { id: 'd9-amerikamura', day: 9, start: 13.5, end: 16.0, cat: 'shopping', title: 'Amerikamura vintage & secondhand designer', sub: '', tag: '',
    location: { name: 'Amerikamura', address: 'Nishishinsaibashi, Chuo Ward, Osaka', lat: 34.6717, lng: 135.4977 } },
  { id: 'd9-dotonbori', day: 9, start: 18.5, end: 20.5, cat: 'food', title: 'Dotonbori food crawl', sub: 'Takoyaki, okonomiyaki, kushikatsu', tag: 'Pay there',
    location: { name: 'Dotonbori', address: 'Dotonbori, Chuo Ward, Osaka', lat: 34.6687, lng: 135.5013 } },

  // ── Day 10 · Sun 10/4 — Universal Studios Japan ─────────────
  { id: 'd10-transit', day: 10, start: 8.0, end: 8.75, cat: 'transit', title: 'Subway/JR to Universal City Station', sub: '', tag: 'Pay there' },
  { id: 'd10-snw', day: 10, start: 8.75, end: 10.0, cat: 'sightseeing', title: 'Super Nintendo World', sub: 'Express Pass timed entry · arrive at/before open', tag: 'Pay there',
    location: { name: 'Universal Studios Japan', address: '2 Chome-1-33 Sakurajima, Konohana Ward, Osaka', lat: 34.6654, lng: 135.4323 } },
  { id: 'd10-usj', day: 10, start: 10.0, end: 17.0, cat: 'sightseeing', title: 'Wizarding World, Minion Park, other attractions', sub: '1-Day Studio Pass', tag: '' },
  { id: 'd10-dinner', day: 10, start: 18.0, end: 19.0, cat: 'food', title: 'Dinner in-park or back in Dotonbori', sub: '', tag: 'Pay there' },

  // ── Day 11 · Mon 10/5 — Osaka ────────────────────────────────
  { id: 'd11-castle', day: 11, start: 9.0, end: 11.0, cat: 'sightseeing', title: 'Osaka Castle', sub: '', tag: 'Pay there',
    location: { name: 'Osaka Castle', address: '1-1 Osakajo, Chuo Ward, Osaka', lat: 34.6873, lng: 135.5262 } },
  { id: 'd11-shinsaibashi', day: 11, start: 12.0, end: 15.0, cat: 'shopping', title: 'Shinsaibashi-suji shopping arcade', sub: 'More vintage hunting', tag: '',
    location: { name: 'Shinsaibashi-suji', address: 'Shinsaibashisuji, Chuo Ward, Osaka', lat: 34.6742, lng: 135.5013 } },
  { id: 'd11-umeda', day: 11, start: 17.0, end: 18.0, cat: 'sightseeing', title: 'Umeda Sky Building views', sub: '', tag: '',
    location: { name: 'Umeda Sky Building', address: '1-1-88 Oyodonaka, Kita Ward, Osaka', lat: 34.7053, lng: 135.4901 } },
  { id: 'd11-dinner', day: 11, start: 19.0, end: 20.5, cat: 'food', title: 'Izakaya dinner', sub: '', tag: 'Pay there' },

  // ── Day 12 · Tue 10/6 — Osaka + Departure ───────────────────
  { id: 'd12-morning', day: 12, start: 9.0, end: 11.5, cat: 'shopping', title: 'Relaxed morning', sub: 'Last-minute Shinsaibashi shopping or a final Osaka meal', tag: '' },
  { id: 'd12-transfer', day: 12, start: 13.5, end: 14.17, cat: 'transit', title: 'Transfer to Kansai Airport', sub: 'Depart hotel by ~1:30–2:00pm', tag: 'Pay there',
    location: { name: 'Kansai International Airport', address: '1 Senshukuku, Tajiri, Osaka', lat: 34.4347, lng: 135.2441 } },
  { id: 'd12-checkin', day: 12, start: 14.17, end: 16.75, cat: 'transit', title: 'International check-in & security', sub: '', tag: '' },
  { id: 'd12-flight', day: 12, start: 17.75, end: 17.75, cat: 'transit', title: 'DEPARTURE: 5:45pm flight from KIX', sub: '', tag: '' },
];

export function eventsForDay(day: number): ItineraryEvent[] {
  return ITINERARY.filter((e) => e.day === day).sort((a, b) => a.start - b.start);
}
