// Live data from free services: OSRM road routes, Open-Meteo weather and
// Nominatim place search. Results are cached per key for the session.
import { isoAdd, isoOff } from './format';
import { addPlace, type Dest } from './places';

export type LiveEntry<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: string };
export interface RouteData { km: number; h: number; coords: [number, number][] }
export interface WxDaily {
  time: string[]; weather_code?: number[]; temperature_2m_max: number[]; temperature_2m_min: number[];
  precipitation_probability_max?: number[]; precipitation_sum?: number[]; snowfall_sum?: number[];
}

export const LIVE = {
  route: {} as Record<string, LiveEntry<RouteData>>,
  wx: {} as Record<string, LiveEntry<WxDaily>>,
  geo: {} as Record<string, LiveEntry<string[]>>,
  subs: new Set<() => void>(),
  /** Called before subscribers when a road route arrives, so trip caches can reset. */
  routeHooks: new Set<() => void>()
};
const notify = () => LIVE.subs.forEach(fn => fn());

async function liveFetch<T>(bucket: 'route' | 'wx' | 'geo', key: string, url: string, parse: (j: any) => T) {
  const store = LIVE[bucket] as Record<string, LiveEntry<T>>;
  if (store[key]) return store[key];
  store[key] = { status: 'loading' }; notify();
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    store[key] = { status: 'ok', data: parse(await r.json()) };
  } catch (e) { store[key] = { status: 'error', error: String((e as Error)?.message || e) }; }
  if (bucket === 'route') LIVE.routeHooks.forEach(fn => fn());
  notify(); return store[key];
}

export const PROV_MAP = (s?: string) => !s ? 'Pakistan' : /Islamabad/.test(s) ? 'Capital' : /Azad|Kashmir/.test(s) ? 'Azad Kashmir' : /Gilgit/.test(s) ? 'Gilgit-Baltistan'
  : /Khyber/.test(s) ? 'Khyber Pakhtunkhwa' : /Baloch/.test(s) ? 'Balochistan' : /Sindh/.test(s) ? 'Sindh' : /Punjab/.test(s) ? 'Punjab' : s;
const OSM_TYPES = /^(city|town|village|hamlet|suburb|neighbourhood|locality|isolated_dwelling|peak|lake|valley|attraction|viewpoint|national_park|park|administrative|county|district|municipality|state_district)$/;

export function geoSearch(q: string) {
  q = q.trim(); if (q.length < 3) return;
  return liveFetch('geo', q.toLowerCase(), `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pk&addressdetails=1&limit=8&accept-language=en&q=${encodeURIComponent(q)}`,
    (rows: any[]) => rows.filter(r => OSM_TYPES.test(r.type || '') || OSM_TYPES.test(r.addresstype || '')).map(r => {
      const a = r.address || {}, name = String(r.name || a.city || a.town || a.village || r.display_name.split(',')[0]).trim();
      return name ? addPlace(name, PROV_MAP(a.state || a.province || a.region), r.lat, r.lon).n : null;
    }).filter((x): x is string => !!x));
}

export function reverseGeo(lat: number, lon: number) {
  return liveFetch('geo', `rev|${lat.toFixed(3)},${lon.toFixed(3)}`, `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1&accept-language=en&lat=${lat}&lon=${lon}`,
    (r: any) => { const a = r.address || {}, name = a.city || a.town || a.village || a.suburb || a.county; return name ? [addPlace(name, PROV_MAP(a.state), lat, lon).n] : []; });
}

export const routeKey = (originName: string, destId: string) => `${originName}|${destId}`;
export function routeFetch(o: { n: string; lat: number; lon: number }, D: Dest) {
  return liveFetch('route', routeKey(o.n, D.id), `https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${D.lon},${D.lat}?overview=full&geometries=geojson`,
    (j: any): RouteData => { const r = j.routes && j.routes[0]; if (!r) throw new Error('no route'); return { km: r.distance / 1000, h: r.duration / 3600, coords: r.geometry.coordinates }; });
}

const shiftYear = (iso: string, k: number) => ((+iso.slice(0, 4) + k) + iso.slice(4)).replace('-02-29', '-02-28');

/** Weather-code → [Phosphor icon, colour token]. */
export const WMO = (c: number | null | undefined): [string, string] => c == null ? ['ph-cloud', 'var(--mute)'] : c === 0 ? ['ph-sun', 'var(--amb)'] : c <= 3 ? ['ph-cloud-sun', 'var(--amb)']
  : c <= 48 ? ['ph-cloud-fog', 'var(--mute)'] : ((c >= 71 && c <= 77) || c === 85 || c === 86) ? ['ph-snowflake', 'var(--sky)'] : c >= 95 ? ['ph-cloud-lightning', 'var(--vio)'] : ['ph-cloud-rain', 'var(--sky)'];

export interface WxPlan { key: string; kind: 'forecast' | 'archive'; year?: number; url: string }
/** Trips in the next 15 days get the forecast; later trips show the same dates in the most recent past year. */
export function wxPlan(D: Dest, start: string, days: number): WxPlan {
  const n = Math.max(1, Math.min(days, 14)), end = isoOff(start, n - 1), today = isoAdd(0), elev = D.ft ? `&elevation=${Math.round(D.ft * 0.3048)}` : '';
  const q = `latitude=${D.lat}&longitude=${D.lon}${elev}&timezone=Asia%2FKarachi`;
  if (start >= today && end <= isoAdd(15)) return { key: `${D.id}|${start}|${n}|f`, kind: 'forecast', url: `https://api.open-meteo.com/v1/forecast?${q}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,snowfall_sum&start_date=${start}&end_date=${end}` };
  let y = 0, s0 = start, e0 = end; while (e0 > isoAdd(-6)) { y++; s0 = shiftYear(start, -y); e0 = shiftYear(end, -y); }
  return { key: `${D.id}|${start}|${n}|a`, kind: 'archive', year: +s0.slice(0, 4), url: `https://archive-api.open-meteo.com/v1/archive?${q}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&start_date=${s0}&end_date=${e0}` };
}
export function wxFetch(D: Dest, start: string, days: number) { const p = wxPlan(D, start, days); liveFetch('wx', p.key, p.url, (j: any) => j.daily as WxDaily); return p; }
