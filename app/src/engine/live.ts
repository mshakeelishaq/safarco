// Live data from free services. Keyed services (OpenRouteService routes, Geoapify
// search and places) go through this app's /api functions so keys stay on the server.
// Keyless ones (Open-Meteo weather, Wikivoyage, exchange rates) are called directly.
// Results are cached per key for the session.
import { isoAdd, isoOff } from './format';
import { addPlace, type Dest } from './places';

export type LiveEntry<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: string };
export interface RouteData { km: number; h: number; coords: [number, number][] }
export interface Spot { name: string; lat: number; lon: number; km: number; type: string; address: string; website?: string }
export interface WikiInfo { title: string; extract: string; image?: string; url: string; source: 'Wikivoyage' | 'Wikipedia' }
export interface FxRate { pkrPerUsd: number; updated: string; live: boolean }
export interface WxDaily {
  time: string[]; weather_code?: number[]; temperature_2m_max: number[]; temperature_2m_min: number[];
  precipitation_probability_max?: number[]; precipitation_sum?: number[]; snowfall_sum?: number[];
}

export const LIVE = {
  route: {} as Record<string, LiveEntry<RouteData>>,
  wx: {} as Record<string, LiveEntry<WxDaily>>,
  geo: {} as Record<string, LiveEntry<string[]>>,
  places: {} as Record<string, LiveEntry<Spot[]>>,
  wiki: {} as Record<string, LiveEntry<WikiInfo | null>>,
  fx: {} as Record<string, LiveEntry<FxRate>>,
  /** Route weather, pass weather, typical weather and air quality, keyed by request URL. */
  rw: {} as Record<string, LiveEntry<any[]>>,
  subs: new Set<() => void>(),
  /** Called before subscribers when a road route arrives, so trip caches can reset. */
  routeHooks: new Set<() => void>()
};
const notify = () => LIVE.subs.forEach(fn => fn());

export async function liveFetch<T>(bucket: 'route' | 'wx' | 'geo' | 'places' | 'wiki' | 'fx' | 'rw', key: string, url: string, parse: (j: any) => T | Promise<T>) {
  const store = LIVE[bucket] as Record<string, LiveEntry<T>>;
  if (store[key]) return store[key];
  store[key] = { status: 'loading' }; notify();
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    store[key] = { status: 'ok', data: await parse(await r.json()) };
  } catch (e) { store[key] = { status: 'error', error: String((e as Error)?.message || e) }; }
  if (bucket === 'route') LIVE.routeHooks.forEach(fn => fn());
  notify(); return store[key];
}

type GeoPlace = { name: string; prov: string; lat: number; lon: number };
const addAll = (j: { places?: GeoPlace[] }) => (j.places || []).map(p => addPlace(p.name, p.prov, p.lat, p.lon).n);

/** Search any place in Pakistan (Geoapify via /api/geocode). */
export function geoSearch(q: string) {
  q = q.trim(); if (q.length < 3) return;
  return liveFetch('geo', q.toLowerCase(), `/api/geocode?q=${encodeURIComponent(q)}`, addAll);
}

/** The town at a GPS position. */
export function reverseGeo(lat: number, lon: number) {
  return liveFetch('geo', `rev|${lat.toFixed(2)},${lon.toFixed(2)}`, `/api/geocode?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`, addAll);
}

export const routeKey = (originName: string, destId: string) => `${originName}|${destId}`;
export const routeUrl = (o: { lat: number; lon: number }, D: { lat: number; lon: number }) => `/api/route?from=${o.lon.toFixed(3)},${o.lat.toFixed(3)}&to=${D.lon.toFixed(3)},${D.lat.toFixed(3)}`;
/** Road distance and shape from OpenRouteService (via /api/route). */
export function routeFetch(o: { n: string; lat: number; lon: number }, D: Dest) {
  return liveFetch('route', routeKey(o.n, D.id), routeUrl(o, D), (j: RouteData): RouteData => j);
}

export type PlaceKind = 'sights' | 'hotels' | 'fuel';
export const placesKey = (kind: PlaceKind, lat: number, lon: number) => `${kind}|${lat.toFixed(2)},${lon.toFixed(2)}`;
export const placesUrl = (kind: PlaceKind, lat: number, lon: number) => `/api/places?kind=${kind}&lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`;
/** Sights, places to stay or fuel stations near a point (Geoapify via /api/places). */
export function placesFetch(kind: PlaceKind, lat: number, lon: number) {
  return liveFetch('places', placesKey(kind, lat, lon), placesUrl(kind, lat, lon), (j: { spots?: Spot[] }) => j.spots || []);
}

/** Destination summary from Wikivoyage, falling back to Wikipedia. No key needed. */
export function wikiFetch(D: Dest) {
  const q = D.generic ? `${D.name} ${D.region}` : D.name;
  const api = (site: string) => `https://${site}/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=1&prop=extracts|pageimages|info&exintro=1&explaintext=1&exsentences=4&inprop=url&pithumbsize=640`;
  const pick = (j: any, source: WikiInfo['source']): WikiInfo | null => {
    const p = j?.query?.pages && Object.values<any>(j.query.pages)[0];
    return p && p.extract && p.extract.length > 60 ? { title: p.title, extract: p.extract, image: p.thumbnail?.source, url: p.fullurl, source } : null;
  };
  return liveFetch('wiki', D.id, api('en.wikivoyage.org'), async j => pick(j, 'Wikivoyage') ?? pick(await (await fetch(api('en.wikipedia.org'))).json(), 'Wikipedia'));
}

/** US dollar → rupee rate from open.er-api.com (free, no key, updated daily). */
export const FX_FALLBACK: FxRate = { pkrPerUsd: 280, updated: '', live: false };
export function fxFetch() {
  return liveFetch('fx', 'USD', 'https://open.er-api.com/v6/latest/USD', (j: any): FxRate => {
    const r = j?.rates?.PKR; if (!(r > 50 && r < 2000)) throw new Error('No PKR rate');
    return { pkrPerUsd: r, updated: String(j.time_last_update_utc || '').slice(5, 16), live: true };
  });
}
export const fxRate = (): FxRate => { const e = LIVE.fx.USD; return e && e.status === 'ok' ? e.data : FX_FALLBACK; };


/** Weather-code → [Phosphor icon, colour token]. */
export const WMO = (c: number | null | undefined): [string, string] => c == null ? ['ph-cloud', 'var(--mute)'] : c === 0 ? ['ph-sun', 'var(--amb)'] : c <= 3 ? ['ph-cloud-sun', 'var(--amb)']
  : c <= 48 ? ['ph-cloud-fog', 'var(--mute)'] : ((c >= 71 && c <= 77) || c === 85 || c === 86) ? ['ph-snowflake', 'var(--sky)'] : c >= 95 ? ['ph-cloud-lightning', 'var(--vio)'] : ['ph-cloud-rain', 'var(--sky)'];

