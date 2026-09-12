import type * as NotificationsModule from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PROXIMITY_TASK } from './location';
import { isExpoGo } from '../env';

// Loaded lazily: importing expo-notifications at module scope crashes Expo Go
// on startup, and this module is imported from App.tsx.
let cached: typeof NotificationsModule | null = null;
function notifications(): typeof NotificationsModule | null {
  if (isExpoGo) return null;
  if (!cached) cached = require('expo-notifications');
  return cached;
}

const N = notifications();
N?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = notifications();
  if (!Notifications) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('leave-by', {
      name: 'Leave-by alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync('nearby-pins', {
      name: 'Nearby saved pins',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return status === 'granted';
}

export async function scheduleLeaveByNotification(params: {
  id: string;
  title: string;
  body: string;
  fireAt: Date;
}) {
  const Notifications = notifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(params.id).catch(() => {});
  if (params.fireAt.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: params.id,
    content: { title: params.title, body: params.body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.fireAt,
      channelId: 'leave-by',
    },
  });
}

async function alreadyNotifiedToday(pinId: string): Promise<boolean> {
  const key = `jt.notified.${pinId}.${new Date().toISOString().slice(0, 10)}`;
  const v = await AsyncStorage.getItem(key);
  if (v) return true;
  await AsyncStorage.setItem(key, '1');
  return false;
}

async function sendProximityNotification(pinId: string, pinName: string) {
  const Notifications = notifications();
  if (!Notifications) return;
  if (await alreadyNotifiedToday(pinId)) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Near a saved pin',
      body: `${pinName} is close by — want directions?`,
      sound: true,
      data: { pinId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: 'nearby-pins' },
  });
}

// Registered at module load so it also runs as a headless JS task when the
// app is backgrounded/killed, per expo-location's geofencing model. The
// region identifier is the only thing the callback receives, so the pin's id
// and name are packed into it (see buildGeofenceRegions).
if (!isExpoGo) {
  TaskManager.defineTask(PROXIMITY_TASK, async ({ data, error }) => {
    if (error) return;
    const { eventType, region } = (data as any) ?? {};
    if (eventType === 2 /* Location.GeofencingEventType.Enter */ && region) {
      const [pinId, ...rest] = String(region.identifier).split('::');
      await sendProximityNotification(pinId, rest.join('::') || pinId);
    }
  });
}
