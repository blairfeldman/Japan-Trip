import { useEffect, useState } from 'react';
import { useAppState } from '../store/AppState';

/** Real device clock, ticking every 30s, unless a dev "preview as" override is set. */
export function useClock(): Date {
  const { state } = useAppState();
  const [real, setReal] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setReal(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  return state.nowOverride ?? real;
}
