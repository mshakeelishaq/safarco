// "Choose your traveller" on the website: a little character that walks across the site, and a head start for the planner.
import type { AppState } from './state';

export type TravellerId = 'backpacker' | 'family' | 'couple' | 'biker';
export interface Traveller { id: TravellerId; name: string; line: string; sets: string; patch: Partial<AppState> }

export const TRAVELLERS: Traveller[] = [
  { id: 'backpacker', name: 'Backpacker', line: 'Light bag, long roads, cheap and cheerful.', sets: 'Budget stays and coaches',
    patch: { adults: 1, kids: 0, elders: 0, groupSize: 1, tier: 'backpacker', vehicle: 'public', rooms: 'shared' } },
  { id: 'family', name: 'Family', line: 'Kids in the back, snacks in the boot.', sets: 'A 4x4 and family rooms',
    patch: { adults: 2, kids: 2, elders: 0, groupSize: 4, tier: 'standard', vehicle: 'suv', rooms: 'shared' } },
  { id: 'couple', name: 'Couple', line: 'Views, good food and a nice room.', sets: 'Comfortable hotels and your car',
    patch: { adults: 2, kids: 0, elders: 0, groupSize: 2, tier: 'premium', vehicle: 'sedan', rooms: 'separate' } },
  { id: 'biker', name: 'Biker', line: 'Two wheels and the open road.', sets: 'Your motorbike and simple stays',
    patch: { adults: 2, kids: 0, elders: 0, groupSize: 2, tier: 'backpacker', vehicle: 'bike', have: 'bike', rooms: 'shared' } }
];
const KEY = 'safarco-traveller';
const SUBS = new Set<() => void>();
export const isTraveller = (v: unknown): v is TravellerId => TRAVELLERS.some(t => t.id === v);
/** The traveller chosen on this device, if any. */
export function getTraveller(): TravellerId | null {
  try { const v = localStorage.getItem(KEY); return isTraveller(v) ? v : null; } catch { return null; }
}
export function setTraveller(id: TravellerId) {
  try { localStorage.setItem(KEY, id); } catch { /* storage blocked: it lasts until the page closes */ }
  MEM = id; SUBS.forEach(f => f());
}
let MEM: TravellerId | null = null;
/** The chosen traveller, or the backpacker until one is chosen. */
export const travellerNow = (): TravellerId => MEM || getTraveller() || 'backpacker';
export const onTraveller = (f: () => void) => { SUBS.add(f); return () => { SUBS.delete(f); }; };
/** What the planner starts with for this traveller (from the website's ?as=family). */
export const travellerPatch = (id: string | null): Partial<AppState> => (isTraveller(id) ? TRAVELLERS.find(t => t.id === id)!.patch : {});
