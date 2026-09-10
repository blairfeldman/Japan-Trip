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

export function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function combineDateAndHour(dateIso: string, hour: number): Date {
  const [y, m, d] = dateIso.split('-').map(Number);
  const hh = Math.floor(hour);
  const mm = Math.round((hour - hh) * 60);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}
