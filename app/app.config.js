/**
 * Layered on top of app.json (Expo passes app.json's contents in as `config`).
 *
 * The Google Maps key used to be the literal string
 * "GOOGLE_MAPS_API_KEY_PLACEHOLDER" committed into app.json, which a native
 * build happily compiles in — you just get a permanently grey map with no
 * explanation. It now comes from the environment, and is simply absent when
 * you haven't set one, so there is a single place to put the key:
 *
 *   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...   (in app/.env)
 *
 * Expo Go doesn't need it at all — it renders the map with its own key.
 */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    android: {
      ...config.android,
      config: googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : undefined,
    },
    ios: {
      ...config.ios,
      config: googleMapsApiKey ? { googleMapsApiKey } : undefined,
    },
  };
};
