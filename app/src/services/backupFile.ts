import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { buildBackup, parseBackup, BackupFile, SyncedState } from './backup';
import { isoDateOnly } from '../utils/time';

// The native half of backup/restore. Kept apart from backup.ts so the merge
// logic there stays runnable (and tested) outside the app.

/** Writes the backup to a cache file and opens Android's share sheet on it. */
export async function exportAndShare(state: SyncedState): Promise<void> {
  const file = new File(Paths.cache, `japan-trip-${isoDateOnly(new Date())}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(buildBackup(state), null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(`Sharing isn't available on this device. The file is saved at ${file.uri}`);
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Send your Japan Trip backup',
    UTI: 'public.json',
  });
}

/** Opens the system file picker. Returns null if the picker was dismissed. */
export async function pickBackup(): Promise<BackupFile | null> {
  const picked = await File.pickFileAsync();
  if (picked.canceled || !picked.result) return null;
  return parseBackup(await picked.result.text());
}
