import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, syncConfigured } from './api';
import { SyncedState, mergeSynced, MergeSummary } from './backup';
import {
  OutgoingItem, PushMarks, SyncOutcome, applyDeletions, changedSincePush,
  fromIncoming, markPushed, toOutgoing,
} from './sync';

/**
 * One sync pass: pull everything after our cursor, merge it, then push what
 * changed locally.
 *
 * Kept apart from `sync.ts` so the mapping and change detection there stay
 * testable without a network. This half is the part that can't be.
 */

const BOOKKEEPING_KEY = 'jt.sync.v1';

interface Bookkeeping {
  cursor: number;
  marks: PushMarks;
}

const EMPTY: Bookkeeping = { cursor: 0, marks: {} };

/**
 * Deliberately not part of the backup file: the cursor is this phone's
 * position in the server's history, so restoring someone else's backup must
 * not hand you their cursor — you'd skip everything they had already seen.
 */
async function loadBookkeeping(): Promise<Bookkeeping> {
  try {
    const raw = await AsyncStorage.getItem(BOOKKEEPING_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      cursor: typeof parsed?.cursor === 'number' ? parsed.cursor : 0,
      marks: parsed?.marks && typeof parsed.marks === 'object' ? parsed.marks : {},
    };
  } catch {
    return EMPTY;
  }
}

async function saveBookkeeping(b: Bookkeeping): Promise<void> {
  try {
    await AsyncStorage.setItem(BOOKKEEPING_KEY, JSON.stringify(b));
  } catch {
    // Out of space: this pass still worked, the next one just re-reads more.
  }
}

/** Only one pass at a time — a second would push the same rows twice. */
let inFlight = false;

export async function runSync(
  local: SyncedState,
  author: string,
  onMerged: (merged: SyncedState, summary: MergeSummary) => void
): Promise<SyncOutcome> {
  if (!syncConfigured) return { ok: false, pulled: 0, pushed: 0, deleted: 0, reason: 'No backend configured' };
  if (inFlight) return { ok: false, pulled: 0, pushed: 0, deleted: 0, reason: 'Already syncing' };
  inFlight = true;

  try {
    const book = await loadBookkeeping();
    let cursor = book.cursor;
    let working = local;
    let pulled = 0;
    let deletedCount = 0;
    let mergedAnything = false;
    let summaryTotal: MergeSummary = {
      newPins: 0, mergedPins: 0, newClips: 0, newEvents: 0, newDecisions: 0, newEdits: 0,
    };

    // --- pull ------------------------------------------------------------
    // Loop while has_more: a client that advances its cursor past a truncated
    // page skips every unreturned row permanently.
    for (let guard = 0; guard < 50; guard++) {
      const page = await api.listItems(cursor);
      if (!page) {
        // Unreachable. Nothing has been written yet, so just stop — the next
        // attempt starts from the same cursor.
        return { ok: false, pulled, pushed: 0, deleted: deletedCount, reason: "Couldn't reach the backend" };
      }
      if (page.items.length > 0) {
        const { state: incoming, deleted } = fromIncoming(page.items);
        const { state: merged, summary } = mergeSynced(working, incoming);
        working = applyDeletions(merged, deleted);
        pulled += page.items.length - deleted.length;
        deletedCount += deleted.length;
        mergedAnything = true;
        summaryTotal = {
          newPins: summaryTotal.newPins + summary.newPins,
          mergedPins: summaryTotal.mergedPins + summary.mergedPins,
          newClips: summaryTotal.newClips + summary.newClips,
          newEvents: summaryTotal.newEvents + summary.newEvents,
          newDecisions: summaryTotal.newDecisions + summary.newDecisions,
          newEdits: summaryTotal.newEdits + summary.newEdits,
        };
      }
      cursor = page.next_seq;
      if (!page.has_more) break;
    }

    // Hand the merged state back before pushing, so what we push includes
    // anything that just arrived and the two phones converge in one pass.
    if (mergedAnything) onMerged(working, summaryTotal);

    // --- push ------------------------------------------------------------
    const outgoing = toOutgoing(working, author);
    const changed = changedSincePush(outgoing, book.marks);
    const sent: OutgoingItem[] = [];
    for (const item of changed) {
      const res = await api.putItem(item);
      if (!res) break; // lost the connection mid-push; the rest waits for next time
      sent.push(item);
    }

    // The cursor is saved together with the marks, and only after the rows
    // they describe are already merged into state — saving it earlier would
    // lose everything in this page if the app died here.
    await saveBookkeeping({ cursor, marks: markPushed(book.marks, sent) });

    return {
      ok: true,
      pulled,
      pushed: sent.length,
      deleted: deletedCount,
      reason: sent.length < changed.length ? 'Some changes are still waiting to upload' : undefined,
    };
  } catch (e: any) {
    return { ok: false, pulled: 0, pushed: 0, deleted: 0, reason: e?.message ?? 'Sync failed' };
  } finally {
    inFlight = false;
  }
}

export function describeSync(o: SyncOutcome): string {
  if (!o.ok) return o.reason ?? 'Sync failed';
  const bits: string[] = [];
  if (o.pulled) bits.push(`${o.pulled} in`);
  if (o.pushed) bits.push(`${o.pushed} out`);
  if (o.deleted) bits.push(`${o.deleted} removed`);
  return bits.length ? `Synced · ${bits.join(', ')}` : 'Synced · already up to date';
}
