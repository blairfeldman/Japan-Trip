/** Decimal-hour helpers. 12.1 means 12:06 (0.1hr = 6min), matching the data files. */

export function hourToLabel(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const period = hh >= 12 ? 'pm' : 'am';
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  return mm === 0 ? `${h12}${period}` : `${h12}:${String(mm).padStart(2, '0')}${period}`;
}

export function hourToClock(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function dateToDecimalHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/**
 * The calendar date *where the phone is*, not in UTC. `toISOString()` would
 * roll the day over at 09:00 JST (and the evening before, back home), which
 * made "today" on the Now and Days screens wrong for a chunk of every day.
 */
export function isoDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parses 'yyyy-mm-dd' as local midnight. `new Date('2026-09-25')` is UTC midnight. */
export function parseIsoDateLocal(dateIso: string): Date {
  const [y, m, d] = dateIso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function combineDateAndHour(dateIso: string, hour: number): Date {
  const [y, m, d] = dateIso.split('-').map(Number);
  const hh = Math.floor(hour);
  const mm = Math.round((hour - hh) * 60);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Whole days from `from` to `to`, counted on calendar-day boundaries. */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}
