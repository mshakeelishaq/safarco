// The price list: every price SafarCo can't get live for free (fuel, tolls, stays,
// hire, coach, flights, jeeps), plus road alerts. The admin edits it at /admin and
// it's stored in Supabase; each section records the date it was last checked.
import { DESTS, EDGES, FARES, P, TIERS, VEH, type TierId } from './engine/data';
import { resetTripCache } from './engine/engine';
import { t } from './i18n';

export const SECTIONS = {
  fuel: { label: 'Fuel', source: 'OGRA (ogra.org.pk)' },
  tolls: { label: 'Motorway tolls', source: 'NHA (nha.gov.pk)' },
  stays: { label: 'Hotel and meal rates', source: 'Booking.com and local hotels' },
  hire: { label: 'Car, 4x4 and coaster hire', source: 'Local rent-a-car operators' },
  coach: { label: 'Coach fares', source: 'Daewoo, Faisal Movers' },
  fares: { label: 'Flight fares', source: 'PIA, Airblue' },
  jeeps: { label: 'Local jeep rates', source: 'Local jeep operators' }
} as const;
export type Section = keyof typeof SECTIONS;

/** A section's label in the interface language (SECTIONS keeps the English, which is also what the admin sees). */
export const sectionLabel = (section: Section) => {
  switch (section) {
    case 'fuel': return t('Fuel');
    case 'tolls': return t('Motorway tolls');
    case 'stays': return t('Hotel and meal rates');
    case 'hire': return t('Car, 4x4 and coaster hire');
    case 'coach': return t('Coach fares');
    case 'fares': return t('Flight fares');
    case 'jeeps': return t('Local jeep rates');
    default: return SECTIONS[section as Section].label;
  }
};

/** areas: places the alert applies to (see src/local.ts); empty means every trip. */
export interface RoadAlert { title: string; message: string; date: string; until?: string; areas?: string[] }
/** A hotel or guest house the admin vouches for. */
export interface TrustedHotel { id: string; name: string; area: string; tier: TierId; price: number; phone: string; note: string; checked: string; active: boolean }
/** A jeep or car driver the admin vouches for. */
export interface TrustedDriver { id: string; name: string; area: string; vehicle: string; seats: number; rate: number; phone: string; note: string; checked: string; active: boolean }
export interface PriceList {
  checked: Record<Section, string>;
  fuel: { petrol: number; diesel: number };
  tolls: Record<string, number>;
  stays: Record<TierId, { night: number; meal: number }>;
  hire: { rentcar: number; rentcarDriver: number; rent4x4: number; rent4x4Driver: number; coaster: number; coasterDriver: number; carAtDestination: number };
  coach: { perKmFlat: number; perKmMountain: number };
  fares: Record<string, Record<string, number>>;
  jeeps: Record<string, number>;
  alerts: RoadAlert[];
  hotels: TrustedHotel[];
  drivers: TrustedDriver[];
  /** Admin's notes per destination for the season guide, e.g. "Cherry blossom early this year". */
  seasonNotes: Record<string, string>;
}

const edgeKey = (e: (typeof EDGES)[number]) => `${e[0]}-${e[1]}`;
export const tollRoads = () => EDGES.filter(e => e[4]).map(e => ({ key: edgeKey(e), label: `${e[6]} (${e[0]} ⇄ ${e[1]})` }));
export const jeepTrips = () => DESTS.flatMap(d => (d.jeeps || []).map(j => ({ key: j[0], label: `${d.name}: ${j[1]}` }))).concat([{ key: 'raikot', label: 'Fairy Meadows: Raikot Bridge ⇄ Tato' }]);

/** The figures built into the app, never checked. Used until the admin saves a list. */
export const DEFAULT_PRICES: PriceList = (() => ({
  checked: { fuel: '', tolls: '', stays: '', hire: '', coach: '', fares: '', jeeps: '' },
  fuel: { petrol: P.petrol, diesel: P.diesel },
  tolls: Object.fromEntries(EDGES.filter(e => e[4]).map(e => [edgeKey(e), e[4]])),
  stays: { backpacker: { night: TIERS.backpacker.night, meal: TIERS.backpacker.meal }, standard: { night: TIERS.standard.night, meal: TIERS.standard.meal }, premium: { night: TIERS.premium.night, meal: TIERS.premium.meal } },
  hire: { rentcar: VEH.rentcar.rate!, rentcarDriver: VEH.rentcar.allow!, rent4x4: VEH.rent4x4.rate!, rent4x4Driver: VEH.rent4x4.allow!, coaster: VEH.coaster.rate!, coasterDriver: VEH.coaster.allow!, carAtDestination: P.localCar },
  coach: { perKmFlat: P.coachFlat, perKmMountain: P.coachMtn },
  fares: JSON.parse(JSON.stringify(FARES)),
  jeeps: { ...Object.fromEntries(DESTS.flatMap(d => (d.jeeps || []).map(j => [j[0], j[3]]))), raikot: P.raikotJeep },
  alerts: [], hotels: [], drivers: [], seasonNotes: {}
}))();

let current: PriceList = DEFAULT_PRICES;
export const prices = () => current;

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
export const rid = () => Math.random().toString(36).slice(2, 10);
const num = (v: unknown, fallback: number) => typeof v === 'number' && isFinite(v) && v >= 0 ? v : fallback;

/** Merge a saved list over the defaults (so new fields keep working) and apply it to the engine. */
export function applyPrices(saved: Partial<PriceList> | null | undefined) {
  const d = DEFAULT_PRICES, s = saved || {};
  const list: PriceList = {
    checked: { ...d.checked, ...(s.checked || {}) },
    fuel: { petrol: num(s.fuel?.petrol, d.fuel.petrol), diesel: num(s.fuel?.diesel, d.fuel.diesel) },
    tolls: Object.fromEntries(Object.entries(d.tolls).map(([k, v]) => [k, num(s.tolls?.[k], v)])),
    stays: Object.fromEntries((Object.keys(d.stays) as TierId[]).map(t => [t, { night: num(s.stays?.[t]?.night, d.stays[t].night), meal: num(s.stays?.[t]?.meal, d.stays[t].meal) }])) as PriceList['stays'],
    hire: Object.fromEntries(Object.entries(d.hire).map(([k, v]) => [k, num((s.hire as Record<string, unknown> | undefined)?.[k], v)])) as PriceList['hire'],
    coach: { perKmFlat: num(s.coach?.perKmFlat, d.coach.perKmFlat), perKmMountain: num(s.coach?.perKmMountain, d.coach.perKmMountain) },
    fares: Object.fromEntries(Object.entries(d.fares).map(([dest, f]) => [dest, Object.fromEntries(Object.entries(f).map(([a, v]) => [a, num(s.fares?.[dest]?.[a], v)]))])),
    jeeps: Object.fromEntries(Object.entries(d.jeeps).map(([k, v]) => [k, num(s.jeeps?.[k], v)])),
    alerts: Array.isArray(s.alerts) ? s.alerts.filter(a => a && a.title).map(a => ({ title: String(a.title).slice(0, 80), message: String(a.message || '').slice(0, 300), date: String(a.date || ''), until: a.until ? String(a.until) : undefined, areas: Array.isArray(a.areas) ? a.areas.map(String).slice(0, 20) : [] })) : [],
    hotels: Array.isArray(s.hotels) ? s.hotels.filter(h => h && h.name && h.area).slice(0, 500).map(h => ({ id: str(h.id, 40) || rid(), name: str(h.name, 80), area: str(h.area, 60), tier: (['backpacker', 'standard', 'premium'] as TierId[]).includes(h.tier) ? h.tier : 'standard', price: num(h.price, 0), phone: str(h.phone, 30), note: str(h.note, 200), checked: str(h.checked, 10), active: h.active !== false })) : [],
    seasonNotes: s.seasonNotes && typeof s.seasonNotes === 'object' ? Object.fromEntries(Object.entries(s.seasonNotes).map(([k, v]) => [str(k, 40), str(v, 200)]).filter(([k, v]) => k && v).slice(0, 100)) : {},
    drivers: Array.isArray(s.drivers) ? s.drivers.filter(x => x && x.name && x.area).slice(0, 500).map(x => ({ id: str(x.id, 40) || rid(), name: str(x.name, 80), area: str(x.area, 60), vehicle: str(x.vehicle, 40) || 'Jeep', seats: num(x.seats, 0), rate: num(x.rate, 0), phone: str(x.phone, 30), note: str(x.note, 200), checked: str(x.checked, 10), active: x.active !== false })) : []
  };
  current = list;
  // Write the figures into the engine's tables.
  P.petrol = list.fuel.petrol; P.diesel = list.fuel.diesel; P.localCar = list.hire.carAtDestination;
  P.coachFlat = list.coach.perKmFlat; P.coachMtn = list.coach.perKmMountain; P.airportCoach = list.coach.perKmFlat; P.raikotJeep = list.jeeps.raikot;
  EDGES.forEach(e => { const v = list.tolls[edgeKey(e)]; if (v !== undefined) e[4] = v; });
  (Object.keys(list.stays) as TierId[]).forEach(t => { TIERS[t].night = list.stays[t].night; TIERS[t].meal = list.stays[t].meal; });
  VEH.rentcar.rate = list.hire.rentcar; VEH.rentcar.allow = list.hire.rentcarDriver;
  VEH.rent4x4.rate = list.hire.rent4x4; VEH.rent4x4.allow = list.hire.rent4x4Driver;
  VEH.coaster.rate = list.hire.coaster; VEH.coaster.allow = list.hire.coasterDriver;
  Object.entries(list.fares).forEach(([dest, f]) => Object.assign(FARES[dest], f));
  DESTS.forEach(dd => (dd.jeeps || []).forEach(j => { const v = list.jeeps[j[0]]; if (v !== undefined) j[3] = v; }));
  resetTripCache();
  return list;
}

/** How long each section's prices usually hold: fuel changes twice a month, tolls about once a year. */
export const FRESH_DAYS: Record<Section, number> = { fuel: 16, tolls: 200, stays: 100, hire: 100, coach: 100, fares: 45, jeeps: 120 };

/** Days since the section was checked, or null if never. */
export const checkedAge = (section: Section, now = new Date()) => {
  const d = current.checked[section], dt = d ? new Date(d + 'T00:00') : null;
  return dt && !isNaN(+dt) ? Math.max(0, Math.floor((+now - +dt) / 864e5)) : null;
};
/** Flight fares change by the day, so they are only ever shown as a rough guide and never flagged as out of date. */
export const TENTATIVE: Section[] = ['fares'];
export const isStale = (section: Section, now = new Date()) => { if (TENTATIVE.includes(section)) return false; const a = checkedAge(section, now); return a === null || a > FRESH_DAYS[section]; };

/** "checked 1 Oct 2026", "checked 1 Oct 2026, may have changed since", "a typical price" or, for flights, "tentative". */
export const checkedText = (section: Section, now = new Date()) => {
  if (TENTATIVE.includes(section)) return t('tentative, check live fares before booking');
  const d = current.checked[section];
  if (!d) return t('a typical price, may differ a little');
  const dt = new Date(d + 'T00:00');
  if (isNaN(+dt)) return t('a typical price, may differ a little');
  const day = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return isStale(section, now) ? t('checked {date}, may have changed since', { date: day }) : t('checked {date}', { date: day });
};

/** Road alerts that haven't expired. */
export const activeAlerts = (today = new Date().toISOString().slice(0, 10)) => current.alerts.filter(a => !a.until || a.until >= today);
