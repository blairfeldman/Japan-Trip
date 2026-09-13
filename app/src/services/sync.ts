import { Category, InboxBooking, ItineraryEvent, Person, SavedPin } from '../types';
import { Decisions, Decision } from '../data/budget';
import { EventEdit, EventEdits } from './schedule';
import { SyncedState } from './backup';
import { RemoteItem } from './api';
import { CATEGORY } from '../theme';

/**
 * Mapping between the app's records and the backend's single `items` table.
 *
 * The server stores one generic row per record — an id, a `kind`, and a `body`
 * blob it never looks inside. So each of the app's five collections becomes a
 * kind, keeping its own shape in `body` and its own id as the row id. That
 * leaves the phone the source of truth for display and the server a place the
 * two phones meet.
 *
 * Free of network and native imports so `npm run test` can exercise the round
 * trip and the change detection under plain node; the loop that actually talks
 * to the server lives in `syncRun.ts`.
 */

export const KIND = {
  pin: 'place',
  event: 'event',
  eventEdit: 'event_edit',
  decision: 'decision',
  booking: 'booking',
} as const;

export interface OutgoingItem {
  id: string;
  kind: string;
  body: unknown;
  author: string;
}

/** Everything the phone holds, as rows the server can store. */
export function toOutgoing(state: SyncedState, author: string): OutgoingItem[] {
  const out: OutgoingItem[] = [];
  for (const pin of state.pins) out.push({ id: pin.id, kind: KIND.pin, body: pin, author });
  for (const e of state.extraEvents) out.push({ id: e.id, kind: KIND.event, body: e, author });
  for (const [id, edit] of Object.entries(state.eventEdits)) {
    out.push({ id: `edit:${id}`, kind: KIND.eventEdit, body: { eventId: id, ...edit }, author });
  }
  for (const [id, decision] of Object.entries(state.decisions)) {
    out.push({ id: `decision:${id}`, kind: KIND.decision, body: { itemId: id, ...decision }, author });
  }
  for (const b of state.inbox) out.push({ id: `booking:${b.id}`, kind: KIND.booking, body: b, author });
  return out;
}

/**
 * A row the *server* created, from a link shared to the app.
 *
 * These come back under the same `place` kind as the app's own pins, but their
 * body is the extraction pipeline's record (`post`, `extraction`, `place`),
 * not a SavedPin — no `id`, no `cat`, no `clips`. They were being dropped on
 * the way in, which meant a video you shared was read, geocoded and stored on
 * the server and then never appeared on either phone, despite the share sheet
 * promising it would show up on the next sync.
 */
interface ShareBody {
  source_url?: string;
  canonical_url?: string;
  post?: { caption?: string; author?: string; thumbnail_url?: string };
  extraction?: { place_name?: string; city?: string; category?: string; confidence?: string };
  recommendation?: string;
  review_reason?: string;
  place?: { name?: string; address?: string; lat?: number; lng?: number };
}

/** The server's coarse category, narrowed by what the post actually says. */
const SERVER_CAT: Record<string, Category> = {
  restaurant: 'food',
  bar: 'food',
  cafe: 'food',
  hotel: 'hotel',
  shop: 'shopping',
  attraction: 'sightseeing',
  other: 'sightseeing',
};

export function pinCategory(serverCat: string | undefined, text: string): Category {
  // The model only knows the generic set; ramen/sushi/matcha are this app's
  // own distinctions and are worth keeping, since they drive the map filters.
  if (/ramen|tsukemen|noodle/i.test(text)) return 'ramen';
  if (/sushi|omakase|sashimi|kaiten/i.test(text)) return 'sushi';
  if (/matcha|green tea|teahouse|tea house|wagashi/i.test(text)) return 'matcha';
  return SERVER_CAT[(serverCat ?? '').toLowerCase()] ?? 'sightseeing';
}

/**
 * Turns one of those rows into a pin, or null if it isn't one yet.
 *
 * Null covers the rows that legitimately have nowhere to go on a map: still
 * being processed, no place named in the caption, or no map match. Those keep
 * their `seq` bumped each time the worker touches them, so once the pipeline
 * does land a location the row simply arrives again and converts then.
 *
 * The id is prefixed rather than reused so pushing the pin back creates the
 * app's own record instead of overwriting the server's extraction log — and
 * because it's derived, both phones produce the same id and converge.
 */
export function pinFromShareRow(item: RemoteItem): SavedPin | null {
  const body = (item.body ?? {}) as ShareBody;
  const place = body.place;
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;

  const post = body.post ?? {};
  const caption = post.caption ?? '';
  const name = place.name || body.extraction?.place_name || caption.slice(0, 60) || 'Saved place';
  const sourceUrl = body.canonical_url || body.source_url || item.source_url || undefined;
  const cat = pinCategory(body.extraction?.category, `${name} ${caption}`);
  // Sharing a link goes through the backend both of you talk to, so the pin
  // belongs to the trip. Who actually found it is kept on the clip.
  const savedBy: Person = item.author === 'Y' ? 'Y' : 'B';

  return {
    id: `share:${item.id}`,
    name,
    cat,
    address: place.address ?? '',
    lat: place.lat as number,
    lng: place.lng as number,
    // Every other pin carries a one-line subtitle; fall back the way Add Pin does.
    sub: body.recommendation || CATEGORY[cat].label,
    who: 'both',
    // The pipeline's own doubts, kept where they'll be read: "check this pin"
    // is only useful next to the pin.
    note: body.review_reason,
    clips: [
      {
        handle: post.author ?? '',
        caption,
        savedBy,
        savedAt: item.created_at,
        sourceUrl,
        thumbnailUrl: post.thumbnail_url,
      },
    ],
    createdAt: item.created_at,
  };
}

/**
 * Rows from the server, back into the app's shape.
 *
 * Also reports which ids were tombstoned, because a merge is a union and can't
 * express a deletion — the caller has to remove those separately or a record
 * deleted on one phone would keep coming back from the other.
 */
export function fromIncoming(items: RemoteItem[]): { state: SyncedState; deleted: string[] } {
  const state: SyncedState = { pins: [], inbox: [], extraEvents: [], decisions: {}, eventEdits: {} };
  const deleted: string[] = [];

  for (const item of items) {
    if (item.deleted) {
      deleted.push(item.id);
      continue;
    }
    const body = item.body ?? {};
    switch (item.kind) {
      case KIND.pin: {
        if (body.id) {
          state.pins.push(body as SavedPin);
        } else {
          // No id: a row the server made from a shared link, not one of ours.
          const fromShare = pinFromShareRow(item);
          if (fromShare) state.pins.push(fromShare);
        }
        break;
      }
      case KIND.event:
        if (body.id) state.extraEvents.push(body as ItineraryEvent);
        break;
      case KIND.eventEdit: {
        const { eventId, ...edit } = body as { eventId: string } & EventEdit;
        if (eventId && edit.at) state.eventEdits[eventId] = edit as EventEdit;
        break;
      }
      case KIND.decision: {
        const { itemId, ...decision } = body as { itemId: string } & Decision;
        if (itemId && decision.at) state.decisions[itemId] = decision as Decision;
        break;
      }
      case KIND.booking:
        if (body.id) state.inbox.push(body as InboxBooking);
        break;
      default:
        // A kind this build doesn't know about — a newer app version, most
        // likely. Ignore it rather than dropping it from the server.
        break;
    }
  }

  return { state, deleted };
}

/** Applies the server's tombstones. Ids are the row ids, hence the prefixes. */
export function applyDeletions(state: SyncedState, deletedIds: string[]): SyncedState {
  if (deletedIds.length === 0) return state;
  const gone = new Set(deletedIds);
  const edits: EventEdits = {};
  for (const [id, edit] of Object.entries(state.eventEdits)) {
    if (!gone.has(`edit:${id}`)) edits[id] = edit;
  }
  const decisions: Decisions = {};
  for (const [id, d] of Object.entries(state.decisions)) {
    if (!gone.has(`decision:${id}`)) decisions[id] = d;
  }
  return {
    pins: state.pins.filter((p) => !gone.has(p.id)),
    extraEvents: state.extraEvents.filter((e) => !gone.has(e.id)),
    inbox: state.inbox.filter((b) => !gone.has(`booking:${b.id}`)),
    eventEdits: edits,
    decisions,
  };
}

/**
 * JSON with object keys in a fixed order.
 *
 * Plain JSON.stringify preserves insertion order, and merging rebuilds objects
 * with their keys in a different order — `{...base, clips, who}` moves those to
 * the end. That would make an untouched record look changed and get pushed
 * again for no reason.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
  return `{${parts.join(',')}}`;
}

/**
 * A short, stable fingerprint of a record as last pushed.
 *
 * Pushing everything on every sync would bump each row's `seq` server-side,
 * which would make the *other* phone re-download the whole set each time — two
 * phones syncing each other in circles forever. Comparing fingerprints means
 * only genuinely changed records go up.
 *
 * djb2 rather than a real hash: this only has to detect change, not resist
 * anyone, and it has to be cheap on a phone.
 */
export function fingerprint(body: unknown): string {
  const text = stableStringify(body);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length.toString(36)}.${(h >>> 0).toString(36)}`;
}

export type PushMarks = Record<string, string>;

/** Only the rows whose content differs from what was last pushed. */
export function changedSincePush(items: OutgoingItem[], marks: PushMarks): OutgoingItem[] {
  return items.filter((i) => marks[i.id] !== fingerprint(i.body));
}

export function markPushed(marks: PushMarks, items: OutgoingItem[]): PushMarks {
  const next = { ...marks };
  for (const i of items) next[i.id] = fingerprint(i.body);
  return next;
}

/** What a completed sync did, for the one line of status the UI shows. */
export interface SyncOutcome {
  ok: boolean;
  pulled: number;
  pushed: number;
  deleted: number;
  reason?: string;
}
