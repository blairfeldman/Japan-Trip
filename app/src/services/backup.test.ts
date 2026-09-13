/**
 * Merge tests. Run with `npm run test` (no device needed) — this logic decides
 * whether combining two phones' backups keeps everything or silently drops it,
 * which is not something you want to find out by losing a week of pins.
 */
import { mergeSynced, parseBackup, buildBackup, findSamePlace, findPinBySourceUrl, SyncedState } from './backup';
import { describeSharedLink } from '../utils/shareLink';
import { placeNameFromCaption, parseOEmbedPayload } from './shareParse';
import { SavedPin, ItineraryEvent } from '../types';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, extra); }
}

const pin = (o: Partial<SavedPin> & Record<string, any> = {}): SavedPin => ({ id: 'x', name: 'P', cat: 'ramen', address: 'A', lat: 35.0, lng: 135.0,
  sub: '', who: 'B', clips: [], createdAt: '2026-09-01T00:00:00Z', ...o } as SavedPin);
const empty = (): SyncedState => ({ pins: [], inbox: [], extraEvents: [], decisions: {}, eventEdits: {} });

console.log('\n-- pins --');
{ // distinct places both kept
  const a = { ...empty(), pins: [pin({ id: 'p1', name: 'Ramen', lat: 35.00, lng: 135.00 })] };
  const b = { ...empty(), pins: [pin({ id: 'p2', name: 'Sushi', lat: 35.90, lng: 135.90 })] };
  const { state, summary } = mergeSynced(a, b);
  check('two different places -> 2 pins', state.pins.length === 2 && summary.newPins === 1);
}
{ // same place, different ids, independently pinned -> one pin, clips unioned
  const a = { ...empty(), pins: [pin({ id: 'p1', name: 'Ramen', createdAt: '2026-09-01T00:00:00Z',
    who: 'B', clips: [{ handle: '@blair', caption: 'c1', savedBy: 'B' as const, savedAt: 't1', sourceUrl: 'u1' }] })] };
  const b = { ...empty(), pins: [pin({ id: 'p2', name: 'Ramen ya', lat: 35.0002, lng: 135.0002,
    createdAt: '2026-09-02T00:00:00Z', who: 'Y',
    clips: [{ handle: '@yev', caption: 'c2', savedBy: 'Y' as const, savedAt: 't2', sourceUrl: 'u2' }] })] };
  const { state, summary } = mergeSynced(a, b);
  check('same place -> 1 pin', state.pins.length === 1, JSON.stringify(state.pins.map((p) => p.id)));
  check('older id survives', state.pins[0].id === 'p1');
  check('clips unioned', state.pins[0].clips.length === 2);
  check('credited to both', state.pins[0].who === 'both');
  check('summary counts merge', summary.mergedPins === 1 && summary.newClips === 1);
}
{ // duplicate clip not re-added
  const c: SavedPin['clips'][number] = { handle: '@b', caption: 'c', savedBy: 'B', savedAt: 't', sourceUrl: 'u1' };
  const a = { ...empty(), pins: [pin({ id: 'p1', clips: [c] })] };
  const b = { ...empty(), pins: [pin({ id: 'p1', clips: [c] })] };
  const { state, summary } = mergeSynced(a, b);
  check('same clip not duplicated', state.pins[0].clips.length === 1 && summary.newClips === 0);
}
{ // merge is idempotent
  const a = { ...empty(), pins: [pin({ id: 'p1' })] };
  const b = { ...empty(), pins: [pin({ id: 'p2', name: 'Other', lat: 40, lng: 140, address: 'B' })] };
  const once = mergeSynced(a, b).state;
  const twice = mergeSynced(once, b);
  check('re-importing same file adds nothing', twice.state.pins.length === 2 && twice.summary.newPins === 0);
}

{ // the bug the first run caught: same address string, far apart
  const a = { ...empty(), pins: [pin({ id: 'p1', name: 'Bar A', address: 'Shibuya City, Tokyo', lat: 35.66, lng: 139.70 })] };
  const b = { ...empty(), pins: [pin({ id: 'p2', name: 'Bar B', address: 'Shibuya City, Tokyo', lat: 35.69, lng: 139.75 })] };
  check('broad shared address does NOT fuse distant pins', mergeSynced(a, b).state.pins.length === 2);
}
{ // geocoder jitter on the same address still merges
  const a = { ...empty(), pins: [pin({ id: 'p1', address: '1-19-1 Kabukicho', lat: 35.69520, lng: 139.70280 })] };
  const b = { ...empty(), pins: [pin({ id: 'p2', address: '1-19-1 Kabukicho', lat: 35.69700, lng: 139.70400 })] };
  check('same address + geocoder jitter still merges', mergeSynced(a, b).state.pins.length === 1);
}

console.log('\n-- decisions (the real conflict) --');
{
  const a = { ...empty(), decisions: { guide: { decision: 'booked' as const, at: '2026-09-10T10:00:00Z' } } };
  const b = { ...empty(), decisions: { guide: { decision: 'skipped' as const, at: '2026-09-10T12:00:00Z' } } };
  check('later wins', mergeSynced(a, b).state.decisions.guide.decision === 'skipped');
  check('earlier does not clobber later', mergeSynced(b, a).state.decisions.guide.decision === 'skipped');
}
{
  const a = { ...empty(), decisions: { g: { decision: 'booked' as const, at: '2026-09-10T10:00:00Z' } } };
  const b = { ...empty(), decisions: { h: { decision: 'skipped' as const, at: '2026-09-10T09:00:00Z' } } };
  const { state, summary } = mergeSynced(a, b);
  check('different items both kept', Object.keys(state.decisions).length === 2 && summary.newDecisions === 1);
}

console.log('\n-- day plans --');
{
  const ev = (id: string): ItineraryEvent => ({ id, day: 3, start: 12, end: 13, cat: 'food', title: id, sub: '', tag: '' });
  const a = { ...empty(), extraEvents: [ev('inb-jal8-event'), ev('manual-aaa')] };
  const b = { ...empty(), extraEvents: [ev('inb-jal8-event'), ev('manual-bbb')] };
  const { state, summary } = mergeSynced(a, b);
  check('same booking filed twice -> one entry', state.extraEvents.filter((e) => e.id === 'inb-jal8-event').length === 1);
  check('distinct manual entries both kept', state.extraEvents.length === 3 && summary.newEvents === 1);
}

console.log('\n-- inbox --');
{
  const bk = (o: Record<string, any>) => ({ id: 'i1', kind: 'Flight' as const, icon: 'x', confidence: 'Confident' as const, title: 't', sub: 's', day: 12, ...o });
  const a = { ...empty(), inbox: [bk({ addedToDay: false })] };
  const b = { ...empty(), inbox: [bk({ addedToDay: true, day: 11 })] };
  check('filed-on-a-day wins', mergeSynced(a, b).state.inbox[0].addedToDay === true);
  check('and does not un-file', mergeSynced(b, a).state.inbox[0].addedToDay === true);
}

console.log('\n-- parse guards --');
{
  const round = parseBackup(JSON.stringify(buildBackup({ ...empty(), pins: [pin({})] })));
  check('round-trips', round.state.pins.length === 1);
  const rejects = (raw: string) => { try { parseBackup(raw); return false; } catch { return true; } };
  check('rejects non-JSON', rejects('not json'));
  check('rejects other JSON', rejects('{"hello":1}'));
  check('rejects newer version', rejects(JSON.stringify({ kind: 'japan-trip-backup', version: 99, state: { pins: [], extraEvents: [] } })));
}

console.log('\n-- day-plan edits merge --');
{
  const mine = { ...empty(), eventEdits: { 'd1-dinner': { patch: { title: 'Ramen' }, at: '2026-09-25T10:00:00Z' } } };
  const theirs = { ...empty(), eventEdits: { 'd1-dinner': { patch: { title: 'Izakaya' }, at: '2026-09-25T12:00:00Z' } } };
  check('later edit wins', mergeSynced(mine, theirs).state.eventEdits['d1-dinner'].patch.title === 'Izakaya');
  check('earlier edit does not clobber later', mergeSynced(theirs, mine).state.eventEdits['d1-dinner'].patch.title === 'Izakaya');

  const del = { ...empty(), eventEdits: { 'd1-dinner': { patch: {}, at: '2026-09-25T13:00:00Z', deleted: true } } };
  check('a later delete beats an earlier edit', mergeSynced(theirs, del).state.eventEdits['d1-dinner'].deleted === true);
  check('an earlier delete loses to a later edit', mergeSynced(del, theirs).state.eventEdits['d1-dinner'].deleted === true);

  const other = { ...empty(), eventEdits: { 'd2-tour': { patch: { start: 9 }, at: '2026-09-26T10:00:00Z' } } };
  check('edits to different entries both survive', Object.keys(mergeSynced(mine, other).state.eventEdits).length === 2);
  check('re-importing the same edits is a no-op', mergeSynced(mergeSynced(mine, other).state, other).summary.newEdits === 0);
}

console.log('\n-- saving from a shared link (no backend) --');
{
  const t = describeSharedLink('https://www.tiktok.com/@tokyo.eats/video/12345');
  check('reads the TikTok handle off the URL', t.platform === 'TikTok' && t.handle === '@tokyo.eats', JSON.stringify(t));
  check('short tiktok links still identified', describeSharedLink('https://vm.tiktok.com/ZAbCd/').platform === 'TikTok');
  check('instagram reels identified', describeSharedLink('https://www.instagram.com/reel/XYZ/').platform === 'Instagram');
  check('unknown link degrades', describeSharedLink('https://example.com/x').platform === 'link');
}
{
  const saved = pin({ id: 'p1', clips: [{ handle: '@a', caption: 'c', savedBy: 'B' as const, savedAt: 't', sourceUrl: 'https://tt/1' }] });
  check('re-sharing the same clip finds its pin', findPinBySourceUrl([saved], 'https://tt/1')?.id === 'p1');
  check('a new clip finds nothing', findPinBySourceUrl([saved], 'https://tt/2') === undefined);
  check('empty url finds nothing', findPinBySourceUrl([saved], '') === undefined);
}
{
  const saved = pin({ id: 'p1', lat: 35.6595, lng: 139.7004, address: 'Shibuya' });
  const again = pin({ id: 'p2', lat: 35.6596, lng: 139.7005, address: 'Shibuya' });
  const elsewhere = pin({ id: 'p3', lat: 34.6937, lng: 135.5023, address: 'Osaka' });
  check('saving a place already pinned finds it', findSamePlace([saved], again)?.id === 'p1');
  check('a genuinely new place does not', findSamePlace([saved], elsewhere) === undefined);
}

console.log('\n-- caption -> place name --');
{
  const c = placeNameFromCaption;
  check('strips hashtags', c('Ichiran Shibuya #tokyo #ramen #japan') === 'Ichiran Shibuya', JSON.stringify(c('Ichiran Shibuya #tokyo #ramen #japan')));
  check('strips emoji', c('Ichiran Shibuya 🍜🔥') === 'Ichiran Shibuya', JSON.stringify(c('Ichiran Shibuya 🍜🔥')));
  check('strips mentions and urls', c('@foodie Ichiran https://x.co/a') === 'Ichiran', JSON.stringify(c('@foodie Ichiran https://x.co/a')));
  check('picks the most descriptive segment', c('Best ramen | Ichiran Shibuya Tokyo') === 'Ichiran Shibuya Tokyo', JSON.stringify(c('Best ramen | Ichiran Shibuya Tokyo')));
  check('keeps Japanese text', c('一蘭 渋谷店 #ramen') === '一蘭 渋谷店', JSON.stringify(c('一蘭 渋谷店 #ramen')));
  check('empty caption is empty, not a crash', c('') === '' && c('#a #b 🍜') === '');
  check('caps runaway captions', c('x'.repeat(300)).length <= 80);
}

console.log('\n-- oEmbed payloads (TikTok + Instagram shapes) --');
{
  const tt = parseOEmbedPayload({
    title: 'Best ramen in Tokyo 🍜 Ichiran Shibuya #tokyo #ramen',
    author_unique_id: 'tokyo.eats',
    author_name: 'Tokyo Eats',
    thumbnail_url: 'https://p16.tiktok.com/cover.jpg',
  }, '@fallback');
  check('tiktok: prefers author_unique_id', tt?.handle === '@tokyo.eats', JSON.stringify(tt));
  // With no separator there is nothing to split on, so the whole cleaned
  // caption is offered — a prefill to trim, not true extraction.
  check('tiktok: offers the cleaned caption', tt?.suggestedName === 'Best ramen in Tokyo Ichiran Shibuya', JSON.stringify(tt?.suggestedName));
  check('tiktok: keeps the cover frame', tt?.thumbnailUrl === 'https://p16.tiktok.com/cover.jpg');

  const ig = parseOEmbedPayload({
    title: 'Matcha at Ippodo Kyoto 🍵 #kyoto',
    author_name: 'kyoto.eats',
    thumbnail_url: 'https://scontent.cdninstagram.com/x.jpg',
  }, '@instagram');
  check('instagram: falls back to author_name', ig?.handle === '@kyoto.eats', JSON.stringify(ig));
  check('instagram: derives a place name', ig?.suggestedName === 'Matcha at Ippodo Kyoto', JSON.stringify(ig?.suggestedName));

  check('already-@ handle is not double-prefixed', parseOEmbedPayload({ title: 'X', author_name: '@who' }, '@f')?.handle === '@who');
  check('no thumbnail is fine', parseOEmbedPayload({ title: 'Ippodo', author_name: 'a' }, '@f')?.thumbnailUrl === undefined);
  check('empty payload yields nothing', parseOEmbedPayload({}, '@f') === null);
  check('junk payload yields nothing', parseOEmbedPayload({ title: 123, author_name: null }, '@f') === null);
  check('caption-only still usable', parseOEmbedPayload({ title: 'Ippodo Kyoto' }, '@f')?.suggestedName === 'Ippodo Kyoto');
  check('separator caption trims to the place',
    parseOEmbedPayload({ title: 'Best ramen | Ichiran Shibuya Tokyo', author_name: 'a' }, '@f')?.suggestedName === 'Ichiran Shibuya Tokyo');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
