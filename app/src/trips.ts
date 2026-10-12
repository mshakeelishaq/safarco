// Saved trips on this device, the auto-saved current trip, and share links.
import type { TripState } from './engine/engine';
import type { PlanEdits } from './state';
import { DESTS, MON } from './engine/data';
import { mon } from './engine/format';
import { CITY, DST, addPlace } from './engine/places';

const DEST_IDS = new Set(DESTS.map(d => d.id));

/** The parts of the app state that describe a trip. */
export type TripData = Pick<TripState, 'origin' | 'mode' | 'dest' | 'corridor' | 'startDate' | 'days' | 'depart' | 'vehicle' | 'tier' | 'adults' | 'kids' | 'elders' | 'groupSize' | 'rooms' | 'cap'>
  & { places?: { n: string; p: string; lat: number; lon: number }[]; have?: TripState['have']; edits?: PlanEdits };
export interface SavedTrip { id: string; name: string; data: TripData; savedAt: string; cloudId?: string }

const KEYS: Exclude<keyof TripData, 'places'>[] = ['origin', 'mode', 'dest', 'corridor', 'startDate', 'days', 'depart', 'vehicle', 'tier', 'adults', 'kids', 'elders', 'groupSize', 'rooms', 'cap', 'have', 'edits'];
const LIST = 'safarco-trips', CURRENT = 'safarco-current';

/** Trip fields from app state, plus any searched places the trip needs (they aren't built in). */
export function tripData(s: TripState & { edits?: PlanEdits }): TripData {
  const d = Object.fromEntries(KEYS.map(k => [k, s[k]])) as unknown as TripData;
  const names = [s.origin, s.corridor.startsWith('city:') ? s.corridor.slice(5) : null, s.dest.startsWith('city:') ? s.dest.slice(5) : null];
  const places = [...new Set(names)].map(n => n ? CITY[n] : undefined).filter((c): c is NonNullable<typeof c> => !!c && !!c.osm).map(c => ({ n: c.n, p: c.p, lat: c.lat, lon: c.lon }));
  if (places.length) d.places = places;
  return d;
}

const VEHICLES = ['sedan', 'suv', 'bike', 'public', 'air', 'rentcar', 'rent4x4', 'coaster'], TIERS = ['backpacker', 'standard', 'premium'];
const int = (v: unknown, lo: number, hi: number, dflt: number) => typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : dflt;

const str = (v: unknown, max: number) => String(v ?? '').slice(0, max);
/** Added and removed places, kept small and plain. */
function cleanEdits(raw: unknown): PlanEdits {
  const e = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const picks = (Array.isArray(e.picks) ? e.picks : []).slice(0, 40).filter((p: any) => p && typeof p.name === 'string' && Number.isInteger(p.day) && p.day >= 0 && p.day < 20)
    .map((p: any) => ({ day: p.day as number, name: str(p.name, 80), note: str(p.note, 120), href: /^https:\/\//.test(String(p.href || '')) ? str(p.href, 300) : '' }));
  const drops = (Array.isArray(e.drops) ? e.drops : []).slice(0, 60).map(d => str(d, 100));
  return { key: str(e.key, 200), picks, drops };
}

/** Checks and cleans trip data from storage or a shared link. Returns null if it isn't usable. */
export function cleanTrip(raw: unknown): TripData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  (Array.isArray(r.places) ? r.places : []).slice(0, 3).forEach((p: any) => {
    if (p && typeof p.n === 'string' && isFinite(p.lat) && isFinite(p.lon)) addPlace(p.n.slice(0, 80), String(p.p || 'Pakistan').slice(0, 40), +p.lat, +p.lon);
  });
  const origin = typeof r.origin === 'string' && CITY[r.origin] ? r.origin : null;
  const place = (v: unknown) => typeof v === 'string' && (DEST_IDS.has(v) || (v.startsWith('city:') && !!CITY[v.slice(5)])) ? v : null;
  const corridor = place(r.corridor), dest = place(r.dest) || corridor;
  if (!origin || !corridor) return null;
  const adults = int(r.adults, 1, 20, 2), kids = int(r.kids, 0, 20, 0), elders = int(r.elders, 0, 20, 0);
  return {
    origin, corridor, dest: dest!, mode: r.mode === 'suggest' ? 'suggest' : 'know',
    startDate: typeof r.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.startDate) ? r.startDate : new Date().toISOString().slice(0, 10),
    days: int(r.days, 2, 14, 4), depart: typeof r.depart === 'number' && r.depart >= 3 && r.depart <= 11 ? r.depart : null,
    vehicle: (VEHICLES.includes(r.vehicle as string) ? r.vehicle : 'sedan') as TripData['vehicle'],
    tier: (TIERS.includes(r.tier as string) ? r.tier : 'standard') as TripData['tier'],
    adults, kids, elders, groupSize: adults + kids + elders, rooms: r.rooms === 'shared' ? 'shared' : 'separate', cap: int(r.cap, 20000, 5000000, 120000),
    have: (['car', 'suv', 'bike'].includes(r.have as string) ? r.have : 'any') as TripData['have'], edits: cleanEdits(r.edits)
  };
}

export const defaultName = (d: TripData) => `${d.origin} → ${DST(d.corridor).name} · ${MON[mon(d) - 1]} ${d.startDate.slice(0, 4)}`;

const read = <T,>(k: string, fallback: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const localTrips = (): SavedTrip[] => read<SavedTrip[]>(LIST, []).map(t => ({ ...t, data: cleanTrip(t.data)! })).filter(t => t.data);
export function saveLocal(t: SavedTrip) { const list = localTrips().filter(x => x.id !== t.id); return write(LIST, [t, ...list].slice(0, 100)); }
export function deleteLocal(id: string) { write(LIST, localTrips().filter(x => x.id !== id)); }
export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));

/** The trip being planned right now, so a reload or closing the app doesn't lose it. */
export const saveCurrent = (d: TripData, savedId: string | null) => write(CURRENT, { data: d, savedId, at: Date.now() });
export const loadCurrent = (): { data: TripData; savedId: string | null } | null => { const c = read<{ data: unknown; savedId?: string } | null>(CURRENT, null); const d = c && cleanTrip(c.data); return d ? { data: d, savedId: c!.savedId || null } : null; };
export const clearCurrent = () => { try { localStorage.removeItem(CURRENT); } catch { /* storage blocked */ } };

// ---- Share links: the trip packed into the URL, so no server is needed ---------

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));

export const shareUrl = (d: TripData) => `${location.origin}/?trip=${b64(JSON.stringify(d))}`;
export function tripFromUrl(): TripData | null {
  const q = new URLSearchParams(location.search).get('trip'); if (!q || q.length > 4000) return null;
  try { return cleanTrip(JSON.parse(unb64(q))); } catch { return null; }
}

/** Adds trips from the account that this device doesn't have yet. */
export function cloudMerge(cloud: SavedTrip[]) {
  const local = localTrips(), have = new Set(local.map(t => t.cloudId).filter(Boolean));
  const add = cloud.map(t => ({ ...t, data: cleanTrip(t.data)! })).filter(t => t.data && !have.has(t.cloudId));
  if (add.length) write(LIST, [...local, ...add].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, 200));
}
