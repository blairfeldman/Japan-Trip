import { Router } from 'express';
import multer from 'multer';
import { readDb, writeDb } from '../db';
import { parseBookingEmail } from '../services/bookingParse';
import { InboxBooking } from '../types';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

export const inboundEmailRouter = Router();

const KIND_ICON: Record<InboxBooking['kind'], string> = {
  Flight: 'AirplaneTakeoff',
  Restaurant: 'ForkKnife',
  Train: 'TrainRegional',
  Hotel: 'MapPin',
  Activity: 'CalendarCheck',
};

/**
 * Inbound route target for a mail-forwarding service pointed at
 * japan@trip.mail (Mailgun Routes and SendGrid Inbound Parse both POST
 * multipart/form-data shaped like this — see server/README.md for the
 * exact provider setup, since a domain + mailbox has to exist before any
 * webhook can fire).
 */
inboundEmailRouter.post('/mailgun', upload.any(), async (req, res) => {
  const subject = (req.body.subject as string) ?? '';
  const from = (req.body.sender ?? req.body.from ?? 'unknown') as string;
  const text = (req.body['stripped-text'] ?? req.body['body-plain'] ?? '') as string;

  if (!text && !subject) return res.status(400).json({ error: 'empty email' });

  try {
    const parsed = await parseBookingEmail({ subject, from, text });
    const booking: InboxBooking = {
      id: `inb-${Date.now()}`,
      kind: parsed.kind,
      icon: KIND_ICON[parsed.kind],
      confidence: parsed.confidence,
      title: parsed.title,
      sub: parsed.sub,
      day: 1, // unknown until the traveler confirms — see README limitation
      raw: text.slice(0, 10000),
    };
    const db = readDb();
    db.inbox = [booking, ...db.inbox];
    writeDb(db);
    res.status(201).json(booking);
  } catch (err: any) {
    res.status(502).json({ error: 'failed to parse booking', detail: String(err?.message ?? err) });
  }
});
