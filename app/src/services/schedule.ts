import { ITINERARY } from '../data/itinerary';
import { ItineraryEvent } from '../types';

/**
 * Edits to the day plan.
 *
 * The 12 days in `data/itinerary.ts` are module data built from the
 * spreadsheet — they can't be mutated, and overwriting them would lose the
 * link back to what was actually booked. So an edit is a *patch* stored
 * against the event's id, applied when the day is rendered. That means:
 *
 * - a seed event can always be reset to what the spreadsheet said,
 * - only fields you actually changed are stored, so a later correction to the
 *   underlying itinerary still shows through everywhere you didn't override,
 * - deleting is a flag rather than a removal, so it survives a merge and can
 *   be undone.
 *
 * Timestamped for the same reason budget decisions are: two phones editing the
 * same entry is a genuine conflict, and the later edit should win.
 */

/** The fields the edit screen can change. Times are decimal hours. */
export type EventPatch = Partial<Pick<ItineraryEvent, 'title' | 'sub' | 'start' | 'end' | 'cat' | 'tag'>>;

export interface EventEdit {
  patch: EventPatch;
  at: string; // ISO
  deleted?: boolean;
}

export type EventEdits = Record<string, EventEdit>;

/** Is this one of the 12 days' built-in entries (so it can be reset)? */
export function isSeedEvent(id: string): boolean {
  return ITINERARY.some((e) => e.id === id);
}

export function seedEvent(id: string): ItineraryEvent | undefined {
  return ITINERARY.find((e) => e.id === id);
}

/** Applies a stored edit. Returns null for a deleted entry. */
export function applyEdit(event: ItineraryEvent, edit: EventEdit | undefined): ItineraryEvent | null {
  if (!edit) return event;
  if (edit.deleted) return null;
  return { ...event, ...edit.patch };
}

/** Everything on a given day, seed and added, with edits applied and deletions dropped. */
export function resolveDayEvents(day: number, extraEvents: ItineraryEvent[], edits: EventEdits): ItineraryEvent[] {
  return [...ITINERARY.filter((e) => e.day === day), ...extraEvents.filter((e) => e.day === day)]
    .map((e) => applyEdit(e, edits[e.id]))
    .filter((e): e is ItineraryEvent => e !== null)
    .sort((a, b) => a.start - b.start);
}

/** One entry by id, edits applied. Undefined if it was deleted or never existed. */
export function resolveEvent(
  id: string,
  extraEvents: ItineraryEvent[],
  edits: EventEdits
): ItineraryEvent | undefined {
  const base = ITINERARY.find((e) => e.id === id) ?? extraEvents.find((e) => e.id === id);
  if (!base) return undefined;
  return applyEdit(base, edits[id]) ?? undefined;
}

/** Has this entry been changed from what it started as? */
export function isEdited(id: string, edits: EventEdits): boolean {
  const edit = edits[id];
  return !!edit && !edit.deleted && Object.keys(edit.patch).length > 0;
}

/** Keeps only the fields that actually differ, so "reset" stays meaningful. */
export function diffPatch(original: ItineraryEvent, next: EventPatch): EventPatch {
  const out: EventPatch = {};
  if (next.title !== undefined && next.title !== original.title) out.title = next.title;
  if (next.sub !== undefined && next.sub !== original.sub) out.sub = next.sub;
  if (next.start !== undefined && next.start !== original.start) out.start = next.start;
  if (next.end !== undefined && next.end !== original.end) out.end = next.end;
  if (next.cat !== undefined && next.cat !== original.cat) out.cat = next.cat;
  if (next.tag !== undefined && next.tag !== original.tag) out.tag = next.tag;
  return out;
}

/** "17:45" -> 17.75. Undefined when it isn't a real time. */
export function parseClock(text: string): number | undefined {
  const m = text.trim().match(/^(\d{1,2})[:.h ]?(\d{2})$/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return h + min / 60;
}

/** 17.75 -> "17:45", for prefilling the edit fields. */
export function formatClock(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
