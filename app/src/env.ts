import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Expo Go doesn't ship the native modules behind share-to-app, scheduled
 * notifications, or background geofencing — touching them there crashes the
 * app at startup. Everything else runs fine, so those features switch off
 * rather than the whole preview being unavailable.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * The Maps key, as compiled into this build. `app.config.js` reads the same
 * variable to write the Android manifest's `com.google.android.geo.API_KEY`,
 * so if this is empty the native key is missing too.
 *
 * That matters because react-native-maps does not degrade gracefully there:
 * rendering a PROVIDER_GOOGLE MapView with no key meta-data throws a fatal
 * "API key not found" and takes the whole app down. Expo Go is the exception
 * — it supplies its own key, so the map works there without this set.
 */
export const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/** Safe to mount a Google MapView? */
export const canRenderMap = isExpoGo || GOOGLE_MAPS_KEY.length > 0;
