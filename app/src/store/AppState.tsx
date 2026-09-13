import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { Category, ItineraryEvent, Person, SavedPin, InboxBooking } from '../types';
import { SEED_PINS } from '../data/pins';
import { SEED_INBOX } from '../data/inbox';
import { TRIP, dayIndexForDate } from '../data/trip';
import { WeatherNow } from '../services/weather';
import { LatLng } from '../services/location';
import { loadPersisted, savePersisted, PersistedState } from '../services/persist';
import { SyncedState } from '../services/backup';
import { EventEdits, EventPatch, diffPatch, seedEvent } from '../services/schedule';
import { Decisions } from '../data/budget';
import { isoDateOnly } from '../utils/time';

interface ConverterState {
  amount: string;
  dir: 'jpy' | 'usd';
}

interface State {
  dayIdx: number; // 0-11
  catFilters: Partial<Record<Category, boolean>>; // true = hidden
  offline: boolean;
  pins: SavedPin[];
  inbox: InboxBooking[];
  extraEvents: ItineraryEvent[]; // bookings merged in from the Inbox / manual add
  snoozedUntil: number | null;
  converter: ConverterState;
  fxRate: number;
  fxLive: boolean;
  weatherByDay: Record<string, WeatherNow>;
  location: LatLng | null;
  nowOverride: Date | null;
  decisions: Decisions;
  /** Patches over the day plan, keyed by event id. See services/schedule.ts. */
  eventEdits: EventEdits;
  /**
   * Which of the two of you is holding this phone.
   *
   * Both phones install the same APK, so nothing else can tell them apart —
   * and with sync on, everything Yev saves would otherwise be filed and
   * pushed under Blair's name. Set on the Inbox screen, kept out of the
   * synced slice because it describes the device, not the trip.
   */
  me: Person;
  hydrated: boolean;
}

type Action =
  | { type: 'HYDRATE'; saved: Partial<PersistedState> | null }
  | { type: 'SET_DAY'; idx: number }
  | { type: 'TOGGLE_CAT_FILTER'; cat: Category }
  | { type: 'CLEAR_CAT_FILTERS' }
  | { type: 'SET_OFFLINE'; value: boolean }
  | { type: 'ADD_PIN'; pin: SavedPin }
  | { type: 'SET_PIN_CAT'; pinId: string; cat: Category }
  | { type: 'ADD_CLIP_TO_PIN'; pinId: string; clip: SavedPin['clips'][number] }
  | { type: 'ADD_INBOX_TO_DAY'; id: string; day: number; event: ItineraryEvent }
  | { type: 'ADD_MANUAL_EVENT'; event: ItineraryEvent }
  | { type: 'SET_CONVERTER'; patch: Partial<ConverterState> }
  | { type: 'SET_FX'; jpyPerUsd: number; live: boolean }
  | { type: 'SET_WEATHER'; dateIso: string; weather: WeatherNow }
  | { type: 'SET_LOCATION'; location: LatLng }
  | { type: 'SET_NOW_OVERRIDE'; date: Date | null }
  | { type: 'SNOOZE_LEAVE_BY'; minutes: number }
  | { type: 'CLEAR_SNOOZE' }
  | { type: 'DECIDE_ITEM'; id: string; decision: 'booked' | 'skipped' }
  | { type: 'EDIT_EVENT'; id: string; original: ItineraryEvent; patch: EventPatch }
  | { type: 'DELETE_EVENT'; id: string }
  | { type: 'RESTORE_EVENT'; id: string }
  | { type: 'SET_ME'; me: Person }
  | { type: 'APPLY_MERGED'; merged: SyncedState };

const initialState: State = {
  // Opens on the day the trip is actually on, not the prototype's pinned Day 6.
  dayIdx: dayIndexForDate(isoDateOnly(new Date())),
  catFilters: {},
  offline: false,
  pins: SEED_PINS,
  inbox: SEED_INBOX,
  extraEvents: [],
  snoozedUntil: null,
  converter: { amount: '3300', dir: 'jpy' },
  fxRate: TRIP.exchangeRateFallback,
  fxLive: false,
  weatherByDay: {},
  location: null,
  nowOverride: null,
  decisions: {},
  eventEdits: {},
  me: 'B',
  hydrated: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        ...(action.saved ?? {}),
        decisions: migrateDecisions(action.saved?.decisions),
        eventEdits: action.saved?.eventEdits ?? {},
        // Seed data is the floor: a saved-but-empty pin list shouldn't wipe
        // the places that shipped with the app.
        pins: action.saved?.pins?.length ? action.saved.pins : state.pins,
        inbox: action.saved?.inbox ?? state.inbox,
        hydrated: true,
      };
    case 'SET_DAY':
      return { ...state, dayIdx: action.idx };
    case 'SET_ME':
      return { ...state, me: action.me };
    case 'TOGGLE_CAT_FILTER':
      return { ...state, catFilters: { ...state.catFilters, [action.cat]: !state.catFilters[action.cat] } };
    case 'CLEAR_CAT_FILTERS':
      return { ...state, catFilters: {} };
    case 'SET_OFFLINE':
      return { ...state, offline: action.value };
    case 'ADD_PIN':
      return { ...state, pins: [action.pin, ...state.pins] };
    case 'SET_PIN_CAT':
      return { ...state, pins: state.pins.map((p) => (p.id === action.pinId ? { ...p, cat: action.cat } : p)) };
    case 'ADD_CLIP_TO_PIN':
      return {
        ...state,
        pins: state.pins.map((p) => (p.id === action.pinId ? { ...p, clips: [...p.clips, action.clip] } : p)),
      };
    case 'ADD_INBOX_TO_DAY':
      return {
        ...state,
        inbox: state.inbox.map((b) => (b.id === action.id ? { ...b, addedToDay: true, day: action.day } : b)),
        extraEvents: [...state.extraEvents, action.event],
      };
    case 'ADD_MANUAL_EVENT':
      return { ...state, extraEvents: [...state.extraEvents, action.event] };
    case 'SET_CONVERTER':
      return { ...state, converter: { ...state.converter, ...action.patch } };
    case 'SET_FX':
      return { ...state, fxRate: action.jpyPerUsd, fxLive: action.live };
    case 'SET_WEATHER':
      return { ...state, weatherByDay: { ...state.weatherByDay, [action.dateIso]: action.weather } };
    case 'SET_LOCATION':
      return { ...state, location: action.location };
    case 'SET_NOW_OVERRIDE':
      return { ...state, nowOverride: action.date };
    case 'SNOOZE_LEAVE_BY':
      return { ...state, snoozedUntil: Date.now() + action.minutes * 60000 };
    case 'CLEAR_SNOOZE':
      return { ...state, snoozedUntil: null };
    case 'DECIDE_ITEM':
      return {
        ...state,
        decisions: { ...state.decisions, [action.id]: { decision: action.decision, at: new Date().toISOString() } },
      };
    case 'EDIT_EVENT': {
      // Only the fields that actually differ are stored, so an entry can
      // always be reset to what the itinerary said.
      const patch = diffPatch(action.original, action.patch);
      if (Object.keys(patch).length === 0 && !state.eventEdits[action.id]) return state;
      return {
        ...state,
        eventEdits: { ...state.eventEdits, [action.id]: { patch, at: new Date().toISOString() } },
      };
    }
    case 'DELETE_EVENT':
      return {
        ...state,
        eventEdits: {
          ...state.eventEdits,
          [action.id]: { patch: state.eventEdits[action.id]?.patch ?? {}, at: new Date().toISOString(), deleted: true },
        },
      };
    case 'RESTORE_EVENT': {
      // A seed entry goes back to the itinerary's version; one you added
      // yourself just stops being deleted.
      const next = { ...state.eventEdits };
      if (seedEvent(action.id)) {
        delete next[action.id];
      } else {
        next[action.id] = { patch: {}, at: new Date().toISOString() };
      }
      return { ...state, eventEdits: next };
    }
    // The caller runs mergeSynced so it can show what changed; this just
    // commits the result.
    case 'APPLY_MERGED':
      return { ...state, ...action.merged };
    default:
      return state;
  }
}

/** Decisions were once a bare string; they carry a timestamp now so two
 * phones' backups can be merged. Old saved data is upgraded on load. */
function migrateDecisions(saved: unknown): Decisions {
  if (!saved || typeof saved !== 'object') return {};
  const out: Decisions = {};
  for (const [id, v] of Object.entries(saved as Record<string, unknown>)) {
    if (v === 'booked' || v === 'skipped') {
      out[id] = { decision: v, at: new Date(0).toISOString() };
    } else if (v && typeof v === 'object' && 'decision' in v) {
      out[id] = v as Decisions[string];
    }
  }
  return out;
}

/** The slice that travels between phones — no per-device UI state. */
export function syncedFrom(state: {
  pins: SavedPin[];
  inbox: InboxBooking[];
  extraEvents: ItineraryEvent[];
  decisions: Decisions;
  eventEdits: EventEdits;
}): SyncedState {
  return {
    pins: state.pins,
    inbox: state.inbox,
    extraEvents: state.extraEvents,
    decisions: state.decisions,
    eventEdits: state.eventEdits,
  };
}

const StateCtx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

function persistable(state: State): PersistedState {
  return {
    pins: state.pins,
    inbox: state.inbox,
    extraEvents: state.extraEvents,
    decisions: state.decisions,
    eventEdits: state.eventEdits,
    catFilters: state.catFilters,
    converter: state.converter,
    me: state.me,
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadPersisted().then((saved) => dispatch({ type: 'HYDRATE', saved }));
  }, []);

  // Write back on change, debounced so a burst of edits is one write. Held
  // until hydration finishes so the seed state can't overwrite what's on disk.
  useEffect(() => {
    if (!state.hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => savePersisted(persistable(state)), 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    state.hydrated,
    state.pins,
    state.inbox,
    state.extraEvents,
    state.decisions,
    state.eventEdits,
    state.catFilters,
    state.converter,
    state.me,
  ]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StateCtx.Provider value={value}>{children}</StateCtx.Provider>;
}

export function useAppState() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
