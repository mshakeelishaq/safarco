import type { TripState } from './engine/engine';
import { isoAdd } from './engine/format';

export type Theme = 'paper' | 'daylight' | 'peach' | 'dark';
export const THEMES: { id: Theme; label: string }[] = [
  { id: 'paper', label: 'Paper' }, { id: 'daylight', label: 'Daylight' }, { id: 'peach', label: 'Peach' }, { id: 'dark', label: 'Dark' }];

export interface AppState extends TripState {
  screen: 'onboard' | 'app'; step: number; oq: string; loc: 'idle' | 'ask' | 'locating' | 'done' | 'denied' | 'failed'; locNote: string;
  dq: string; pickId: string | null; tab: 'trip' | 'map' | 'offline'; settings: boolean;
  flash: 'budget' | null; offline: 'off' | 'downloading' | 'ready'; progress: number;
  offlineMB: number; offlineErr: string; mapFail: boolean; theme: Theme;
}

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
  offline: 'off', progress: 0, offlineMB: 0, offlineErr: '', mapFail: false, theme: savedTheme()
});

export type Patch = Partial<AppState>;
