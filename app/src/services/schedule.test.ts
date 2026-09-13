/**
 * Day-plan edit tests. The itinerary is immutable module data, so an edit is a
 * patch applied at render time — these cover that a change shows up, that a
 * seed entry can always be put back, and that a delete really disappears.
 */
import { ITINERARY } from '../data/itinerary';
import { ItineraryEvent } from '../types';
import {
  applyEdit, resolveDayEvents, resolveEvent, isSeedEvent, isEdited,
  diffPatch, parseClock, formatClock, EventEdits,
} from './schedule';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra); }
}

const seed = ITINERARY.find((e) => e.day === 1)!;
const at = '2026-09-20T10:00:00Z';

console.log('\n-- clock parsing --');
{
  check('17:45', parseClock('17:45') === 17.75);
  check('09:00', parseClock('09:00') === 9);
  check('9:00 unpadded', parseClock('9:00') === 9);
  check('dot separator', parseClock('17.45') === 17.75);
  check('rejects 25:00', parseClock('25:00') === undefined);
  check('rejects 10:75', parseClock('10:75') === undefined);
  check('rejects prose', parseClock('lunchtime') === undefined);
  check('round-trips', formatClock(parseClock('07:05')!) === '07:05');
}

console.log('\n-- applying an edit --');
{
  check('no edit is a passthrough', applyEdit(seed, undefined) === seed);
  const edited = applyEdit(seed, { patch: { title: 'Changed' }, at });
  check('patched field changes', edited?.title === 'Changed');
  check('unpatched fields survive', edited?.start === seed.start && edited?.cat === seed.cat);
  check('deleted yields null', applyEdit(seed, { patch: {}, at, deleted: true }) === null);
}

console.log('\n-- resolving a day --');
{
  const day1 = ITINERARY.filter((e) => e.day === 1);
  check('seed day resolves', resolveDayEvents(1, [], {}).length === day1.length);

  const hidden: EventEdits = { [seed.id]: { patch: {}, at, deleted: true } };
  check('a deleted entry drops out', resolveDayEvents(1, [], hidden).length === day1.length - 1);
  check('and is gone by id too', resolveEvent(seed.id, [], hidden) === undefined);

  const moved: EventEdits = { [seed.id]: { patch: { start: 5, end: 6 }, at } };
  check('re-timed entries re-sort', resolveDayEvents(1, [], moved)[0].id === seed.id);

  const mine: ItineraryEvent = { id: 'mine-1', day: 1, start: 8, end: 9, cat: 'food', title: 'Coffee', sub: '', tag: '' };
  check('added entries appear', resolveDayEvents(1, [mine], {}).some((e) => e.id === 'mine-1'));
  check('added entries are editable', resolveEvent('mine-1', [mine], { 'mine-1': { patch: { title: 'Tea' }, at } })?.title === 'Tea');
  check('added entries are deletable', resolveEvent('mine-1', [mine], { 'mine-1': { patch: {}, at, deleted: true } }) === undefined);
  check('other days untouched', resolveDayEvents(2, [mine], {}).every((e) => e.day === 2));
  check('unknown id resolves to nothing', resolveEvent('nope', [], {}) === undefined);
}

console.log('\n-- seed vs added, and reset --');
{
  check('seed entries are recognised', isSeedEvent(seed.id));
  check('added entries are not', !isSeedEvent('mine-1'));
  check('an edit is flagged', isEdited(seed.id, { [seed.id]: { patch: { title: 'x' }, at } }));
  check('an empty patch is not', !isEdited(seed.id, { [seed.id]: { patch: {}, at } }));
  check('a delete is not "edited"', !isEdited(seed.id, { [seed.id]: { patch: { title: 'x' }, at, deleted: true } }));
}

console.log('\n-- only real changes are stored --');
{
  const same = diffPatch(seed, { title: seed.title, start: seed.start, cat: seed.cat });
  check('unchanged fields are dropped', Object.keys(same).length === 0, JSON.stringify(same));
  const differs = diffPatch(seed, { title: 'New', start: seed.start });
  check('changed fields are kept', differs.title === 'New' && differs.start === undefined, JSON.stringify(differs));
  check('an empty tag is a real value', diffPatch({ ...seed, tag: 'Prepaid' }, { tag: '' }).tag === '');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
