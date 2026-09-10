# Japan Trip — backend

Small Express + TypeScript server behind three real features the mobile app
can't do entirely on its own: **pin dedupe/storage shared between both of
you**, **the TikTok/Instagram share-link parsing pipeline**, and **the
`japan@trip.mail` forwarded-booking inbox**. Everything is stored in one
JSON file (`data/db.json`) — no database server to run.

The app works fine with **no backend at all** — it just keeps pins/inbox
local to the phone and the Share Sheet tells you to add the pin by hand
instead of auto-parsing. Deploying this server is what turns on the shared
and automatic parts.

## Run it

```bash
npm install
cp .env.example .env   # optional, see below
npm run dev             # http://localhost:4000
```

Point the app at it by setting `EXPO_PUBLIC_API_BASE_URL=http://<your-host>:4000`
(see `app/.env.example`). On a physical Android phone this has to be a
reachable address, not `localhost` — your machine's LAN IP while developing,
or a real deployed URL.

## What works out of the box

- `GET/POST/DELETE /pins` — shared pin storage.
- `GET /inbox`, `POST /inbox/:id/add-to-day` — the three example forwarded
  bookings ship pre-seeded, matching what the app shows locally.
- `POST /share/analyze` — responds `501 video_parsing_unavailable` until you
  install `yt-dlp` (see below), rather than pretending to succeed.

## What needs real accounts/binaries to actually work

**1. TikTok/Instagram parsing (`POST /share/analyze`)**

This is a real pipeline, not a mock: it downloads the clip's metadata,
optionally OCRs on-screen text, asks an LLM to extract a place name, then
geocodes and dedupes it. It needs:

- **[`yt-dlp`](https://github.com/yt-dlp/yt-dlp)** on the server's `PATH` —
  reads the caption/uploader without downloading the whole video
  (`--dump-json --skip-download`). Install: `pip install yt-dlp` or
  `brew install yt-dlp`.
- **`ffmpeg` + `tesseract`** (optional, best-effort) — only used to sample a
  few frames and OCR on-screen text when the caption alone doesn't name the
  place. Without them, `extractOnScreenText` just returns `''` and the
  pipeline still runs on the caption alone.
- **`ANTHROPIC_API_KEY`** (optional but strongly recommended) — used to pull
  a specific place name out of the caption/OCR text. Without it, a much
  weaker regex fallback (`/(?:at|@)\s+([A-Z][\w'&. -]{2,40})/`) is used and
  will miss most real captions.

  > **A note on TikTok/Instagram themselves:** neither publishes a public
  > API for reading arbitrary videos, and downloading from them via
  > `yt-dlp` can be rate-limited, blocked, or against their terms depending
  > on how you use it — this is why the design's own "Decisions I made"
  > called out the same problem for Tabelog. Treat this pipeline as
  > best-effort for two people's personal trip-planning use, not something
  > to point at high volume, and expect it to occasionally fail and need
  > the manual "Add by hand" fallback the Share Sheet already offers.

**2. Forwarded bookings (`POST /inbound-email/mailgun`)**

There is no way to spin up `japan@trip.mail` from code — that needs a real
domain plus an inbound-email provider pointed at this endpoint:

- **[Mailgun Routes](https://documentation.mailgun.com/en/latest/user_manual.html#receiving-forwarding-and-storing-messages)**
  (or SendGrid's [Inbound Parse](https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/setting-up-the-inbound-parse-webhook),
  which posts a compatible `multipart/form-data` shape) — configure a route
  on your domain that POSTs to `https://<your-host>/inbound-email/mailgun`.
- A domain you control, with MX records pointed at the provider, and a
  mailbox/alias like `japan@trip.<yourdomain>` — update `TRIP.inboxEmail`
  in `app/src/data/trip.ts` to match whatever address you actually set up
  (`japan@trip.mail` in the app right now is a placeholder from the design,
  not a real registrable domain).
- `ANTHROPIC_API_KEY` again, for extracting the booking fields from the
  email body — especially useful for the Tabelog-in-Japanese case the
  design specifically calls out.
- **Known limitation:** the parsed booking's `day` always defaults to `1`
  until you confirm it — there's no reliable way to map an arbitrary email
  to a specific trip day server-side. The Inbox screen shows the parsed
  date/time in the booking's subtitle so you can sanity-check it before
  tapping "Add to Day N"; wiring a day-correction control is the next
  obvious piece of work here if this matters to you.

**3. Google Maps** — this server doesn't touch maps at all (the app talks
to Google Maps directly); see `app/README.md` for that key.

## Deploying

Any small Node host works (a $5 VPS, Fly.io, Railway, Render, etc.) — it
just needs to keep `data/db.json` on a persistent disk (not ephemeral
container storage) and, if you want the parsing pipeline, a place you can
install `yt-dlp`/`ffmpeg`/`tesseract` as system packages. `npm run build && npm start`
serves the compiled output from `dist/`.
