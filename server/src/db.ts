import fs from 'node:fs';
import path from 'node:path';
import { DbShape } from './types';

// Plain JSON-file persistence — no native module to compile, easy to inspect
// and back up by hand, and plenty for a two-person trip's worth of pins and
// bookings. Swap for a real database if this ever needs to handle more load.
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '..', 'data', 'db.json');

function ensureFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    // Seeded with the same three example forwarded bookings the app ships
    // locally, so a freshly-connected backend doesn't look emptier than
    // the offline fallback it's replacing.
    const seeded: DbShape = {
      pins: [],
      inbox: [
        {
          id: 'inb-jal8', kind: 'Flight', icon: 'AirplaneTakeoff', confidence: 'Confident',
          title: 'JAL 8 · KIX → SFO', sub: 'Tue Oct 6, 17:45 · 2 seats, 41H/41J · conf. WQ8T2M', day: 12,
        },
        {
          id: 'inb-zagin', kind: 'Restaurant', icon: 'ForkKnife', confidence: 'Check date',
          title: 'Tabelog: Torisoba Zagin', sub: 'Confirmation in Japanese · reads Oct 5, 19:00, party of 2 · pay at the counter', day: 11,
        },
        {
          id: 'inb-rapit', kind: 'Train', icon: 'TrainRegional', confidence: 'Confident',
          title: 'Nankai Rapi:t · Namba → KIX', sub: 'Tue Oct 6, 14:05 · car 4, seats 3A/3B · ¥1,490 each, paid', day: 12,
        },
      ],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(seeded, null, 2));
  }
}

export function readDb(): DbShape {
  ensureFile();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

export function writeDb(db: DbShape) {
  ensureFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
