import { DAYS } from '../data/trip';
import { Category, InboxBooking, ItineraryEvent } from '../types';

/**
 * Reads a confirmation you paste or share into the app — the offline stand-in
 * for forwarding it to `japan@trip.mail`, which needs a deployed backend and a
 * real inbound-email domain.
 *
 * Everything here runs on the phone with no network, so it still works on a
 * train with no signal. `parseBookingWithModel` below is the better path — it
 * asks the backend's model — but it needs signal and a deployed backend, and
 * falls back to this.
 *
 * The date trick: rather than parse dates properly — hopeless across "Oct 6",
 * "10/6", "6 Oct" and "10月6日" — it collects every plausible month/day pair in
 * the text and keeps the one that lands on an actual day of this trip. Dates
 * that aren't trip days (a booking date, a footer, a price) fall away on their
 * own.
 */

export interface ParsedBooking {
  kind: InboxBooking['kind'];
  title: string;
  sub: string;
  confidence: InboxBooking['confidence'];
  /** 1-12, when the text names a date inside the trip. */
  day?: number;
  /** Decimal hour, e.g. 17.75 for 17:45. */
  startHour?: number;
  confirmation?: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function detectKind(text: string): ParsedBooking['kind'] {
  if (/\bflight|airlines?|boarding|\bJAL\b|\bANA\b|airport/i.test(text)) return 'Flight';
  if (/train|shinkansen|rapi:?t|romancecar|platform|nozomi|hikari/i.test(text)) return 'Train';
  if (/table|reservation|restaurant|tabelog|omakase|party of|covers?\b/i.test(text)) return 'Restaurant';
  if (/hotel|ryokan|check-?in|check-?out|nights?\b/i.test(text)) return 'Hotel';
  return 'Activity';
}

/** Every (month, day) the text might be naming, in any common written form. */
function dateCandidates(text: string): { month: number; day: number }[] {
  const found: { month: number; day: number }[] = [];

  // 2026-10-06
  for (const m of text.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) {
    found.push({ month: Number(m[2]), day: Number(m[3]) });
  }
  // 10/6 and 6/10 — both readings, since the trip-day filter settles it
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g)) {
    found.push({ month: Number(m[1]), day: Number(m[2]) });
    found.push({ month: Number(m[2]), day: Number(m[1]) });
  }
  // Oct 6 / October 6th
  for (const m of text.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/g)) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month) found.push({ month, day: Number(m[2]) });
  }
  // 6 Oct / 6th October
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\b/g)) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (month) found.push({ month, day: Number(m[1]) });
  }
  // 10月6日
  for (const m of text.matchAll(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)) {
    found.push({ month: Number(m[1]), day: Number(m[2]) });
  }

  return found;
}

/** The trip day this confirmation is for, if any of its dates is one. */
export function tripDayFromText(text: string): number | undefined {
  for (const c of dateCandidates(text)) {
    const hit = DAYS.find((d) => {
      const [, mm, dd] = d.date.split('-').map(Number);
      return mm === c.month && dd === c.day;
    });
    if (hit) return hit.day;
  }
  return undefined;
}

/** First clock time in the text, as a decimal hour. */
export function timeFromText(text: string): number | undefined {
  const m = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return undefined;
    const suffix = m[3]?.toLowerCase();
    if (suffix === 'pm' && h < 12) h += 12;
    if (suffix === 'am' && h === 12) h = 0;
    return h + min / 60;
  }
  // "5pm" with no minutes
  const bare = text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (bare) {
    let h = Number(bare[1]);
    if (h > 12) return undefined;
    if (bare[2].toLowerCase() === 'pm' && h < 12) h += 12;
    if (bare[2].toLowerCase() === 'am' && h === 12) h = 0;
    return h;
  }
  return undefined;
}

export function confirmationFromText(text: string): string | undefined {
  const m = text.match(/\b(?:conf(?:irmation)?|booking|reference|ref|PNR)\b[\s.:#—-]*([A-Z0-9]{5,12})\b/i);
  return m?.[1];
}

/** A usable title: the first line that isn't boilerplate. */
function titleFromText(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(from|to|sent|date|subject|dear|hi|hello)\b[:\s]/i.test(l));
  const subject = text.match(/^subject:\s*(.+)$/im)?.[1]?.trim();
  return (subject || lines[0] || 'Booking').slice(0, 80);
}

export function parseBookingText(raw: string): ParsedBooking | null {
  const text = raw.trim();
  if (text.length < 8) return null;

  const kind = detectKind(text);
  const day = tripDayFromText(text);
  const startHour = timeFromText(text);
  const confirmation = confirmationFromText(text);

  const dayMeta = day ? DAYS.find((d) => d.day === day) : undefined;
  const sub = [
    dayMeta ? `${dayMeta.dow} ${dayMeta.date.slice(5).replace('-', '/')}` : null,
    startHour != null ? `${String(Math.floor(startHour)).padStart(2, '0')}:${String(Math.round((startHour % 1) * 60)).padStart(2, '0')}` : null,
    confirmation ? `conf. ${confirmation}` : null,
    /paid|prepaid|payment received/i.test(text) ? 'paid' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    kind,
    title: titleFromText(text),
    sub: sub || 'Pasted confirmation — check the details',
    // A date we could actually place on the trip is the strongest signal.
    confidence: day && startHour != null ? 'Confident' : 'Check date',
    day,
    startHour,
    confirmation,
  };
}

/**
 * The same job done by the backend's model instead of these regexes.
 *
 * Worth the round trip when a confirmation is in Japanese prose, or laid out
 * so the date and time aren't where a pattern would look. Returns null when
 * there's no backend, no key, or no signal — the caller keeps the offline
 * parse it already has rather than losing the preview.
 *
 * The server deliberately returns an ISO date rather than a trip day, so the
 * mapping onto "day 6 of the trip" stays here, where DAYS lives.
 */
export async function parseBookingWithModel(text: string): Promise<ParsedBooking | null> {
  const { api } = await import('./api');
  const res = await api.parseBooking(text);
  if (!res) return null;

  const day = res.date ? DAYS.find((d) => d.date === res.date)?.day : undefined;
  const startHour = res.time ? timeFromText(res.time) : undefined;
  const dayMeta = day ? DAYS.find((d) => d.day === day) : undefined;

  const sub =
    res.sub ||
    [
      dayMeta ? `${dayMeta.dow} ${dayMeta.date.slice(5).replace('-', '/')}` : null,
      res.time,
      res.confirmation ? `conf. ${res.confirmation}` : null,
      res.prepaid ? 'paid' : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return {
    kind: (['Flight', 'Train', 'Restaurant', 'Hotel', 'Activity'] as const).includes(res.kind as any)
      ? (res.kind as ParsedBooking['kind'])
      : 'Activity',
    title: res.title || 'Booking',
    // Keep "paid" in the sub: bookingToEvent reads it back to set the tag.
    sub: res.prepaid && !/paid/i.test(sub) ? `${sub} · paid` : sub,
    confidence: res.confidence === 'Confident' ? 'Confident' : 'Check date',
    day,
    startHour,
    confirmation: res.confirmation ?? undefined,
  };
}

const KIND_CAT: Record<InboxBooking['kind'], Category> = {
  Flight: 'transit',
  Train: 'transit',
  Restaurant: 'food',
  Hotel: 'hotel',
  Activity: 'sightseeing',
};

const KIND_HOURS: Record<InboxBooking['kind'], number> = {
  Flight: 1.5,
  Train: 0.6,
  Restaurant: 1.25,
  Hotel: 0.5,
  Activity: 1,
};

/** Straight to a day-plan entry, keeping the time and confirmation we parsed. */
export function bookingToEvent(p: ParsedBooking, day: number, id: string): ItineraryEvent {
  const start = p.startHour ?? 12;
  return {
    id,
    day,
    start,
    end: start + KIND_HOURS[p.kind],
    cat: KIND_CAT[p.kind],
    title: p.title,
    sub: p.sub,
    tag: /paid|prepaid|payment received/i.test(p.sub) ? 'Prepaid' : 'Pay there',
    booking: {
      confirmation: p.confirmation,
      reserved: 'Added from a confirmation',
    },
  };
}

const KIND_ICON: Record<InboxBooking['kind'], string> = {
  Flight: 'AirplaneTakeoff',
  Train: 'TrainRegional',
  Restaurant: 'ForkKnife',
  Hotel: 'Bathtub',
  Activity: 'CalendarCheck',
};

export function bookingToInbox(p: ParsedBooking, id: string): InboxBooking {
  return {
    id,
    kind: p.kind,
    icon: KIND_ICON[p.kind],
    confidence: p.confidence,
    title: p.title,
    sub: p.sub,
    day: p.day ?? 1,
    raw: p.confirmation,
  };
}
