import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pinsRouter } from './routes/pins';
import { inboxRouter } from './routes/inbox';
import { shareRouter } from './routes/share';
import { inboundEmailRouter } from './routes/inboundEmail';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/pins', pinsRouter);
app.use('/inbox', inboxRouter);
app.use('/share', shareRouter);
app.use('/inbound-email', inboundEmailRouter);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(PORT, () => {
  console.log(`Japan Trip server listening on :${PORT}`);
});
