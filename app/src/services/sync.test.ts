/**
 * Sync mapping tests. Run with `npm run test`.
 *
 * The two that matter: records must survive a round trip through the server's
 * generic `items` shape, and unchanged records must NOT be re-pushed — two
 * phones re-uploading everything would bump each other's cursors forever.
 */
import { SavedPin, ItineraryEvent, InboxBooking } from '../types';
import { SyncedState, mergeSynced } from './backup';
import { RemoteItem } from './api';
import {
  KIND, toOutgoing, fromIncoming, applyDeletions, fingerprint,
  changedSincePush, markPushed,
} from './sync';

/** Compare by content, not by whichever order the keys happen to be in. */
const same = (a: unknown, b: unknown) => fingerprint(a) === fingerprint(b);

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra); }
}

const at = '2026-09-20T10:00:00Z';
const pin = (o: Partial<SavedPin> = {}): SavedPin => ({
  id: 'p1', name: 'Tsuta', cat: 'ramen', address: 'Sugamo, Tokyo', lat: 35.73, lng: 139.73,
  sub: 'ramen', who: 'B', clips: [], createdAt: at, ...o } as SavedPin);
const ev = (o: Partial<ItineraryEvent> = {}): ItineraryEvent => ({
  id: 'e1', day: 3, start: 12, end: 13, cat: 'food', title: 'Lunch', sub: '', tag: '', ...o } as ItineraryEvent);
const bk = (o: Partial<InboxBooking> = {}): InboxBooking => ({
  id: 'b1', kind: 'Flight', icon: 'AirplaneTakeoff', confidence: 'Confident',
  title: 'JAL 8', sub: 'Oct 6', day: 12, ...o } as InboxBooking);

const full = (): SyncedState => ({
  pins: [pin()],
  extraEvents: [ev()],
  inbox: [bk()],
  decisions: { 'guide-item': { decision: 'booked', at } },
  eventEdits: { 'd1-dinner': { patch: { title: 'Ramen instead' }, at } },
});

/** Turn outgoing rows back into what the server would hand us. */
const asRemote = (state: SyncedState, deletedIds: string[] = []): RemoteItem[] =>
  toOutgoing(state, 'blair').map((o, i) => ({
    id: o.id, seq: i + 1, kind: o.kind, body: o.body, author: o.author,
    status: 'ok', source_url: null, created_at: at, updated_at: at,
    deleted: deletedIds.includes(o.id),
  }));

console.log('\n-- every record type survives the round trip --');
{
  const original = full();
  const { state, deleted } = fromIncoming(asRemote(original));
  check('pins', JSON.stringify(state.pins) === JSON.stringify(original.pins), JSON.stringify(state.pins));
  check('day-plan entries', JSON.stringify(state.extraEvents) === JSON.stringify(original.extraEvents));
  check('inbox bookings', JSON.stringify(state.inbox) === JSON.stringify(original.inbox));
  check('budget decisions', JSON.stringify(state.decisions) === JSON.stringify(original.decisions), JSON.stringify(state.decisions));
  check('day-plan edits', JSON.stringify(state.eventEdits) === JSON.stringify(original.eventEdits), JSON.stringify(state.eventEdits));
  check('nothing reported deleted', deleted.length === 0);
}
{
  const kinds = toOutgoing(full(), 'blair').map((o) => o.kind);
  check('one row per record, five kinds', kinds.length === 5 && new Set(kinds).size === 5, kinds.join(','));
  const ids = toOutgoing(full(), 'blair').map((o) => o.id);
  check('keyed records get a prefix so ids cannot collide',
    ids.includes('decision:guide-item') && ids.includes('edit:d1-dinner') && ids.includes('booking:b1'), ids.join(','));
  check('records with their own id keep it', ids.includes('p1') && ids.includes('e1'));
}

console.log('\n-- tombstones actually remove things --');
{
  const state = full();
  check('a deleted pin goes', applyDeletions(state, ['p1']).pins.length === 0);
  check('a deleted entry goes', applyDeletions(state, ['e1']).extraEvents.length === 0);
  check('a deleted decision goes', Object.keys(applyDeletions(state, ['decision:guide-item']).decisions).length === 0);
  check('a deleted edit goes', Object.keys(applyDeletions(state, ['edit:d1-dinner']).eventEdits).length === 0);
  check('a deleted booking goes', applyDeletions(state, ['booking:b1']).inbox.length === 0);
  check('unrelated ids change nothing', same(applyDeletions(state, ['nope']), state));
  check('an empty list is a no-op', applyDeletions(state, []) === state);

  const { deleted } = fromIncoming(asRemote(full(), ['p1']));
  check('the server reports its tombstones', deleted.includes('p1'));
  const { state: live } = fromIncoming(asRemote(full(), ['p1']));
  check('and a tombstone is not also merged as a record', live.pins.length === 0);
}

console.log('\n-- unchanged records are not re-pushed --');
{
  const items = toOutgoing(full(), 'blair');
  check('everything is new at first', changedSincePush(items, {}).length === 5);
  const marks = markPushed({}, items);
  check('nothing to push the second time', changedSincePush(items, marks).length === 0);

  const edited = toOutgoing({ ...full(), pins: [pin({ name: 'Tsuta Yoyogi' })] }, 'blair');
  const changed = changedSincePush(edited, marks);
  check('only the edited record goes again', changed.length === 1 && changed[0].id === 'p1', JSON.stringify(changed.map((c) => c.id)));

  const added = toOutgoing({ ...full(), pins: [pin(), pin({ id: 'p2', name: 'Other' })] }, 'blair');
  check('a new record goes', changedSincePush(added, marks).map((c) => c.id).join() === 'p2');
}
{
  check('same content, same fingerprint', fingerprint({ a: 1, b: 'x' }) === fingerprint({ a: 1, b: 'x' }));
  check('different content, different fingerprint', fingerprint({ a: 1 }) !== fingerprint({ a: 2 }));
  check('a nested change is caught', fingerprint({ a: { b: [1, 2] } }) !== fingerprint({ a: { b: [1, 3] } }));
  // Merging rebuilds objects with keys in a different order; that must not
  // read as a change, or every merged record would be pushed back again.
  check('key order is not a change', fingerprint({ a: 1, b: 2 }) === fingerprint({ b: 2, a: 1 }));
  check('nested key order is not a change', fingerprint({ x: { a: 1, b: 2 } }) === fingerprint({ x: { b: 2, a: 1 } }));
  check('array order still is a change', fingerprint([1, 2]) !== fingerprint([2, 1]));
  check('an added key is a change', fingerprint({ a: 1 }) !== fingerprint({ a: 1, b: 2 }));
}

console.log('\n-- a full pull, merged into what the phone already has --');
{
  // The other phone's records arrive and combine with ours rather than replacing.
  const mine: SyncedState = { ...full(), pins: [pin()] };
  const theirs: SyncedState = { pins: [pin({ id: 'p9', name: 'Yev pin', lat: 34.69, lng: 135.50, address: 'Osaka' })],
    extraEvents: [], inbox: [], decisions: {}, eventEdits: {} };
  const { state: incoming } = fromIncoming(asRemote(theirs));
  const { state: merged } = mergeSynced(mine, incoming);
  check('both phones\' pins survive', merged.pins.length === 2, JSON.stringify(merged.pins.map((p) => p.id)));
  check('my other records are untouched', merged.extraEvents.length === 1 && Object.keys(merged.decisions).length === 1);
}
{
  // Pulling the same page twice must not duplicate anything.
  const mine = full();
  const { state: incoming } = fromIncoming(asRemote(mine));
  const once = mergeSynced(mine, incoming).state;
  const twice = mergeSynced(once, incoming);
  check('re-pulling the same rows adds nothing', twice.state.pins.length === 1 && twice.summary.newPins === 0);
}
{
  const { state } = fromIncoming([
    { id: 'x', seq: 1, kind: 'something_newer', body: { id: 'x' }, author: '', status: 'ok',
      source_url: null, created_at: at, updated_at: at, deleted: false },
  ]);
  check('an unknown kind is ignored, not crashed on',
    state.pins.length === 0 && state.extraEvents.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
