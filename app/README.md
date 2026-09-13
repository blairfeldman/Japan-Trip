# Japan Trip — app

React Native / Expo implementation of the `Japan Trip.dc.html` Claude Design
prototype (see `/README.md` and `/chats/chat1.md` at the repo root for the
original design brief). All 12 screens, real navigation, and the actual
itinerary/budget numbers from `project/uploads/itinerary_files-*.xlsx` —
not the placeholder Day-6-only data the prototype shipped with.

## Status: what's really live vs. simulated

This was built for **full functional integrations**, not a click-through
mock — but a few pieces need accounts/hardware this environment can't
provision on your behalf. Here's the honest breakdown:

| Feature | Status |
|---|---|
| All 12 screens, real navigation, real data | ✅ Live — pulled from the actual spreadsheet, see `src/data/` |
| Editing the day plan | ✅ Live — hold an entry on the Days grid to change its time, title, category or cost, or remove it; **+** in the header adds one. Itinerary entries are patched, never overwritten, so the original can always be restored |
| Weather (Now screen) | ✅ Live — [Open-Meteo](https://open-meteo.com/), keyless |
| Currency converter | ✅ Live — [frankfurter.app](https://www.frankfurter.app/), keyless (ECB daily rate) |
| GPS distances + "leave in N min" countdown | ✅ Live — real `expo-location`, see `src/services/location.ts` |
| Proximity alerts when near a saved pin | ⚠️ Wired but **unverified** — real `expo-location` geofencing + local notifications, armed from `NowScreen`. Needs a dev build (off in Expo Go) and someone physically walking near a pin to confirm |
| Walking ETA for leave-by alerts | ⚠️ Live *estimate* (straight-line distance ÷ avg. walking speed) unless you add a Google Directions key — see below |
| Phrase audio + slow/normal + word highlight | ✅ Live — on-device TTS via `expo-speech`, real `ja-JP` voice |
| Add Pin → address matching | ✅ Live — [Nominatim](https://nominatim.org/) geocoding, keyless |
| Google Maps tiles on the Map tab | ⚠️ Needs **your** Google Maps API key (see below). Expo Go uses its own; a standalone build without one shows an explanation instead of the map |
| Saved pins, day plans and Book it / Skip decisions surviving a restart | ✅ Live — persisted to `AsyncStorage`, see `src/services/persist.ts` |
| Backing those up, and merging two phones' saves | ✅ Live — export/import a JSON file from the Inbox screen, no server needed. See below |
| Sync between both phones | ✅ Live once `backend/` is deployed and `EXPO_PUBLIC_API_BASE_URL` + `EXPO_PUBLIC_API_TOKEN` are set. Without them the app is local-only, exactly as before. Set **This phone** on the Inbox screen on each handset first — see below |
| "Share to app" from TikTok/Instagram | ✅ Live in a real build (not Expo Go). Shared links attach to the pin, and re-sharing a clip or saving a place that's already pinned merges instead of duplicating. The caption, author and cover frame are read from the services' own public oEmbed endpoints — no key, no account, no backend — and offered as a name to correct. With `backend/` deployed the caption also goes to a model and a real geocoder, so the pin lands on the actual address rather than a name to look up later |
| Getting a booking into the app | ✅ Live — paste a confirmation into the Inbox, or share it straight from your mail app. Date, time and confirmation number are read on-device, and the date is matched to a trip day. See below |
| Forwarding real booking emails to `japan@trip.mail` | ❌ Not built. The address is a placeholder from the design, and receiving mail needs your own domain, an inbound-email provider and an endpoint in `backend/` to receive it. The paste/share route above covers the same ground without any of that |

Nothing here fakes success: where a real integration isn't configured, the
UI says so (e.g. the Share Sheet explicitly says no parsing backend is
configured, rather than pretending to find a place) rather than showing
made-up data.

**Still not visually verified on a device from here** — this sandbox has no
Android emulator or phone attached. It type-checks clean (`npx tsc --noEmit`)
and bundles clean (`npx expo export --platform android`), and the backend was
smoke-tested end-to-end, but the layout numbers below were reasoned about
rather than looked at. Check the golden paths on the phone.

## Running it

### Quickest look: Expo Go

```powershell
npm.cmd install
npx.cmd expo start   # scan the QR with Expo Go on an Android phone
```

> **Why `.cmd`?** PowerShell resolves `npm` to `npm.ps1`, and Windows blocks
> unsigned `.ps1` scripts by default — you get "running scripts is disabled
> on this system". Calling `npm.cmd` / `npx.cmd` skips the PowerShell wrapper
> and is the simplest fix. To drop the suffix permanently, run once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. Every command below
> uses the `.cmd` form.

Share-to-app, scheduled notifications, and background geofencing are
switched off under Expo Go (it doesn't ship those native modules — see
`src/env.ts`). Every screen, the live weather/currency calls, GPS distances
and the phrase audio all work, and the map draws real tiles using Expo Go's
own Google key, so no API key is needed just to look at it.

## Building a real APK (do this before the trip)

**Expo Go cannot run this app in Japan.** It loads the JS bundle from the
Metro dev server on your laptop — no `npx expo start` on the same network,
no app. It's a preview tool, not a way to ship the app to yourself. You need
a standalone build installed on the phone.

That build is also what switches on the three features `src/env.ts` disables
under Expo Go: notifications, share-to-app, and background proximity alerts.

### One-time setup

```powershell
npm.cmd install
npx.cmd eas-cli login          # free Expo account
npx.cmd eas-cli init           # writes extra.eas.projectId into app.json — commit that
```

Then push the Maps key to EAS. **This step is easy to miss**: `.env` is
gitignored and EAS uploads only git-tracked files, so a key that works in
Expo Go is simply absent on the build server, and you get a grey map in a
build that looked fine locally.

```powershell
npx.cmd eas-cli env:set --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "<your key>" --visibility sensitive --environment preview --environment development --environment production
```

The same applies to the sync backend. Set these two as well, or the build
comes out local-only — no syncing between phones, and shared TikToks parsed
on the phone from the caption alone:

```powershell
npx.cmd eas-cli env:set --name EXPO_PUBLIC_API_BASE_URL --value "https://<your-app>.fly.dev" --visibility plaintext --environment preview --environment development --environment production
npx.cmd eas-cli env:set --name EXPO_PUBLIC_API_TOKEN --value "<the APP_TOKEN from fly secrets>" --visibility sensitive --environment preview --environment development --environment production
```

EAS variables are scoped per *environment*, and each profile in `eas.json`
names the environment it pulls from (`preview` → `preview`, and so on) — so
set it in all three and the profile you build won't matter.

Changing a variable does **not** rebuild anything: the value is baked into
the APK at build time, so after any `env:set` you need a fresh build for it
to take effect.

### The build you actually want

```powershell
npx.cmd eas-cli build --platform android --profile preview
```

`preview` (see `eas.json`) produces an **APK with the JS bundled in** — it
runs with no laptop, no dev server, no network. That's the one to have on
the phone in Japan. EAS emails a download link; open it on the phone and
install it (Android will ask you to allow installs from that browser).

`production` builds an `.aab` instead, which is for the Play Store and
**cannot be sideloaded** — don't use it for this.

### Iterating after you leave Expo Go

A `preview` build has the JS frozen inside it, so every code change means a
fresh ~15-minute cloud build. For day-to-day work, build the dev client
once:

```powershell
npx.cmd eas-cli build --platform android --profile development
npx.cmd expo start --dev-client     # fast reload against the installed build
```

That one does need your dev server, exactly like Expo Go — it's for the
sofa, not for Kyoto. Build `preview` again before you fly.

### Building locally instead

If you'd rather not use EAS's servers, `npx.cmd expo prebuild --clean` then
`npx.cmd expo run:android` builds on your machine — but that needs Android
Studio, the Android SDK and a JDK installed on Windows first.

## Setup you need to do yourself

1. **Google Maps API key** (Map tab tiles + optional Directions ETAs).

   At [console.cloud.google.com](https://console.cloud.google.com/):

   1. Create a project (any name).
   2. **Enable billing on it.** Google won't let you use the Maps SDK at all
      without a billing account, so a card is required. Mobile map loads
      themselves are *unlimited at no charge* — the per-1,000 pricing you'll
      read about is the web JavaScript SKU, not the Android SDK. Directions
      calls are billable but have a free monthly allowance far above what two
      people walking around Japan will use.
   3. **APIs & Services → Library**: enable **Maps SDK for Android**. Add
      **Directions API** too if you want exact walking times instead of the
      straight-line estimate.
   4. **APIs & Services → Credentials → Create credentials → API key.** Copy it.
   5. Restrict it (the key ships inside the APK, so anyone can extract it):
      - *API restrictions* → limit to the two APIs above.
      - *Application restrictions* → **Android apps**, then add package name
        `com.blairfeldman.japantrip` with the signing SHA-1 below.

   **Getting the SHA-1 when EAS holds your keystore.** EAS generated and
   stores the signing key, so the fingerprint isn't on your machine and
   `keytool` won't find it. Ask EAS:

   ```powershell
   npx.cmd eas-cli credentials -p android
   ```

   Pick your build profile, then the Keystore entry — it prints the SHA-1
   certificate fingerprint. Paste that into the Android restriction.

   Then set the key **once**, as an EAS environment variable (see "Building a
   real APK" below) and in `.env` for Expo Go / local runs.

   > If the map comes back grey after restricting the key, the restriction is
   > wrong — usually the SHA-1 of a different build profile, since the
   > `development` and `preview` profiles can hold separate keystores. A grey
   > map means the key was rejected; a missing key is the crash case the Map
   > tab now guards against.

   `app.config.js` reads it from there and compiles it into the native build,
   and `src/services/location.ts` uses the same value for the Directions
   calls.

   **In a standalone build this is not optional.** `react-native-maps` does
   not degrade without it: a `PROVIDER_GOOGLE` map with no
   `com.google.android.geo.API_KEY` in the manifest throws a fatal "API key
   not found" and takes the app down. Expo Go hides this because it supplies
   its own key. The Map tab therefore checks for the key and shows an
   explanation instead of mounting the map when it's missing, so a keyless
   build is merely limited rather than broken — but you still want the key.
2. **Backend** (sync between both phones, TikTok/IG parsing, model-read
   confirmations) — deploy `backend/` and set `EXPO_PUBLIC_API_BASE_URL` and
   `EXPO_PUBLIC_API_TOKEN`. See `backend/README.md` for the deploy steps and
   what each piece unlocks.
3. **Rename the bundle identifiers** in `app.json`
   (`com.blairfeldman.japantrip`) if you're publishing this rather than
   just running it on your own device.

## Which phone is which

Both of you install the same APK, so the app can't tell the handsets apart on
its own. The **This phone** setting at the bottom of the Inbox screen says
which of you is holding it, and everything saved from then on is filed under
that person: new pins, the clips attached to them, and the author recorded
against every row pushed to the backend. It's stored on the device and never
synced, so the two phones can disagree — which is the point.

Set it once per phone, before you start saving things. Left alone it assumes
Blair, which is only right on one of the two.

One thing it deliberately does *not* do is control visibility: with the
backend configured everything syncs to the database you both read. The switch
on Add Pin files a place as yours or as both of yours; it doesn't hide it.

## Editing the day plan

Hold any entry on the Days grid (or tap it, then **Edit**) to change its time,
title, note, category or cost tag, or to remove it from the day. The **+** in
the Days header adds a new entry.

The 12 days in `src/data/itinerary.ts` are generated from the spreadsheet and
are never mutated. An edit is stored as a *patch* against the entry's id and
applied when the day is rendered (`src/services/schedule.ts`), which means:

- a spreadsheet entry can always be reset to what it originally said,
- only the fields you actually changed are stored,
- removing is a flag, not a deletion, so it survives a merge and can be undone,
- edits are timestamped, so merging two phones takes the later change.

Edited entries are marked with a dot on the day grid. Covered by
`src/services/schedule.test.ts`.

## Sync

With `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_API_TOKEN` set (see
`backend/README.md`), pins, day-plan entries, edits, decisions and inbox
bookings sync between both phones. It runs when the app opens, when it returns
to the foreground, and a few seconds after a local change settles — not on a
timer, because those are the moments that matter and a trip app is mostly in a
pocket.

**The phone remains the source of truth for display.** Every screen renders
from local storage; sync only reconciles in the background. Lose signal on the
Yamanote line and nothing changes except that the next pass has more to do.

How a pass works:

1. **Pull** everything after this phone's `seq` cursor, looping while the
   server says `has_more` — a client that advances its cursor past a truncated
   page skips those rows permanently.
2. **Merge** with the same `mergeSynced` the backup file uses, so the rules are
   identical whichever way records arrive. Tombstones are applied separately,
   since a union can't express a deletion.
3. **Push** only records whose content actually changed, compared against a
   fingerprint of what was last sent. Pushing everything each pass would bump
   every row's `seq`, which would make the *other* phone re-download the whole
   set — two phones syncing in circles forever.
4. **Save the cursor** with the push marks, and only after the rows are already
   merged into state.

The cursor lives outside the backup file on purpose: it's this phone's position
in the server's history, so restoring someone else's backup must not hand you
theirs or you'd skip everything they had already seen.

`Days → envelope → Sync` shows what the last pass did and has a **Sync now**
button. Covered by `src/services/sync.test.ts`.

## Backup & merging two phones

Everything you save lives on the phone. Two things follow from that:

- **Expo Go data does not carry into a real build.** Expo Go stores it in its
  own Android sandbox; the standalone app has a different package name and a
  different sandbox. Nothing saved while previewing in Expo Go survives the
  switch.
- **Installing a newer APK over an older one keeps your data** (same package,
  same keystore — Android treats it as an update). Uninstalling loses it.

So: **Days → envelope icon → Backup & merge**. "Back up / send" writes a JSON
file and opens the Android share sheet; "Import" reads one back and *merges*
it in — it never overwrites what's already on the phone.

Merging works because nothing in this app edits existing records: every
action is either an append (a pin, a clip, a day plan) or a set on one key (a
budget decision). So combining two phones is a union, and the rules are:

| Data | Rule |
|---|---|
| Pins | Union by id, then by being the same place — within 60 m, or the same address within 500 m (geocoders jitter). Duplicates fuse into one pin credited to both, with both clips. |
| Clips | Union, identified by source link |
| Day plans | Union by id — items derived from a booking or pin have deterministic ids, so both of you filing the same one collapses to one |
| Inbox | "Filed onto a day" only ever goes one way, so it wins |
| Budget decisions | The one true conflict: later timestamp wins |
| Map filters, converter | Not synced — per-device |

Importing the same file twice changes nothing. The logic is in
`src/services/backup.ts` (deliberately free of native imports) and is covered
by `src/services/backup.test.ts`:

```powershell
npm.cmd test
```

This is merge-on-swap, not live sync — you each see the other's additions
when you exchange a file, not the moment they're saved.

## Getting bookings in without the email address

`japan@trip.mail` needs a deployed backend and a real inbound-email domain, so
until that exists there are two working routes, both entirely on-device:

- **Share it.** Open the confirmation in Gmail (or any mail app) → Share →
  Japan Trip. Text shared to the app that isn't a TikTok/Instagram link is
  treated as a booking and lands in the Inbox, already parsed.
- **Paste it.** Days → envelope → *Paste or add a booking*, and paste the whole
  email.

Either way `src/services/bookingParse.ts` pulls out the kind (flight, train,
restaurant, hotel, activity), the time, the confirmation number, and whether it
was prepaid — then places it on the right day of the trip.

The date matching is the useful trick: rather than trying to parse dates
properly across `Oct 6`, `10/6`, `6 Oct` and `10月6日`, it collects every
plausible month/day pair in the text and keeps whichever one lands on an actual
day of *this* trip. Dates that aren't trip days — the date the mail was sent, a
price, a footer — drop out by themselves. Covered by
`src/services/bookingParse.test.ts`.

It's regex, not a language model, so a confirmation written entirely in
Japanese prose may only yield the date. The screen shows what it found and lets
you override the day before adding, and flags "no trip date found" rather than
guessing.

## Notes on the layout

Android is edge-to-edge from Expo SDK 54 onwards and it can't be turned off,
so every screen positions its own chrome against `useSafeAreaInsets()` rather
than assuming the OS leaves a gap. If you add a screen, do the same — a bare
`padding: 20` puts your heading underneath the status bar clock.

## What I deliberately didn't try to fake

- The prototype's phone-frame chrome (fake status bar, notch, battery %)
  isn't reproduced — a real installed app gets the OS's real status bar for
  free, and drawing a fake one over it would look wrong on a real phone.
  Everything *inside* the frame is pixel-matched from the design.
- Category colors were `oklch()` in the prototype's CSS; converted to sRGB
  hex in `src/theme.ts` since RN's style engine needs plain color strings.
- Booking photos (station photo, TikTok cover frame, etc.) render as an
  honest diagonal-hatch placeholder (`src/components/PlaceholderBanner.tsx`)
  rather than a stock photo standing in for a real one.
