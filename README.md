# Japan Trip

A trip-planning Android app for Blair & Yev's Sept 25 – Oct 6 Japan trip
(Tokyo, Hakone, Kyoto, Osaka), implemented from a Claude Design prototype.

- **`app/`** — the real React Native / Expo app. Start here: **`app/README.md`**
  for what's genuinely live (weather, GPS, notifications, currency, on-device
  TTS, geocoding) vs. what needs you to add an account/key (Google Maps,
  the backend, a real forwarded-booking email address).
- **`backend/`** — the Fly-hosted sync backend: one shared database both
  phones read and write, plus the share-to-pin pipeline (Claude reads the
  caption, Google Places locates it). The app is local-first and runs fine
  without it. See **`backend/README.md`**.

## Where this came from

This repo started as a **handoff bundle from Claude Design**
(claude.ai/design) — a clickable HTML/CSS/JS prototype, not production code.
That original material is kept for reference:

- **`chats/chat1.md`** — the full design conversation; this is where the
  actual product intent lives (categories, prepaid/pay-there logic, nav
  structure, etc.) — read it before changing behavior that doesn't have an
  obvious visual spec.
- **`project/Japan Trip.dc.html`** + **`project/support.js`** — the original
  prototype: 12 tappable screens in one static Android frame, all mock
  data pinned to Day 6.
- **`project/uploads/itinerary_files-*.xlsx`** — the real itinerary and
  budget spreadsheet. `app/src/data/` is generated from this file, not from
  the prototype's hardcoded numbers — see the comments at the top of
  `app/src/data/budget.ts` and `app/src/data/itinerary.ts` for exactly how.

## Decisions made translating prototype → real app

- **Platform/stack:** React Native + Expo (chosen over native
  Kotlin/Compose or a web app) — real installable Android app, real
  `expo-location`/`expo-notifications`/`expo-speech`, one codebase.
- **Scope:** full functional integrations where they can run without
  infrastructure only you can provision (GPS, notifications, weather,
  currency, TTS, geocoding) — plus real code paths for the pieces that do
  need your own accounts (Google Maps, a deployed backend, a real inbound
  email address), rather than mocking those and calling it done. Each such
  piece says so explicitly in the UI and in `app/README.md` / `backend/README.md`.
- **All 12 days, not just Day 6:** the prototype only ever populated Day 6's
  hour grid. The real app's `app/src/data/itinerary.ts` has hand-built time
  blocks for all 12 days, derived from the spreadsheet's day-by-day prose
  plus its explicitly booked confirmations (Shinkansen, Romancecar, tours,
  flights) — times without an explicit booking are reasonable estimates,
  not invented facts.
- **Money math is real, not copied from the prototype:** the prepaid/pay
  there/undecided split in the prototype (`$4,108` / `$1,707` / `$603`)
  looks like plausible numbers a design tool made up rather than a value
  computed by a documented rule. The real app instead classifies every
  line item programmatically (lodging + anything the sheet marks
  `BOOKED` → Prepaid; the sheet's own `Optional` column → Undecided;
  everything else → Pay there), which lands at `$4,080` / `$1,735` / `$603`
  on the same `$6,419` total — see `app/src/data/budget.ts`.
