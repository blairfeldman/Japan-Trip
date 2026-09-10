// Generated from project/uploads/itinerary_files-*.xlsx (Budget sheet, Itemized Costs table).
// Classification: Lodging rows and any row whose source notes literally say 'BOOKED' are Prepaid;
// rows flagged Optional in the sheet are Undecided; everything else is Pay there.
import { Category } from '../types';

export interface BudgetItem {
  id: string;
  day: number;
  city: string;
  cat: Category;
  item: string;
  usd: number;
  jpy: number;
  perTraveler: number;
  tag: 'Prepaid' | 'Pay there' | 'Undecided';
  notes: string;
}

export type Decisions = Record<string, 'booked' | 'skipped'>;

/** Applies "Book it" / "Skip" choices made on undecided items: booked ones
 * become Prepaid, skipped ones drop out of the budget entirely. */
export function applyDecisions(items: BudgetItem[], decisions: Decisions): BudgetItem[] {
  return items
    .filter((i) => !(i.tag === 'Undecided' && decisions[i.id] === 'skipped'))
    .map((i) => (i.tag === 'Undecided' && decisions[i.id] === 'booked' ? { ...i, tag: 'Prepaid' as const } : i));
}

export function dayTotalUsd(day: number, decisions: Decisions = {}): number {
  return applyDecisions(BUDGET_ITEMS.filter((i) => i.day === day), decisions).reduce((sum, i) => sum + i.usd, 0);
}

export function tripTotals(decisions: Decisions = {}) {
  const items = applyDecisions(BUDGET_ITEMS, decisions);
  const prepaid = items.filter((i) => i.tag === 'Prepaid').reduce((s, i) => s + i.usd, 0);
  const payThere = items.filter((i) => i.tag === 'Pay there').reduce((s, i) => s + i.usd, 0);
  const undecided = items.filter((i) => i.tag === 'Undecided').reduce((s, i) => s + i.usd, 0);
  return { prepaid, payThere, undecided, total: prepaid + payThere + undecided };
}

export const BUDGET_ITEMS: BudgetItem[] = [
  { id: 'gracery-hotel-1-of-4-nights', day: 1, city: 'Tokyo', cat: 'hotel', item: 'Gracery Hotel (1 of 4 nights)', usd: 239.11, jpy: 35867, perTraveler: 119.56, tag: 'Prepaid', notes: 'Given by user: Gracery Hotel, $956.45 total for Sept 25-29 (4 nights), split evenly ~$239.11/night' },
  { id: 'airport-transfer-narita-express-limousin', day: 1, city: 'Tokyo', cat: 'transit', item: 'Airport transfer (Narita Express / Limousine Bus)', usd: 42.67, jpy: 6400, perTraveler: 21.33, tag: 'Pay there', notes: 'Estimate — Narita Express ~¥3,070-3,250 one-way, Limousine Bus similar' },
  { id: 'arrival-day-meals-est', day: 1, city: 'Tokyo', cat: 'food', item: 'Arrival day meals (est.)', usd: 53.33, jpy: 8000, perTraveler: 26.67, tag: 'Pay there', notes: 'Rough daily food estimate; late arrival, light dinner' },
  { id: 'gracery-hotel-2-of-4-nights', day: 2, city: 'Tokyo', cat: 'hotel', item: 'Gracery Hotel (2 of 4 nights)', usd: 239.11, jpy: 35867, perTraveler: 119.56, tag: 'Prepaid', notes: 'Given by user: Gracery Hotel, $956.45 total for Sept 25-29 (4 nights), split evenly ~$239.11/night' },
  { id: 'tokyo-tsukiji-fish-market-food-and-walki', day: 2, city: 'Tokyo', cat: 'food', item: 'Tokyo Tsukiji Fish Market Food and Walking Tour (Travel Japan Together)', usd: 50, jpy: 7500, perTraveler: 25, tag: 'Prepaid', notes: 'BOOKED & PAID: Airbnb Experience, Sat 9/26, 8:30-10:30am (2 hrs), meet at 3-chōme-11-8 Tsukiji. $25/person.' },
  { id: 'tokyo-subway-day-travel', day: 2, city: 'Tokyo', cat: 'transit', item: 'Tokyo subway/day travel', usd: 10.67, jpy: 1600, perTraveler: 5.33, tag: 'Pay there', notes: 'Estimate — Tokyo Metro day pass / IC card taps' },
  { id: 'extra-snacks-drinks-beyond-the-tour-est', day: 2, city: 'Tokyo', cat: 'food', item: 'Extra snacks/drinks beyond the tour (est.)', usd: 13.33, jpy: 2000, perTraveler: 6.67, tag: 'Pay there', notes: 'Reduced further — the booked Tsukiji tour is a food tour with tastings included; this just covers anything extra' },
  { id: 'gracery-hotel-3-of-4-nights', day: 3, city: 'Tokyo', cat: 'hotel', item: 'Gracery Hotel (3 of 4 nights)', usd: 239.11, jpy: 35867, perTraveler: 119.56, tag: 'Prepaid', notes: 'Given by user: Gracery Hotel, $956.45 total for Sept 25-29 (4 nights), split evenly ~$239.11/night' },
  { id: 'teamlab-borderless-ticket', day: 3, city: 'Tokyo', cat: 'sightseeing', item: 'teamLab Borderless ticket', usd: 57.33, jpy: 8600, perTraveler: 28.67, tag: 'Pay there', notes: 'Official pricing ¥3,800-4,800/adult, avg used' },
  { id: 'sushi-itsutsu-omakase-dinner-ginza', day: 3, city: 'Tokyo', cat: 'sushi', item: 'Sushi Itsutsu omakase dinner (Ginza)', usd: 161.33, jpy: 24200, perTraveler: 80.67, tag: 'Prepaid', notes: 'Chosen: Sushi Itsutsu, Ginza — BOOKED 8:00pm, ¥12,100/person (tax incl.)' },
  { id: 'tokyo-subway-day-travel-shibuya-azabudai', day: 3, city: 'Tokyo', cat: 'transit', item: 'Tokyo subway/day travel (Shibuya-Azabudai-Ginza)', usd: 16, jpy: 2400, perTraveler: 8, tag: 'Pay there', notes: 'One-directional route now: Shibuya → Azabudai Hills (teamLab) → Ginza (shopping + dinner), no backtracking' },
  { id: 'gracery-hotel-4-of-4-nights', day: 4, city: 'Tokyo', cat: 'hotel', item: 'Gracery Hotel (4 of 4 nights)', usd: 239.11, jpy: 35867, perTraveler: 119.56, tag: 'Prepaid', notes: 'Given by user: Gracery Hotel, $956.45 total for Sept 25-29 (4 nights), split evenly ~$239.11/night' },
  { id: 'tokyo-disneysea-1-day-ticket', day: 4, city: 'Tokyo', cat: 'sightseeing', item: 'Tokyo DisneySea 1-day ticket', usd: 125.33, jpy: 18800, perTraveler: 62.67, tag: 'Pay there', notes: 'Official date-based pricing ¥7,900-10,900/adult, avg used' },
  { id: 'in-park-meals-est', day: 4, city: 'Tokyo', cat: 'food', item: 'In-park meals (est.)', usd: 53.33, jpy: 8000, perTraveler: 26.67, tag: 'Pay there', notes: 'Theme park food premium estimate' },
  { id: 'transport-to-from-maihama-disneysea', day: 4, city: 'Tokyo', cat: 'transit', item: 'Transport to/from Maihama (DisneySea)', usd: 8, jpy: 1200, perTraveler: 4, tag: 'Pay there', notes: 'Estimate — JR/monorail fare' },
  { id: 'gora-kadan-1-night', day: 5, city: 'Hakone', cat: 'hotel', item: 'Gora Kadan, 1 night', usd: 1145.99, jpy: 171898, perTraveler: 572.99, tag: 'Prepaid', notes: 'Given by user: Gora Kadan, $1,145.99 total for Sept 29-30 (1 night)' },
  { id: 'odakyu-romancecar-hakone-25-exe6-shinjuk', day: 5, city: 'Hakone', cat: 'transit', item: 'Odakyu Romancecar "Hakone 25" (EXE6), Shinjuku-Hakone-Yumoto', usd: 15.33, jpy: 2300, perTraveler: 7.67, tag: 'Prepaid', notes: 'BOOKED: Booking #00008, Tue 9/29, 12:20 Shinjuku → 13:47 Hakone-Yumoto, Car 1 seats 8C/8D. ¥2,300 total is the limited express reserved-seat surcharge for both adults — base IC card fare (~¥1,190/person) is separate, paid via Suica/Pasmo tap' },
  { id: 'hakone-free-pass-2-day-from-shinjuku', day: 5, city: 'Hakone', cat: 'transit', item: 'Hakone Free Pass (2-day, from Shinjuku)', usd: 81.33, jpy: 12200, perTraveler: 40.67, tag: 'Pay there', notes: 'Official Odakyu pricing, covers ropeway/cablecar/boat/bus' },
  { id: 'lunch-en-route-est', day: 5, city: 'Hakone', cat: 'food', item: 'Lunch en route (est.)', usd: 33.33, jpy: 5000, perTraveler: 16.67, tag: 'Pay there', notes: 'Kaiseki dinner + breakfast assumed included in ryokan rate' },
  { id: 'akari-kyoto-gion-1-of-3-nights', day: 6, city: 'Kyoto', cat: 'hotel', item: 'Akari Kyoto Gion (1 of 3 nights)', usd: 180, jpy: 27000, perTraveler: 90, tag: 'Prepaid', notes: 'Given by user: Akari Kyoto Gion, 46-7 Bishamon-cho, Gion, ¥81,000 total for Sept 30-Oct 3 (3 nights), split evenly' },
  { id: 'shinkansen-hikari-641-odawara-kyoto', day: 6, city: 'Kyoto', cat: 'transit', item: 'Shinkansen HIKARI 641, Odawara-Kyoto', usd: 202, jpy: 30300, perTraveler: 101, tag: 'Prepaid', notes: 'BOOKED: HIKARI 641, Wed 9/30, 12:07 Odawara → 14:12 Kyoto, Car 10 Seat 12-D. $101/person as given' },
  { id: 'quick-dinner-near-uji-kyoto-travel-day-m', day: 6, city: 'Kyoto', cat: 'food', item: 'Quick dinner near Uji/Kyoto + travel day meals (est.)', usd: 66.67, jpy: 10000, perTraveler: 33.33, tag: 'Pay there', notes: 'Replaces Pontocho dinner since evening now spent at Nintendo Museum' },
  { id: 'akari-kyoto-gion-2-of-3-nights', day: 7, city: 'Kyoto', cat: 'hotel', item: 'Akari Kyoto Gion (2 of 3 nights)', usd: 180, jpy: 27000, perTraveler: 90, tag: 'Prepaid', notes: 'Given by user: Akari Kyoto Gion, 46-7 Bishamon-cho, Gion, ¥81,000 total for Sept 30-Oct 3 (3 nights), split evenly' },
  { id: 'kiyomizu-dera-entry', day: 7, city: 'Kyoto', cat: 'sightseeing', item: 'Kiyomizu-dera entry', usd: 5.33, jpy: 800, perTraveler: 2.67, tag: 'Pay there', notes: 'Official entry fee' },
  { id: 'higashiyama-local-guide-half-day', day: 7, city: 'Kyoto', cat: 'sightseeing', item: 'Higashiyama local guide (half day)', usd: 183.33, jpy: 27500, perTraveler: 91.67, tag: 'Undecided', notes: 'Estimate — licensed local guide ¥20,000-35,000/half day, booking not per-person' },
  { id: 'kyoto-bus-subway-day-pass', day: 7, city: 'Kyoto', cat: 'transit', item: 'Kyoto bus/subway day pass', usd: 14.67, jpy: 2200, perTraveler: 7.33, tag: 'Pay there', notes: 'Official Bus & Subway 1-Day Combo Pass' },
  { id: 'meals-est', day: 7, city: 'Kyoto', cat: 'food', item: 'Meals (est.)', usd: 66.67, jpy: 10000, perTraveler: 33.33, tag: 'Pay there', notes: 'General daily food estimate' },
  { id: 'akari-kyoto-gion-3-of-3-nights', day: 8, city: 'Kyoto', cat: 'hotel', item: 'Akari Kyoto Gion (3 of 3 nights)', usd: 180, jpy: 27000, perTraveler: 90, tag: 'Prepaid', notes: 'Given by user: Akari Kyoto Gion, 46-7 Bishamon-cho, Gion, ¥81,000 total for Sept 30-Oct 3 (3 nights), split evenly' },
  { id: 'nintendo-museum-ticket-uji', day: 6, city: 'Kyoto', cat: 'sightseeing', item: 'Nintendo Museum ticket (Uji)', usd: 44, jpy: 6600, perTraveler: 22, tag: 'Prepaid', notes: 'Official adult ticket price, ¥3,300 — BOOKED for 4:00pm entry on 9/30, direct purchase (not lottery)' },
  { id: 'chopstick-making-workshop-w-engraving', day: 8, city: 'Kyoto', cat: 'sightseeing', item: 'Chopstick-making workshop w/ engraving', usd: 53.33, jpy: 8000, perTraveler: 26.67, tag: 'Pay there', notes: 'Typical Kyoto workshop ¥3,000-5,000/person incl. engraving' },
  { id: 'nishiki-market-food-walk-tour', day: 8, city: 'Kyoto', cat: 'food', item: 'Nishiki Market food-walk tour', usd: 190, jpy: 28500, perTraveler: 95, tag: 'Undecided', notes: 'Small-group food tour, ~$70-120/person, midpoint used' },
  { id: 'round-trip-to-uji-kintetsu-line', day: 6, city: 'Kyoto', cat: 'transit', item: 'Round-trip to Uji (Kintetsu Line)', usd: 9.6, jpy: 1440, perTraveler: 4.8, tag: 'Pay there', notes: '~¥360 each way to Ogura Station for Nintendo Museum' },
  { id: 'kyoto-bus-subway-day-pass-2', day: 8, city: 'Kyoto', cat: 'transit', item: 'Kyoto bus/subway day pass', usd: 14.67, jpy: 2200, perTraveler: 7.33, tag: 'Pay there', notes: 'Official Bus & Subway 1-Day Combo Pass' },
  { id: 'meals-beyond-the-food-tour-est', day: 8, city: 'Kyoto', cat: 'food', item: 'Meals beyond the food tour (est.)', usd: 40, jpy: 6000, perTraveler: 20, tag: 'Pay there', notes: 'Reduced since Nishiki tour covers a lot of eating' },
  { id: 'mercure-tokyu-stay-osaka-namba-1-of-3-ni', day: 9, city: 'Osaka', cat: 'hotel', item: 'Mercure Tokyu Stay Osaka Namba (1 of 3 nights)', usd: 218.01, jpy: 32702, perTraveler: 109.01, tag: 'Prepaid', notes: 'Given by user: Mercure Tokyu Stay Osaka Namba, $654.05 total for Oct 3-6 (3 nights), split evenly' },
  { id: 'jr-special-rapid-kyoto-osaka', day: 9, city: 'Osaka', cat: 'transit', item: 'JR Special Rapid, Kyoto-Osaka', usd: 7.73, jpy: 1160, perTraveler: 3.87, tag: 'Pay there', notes: 'Regular (non-Shinkansen) fare, ~29 min' },
  { id: 'dotonbori-food-walk-tour', day: 9, city: 'Osaka', cat: 'food', item: 'Dotonbori food-walk tour', usd: 230, jpy: 34500, perTraveler: 115, tag: 'Undecided', notes: 'Small-group food tour, ~$80-150/person, midpoint used' },
  { id: 'meals-beyond-the-food-tour-est-2', day: 9, city: 'Osaka', cat: 'food', item: 'Meals beyond the food tour (est.)', usd: 40, jpy: 6000, perTraveler: 20, tag: 'Pay there', notes: 'Reduced since Dotonbori tour covers a lot of eating' },
  { id: 'mercure-tokyu-stay-osaka-namba-2-of-3-ni', day: 10, city: 'Osaka', cat: 'hotel', item: 'Mercure Tokyu Stay Osaka Namba (2 of 3 nights)', usd: 218.01, jpy: 32702, perTraveler: 109.01, tag: 'Prepaid', notes: 'Given by user: Mercure Tokyu Stay Osaka Namba, $654.05 total for Oct 3-6 (3 nights), split evenly' },
  { id: 'universal-studios-japan-1-day-studio-pas', day: 10, city: 'Osaka', cat: 'sightseeing', item: 'Universal Studios Japan 1-Day Studio Pass', usd: 382.67, jpy: 57400, perTraveler: 191.33, tag: 'Pay there', notes: 'Given by user: ¥57,400 total for 2 tickets (¥28,700/person) — assumed to be the base 1-Day Studio Pass, separate from the Express Pass below' },
  { id: 'usj-express-pass-incl-super-nintendo-wor', day: 10, city: 'Osaka', cat: 'sightseeing', item: 'USJ Express Pass (incl. Super Nintendo World entry)', usd: 293.33, jpy: 44000, perTraveler: 146.67, tag: 'Pay there', notes: 'Estimate — Express Pass tiers covering Super Nintendo World run ~¥17,000-29,000/person depending on date/tier; midpoint used. A free same-day in-app lottery also exists for SNW entry but isn\'t guaranteed' },
  { id: 'subway-jr-to-universal-city-station', day: 10, city: 'Osaka', cat: 'transit', item: 'Subway/JR to Universal City Station', usd: 8, jpy: 1200, perTraveler: 4, tag: 'Pay there', notes: 'Estimate — JR Yumesaki Line fare' },
  { id: 'in-park-meals-est-2', day: 10, city: 'Osaka', cat: 'food', item: 'In-park meals (est.)', usd: 66.67, jpy: 10000, perTraveler: 33.33, tag: 'Pay there', notes: 'Theme park food premium estimate' },
  { id: 'mercure-tokyu-stay-osaka-namba-3-of-3-ni', day: 11, city: 'Osaka', cat: 'hotel', item: 'Mercure Tokyu Stay Osaka Namba (3 of 3 nights)', usd: 218.01, jpy: 32702, perTraveler: 109.01, tag: 'Prepaid', notes: 'Given by user: Mercure Tokyu Stay Osaka Namba, $654.05 total for Oct 3-6 (3 nights), split evenly' },
  { id: 'osaka-castle-entry', day: 11, city: 'Osaka', cat: 'sightseeing', item: 'Osaka Castle entry', usd: 8, jpy: 1200, perTraveler: 4, tag: 'Pay there', notes: 'Official entry fee' },
  { id: 'osaka-subway-day-pass', day: 11, city: 'Osaka', cat: 'transit', item: 'Osaka subway day pass', usd: 10.93, jpy: 1640, perTraveler: 5.47, tag: 'Pay there', notes: 'Estimate — Osaka Metro day pass' },
  { id: 'meals-est-2', day: 11, city: 'Osaka', cat: 'food', item: 'Meals (est.)', usd: 66.67, jpy: 10000, perTraveler: 33.33, tag: 'Pay there', notes: 'General daily food estimate' },
  { id: 'transfer-to-kansai-airport', day: 12, city: 'Osaka', cat: 'transit', item: 'Transfer to Kansai Airport', usd: 21.33, jpy: 3200, perTraveler: 10.67, tag: 'Pay there', notes: 'Estimate — JR rapid/Nankai to KIX' },
  { id: 'last-day-meals-est', day: 12, city: 'Osaka', cat: 'food', item: 'Last-day meals (est.)', usd: 40, jpy: 6000, perTraveler: 20, tag: 'Pay there', notes: 'Light departure day' },
  { id: 'tokyo-local-foods-workshop-tour-private-', day: 2, city: 'Tokyo', cat: 'food', item: 'Tokyo Local Foods & Workshop Tour (private, GoWithGuide - Toshiyuki D.)', usd: 253.33, jpy: 38000, perTraveler: 126.67, tag: 'Prepaid', notes: 'BOOKED & PAID: private 8-hr tour, 2:00pm-10:00pm, guide Toshiyuki D. — Asakusa Nakamise food tasting, Senso-ji, Ameshin candy-making workshop, okonomiyaki dinner, izakaya bar hopping. ¥38,000 total for 2 adults.' },
  { id: 'flipper-s-shibuya-fluffy-souffl-pancake-', day: 3, city: 'Tokyo', cat: 'food', item: 'Flipper\'s Shibuya — fluffy soufflé pancake breakfast', usd: 24, jpy: 3600, perTraveler: 12, tag: 'Pay there', notes: 'Estimate — Flipper\'s "Miracle Pancake" course, ~¥1,500-2,200/person incl. drink' },
  { id: 'traditional-tea-ceremony-with-matcha-jap', day: 8, city: 'Kyoto', cat: 'matcha', item: 'Traditional Tea Ceremony with Matcha (Japan Wonder Travel)', usd: 58, jpy: 8700, perTraveler: 29, tag: 'Prepaid', notes: 'BOOKED & PAID: Airbnb Experience, 11:00am-1:15pm, meet at Yamato Town 5F. $29/person.' },
];
