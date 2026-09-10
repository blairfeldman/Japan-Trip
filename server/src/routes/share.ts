import { Router } from 'express';
import { readDb, writeDb } from '../db';
import { distanceMeters, geocode } from '../services/geocode';
import { extractLocation, extractOnScreenText, fetchVideoMeta, MissingToolError } from '../services/videoParse';
import { Category, SavedPin } from '../types';

export const shareRouter = Router();

const DUPLICATE_RADIUS_M = 75;

const CATEGORY_KEYWORDS: [RegExp, Category][] = [
  [/ramen/i, 'ramen'],
  [/sushi|omakase/i, 'sushi'],
  [/matcha|tea ?room|tea ceremony/i, 'matcha'],
  [/shop|store|boutique|resale|vintage/i, 'shopping'],
  [/hotel|ryokan|inn/i, 'hotel'],
  [/shrine|temple|museum|park|tower|castle|garden/i, 'sightseeing'],
];

function guessCategory(text: string): Category {
  for (const [re, cat] of CATEGORY_KEYWORDS) if (re.test(text)) return cat;
  return 'food';
}

shareRouter.post('/analyze', async (req, res) => {
  const url = (req.body?.url as string)?.trim();
  if (!url) return res.status(400).json({ error: 'url is required' });

  let meta;
  try {
    meta = await fetchVideoMeta(url);
  } catch (err) {
    if (err instanceof MissingToolError) {
      return res.status(501).json({
        error: 'video_parsing_unavailable',
        detail: `${err.tool} is not installed on this server — see server/README.md for setup.`,
      });
    }
    return res.status(502).json({ error: 'failed_to_read_video', detail: String((err as Error).message) });
  }

  const ocrText = await extractOnScreenText(url).catch(() => '');
  const combined = [meta.title, meta.description, ocrText].filter(Boolean).join('\n');

  const location = await extractLocation(combined).catch(() => null);
  if (!location) {
    return res.status(422).json({ error: 'no_place_identified', detail: 'Could not find a specific place in the caption or on-screen text.' });
  }

  const geo = await geocode(`${location.placeName}, ${location.cityOrArea}, Japan`);
  if (!geo) {
    return res.status(422).json({ error: 'geocode_failed', detail: `Found "${location.placeName}" but couldn't place it on the map.` });
  }

  const db = readDb();
  const existing = db.pins.find((p) => distanceMeters(p, { lat: geo.lat, lng: geo.lng }) < DUPLICATE_RADIUS_M);
  if (existing) {
    existing.clips.push({
      handle: `@${meta.uploader}`,
      caption: meta.title.slice(0, 200),
      savedBy: 'B',
      savedAt: new Date().toISOString(),
      sourceUrl: url,
    });
    writeDb(db);
    return res.json({ status: 'duplicate', duplicateOf: existing });
  }

  const pin: SavedPin = {
    id: `p-${Date.now()}`,
    name: location.placeName,
    cat: (location.category as Category) || guessCategory(combined),
    address: geo.displayName,
    lat: geo.lat,
    lng: geo.lng,
    sub: meta.title.slice(0, 120),
    who: 'both',
    clips: [{ handle: `@${meta.uploader}`, caption: meta.title.slice(0, 200), savedBy: 'B', savedAt: new Date().toISOString(), sourceUrl: url }],
    createdAt: new Date().toISOString(),
  };
  db.pins = [pin, ...db.pins];
  writeDb(db);
  res.json({ status: 'saved', pin });
});
