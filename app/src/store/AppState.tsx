import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { Category, ItineraryEvent, SavedPin, InboxBooking } from '../types';
import { SEED_PINS } from '../data/pins';
import { SEED_INBOX } from '../data/inbox';
import { TRIP } from '../data/trip';
import { WeatherNow } from '../services/weather';
import { LatLng } from '../services/location';

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
  decisions: Record<string, 'booked' | 'skipped'>;
}

type Action =
  | { type: 'SET_DAY'; idx: number }
  | { type: 'TOGGLE_CAT_FILTER'; cat: Category }
  | { type: 'CLEAR_CAT_FILTERS' }
  | { type: 'SET_OFFLINE'; value: boolean }
  | { type: 'ADD_PIN'; pin: SavedPin }
  | { type: 'ADD_CLIP_TO_PIN'; pinId: string; clip: SavedPin['clips'][number] }
  | { type: 'ADD_INBOX_TO_DAY'; id: string; day: number; event: ItineraryEvent }
  | { type: 'ADD_MANUAL_EVENT'; event: ItineraryEvent }
  | { type: 'SET_CONVERTER'; patch: Partial<ConverterState> }
  | { type: 'SET_FX'; jpyPerUsd: number; live: boolean }
  | { type: 'SET_WEATHER'; dateIso: string; weather: WeatherNow }
  | { type: 'SET_LOCATION'; location: LatLng }
  | { type: 'SET_NOW_OVERRIDE'; date: Date | null }
  | { type: 'SNOOZE_LEAVE_BY'; minutes: number }
  | { type: 'DECIDE_ITEM'; id: string; decision: 'booked' | 'skipped' };

const initialState: State = {
  dayIdx: 5,
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
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DAY':
      return { ...state, dayIdx: action.idx };
    case 'TOGGLE_CAT_FILTER':
      return { ...state, catFilters: { ...state.catFilters, [action.cat]: !state.catFilters[action.cat] } };
    case 'CLEAR_CAT_FILTERS':
      return { ...state, catFilters: {} };
    case 'SET_OFFLINE':
      return { ...state, offline: action.value };
    case 'ADD_PIN':
      return { ...state, pins: [action.pin, ...state.pins] };
    case 'ADD_CLIP_TO_PIN':
      return {
        ...state,
        pins: state.pins.map((p) => (p.id === action.pinId ? { ...p, clips: [...p.clips, action.clip] } : p)),
      };
    case 'ADD_INBOX_TO_DAY':
      return {
        ...state,
        inbox: state.inbox.map((b) => (b.id === action.id ? { ...b, addedToDay: true } : b)),
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
    case 'DECIDE_ITEM':
      return { ...state, decisions: { ...state.decisions, [action.id]: action.decision } };
    default:
      return state;
  }
}

const StateCtx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StateCtx.Provider value={value}>{children}</StateCtx.Provider>;
}

export function useAppState() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

/** Parses a booking's first HH:MM into a decimal hour; falls back to a sane default. */
export function inboxToEvent(b: InboxBooking, dateIso: string): ItineraryEvent {
  const m = b.sub.match(/(\d{1,2}):(\d{2})/);
  const start = m ? parseInt(m[1], 10) + parseInt(m[2], 10) / 60 : 12;
  const dur = b.kind === 'Flight' ? 1.5 : b.kind === 'Restaurant' ? 1.25 : b.kind === 'Train' ? 0.6 : 1;
  const cat: Category = b.kind === 'Restaurant' ? 'food' : 'transit';
  const paid = /paid|conf\./i.test(b.sub) && !/pay at the counter/i.test(b.sub);
  return {
    id: `${b.id}-event`,
    day: b.day,
    start,
    end: start + dur,
    cat,
    title: b.title,
    sub: b.sub,
    tag: paid ? 'Prepaid' : 'Pay there',
    booking: { reserved: 'Forwarded booking' },
  };
}
