import type { TripState } from './engine/engine';
import type { Have } from './engine/data';
import type { WishId } from './engine/seasons';
import { isoAdd } from './engine/format';
import { lang as currentLang, type Lang } from './i18n';

export type Theme = 'paper' | 'daylight' | 'peach' | 'dark';
export const THEMES: { id: Theme; label: string }[] = [
  { id: 'paper', label: 'Paper' }, { id: 'daylight', label: 'Daylight' }, { id: 'peach', label: 'Peach' }, { id: 'dark', label: 'Dark' }];

export interface AppState extends TripState {
  screen: 'onboard' | 'app'; step: number; oq: string; loc: 'idle' | 'ask' | 'locating' | 'done' | 'denied' | 'failed'; locNote: string;
  dq: string; pickId: string | null; tab: 'trip' | 'map' | 'budget' | 'prepare'; settings: boolean;
  flash: 'budget' | null; offline: 'off' | 'downloading' | 'ready'; progress: number;
  offlineMB: number; offlineErr: string; mapFail: boolean; theme: Theme;
  /** Which bottom sheet is open besides Edit trip. */
  sheet: 'none' | 'trips' | 'save' | 'signin' | 'feedback' | 'review' | 'share' | 'sos' | 'expense' | 'food';
  /** Where the phone was last found on the road (GPS), for progress along today's drive. */
  here: { lat: number; lon: number; at: number } | null;
  /** The trusted hotel or driver being rated in the review sheet. */
  reviewFor: { kind: 'hotel' | 'driver'; id: string; name: string; date: string } | null;
  /** The place a traveller is suggesting somewhere to eat for. */
  foodFor: { dest: string; name: string } | null;
  /** The welcome screen explaining what SafarCo is for. */
  welcome: boolean;
  /** The season guide: best places by season. */
  guide: boolean;
  /** Interface language (English or Roman Urdu). */
  lang: Lang;
  /** The saved trip being edited, if any (changes save to it automatically). */
  savedId: string | null;
  toast: string | null;
  /** Data saver: no 3D scene, for slow phones and networks. */
  lite: boolean;
  /** The destination this trip was built for: its chip stays while other chips are tried. */
  chosen: string | null;
  have: Have;
  /** More places on the trip besides the main one (a circuit). */
  extra: string[];
  /** Whether the traveller set a spending limit (otherwise SafarCo just prices the trip). */
  capOn: boolean;
  overnight: string | null;
  roomCount: number | null;
  /** The traveller chose the number of days; until then it follows the destination's usual length. */
  daysSet: boolean;
  /** "Plan it for me": two questions (what to see; city and days), then SafarCo picks the rest. */
  quick: boolean;
  sleepAt: string[];
  /** Towns where a drive stops for the night by choice: 'out:CHL', 'back:ORM'. */
  breaks: string[];
  /** Fewer hotel changes: nearby places on day trips from one hotel. */
  comfort: boolean;
  /** Places seen on a day trip on a free day. */
  dayTrips: string[];
  /** What they want to see, from the first question; null until answered. */
  wish: WishId | null;
  /** When the "getting your plan ready" screen opened (ms), or null when it isn't showing. */
  building: number | null;
  /** The day whose full page is open, or null. */
  dayOpen: number | null;
  /** Places the traveller added or removed, for the plan they were made on. */
  edits: PlanEdits;
}

/** A place the traveller added to a day. */
export interface PlacePick { day: number; name: string; note: string; href: string }
/** Changes to the plan's places. `key` names the plan they apply to; a different plan ignores them. */
export interface PlanEdits { key: string; picks: PlacePick[]; drops: string[]; times?: Record<number, number> }
export const NO_EDITS: PlanEdits = { key: '', picks: [], drops: [] };

const prefersLite = () => {
  try {
    const v = localStorage.getItem('safarco-lite'); if (v) return v === '1';
    return !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData || matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
};

const savedTheme = (): Theme => {
  try {
    const q = new URLSearchParams(location.search).get('theme'), v = q || localStorage.getItem('safarco-theme');
    if (v === 'paper' || v === 'daylight' || v === 'peach' || v === 'dark') return v;
  } catch { /* storage blocked */ }
  return 'paper';
};

export const initialState = (): AppState => ({
  screen: 'onboard', step: 0, origin: null, oq: '', loc: 'idle', locNote: '', mode: null, dest: 'hunza', dq: '', startDate: isoAdd(21), depart: null, pickId: null,
  vehicle: 'sedan', tier: 'standard', groupSize: 2, adults: 2, kids: 0, elders: 0, rooms: 'separate', days: 4, cap: 120000,
  corridor: 'hunza', tab: 'trip', settings: false, flash: null,
  offline: 'off', progress: 0, offlineMB: 0, offlineErr: '', mapFail: false, theme: savedTheme(),
  sheet: 'none', savedId: null, toast: null, lite: prefersLite(), chosen: null, reviewFor: null, foodFor: null, welcome: false, guide: false, lang: currentLang(),
  have: 'any', wish: null, extra: [], capOn: false, overnight: null, roomCount: null, sleepAt: [], daysSet: false, quick: false, breaks: [], comfort: false, dayTrips: [], here: null, building: null, dayOpen: null, edits: NO_EDITS
});

export type Patch = Partial<AppState>;
