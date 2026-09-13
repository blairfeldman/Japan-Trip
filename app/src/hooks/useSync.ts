import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { useAppState, syncedFrom } from '../store/AppState';
import { syncConfigured } from '../services/api';
import { runSync, describeSync, rewindCursor } from '../services/syncRun';
import { SyncOutcome } from '../services/sync';

/**
 * Keeps this phone in step with the other one.
 *
 * Runs on mount, whenever the app comes back to the foreground, and a few
 * seconds after any local change — not on a timer, because a trip app spends
 * most of its life in a pocket and the interesting moments are exactly those
 * three.
 *
 * Nothing here blocks the UI: the app reads from local state throughout, and a
 * failed pass just leaves the cursor where it was for next time.
 */

const DEBOUNCE_MS = 4000;

export function useSync() {
  const { state, dispatch } = useAppState();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<SyncOutcome | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read through a ref so the debounce doesn't restart on every keystroke.
  const stateRef = useRef(state);
  stateRef.current = state;

  const sync = useCallback(async (): Promise<SyncOutcome | null> => {
    if (!syncConfigured) return null;
    setBusy(true);
    try {
      const outcome = await runSync(syncedFrom(stateRef.current), stateRef.current.me, (merged) =>
        dispatch({ type: 'APPLY_MERGED', merged })
      );
      setLast(outcome);
      return outcome;
    } finally {
      setBusy(false);
    }
  }, [dispatch]);

  /**
   * Re-read the whole server, not just what's new. Slower and almost never
   * needed — it's the recovery path for rows an older build pulled and
   * couldn't make sense of, which the cursor has since moved past.
   */
  const resync = useCallback(async (): Promise<SyncOutcome | null> => {
    await rewindCursor();
    return sync();
  }, [sync]);

  // On mount, and whenever the app is reopened.
  useEffect(() => {
    if (!syncConfigured || !state.hydrated) return;
    sync();
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') sync();
    });
    return () => sub.remove();
  }, [state.hydrated]);

  // Shortly after a local change settles.
  useEffect(() => {
    if (!syncConfigured || !state.hydrated) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => sync(), DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state.hydrated, state.pins, state.extraEvents, state.eventEdits, state.decisions, state.inbox]);

  return {
    configured: syncConfigured,
    busy,
    last,
    status: last ? describeSync(last) : null,
    sync,
    resync,
  };
}
