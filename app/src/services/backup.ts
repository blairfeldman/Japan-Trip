import { InboxBooking, ItineraryEvent, SavedPin } from '../types';
import { Decisions } from '../data/budget';
import { distanceMeters } from '../utils/geo';

/**
 * Backup / merge between the two phones.
 *
 * Everything the app writes is either an append (a pin, a clip, a day plan)
 * or a set on one key (a budget decision) — nothing edits an existing
 * record's fields. That means combining two phones is a union, not a
 * three-way merge, and the only genuine conflict is the same budget item
 * decided differently on each phone, which the timestamps settle.
 *
 * Per-device UI state (map filters, converter entry) is deliberately not
 * part of this — you don't want the other phone's filters.
 *
 * Deliberately free of native imports so `npm run test` can exercise it under
 * plain node; the file picking and sharing live in `backupFile.ts`.
 */

export const BACKUP_KIND = 'japan-trip-backup';
export const BACKUP_VERSION = 1;

/** Two pins this close together are treated as the same place. */
const SAME_PLACE_M = 60;

/**
 * How far apart two pins sharing an address string may be and still count as
 * one place. Geocoding the same address twice can land tens of metres apart,
 * but Nominatim also returns broad names ("Shibuya City, Tokyo"), so matching
 * on text alone would fuse genuinely different places that share one. The
 * coordinates are the authority; the text only breaks a near tie.
 */
const SAME_ADDRESS_MAX_M = 500;

export interface SyncedState {
  pins: SavedPin[];
  inbox: InboxBooking[];
  extraEvents: ItineraryEvent[];
  decisions: Decisions;
}

export interface BackupFile {
  kind: typeof BACKUP_KIND;
  version: number;
  exportedAt: string;
  state: SyncedState;
}

export interface MergeSummary {
  newPins: number;
  mergedPins: number;
  newClips: number;
  newEvents: number;
  newDecisions: number;
}

export function isEmptySummary(s: MergeSummary): boolean {
  return s.newPins + s.mergedPins + s.newClips + s.newEvents + s.newDecisions === 0;
}

function normalizeAddress(a: string): string {
  return a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasCoords(p: SavedPin): boolean {
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0);
}

/** Same physical place? Coordinates decide; the address only breaks a near tie. */
function isSamePlace(a: SavedPin, b: SavedPin): boolean {
  const sameAddress = normalizeAddress(a.address) === normalizeAddress(b.address);
  if (!hasCoords(a) || !hasCoords(b)) return sameAddress;
  const meters = distanceMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
  if (meters <= SAME_PLACE_M) return true;
  return sameAddress && meters <= SAME_ADDRESS_MAX_M;
}

/** Clips are identified by their source link, or by who saved what and when. */
function clipKey(c: SavedPin['clips'][number]): string {
  return c.sourceUrl ?? `${c.handle}|${c.savedBy}|${c.savedAt}`;
}

function mergeClips(a: SavedPin['clips'], b: SavedPin['clips']): { clips: SavedPin['clips']; added: number } {
  const seen = new Set(a.map(clipKey));
  const added = b.filter((c) => !seen.has(clipKey(c)));
  return { clips: [...a, ...added], added: added.length };
}

/** Pins made by both of us become one pin credited to both. */
function mergeWho(a: SavedPin['who'], b: SavedPin['who']): SavedPin['who'] {
  return a === b ? a : 'both';
}

function mergePinPair(base: SavedPin, incoming: SavedPin): { pin: SavedPin; newClips: number } {
  const { clips, added } = mergeClips(base.clips, incoming.clips);
  return {
    pin: {
      ...base,
      clips,
      who: mergeWho(base.who, incoming.who),
      // Keep whatever detail exists rather than letting a sparser copy win.
      note: base.note ?? incoming.note,
      hours: base.hours ?? incoming.hours,
      price: base.price ?? incoming.price,
    },
    newClips: added,
  };
}

export function mergeSynced(local: SyncedState, incoming: SyncedState): { state: SyncedState; summary: MergeSummary } {
  const summary: MergeSummary = { newPins: 0, mergedPins: 0, newClips: 0, newEvents: 0, newDecisions: 0 };

  // Pins: match on id first, then on being the same physical place. The older
  // record wins the id so links from events and clips stay valid.
  const pins = [...local.pins];
  for (const inc of incoming.pins) {
    const byId = pins.findIndex((p) => p.id === inc.id);
    if (byId >= 0) {
      const { pin, newClips } = mergePinPair(pins[byId], inc);
      pins[byId] = pin;
      summary.newClips += newClips;
      continue;
    }
    const byPlace = pins.findIndex((p) => isSamePlace(p, inc));
    if (byPlace >= 0) {
      const older = pins[byPlace].createdAt <= inc.createdAt ? pins[byPlace] : inc;
      const newer = pins[byPlace].createdAt <= inc.createdAt ? inc : pins[byPlace];
      const { pin, newClips } = mergePinPair(older, newer);
      pins[byPlace] = pin;
      summary.newClips += newClips;
      summary.mergedPins += 1;
      continue;
    }
    pins.push(inc);
    summary.newPins += 1;
  }

  // Day plans: union by id. Entries derived from a booking or a pin have
  // deterministic ids, so both phones adding the same one collapses to one.
  const eventIds = new Set(local.extraEvents.map((e) => e.id));
  const extraEvents = [...local.extraEvents];
  for (const e of incoming.extraEvents) {
    if (eventIds.has(e.id)) continue;
    eventIds.add(e.id);
    extraEvents.push(e);
    summary.newEvents += 1;
  }

  // Inbox: filed-onto-a-day only ever goes one way, so true wins.
  const inbox = local.inbox.map((b) => {
    const inc = incoming.inbox.find((x) => x.id === b.id);
    if (!inc) return b;
    if (inc.addedToDay && !b.addedToDay) return { ...b, addedToDay: true, day: inc.day };
    return b;
  });
  for (const inc of incoming.inbox) {
    if (!inbox.some((b) => b.id === inc.id)) inbox.push(inc);
  }

  // Decisions: the only real conflict. Later timestamp wins.
  const decisions: Decisions = { ...local.decisions };
  for (const [id, inc] of Object.entries(incoming.decisions)) {
    const mine = decisions[id];
    if (!mine) {
      decisions[id] = inc;
      summary.newDecisions += 1;
    } else if (inc.at > mine.at && inc.decision !== mine.decision) {
      decisions[id] = inc;
      summary.newDecisions += 1;
    }
  }

  return { state: { pins, inbox, extraEvents, decisions }, summary };
}

export function buildBackup(state: SyncedState): BackupFile {
  return { kind: BACKUP_KIND, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), state };
}

/** Throws with a human-readable reason rather than merging nonsense. */
export function parseBackup(raw: string): BackupFile {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't JSON — pick the backup file the app exported.");
  }
  if (parsed?.kind !== BACKUP_KIND) {
    throw new Error("That's not a Japan Trip backup file.");
  }
  if (typeof parsed.version !== 'number' || parsed.version > BACKUP_VERSION) {
    throw new Error(`That backup was made by a newer version of the app (v${parsed.version}).`);
  }
  const s = parsed.state;
  if (!s || !Array.isArray(s.pins) || !Array.isArray(s.extraEvents)) {
    throw new Error('That backup file is missing its contents.');
  }
  return {
    kind: BACKUP_KIND,
    version: parsed.version,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    state: {
      pins: s.pins,
      inbox: Array.isArray(s.inbox) ? s.inbox : [],
      extraEvents: s.extraEvents,
      decisions: s.decisions && typeof s.decisions === 'object' ? s.decisions : {},
    },
  };
}
