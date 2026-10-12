// Weather along the whole route, at the hour you'll be at each point.
// Free Open-Meteo APIs, no key: hourly forecast (next 16 days), pass weather at the
// pass's real height, the last 5 years on the same dates for later trips, and air quality.
import { EDGES, MTN_NODES, NODES, NODE_INFO } from '../engine/data';
import { hoursAt, type Leg, type Plan, type TripState } from '../engine/engine';
import { clock, dayLabel, isoAdd, isoOff } from '../engine/format';
import { LIVE, liveFetch } from '../engine/live';
import { DST, cityOr } from '../engine/places';
import { t } from '../i18n';

// ---- Mountain passes ------------------------------------------------------------
/** [name, lat, lon, height ft, edge a, edge b, km from a] */
export const PASSES: [string, number, number, number, string, string, number][] = [
  ['Babusar Top', 35.147, 74.063, 13690, 'NRN', 'CHL', 70],
  ['Khunjerab Pass', 36.850, 75.427, 15397, 'SST', 'KJB', 85],
  ['Shandur Pass', 36.075, 72.525, 12200, 'PHD', 'MSJ', 60],
  ['Deosai Plains', 35.000, 75.420, 13500, 'AST', 'SKD', 85],
  ['Fort Munro', 29.960, 69.980, 6470, 'DGK', 'LRL', 85]
];

// ---- Points along the road ------------------------------------------------------
export interface RoutePoint {
  day: number; iso: string; offsetH: number; lat: number; lon: number; label: string;
  mtn: boolean; ft?: number; pass?: string; km: number; outbound: boolean;
  /** The bare place name (no "near"), used when naming the spot in the departure tip. */
  at?: string;
}

const cum = (legs: Leg[]) => legs.reduce<number[]>((a, l) => (a.push(a[a.length - 1] + l.km), a), [0]);

/** Point `f` (0–1) of the way along a polyline of [lon, lat]. */
function along(line: [number, number][], f: number): [number, number] {
  const seg: number[] = [0];
  for (let i = 1; i < line.length; i++) seg.push(seg[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], (line[i][1] - line[i - 1][1])));
  const target = Math.max(0, Math.min(1, f)) * seg[seg.length - 1];
  const i = seg.findIndex(x => x >= target); if (i <= 0) return [line[0][1], line[0][0]];
  const t = (target - seg[i - 1]) / Math.max(1e-9, seg[i] - seg[i - 1]);
  return [line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t, line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t];
}

/** "Chilas", or "near Chilas" a little further out, from the towns and passes SafarCo knows; `at` is the bare name. */
const nearName = (lat: number, lon: number) => {
  let best = '', bd = 1e9;
  const look = (n: string, la: number, lo: number) => { const d = Math.hypot(la - lat, (lo - lon) * 0.85); if (d < bd) { bd = d; best = n; } };
  for (const k of Object.keys(NODES)) look(NODE_INFO[k][0], NODES[k][0], NODES[k][1]);
  PASSES.forEach(([n, la, lo]) => look(n, la, lo));
  return bd < 0.08 ? { name: best, at: best } : bd < 0.45 ? { name: t('near {place}', { place: best }), at: best } : { name: '', at: '' };
};
const roadName = (r: string) => r.replace(/\s*\(.*?\)/g, '').trim();

/**
 * Sample points for every driving day: start, every ~50 km, each mountain pass, arrival.
 * Positions follow the real road line from OpenRouteService when it has loaded.
 */
export function routePoints(s: TripState, plan: Plan, road: [number, number][] | null): RoutePoint[] {
  const out: RoutePoint[] = [];
  const drive = plan.days.map((d, i) => ({ d, i })).filter(x => x.d.track);
  const outbound = drive.filter(x => x.d.kind === 'drive'), tripKm = outbound.reduce((a, x) => a + cum(x.d.track!.legs).slice(-1)[0], 0);
  let offOut = 0;
  const offsets = new Map<number, number>();
  outbound.forEach(x => { offsets.set(x.i, offOut); offOut += cum(x.d.track!.legs).slice(-1)[0]; });
  // Return days mirror the outbound days in reverse order.
  const back = drive.filter(x => x.d.kind === 'return');
  back.forEach((x, j) => { const o = outbound[outbound.length - 1 - j]; if (o) offsets.set(x.i, offsets.get(o.i)!); });

  for (const { d, i } of drive) {
    const tr = d.track!, c = cum(tr.legs), total = c[c.length - 1], isOut = d.kind === 'drive';
    const pos = (km: number): [number, number] => {
      if (road && road.length > 1 && tripKm > 0) {
        const g = isOut ? offsets.get(i)! + km : offsets.get(i)! + (total - km);
        return along(road, g / tripKm);
      }
      let li = c.findIndex(x => x >= km) - 1; if (li < 0) li = 0; li = Math.min(li, tr.legs.length - 1);
      const f = (km - c[li]) / Math.max(1e-6, tr.legs[li].km), [a, b] = [tr.coords[li], tr.coords[li + 1]];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    };
    const legAt = (km: number) => tr.legs[Math.max(0, Math.min(tr.legs.length - 1, c.findIndex(x => x >= km) - 1))];
    const add = (km: number, label?: string, extra: Partial<RoutePoint> = {}) => {
      const [lat, lon] = pos(km), l = legAt(km), near = label === undefined ? nearName(lat, lon) : { name: label, at: label }, name = near.name || t('{road} road', { road: roadName(l.road) });
      out.push({ day: i, iso: d.iso!, offsetH: hoursAt(tr.marks, km), lat, lon, km, outbound: isOut,
        label: name, at: near.at || name, mtn: !!(l.mtn || MTN_NODES.has(l.a) || MTN_NODES.has(l.b)), ...extra });
    };
    const [from, to] = d.title.split(' → ');
    const step = Math.max(45, total / 9);
    add(0, from);
    for (let km = step; km < total - step * 0.5; km += step) add(km);
    // Passes on this day's legs.
    tr.legs.forEach((l, li) => PASSES.forEach(([name, lat, lon, ft, a, b, at]) => {
      const fwd = l.a === a && l.b === b, rev = l.a === b && l.b === a; if (!fwd && !rev) return;
      const frac = Math.min(1, at / edgeLen(a, b)), km = c[li] + (fwd ? frac : 1 - frac) * l.km;
      out.push({ day: i, iso: d.iso!, offsetH: hoursAt(tr.marks, km), lat, lon, km, outbound: isOut, label: name, at: name, mtn: true, ft, pass: name });
    }));
    add(total, to);
  }
  return out.sort((x, y) => x.day - y.day || x.km - y.km);
}

const edgeLen = (a: string, b: string) => { const e = EDGES.find(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a)); return e ? e[2] : 100; };

// ---- Requests ---------------------------------------------------------------------
const OM = 'https://api.open-meteo.com/v1/forecast', ARCH = 'https://archive-api.open-meteo.com/v1/archive', AQ = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const HOURLY = 'temperature_2m,precipitation,precipitation_probability,snowfall,weather_code,wind_gusts_10m,visibility,freezing_level_height';
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,snowfall_sum,wind_gusts_10m_max,uv_index_max';
const ARCH_DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_gusts_10m_max';
export const FORECAST_DAYS = 16;

interface Loc { key: string; lat: number; lon: number; ft?: number }
const locKey = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`;
const coordsQ = (ls: Loc[]) => `latitude=${ls.map(l => l.lat.toFixed(3)).join(',')}&longitude=${ls.map(l => l.lon.toFixed(3)).join(',')}`;
const elevQ = (ls: Loc[]) => ls.some(l => l.ft) ? `&elevation=${ls.map(l => Math.round((l.ft || 0) * 0.3048)).join(',')}` : '';
const shiftYear = (iso: string, k: number) => ((+iso.slice(0, 4) + k) + iso.slice(4)).replace('-02-29', '-02-28');

export interface WeatherPlan {
  road: Loc[]; passes: Loc[]; dest: Loc; aqPlaces: { key: string; lat: number; lon: number; label: string; iso: string }[];
  start: string; end: string; fcStart: string | null; fcEnd: string | null; needTypical: boolean; years: number[];
  urls: { fcRoad?: string; fcPass?: string; arch: { year: number; road: string; pass?: string }[]; aq?: string };
}

/** Every request needed for the trip's weather. */
export function weatherPlan(s: TripState, plan: Plan, points: RoutePoint[]): WeatherPlan {
  const D = DST(s.corridor), o = cityOr(s.origin);
  const start = s.startDate, end = isoOff(start, Math.max(0, s.days - 1)), today = isoAdd(0), last = isoAdd(FORECAST_DAYS - 1);
  const roadMap = new Map<string, Loc>(), passMap = new Map<string, Loc>();
  const dest: Loc = { key: locKey(D.lat, D.lon), lat: D.lat, lon: D.lon };
  roadMap.set(dest.key, dest);
  points.forEach(p => { const k = locKey(p.lat, p.lon); if (p.pass) passMap.set(k, { key: k, lat: p.lat, lon: p.lon, ft: p.ft }); else if (!roadMap.has(k)) roadMap.set(k, { key: k, lat: p.lat, lon: p.lon }); });
  const road = [...roadMap.values()], passes = [...passMap.values()];
  const fcStart = start <= last && end >= today ? (start < today ? today : start) : null, fcEnd = fcStart ? (end > last ? last : end) : null;
  const needTypical = end > last || !fcStart;
  const urls: WeatherPlan['urls'] = { arch: [] };
  const tz = '&timezone=Asia%2FKarachi';
  if (fcStart) {
    urls.fcRoad = `${OM}?${coordsQ(road)}&hourly=${HOURLY}&daily=${DAILY}${tz}&start_date=${fcStart}&end_date=${fcEnd}`;
    if (passes.length) urls.fcPass = `${OM}?${coordsQ(passes)}${elevQ(passes)}&hourly=${HOURLY}&daily=${DAILY}${tz}&start_date=${fcStart}&end_date=${fcEnd}`;
  }
  // The same dates in each of the last 5 complete years (the archive runs about a week behind).
  const years: number[] = [];
  if (needTypical) {
    for (let k = 1; years.length < 5 && k < 10; k++) {
      const s0 = shiftYear(start, -k), e0 = shiftYear(end, -k); if (e0 > isoAdd(-7)) continue;
      years.push(+s0.slice(0, 4));
      urls.arch.push({ year: +s0.slice(0, 4), road: `${ARCH}?${coordsQ(road)}&daily=${ARCH_DAILY}${tz}&start_date=${s0}&end_date=${e0}`,
        pass: passes.length ? `${ARCH}?${coordsQ(passes)}${elevQ(passes)}&daily=${ARCH_DAILY}${tz}&start_date=${s0}&end_date=${e0}` : undefined });
    }
  }
  // Air quality where you sleep or start: home, each night's town, the destination. Forecast covers ~5 days.
  const aqPlaces: WeatherPlan['aqPlaces'] = [{ key: locKey(o.lat, o.lon), lat: o.lat, lon: o.lon, label: o.n, iso: start }];
  plan.days.forEach(d => { if (d.stay && d.iso) aqPlaces.push({ key: locKey(d.stay.lat, d.stay.lon), lat: d.stay.lat, lon: d.stay.lon, label: d.stay.town, iso: d.iso }); });
  const aqLast = isoAdd(4), aqIn = aqPlaces.filter(p => p.iso >= today && p.iso <= aqLast);
  if (aqIn.length) {
    const u = [...new Map(aqIn.map(p => [p.key, p])).values()];
    urls.aq = `${AQ}?${coordsQ(u.map(p => ({ key: p.key, lat: p.lat, lon: p.lon })))}&hourly=pm2_5,us_aqi${tz}&start_date=${aqIn.reduce((a, p) => p.iso < a ? p.iso : a, aqIn[0].iso)}&end_date=${aqIn.reduce((a, p) => p.iso > a ? p.iso : a, aqIn[0].iso)}`;
  }
  return { road, passes, dest, aqPlaces, start, end, fcStart, fcEnd, needTypical, years, urls };
}

const asList = (j: any) => Array.isArray(j) ? j : [j];
export const allUrls = (w: WeatherPlan) => [w.urls.fcRoad, w.urls.fcPass, w.urls.aq, ...w.urls.arch.flatMap(a => [a.road, a.pass])].filter((u): u is string => !!u);
export function fetchWeather(w: WeatherPlan) { allUrls(w).forEach(u => liveFetch('rw', u, u, asList)); }
const got = (u?: string) => { const e = u ? LIVE.rw[u] : undefined; return e && e.status === 'ok' ? e.data : null; };
const state = (u?: string) => !u ? 'none' : !LIVE.rw[u] ? 'loading' : LIVE.rw[u].status;

// ---- Reading the weather --------------------------------------------------------------
export type Level = 'danger' | 'caution';
export interface Flag { level: Level; kind: 'storm' | 'rain' | 'snow' | 'ice' | 'fog' | 'heat' | 'wind' | 'cold'; text: string; icon: string }
export interface PointWx {
  temp: number | null; hi?: number; lo?: number; code: number | null; precip: number; prob: number | null; snow: number; gust: number | null; vis: number | null; freeze: number | null;
  flags: Flag[]; typical: boolean; years?: number; rainYears?: number; snowYears?: number;
}

const idxOf = (loc: any, iso: string, hour: number) => {
  const h = Math.max(0, Math.min(23, Math.round(hour)));
  return loc?.hourly?.time ? loc.hourly.time.indexOf(`${iso}T${String(h).padStart(2, '0')}:00`) : -1;
};
const dayIdx = (loc: any, iso: string) => loc?.daily?.time ? loc.daily.time.indexOf(iso) : -1;
const v = (loc: any, part: 'hourly' | 'daily', name: string, i: number): number | null => { const a = loc?.[part]?.[name]; const x = a && i >= 0 ? a[i] : null; return typeof x === 'number' ? x : null; };

/** Hazards for one moment at one place. */
export function flagsFor(w: { temp: number | null; code: number | null; precip: number; snow: number; gust: number | null; vis: number | null; daySum?: number | null }, mtn: boolean, bike: boolean): Flag[] {
  const f: Flag[] = [];
  if (w.code != null && w.code >= 95) f.push({ level: 'danger', kind: 'storm', icon: 'ph-cloud-lightning', text: t('Thunderstorm') });
  if (w.snow >= 0.3) f.push({ level: 'danger', kind: 'snow', icon: 'ph-snowflake', text: t('Snow on the road ({n} cm/h)', { n: w.snow.toFixed(1) }) });
  if (w.temp != null && w.temp <= 1 && (w.precip > 0.1 || w.snow > 0)) f.push({ level: 'danger', kind: 'ice', icon: 'ph-thermometer-cold', text: t('Icy road risk') });
  else if (w.temp != null && w.temp <= -3 && mtn) f.push({ level: 'caution', kind: 'cold', icon: 'ph-thermometer-cold', text: t('Freezing ({temp}°): black ice possible in shade', { temp: Math.round(w.temp) }) });
  if (mtn && (w.precip >= 2 || (w.daySum ?? 0) >= 20)) f.push({ level: 'danger', kind: 'rain', icon: 'ph-cloud-rain', text: t('Heavy rain: landslide risk') });
  else if (w.precip >= 4) f.push({ level: 'caution', kind: 'rain', icon: 'ph-cloud-rain', text: t('Heavy rain') });
  if (w.vis != null && w.vis < 1000) f.push({ level: w.vis < 200 ? 'danger' : 'caution', kind: 'fog', icon: 'ph-cloud-fog', text: t('Fog (visibility about {n} m)', { n: w.vis < 1000 ? Math.round(w.vis / 50) * 50 : w.vis }) });
  if (w.temp != null && w.temp >= 42) f.push({ level: 'danger', kind: 'heat', icon: 'ph-thermometer-hot', text: t('Extreme heat ({temp}°)', { temp: Math.round(w.temp) }) });
  else if (w.temp != null && w.temp >= 38) f.push({ level: 'caution', kind: 'heat', icon: 'ph-thermometer-hot', text: t('Very hot ({temp}°)', { temp: Math.round(w.temp) }) });
  const [cw, dw] = bike ? [40, 55] : [50, 70];
  if (w.gust != null && w.gust >= cw) f.push({ level: w.gust >= dw ? 'danger' : 'caution', kind: 'wind', icon: 'ph-wind', text: t('Strong wind (gusts {n} km/h)', { n: Math.round(w.gust) }) });
  return f;
}

/** Weather at a point at a given hour of its day. */
export function pointWx(w: WeatherPlan, p: { iso: string; lat: number; lon: number; pass?: string; ft?: number; mtn: boolean }, hour: number, bike: boolean): PointWx | null {
  const k = locKey(p.lat, p.lon), inFc = w.fcStart && p.iso >= w.fcStart && p.iso <= w.fcEnd!;
  if (inFc) {
    const list = p.pass ? got(w.urls.fcPass) : got(w.urls.fcRoad), locs = p.pass ? w.passes : w.road;
    const loc = list?.[locs.findIndex(l => l.key === k)]; if (!loc) return null;
    const i = idxOf(loc, p.iso, hour), di = dayIdx(loc, p.iso); if (i < 0) return null;
    const r = { temp: v(loc, 'hourly', 'temperature_2m', i), code: v(loc, 'hourly', 'weather_code', i), precip: v(loc, 'hourly', 'precipitation', i) || 0, prob: v(loc, 'hourly', 'precipitation_probability', i),
      snow: v(loc, 'hourly', 'snowfall', i) || 0, gust: v(loc, 'hourly', 'wind_gusts_10m', i), vis: v(loc, 'hourly', 'visibility', i), freeze: v(loc, 'hourly', 'freezing_level_height', i),
      hi: v(loc, 'daily', 'temperature_2m_max', di) ?? undefined, lo: v(loc, 'daily', 'temperature_2m_min', di) ?? undefined };
    return { ...r, typical: false, flags: flagsFor({ ...r, daySum: v(loc, 'daily', 'precipitation_sum', di) }, p.mtn, bike) };
  }
  // Later trips: what the same dates were like in each of the last 5 years.
  const locs = p.pass ? w.passes : w.road, li = locs.findIndex(l => l.key === k); if (li < 0) return null;
  let n = 0, hi = 0, lo = 0, rainY = 0, snowY = 0, gustMax = 0;
  for (const a of w.urls.arch) {
    const loc = got(p.pass ? a.pass : a.road)?.[li]; if (!loc) continue;
    const di = dayIdx(loc, shiftYear(p.iso, a.year - +p.iso.slice(0, 4))); if (di < 0) continue;
    const mx = v(loc, 'daily', 'temperature_2m_max', di), mn = v(loc, 'daily', 'temperature_2m_min', di); if (mx == null || mn == null) continue;
    n++; hi += mx; lo += mn; if ((v(loc, 'daily', 'precipitation_sum', di) || 0) >= 5) rainY++; if ((v(loc, 'daily', 'snowfall_sum', di) || 0) >= 1) snowY++;
    gustMax = Math.max(gustMax, v(loc, 'daily', 'wind_gusts_10m_max', di) || 0);
  }
  if (!n) return null;
  hi /= n; lo /= n;
  // A rough temperature for the hour: coolest at dawn, warmest mid-afternoon.
  const temp = lo + (hi - lo) * Math.max(0, Math.sin(Math.PI * (hour - 6) / 12));
  const flags: Flag[] = [];
  if (snowY >= 2) flags.push({ level: p.mtn ? 'danger' : 'caution', kind: 'snow', icon: 'ph-snowflake', text: t('Snow on these dates in {n} of the last {years} years', { n: snowY, years: n }) });
  if (rainY >= 3) flags.push({ level: 'caution', kind: 'rain', icon: 'ph-cloud-rain', text: p.mtn ? t('Rain on these dates in {n} of the last {years} years: landslide risk', { n: rainY, years: n }) : t('Rain on these dates in {n} of the last {years} years', { n: rainY, years: n }) });
  if (hi >= 40) flags.push({ level: hi >= 43 ? 'danger' : 'caution', kind: 'heat', icon: 'ph-thermometer-hot', text: t('Usually very hot (about {temp}°)', { temp: Math.round(hi) }) });
  if (lo <= -3 && p.mtn) flags.push({ level: 'caution', kind: 'cold', icon: 'ph-thermometer-cold', text: t('Usually below freezing at night ({temp}°)', { temp: Math.round(lo) }) });
  const code = snowY >= 3 ? 71 : rainY >= 3 ? 61 : rainY >= 1 ? 2 : 0;
  return { temp, hi, lo, code, precip: 0, prob: null, snow: 0, gust: gustMax || null, vis: null, freeze: null, flags, typical: true, years: n, rainYears: rainY, snowYears: snowY };
}

// ---- Best departure time ------------------------------------------------------------
const WEIGHT: Record<Flag['kind'], number> = { storm: 4, snow: 4, ice: 4, rain: 3, fog: 2, heat: 1, wind: 1, cold: 1 };
const scoreFlags = (f: Flag[]) => f.reduce((a, x) => a + WEIGHT[x.kind] * (x.level === 'danger' ? 2 : 1), 0);

/** Tries departure times from 4:30 to 9:00 am against the hourly forecast; returns a better one if there is one. */
export function bestDeparture(w: WeatherPlan, plan: Plan, points: RoutePoint[], bike: boolean) {
  const fcPts = points.filter(p => w.fcStart && p.iso >= w.fcStart && p.iso <= w.fcEnd!);
  if (!fcPts.length || !plan.hasDrive || !got(w.urls.fcRoad)) return null;
  const drives = plan.days.filter(d => d.track);
  const score = (dep: number) => {
    let sc = 0; const why = new Map<string, Flag>();
    for (const p of fcPts) { const x = pointWx(w, p, dep + p.offsetH, bike); if (!x) continue; sc += scoreFlags(x.flags); x.flags.forEach(f => why.set(`${f.kind}|${p.day}|${p.label}|${p.at ?? p.label}`, f)); }
    for (const d of drives) { const t = d.track!, arrive = dep + t.marks[t.marks.length - 1][1]; if (arrive > t.sunset - 0.25) sc += 6; if (dep < t.sunrise - 0.25) sc += t.legs.some(l => l.mtn) ? 2 : 1; }
    return { sc, why };
  };
  const now = score(plan.dep), cands = [4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map(d => ({ d, ...score(d) })).sort((a, b) => a.sc - b.sc || Math.abs(a.d - plan.dep) - Math.abs(b.d - plan.dep));
  const best = cands[0];
  if (best.d === plan.dep || now.sc - best.sc < 3) return null;
  const avoided = [...now.why.entries()].filter(([k]) => !best.why.has(k)).map(([k, f]) => t('{hazard} at {place}', { hazard: f.text.toLowerCase().replace(/ \(.*\)/, '').replace(/:.*/, ''), place: k.split('|')[3].replace(/^near /, '') }));
  const uniq = [...new Set(avoided)].slice(0, 2);
  return { dep: best.d, text: uniq.length ? t('Leave at {time} instead to avoid {list}.', { time: clock(best.d), list: uniq.join(` ${t('and')} `) }) : t('Leave at {time} instead for safer weather on the road.', { time: clock(best.d) }) };
}

// ---- Air quality -------------------------------------------------------------------
const AQI = (a: number) => a <= 50 ? [t('Good'), 'var(--g)'] : a <= 100 ? [t('Moderate'), 'var(--amb)'] : a <= 150 ? [t('Unhealthy for sensitive groups'), 'var(--amb)'] : a <= 200 ? [t('Unhealthy'), 'var(--cor)'] : a <= 300 ? [t('Very unhealthy'), 'var(--cor)'] : [t('Hazardous'), 'var(--cor)'];
export function airQuality(w: WeatherPlan) {
  const data = got(w.urls.aq), uniq = [...new Map(w.aqPlaces.filter(p => p.iso >= isoAdd(0) && p.iso <= isoAdd(4)).map(p => [p.key, p])).values()];
  const rows = data ? w.aqPlaces.map(p => {
    const loc = data[uniq.findIndex(u => u.key === p.key)]; if (!loc?.hourly?.time) return null;
    let max = -1, pm = 0;
    loc.hourly.time.forEach((t: string, i: number) => { if (t.startsWith(p.iso)) { const a = loc.hourly.us_aqi?.[i]; if (typeof a === 'number' && a > max) { max = a; pm = loc.hourly.pm2_5?.[i] || 0; } } });
    if (max < 0) return null; const [label, color] = AQI(max);
    return { key: p.key + p.iso, place: p.label, date: dayLabel(p.iso, 0), aqi: Math.round(max), pm: Math.round(pm), label, color, bad: max > 150 };
  }).filter((x): x is NonNullable<typeof x> => !!x).filter((x, i, a) => a.findIndex(y => y.place === x.place && y.date === x.date) === i) : [];
  return { rows, loading: state(w.urls.aq) === 'loading', inRange: !!w.urls.aq };
}

export { locKey };
