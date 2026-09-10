import { Router } from 'express';
import { readDb, writeDb } from '../db';

export const inboxRouter = Router();

inboxRouter.get('/', (_req, res) => {
  res.json(readDb().inbox);
});

inboxRouter.post('/:id/add-to-day', (req, res) => {
  const { day } = req.body as { day: number };
  const db = readDb();
  const booking = db.inbox.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'booking not found' });
  booking.addedToDay = true;
  booking.day = day ?? booking.day;
  writeDb(db);
  res.json({ ok: true });
});
