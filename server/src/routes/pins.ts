import { Router } from 'express';
import { readDb, writeDb } from '../db';
import { SavedPin } from '../types';

export const pinsRouter = Router();

pinsRouter.get('/', (_req, res) => {
  res.json(readDb().pins);
});

pinsRouter.post('/', (req, res) => {
  const pin = req.body as SavedPin;
  if (!pin?.id || !pin?.name || typeof pin.lat !== 'number' || typeof pin.lng !== 'number') {
    return res.status(400).json({ error: 'pin needs at least id, name, lat, lng' });
  }
  const db = readDb();
  db.pins = [pin, ...db.pins.filter((p) => p.id !== pin.id)];
  writeDb(db);
  res.status(201).json(pin);
});

pinsRouter.delete('/:id', (req, res) => {
  const db = readDb();
  const before = db.pins.length;
  db.pins = db.pins.filter((p) => p.id !== req.params.id);
  writeDb(db);
  res.json({ ok: true, removed: before !== db.pins.length });
});
