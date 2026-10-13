// Fuel on the road: pumps from OpenStreetMap (via /api/places?kind=fuel) along each driving day,
// plus SafarCo's own notes for mountain and coastal stretches where pumps are far apart.
import type { Leg, Plan } from './engine';
import { LIVE, placesKey, type Spot } from './live';
import { mapsQ } from './format';
import { nearName, type RoutePoint } from '../weather/route';
import { lang, t } from '../i18n';

/**
 * Stretches with few or no pumps, by road edge: [fill up here going a → b, going b → a, note].
 * An empty place means "before this stretch". Map data misses small pumps, so these come first.
 */
export const FUEL_GAPS: Record<string, [string, string, string]> = {
  'NRN-CHL': ['Naran', 'Chilas', 'No proper pump over Babusar Pass for about 115 km.'],
  'AST-SKD': ['Astore', 'Skardu', 'No fuel on the Deosai Plains for about 170 km.'],
  'PHD-MSJ': ['Gahkuch', 'Chitral', 'Over Shandur Pass, villages sell fuel only from drums.'],
  'SST-KJB': ['Sost', 'Sost', 'No pump between Sost and Khunjerab Pass, 85 km each way.'],
  'BSM-CHL': ['Besham', 'Chilas', 'Pumps are far apart on this part of the KKH.'],
  'RKT-SKD': ['', '', 'Few pumps on the Skardu road along the Indus.'],
  'GLT-SKD': ['Gilgit', 'Skardu', 'Few pumps on the Skardu road along the Indus.'],
  'DIR-THL': ['Dir', '', 'Few pumps after Dir, and none in Kumrat valley. Thal sells fuel from drums.'],
  'MZD-KEL': ['Muzaffarabad', '', 'Pumps thin out up the Neelum valley.'],
  'CTR-BMB': ['Chitral', '', 'No pumps in the Kalash valleys.'],
  'GLT-NLT': ['Gilgit', '', 'No pump in Naltar valley.'],
  'KHI-KML': ['Hub', '', 'Pumps are far apart on the Makran Coastal Highway.'],
  'KML-ORM': ['', 'Ormara', 'Pumps are far apart on the Makran Coastal Highway. Ormara has fuel.'],
  'ORM-GWD': ['Ormara', '', 'Pumps are far apart on the Makran Coastal Highway. Pasni has fuel.']
};

/** SafarCo's fuel notes for one driving day's roads. */
export function fuelNotes(legs: Leg[]) {
  const out: string[] = [];
  legs.forEach(l => {
    const f = FUEL_GAPS[`${l.a}-${l.b}`], r = FUEL_GAPS[`${l.b}-${l.a}`], g = f || r; if (!g) return;
    const place = f ? g[0] : g[1], note = t(g[2]);
    const text = place ? t('Fill up in {place}. {note}', { place, note }) : t('Fill up before this stretch. {note}', { note });
    if (!out.includes(text)) out.push(text);
  });
  return out;
}

// ---- Pumps along the real road --------------------------------------------------

const KX = 111.32, KY = 110.57;
/** Where a point sits along a [lon, lat] line: km from the start, and km away from the line. */
export function project(line: [number, number][], lat: number, lon: number) {
  const cx = Math.cos(lat * Math.PI / 180) * KX;
  let best = { along: 0, off: Infinity }, run = 0;
  for (let i = 1; i < line.length; i++) {
    const ax = line[i - 1][0] * cx, ay = line[i - 1][1] * KY, bx = line[i][0] * cx, by = line[i][1] * KY, px = lon * cx, py = lat * KY;
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy, len = Math.sqrt(len2);
    const f = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const off = Math.hypot(ax + dx * f - px, ay + dy * f - py);
    if (off < best.off) best = { along: run + f * len, off };
    run += len;
  }
  return best;
}

/** The points to ask for pumps around: every sample of the outbound driving days (the way back uses the same road). */
export const fuelQueryPoints = (pts: RoutePoint[]) => pts.filter(p => p.outbound);

/** Pumps further apart than this get a warning. */
export const GAP_KM = 100;
/** How far from the road a pump may be and still count as on it. */
const OFF_KM = 1.5;

export interface FuelStop { key: string; name: string; place: string; at: number; count: number; lat: number; lon: number; href: string }
export interface DayFuel { stops: FuelStop[]; notes: string[]; gaps: string[]; loading: boolean; live: boolean }

let memo: { key: string; out: Map<number, DayFuel> } | null = null;

/**
 * Fuel for every driving day: the pumps on that day's stretch of road (grouped by place),
 * SafarCo's notes, and a warning where the map shows no pump for a long way.
 * `road` is the real road line from OpenRouteService; without it only the notes show.
 */
export function fuelByDay(plan: Plan, pts: RoutePoint[], road: [number, number][] | null): Map<number, DayFuel> {
  const queries = fuelQueryPoints(pts).map(p => LIVE.places[placesKey('fuel', p.lat, p.lon)]);
  const key = `${lang()}#${plan.days.map(d => d.title).join('|')}#${road ? road.length + ':' + road[0] + road[road.length - 1] : '-'}#${queries.map(q => q ? q.status : '_').join('')}`;
  if (memo && memo.key === key) return memo.out;
  const out = new Map<number, DayFuel>();
  const loading = !!road && queries.some(q => !q || q.status === 'loading');
  const live = !!road && queries.some(q => q && q.status === 'ok');

  // Every pump found, placed along the road; pumps off the road are dropped.
  const seen = new Set<string>(), pumps: (Spot & { along: number })[] = [];
  if (road && road.length > 1) queries.forEach(q => q && q.status === 'ok' && q.data.forEach(s => {
    const k = `${s.lat.toFixed(3)},${s.lon.toFixed(3)}`; if (seen.has(k)) return; seen.add(k);
    const p = project(road, s.lat, s.lon); if (p.off <= OFF_KM) pumps.push({ ...s, along: p.along });
  }));

  plan.days.forEach((d, i) => {
    if (!d.track) return;
    const notes = fuelNotes(d.track.legs), mine = pts.filter(p => p.day === i);
    let stops: FuelStop[] = [], gaps: string[] = [];
    if (road && road.length > 1 && mine.length > 1) {
      const pos = mine.map(p => project(road, p.lat, p.lon).along), lo = Math.min(...pos), hi = Math.max(...pos), out = d.kind !== 'return';
      const here = pumps.filter(p => p.along >= lo - 1 && p.along <= hi + 1).map(p => ({ ...p, at: Math.max(0, out ? p.along - lo : hi - p.along) })).sort((a, b) => a.at - b.at);
      // Pumps within 3 km of each other are one stop, named after the nearest town SafarCo knows.
      here.forEach(p => {
        const last = stops[stops.length - 1];
        if (last && p.at - last.at <= 3) { last.count++; return; }
        const place = nearName(p.lat, p.lon).at || p.address.split(',')[0].trim();
        stops.push({ key: `${i}-${Math.round(p.at)}`, name: p.name, place, at: Math.round(p.at), count: 1, lat: p.lat, lon: p.lon, href: mapsQ(`${p.lat.toFixed(5)},${p.lon.toFixed(5)}`) });
      });
      // Long stretches with no pump on the map. SafarCo's own notes say it better, so they win.
      if (live && !loading && !notes.length) {
        const total = hi - lo, marks = [0, ...stops.map(s => s.at), total];
        for (let j = 1; j < marks.length; j++) {
          const gap = marks[j] - marks[j - 1]; if (gap < GAP_KM) continue;
          gaps.push(j === 1 ? t('No pump on the map for the first {km} km. Fill up before you leave.', { km: Math.round(gap / 5) * 5 })
            : t('No pump on the map for about {km} km after {place}. Fill up there.', { km: Math.round(gap / 5) * 5, place: stops[j - 2].place || t('km {km}', { km: stops[j - 2].at }) }));
        }
      }
      // Keep the list short: towns with pumps, not every pump.
      const byPlace = new Map<string, FuelStop>();
      stops.forEach(s => { const k = s.place || s.key, b = byPlace.get(k); if (b) b.count += s.count; else byPlace.set(k, { ...s }); });
      stops = [...byPlace.values()];
    }
    out.set(i, { stops, notes, gaps, loading, live });
  });
  memo = { key, out };
  return out;
}
