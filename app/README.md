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
| Weather (Now screen) | ✅ Live — [Open-Meteo](https://open-meteo.com/), keyless |
| Currency converter | ✅ Live — [frankfurter.app](https://www.frankfurter.app/), keyless (ECB daily rate) |
| GPS distances + "leave in N min" countdown | ✅ Live — real `expo-location`, see `src/services/location.ts` |
| Proximity alerts when near a saved pin | ⚠️ Wired but **unverified** — real `expo-location` geofencing + local notifications, armed from `NowScreen`. Needs a dev build (off in Expo Go) and someone physically walking near a pin to confirm |
| Walking ETA for leave-by alerts | ⚠️ Live *estimate* (straight-line distance ÷ avg. walking speed) unless you add a Google Directions key — see below |
| Phrase audio + slow/normal + word highlight | ✅ Live — on-device TTS via `expo-speech`, real `ja-JP` voice |
| Add Pin → address matching | ✅ Live — [Nominatim](https://nominatim.org/) geocoding, keyless |
| Google Maps tiles on the Map tab | ⚠️ Needs **your** Google Maps API key (see below) — blank/gray without one |
| Saved pins, day plans and Book it / Skip decisions surviving a restart | ✅ Live — persisted to `AsyncStorage`, see `src/services/persist.ts` |
| Shared pins, forwarded-booking inbox sync | ⚠️ Needs the backend in `server/` deployed and `EXPO_PUBLIC_API_BASE_URL` set — falls back to on-device-only storage without it |
| "Share to app" from TikTok/Instagram | ⚠️ Real Android Share Sheet target (via `expo-share-intent`) is wired up, but needs a **dev build** (not Expo Go) — see below. The actual video parsing happens server-side; see `server/README.md` |
| Forwarding real booking emails to `japan@trip.mail` | ⚠️ That address is a placeholder from the design — needs your own domain + inbound-email provider, see `server/README.md` |

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

```bash
npm install
npx expo start      # scan the QR with Expo Go on an Android phone
```

Share-to-app, scheduled notifications, and background geofencing are
switched off under Expo Go (it doesn't ship those native modules — see
`src/env.ts`). Every screen, the live weather/currency calls, GPS distances
and the phrase audio all work, and the map draws real tiles using Expo Go's
own Google key, so no API key is needed just to look at it.

### Full build

For share-to-app and notifications you need a real build, not Expo Go:

```bash
npm install
cp .env.example .env   # fill in what you have, see below
npx expo prebuild --clean
npx expo run:android    # builds and installs a dev client on a device/emulator
```

After the first `run:android`, day-to-day development can use
`npx expo start --dev-client` against that installed build.

## Setup you need to do yourself

1. **Google Maps API key** (Map tab tiles + optional Directions ETAs) — get
   one at [Google Cloud Console](https://developers.google.com/maps/documentation/android-sdk/get-api-key),
   enable the **Maps SDK for Android** (and **Directions API** if you want
   exact walking times instead of the straight-line estimate). It goes in
   **one** place now:
   - `.env` → `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

   `app.config.js` reads it from there and compiles it into the native build,
   and `src/services/location.ts` uses the same value for the Directions
   calls. Set no key and the field is simply absent — you get Expo Go's own
   map tiles, and straight-line walking estimates.
2. **Backend** (shared pins, inbox, TikTok/IG parsing) — deploy `server/`
   somewhere reachable from your phone and set `EXPO_PUBLIC_API_BASE_URL`.
   See `server/README.md` for what that unlocks and what it in turn needs.
3. **Rename the bundle identifiers** in `app.json`
   (`com.blairfeldman.japantrip`) if you're publishing this rather than
   just running it on your own device.

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
