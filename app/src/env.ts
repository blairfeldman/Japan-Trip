import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Expo Go doesn't ship the native modules behind share-to-app, scheduled
 * notifications, or background geofencing — touching them there crashes the
 * app at startup. Everything else runs fine, so those features switch off
 * rather than the whole preview being unavailable.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
