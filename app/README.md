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
| GPS + "leave in N min" + proximity alerts | ✅ Live — real `expo-location` geofencing + `expo-notifications`, see `src/services/location.ts` / `notifications.ts` |
| Walking ETA for leave-by alerts | ⚠️ Live *estimate* (straight-line distance ÷ avg. walking speed) unless you add a Google Directions key — see below |
| Phrase audio + slow/normal + word highlight | ✅ Live — on-device TTS via `expo-speech`, real `ja-JP` voice |
| Add Pin → address matching | ✅ Live — [Nominatim](https://nominatim.org/) geocoding, keyless |
| Google Maps tiles on the Map tab | ⚠️ Needs **your** Google Maps API key (see below) — blank/gray without one |
| Shared pins, forwarded-booking inbox sync | ⚠️ Needs the backend in `server/` deployed and `EXPO_PUBLIC_API_BASE_URL` set — falls back to on-device-only storage without it |
| "Share to app" from TikTok/Instagram | ⚠️ Real Android Share Sheet target (via `expo-share-intent`) is wired up, but needs a **dev build** (not Expo Go) — see below. The actual video parsing happens server-side; see `server/README.md` |
| Forwarding real booking emails to `japan@trip.mail` | ⚠️ That address is a placeholder from the design — needs your own domain + inbound-email provider, see `server/README.md` |

Nothing here fakes success: where a real integration isn't configured, the
UI says so (e.g. the Share Sheet explicitly says no parsing backend is
configured, rather than pretending to find a place) rather than showing
made-up data.

**I have not been able to visually test this in a running app** — this
sandbox has no Android emulator or physical device attached. It type-checks
clean (`npx tsc --noEmit`) and the backend was smoke-tested end-to-end, but
you should run it on a real device/emulator and check the golden paths
before considering it done.

## Running it

This app uses `expo-share-intent`, which needs native code — **you can't
use Expo Go**, only a dev client:

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
   exact walking times instead of the straight-line estimate). Put it in:
   - `app.json` → `expo.android.config.googleMaps.apiKey` (compiled into
     the app, required for the map to render at all on Android)
   - `.env` → `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (used for the optional
     Directions ETA calls)
2. **Backend** (shared pins, inbox, TikTok/IG parsing) — deploy `server/`
   somewhere reachable from your phone and set `EXPO_PUBLIC_API_BASE_URL`.
   See `server/README.md` for what that unlocks and what it in turn needs.
3. **Rename the bundle identifiers** in `app.json`
   (`com.blairfeldman.japantrip`) if you're publishing this rather than
   just running it on your own device.

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
