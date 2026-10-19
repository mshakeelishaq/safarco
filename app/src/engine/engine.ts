// Trip engine: road routing, day-by-day plan, costs, season notes and suggestions.
// Ported from the SafarCo App v7 design; all figures are estimates.
import {
  AIRPORTS, CONFIGS, DESTS, EDGES, ROAD_SHAPES, EDGE_STOPS, FARES, MONTH_FULL, MTN_NODES, NODES, NODE_INFO, P as PR, PLACE_INFO, ROAD_NOTE, SLOTS, STOP_DUR, STOP_HOTELS,
  SUGGEST_POOL, SECURITY_AREAS, RISK_ROAD_NOTE, SUNRISE, SUNSET, TIERS, VEH, OWN_CONFIGS, type Have, type Edge, type EdgeStop, type Hotel, type Jeep, type Mode, type Place, type StopKind, type TierId, type TripConfig, type VehicleId
} from './data';
import { clock, dayLabel, dur, fmt, fmtN, hav, inM, isoOff, mapsQ, mon } from './format';
import { sunTimes } from './sun';
import { timeDay, type DayClock } from './timing';
import { t } from '../i18n';
import { LIVE, routeKey } from './live';
import { wishPlaces, type WishId } from './seasons';
import { DST, cityOr, placesFor, rangeTxt, seasonFactor, type Dest } from './places';

export interface TripState {
  origin: string | null; mode: Mode | null; dest: string; corridor: string; startDate: string; days: number; depart: number | null;
  vehicle: VehicleId; tier: TierId; adults: number; kids: number; elders: number; groupSize: number; rooms: 'separate' | 'shared'; cap: number;
  /** The traveller's own transport, if any; 'any' (or unset) lets SafarCo pick. */
  have?: Have;
  /** What they want to see (green valleys, blossom…): its places come first in suggestions. */
  wish?: WishId | null;
  /** More places on the same trip (a circuit), besides the main destination `corridor`. */
  extra?: string[];
  /** Whether `cap` is a real spending limit. Without one, trips are priced, not filtered. */
  capOn?: boolean;
  /** Nearby places the traveller chose to sleep at, instead of seeing them on a day trip from a base. */
  sleepAt?: string[];
  /** Rooms the traveller asked for; empty means the suggested number. */
  roomCount?: number | null;
  /** Departure time chosen for a day, by day number (0 = the first day). */
  departAt?: Record<number, number>;
  /** A night at a nearby place instead of its day trip (Khaplu from Skardu). */
  overnight?: string | null;
  /** Towns on the road where the traveller chose to break a drive for the night: 'out:CHL' going, 'back:ORM' coming home. */
  breaks?: string[];
  /** Fewer hotel changes: places up to 3 h from a base are seen on day trips from it. */
  comfort?: boolean;
  /** Places the traveller chose to see on a day trip from where they're staying (on a free day), whatever the distance. */
  dayTrips?: string[];
  /** Flying in from abroad: the trip starts at the arrival airport (`origin`) with a day to land and rest. */
  abroad?: boolean;
  /** From abroad, SafarCo picks the arrival airport that suits the destination (until the traveller picks one). */
  airAuto?: boolean;
  /** Another road the traveller picked over the fastest (GT Road instead of the M-2), for this destination and city. */
  roadPick?: RoadPick | null;
}

/** Airports with flights from abroad that a trip can start from. */
export const AIR_IN = ['Islamabad', 'Lahore', 'Karachi'];
/** The arrival airport closest by road to a destination. */
export const bestAirport = (key: string, month = 7) => AIR_IN.map(n => ({ n, h: trip(key, n, month).hours })).sort((a, b) => a.h - b.h)[0].n;
/** From abroad, Gilgit-Baltistan is flown to from Islamabad by default (Gilgit or Skardu airport). */
export const flyNorth = (s: { abroad?: boolean }, key: string) => !!s.abroad && ['Gilgit', 'Skardu'].includes(DST(key).air || '');
/** Landed in Lahore or Karachi and flying north: first to Islamabad (by road from Lahore, by air from Karachi). */
export const viaIsb = (s: Pick<TripState, 'abroad' | 'vehicle' | 'corridor' | 'origin'>) => s.vehicle === 'air' && flyNorth(s, s.corridor) && !!s.origin && s.origin !== 'Islamabad';
const ISB_BY_AIR = (o: string) => o === 'Karachi';
/** Ways to travel for someone flying in: no own car, so coach, a hired car or 4x4 with driver, a flight, or a coaster. */
const ABROAD_CONFIGS: TripConfig[] = [CONFIGS[0], { id: 'hire', name: 'Hired car', vehicle: 'rentcar', tier: 'standard' }, { id: 'hire4', name: 'Hired 4x4', vehicle: 'rent4x4', tier: 'standard' }, { id: 'hirep', name: 'Premium', vehicle: 'rent4x4', tier: 'premium' }, ...CONFIGS.filter(cf => cf.id === 'fly' || cf.id === 'group')];

/** Trip styles to compare: the traveller's own vehicle only, or every style SafarCo knows. */
export const configsFor = (s: { have?: Have; groupSize: number; abroad?: boolean }) => s.have && s.have !== 'any' ? OWN_CONFIGS[s.have] : s.abroad ? ABROAD_CONFIGS.filter(cf => cf.id !== 'group' || s.groupSize >= 8) : CONFIGS.filter(cf => cf.id !== 'group' || s.groupSize >= 8);

/** Whether a destination suits a sedan or bike: a jeep for the last part, or fine. Null for 4x4s, coaches and flights. */
export function roadFit(vehicle: VehicleId, key: string, origin: string | null, month: number): { level: 'jeep'; text: string } | null {
  if (!['sedan', 'bike', 'rentcar'].includes(vehicle)) return null;
  const D = DST(key);
  if (D.hub !== undefined) return { level: 'jeep', text: t('Last part by local jeep (Raikot Bridge → Tato)') };
  const c = trip(key, origin, month);
  if (c.legs.some(l => /jeep/i.test(l.road))) return { level: 'jeep', text: t('Last stretch is a jeep track: hire a local jeep') };
  return null;
}

export const MAX_DRIVE_H = 10;
export const babusarClosed = (m: number) => !(m >= 6 && m <= 10);
export const jeepsFor = (P: number) => Math.max(1, Math.ceil(P / 5));

export interface Leg { a: string; b: string; km: number; h: number; road: string; months?: number[]; mtn?: boolean }
/** `arrive`: where a day trip reaches its place (sights follow it); `driveH`: hours of a drive back that the day page times. */
/** `keep`: a place in a day plan people follow, kept in its order when the day is timed. */
export interface StopItem { time: string; kind: StopKind; label: string; note: string; dur?: string; isDrive?: boolean; walk?: boolean; keep?: boolean; href?: string; arrive?: boolean; driveH?: number }

/** The road a pair of towns' stops belong to (the first one listed): another road between them gets roadside stops instead. */
const MAIN_ROAD: Record<string, string> = {};
EDGES.forEach(e => { MAIN_ROAD[`${e[0]}-${e[1]}`] ??= e[6]; MAIN_ROAD[`${e[1]}-${e[0]}`] ??= e[6]; });
function stopsOn(l: Leg): EdgeStop[] {
  const own = !MAIN_ROAD[`${l.a}-${l.b}`] || MAIN_ROAD[`${l.a}-${l.b}`] === l.road;
  const f = own ? EDGE_STOPS[`${l.a}-${l.b}`] : undefined, r = own ? EDGE_STOPS[`${l.b}-${l.a}`] : undefined;
  const st: EdgeStop[] = f ? f.map(x => [...x] as EdgeStop) : r ? r.map(x => [l.km - x[0], x[1], x[2], x[3]] as EdgeStop) : [];
  if (!st.length && l.h > 2.5) { const n = Math.floor(l.h / 2.5); for (let i = 1; i <= n; i++) st.push([l.km * i / (n + 1), 'tea', t('Roadside dhaba'), t('Tea, fuel and washrooms')]); }
  return st.filter(x => x[0] > 0 && x[0] < l.km).sort((a, b) => a[0] - b[0]);
}
const mealName = (h: number) => h < 10.75 ? t('Breakfast') : h < 16 ? t('Lunch') : h < 18.75 ? t('Tea break') : t('Dinner');

/** Sights already shown on the plan being built, in day order: each is shown once (a viewpoint passed again on the way home is left out). */
let SEEN: Set<string> | null = null;

/** Timed drive/stop list for one driving day. */
function dayStops(ls: Leg[], fromName: string, toName: string, dep: number, sunset: number) {
  const out: StopItem[] = []; let tm = dep, driveH = 0, stopMin = 0, km = 0, pend = { h: 0, km: 0, roads: [] as string[] };
  // [km driven today, hours after departure]: where the car is at each moment (stops make flat steps).
  const marks: [number, number][] = [[0, 0]], mark = () => marks.push([km + pend.km, tm + pend.h - dep]);
  // Breakfast before leaving: at the hotel, or packed for a very early start.
  out.push(dep >= 6 ? { time: clock(dep - 0.5), kind: 'food', label: t('Breakfast'), note: t('At your hotel, before you leave') } : { time: clock(dep), kind: 'food', label: t('Packed breakfast'), note: t('Early start: ask the hotel the night before') });
  out.push({ time: clock(tm), kind: 'go', label: t('Leave {place}', { place: fromName }), note: '' });
  let lunch = false;
  const road = (r: string) => { if (!pend.roads.includes(r)) pend.roads.push(r); };
  const flush = () => {
    if (pend.h > 0.02) out.push({ isDrive: true, kind: 'drive', time: '', label: t('{time} drive', { time: dur(pend.h) }), note: `${fmtN(pend.km < 20 ? pend.km : Math.round(pend.km / 5) * 5)} km · ${pend.roads.map(r => r === 'Local roads' ? t('Local roads') : r).join(', ')}` });
    tm += pend.h; driveH += pend.h; km += pend.km; pend = { h: 0, km: 0, roads: [] };
  };
  ls.forEach((l, li) => {
    const sp = l.km / Math.max(l.h, 0.01); let done = 0; road(l.road);
    stopsOn(l).filter(x => !(li === 0 && x[0] < 8) && !(li === ls.length - 1 && x[0] > l.km - 8)).forEach(([at, kind, label, note]) => {
      // Timing-only runs have no names and leave the shown sights alone.
      if (kind === 'view' && fromName && SEEN) { if (SEEN.has(placeKey(label))) return; SEEN.add(placeKey(label)); }
      pend.h += (at - done) / sp; pend.km += at - done; done = at; mark(); flush();
      // The first stop between noon and half past two is lunch.
      const isLunch = !lunch && tm >= 12 && tm <= 14.5 && kind !== 'fuel', k: StopKind = isLunch ? 'food' : kind, m = isLunch ? Math.max(STOP_DUR.food || 40, STOP_DUR[kind] || 15) : STOP_DUR[kind] || 15;
      if (isLunch || (kind === 'food' && tm >= 11 && tm < 16)) lunch = true;
      out.push({ time: clock(tm), kind: k, label, note: k === 'food' ? `${mealName(tm)} · ${t(note)}` : t(note), dur: t('{n} min stop', { n: m }) }); tm += m / 60; stopMin += m; road(l.road); mark();
    });
    pend.h += (l.km - done) / sp; pend.km += l.km - done; mark();
  });
  flush();
  const late = tm > sunset;
  out.push({ time: clock(tm), kind: 'bed', label: t('Arrive {place}', { place: toName }), note: late ? t('After sunset (about {time}). Leave earlier if you can.', { time: clock(sunset) }) : t('Before sunset (about {time})', { time: clock(sunset) }) });
  if (!lunch && dep < 12 && tm > 14.5) out.splice(out.length - 1, 0, { time: '', kind: 'food', label: t('Lunch on the way'), note: t('No good stop around midday: carry snacks, or eat at the next dhaba') });
  else if (!lunch && tm >= 12 && tm <= 15) out.push({ time: clock(Math.max(tm + 0.25, 13)), kind: 'food', label: t('Lunch'), note: t('In {place}', { place: toName }) });
  out.push({ time: clock(Math.max(tm + 0.5, 19.5)), kind: 'food', label: t('Dinner'), note: t('In {place}', { place: toName }) });
  return { items: out, arrive: tm, driveH, stopMin, km, late, marks };
}

/** The latest half hour to leave and still arrive half an hour before sunset (between 4:30 and 8 am). */
function recDep(ls: Leg[], set: number) {
  let r = 8;
  // Twice, since a later start can move lunch onto a different stop.
  for (let i = 0; i < 2; i++) r = Math.max(4.5, Math.min(8, Math.floor((set - 0.5 - (dayStops(ls, '', '', r, 30).arrive - r)) * 2) / 2));
  return r;
}

/** Hours after departure at which the car reaches `km` on a driving day. */
export function hoursAt(marks: [number, number][], km: number) {
  for (let i = 1; i < marks.length; i++) {
    const [k0, h0] = marks[i - 1], [k1, h1] = marks[i];
    if (km <= k1) return k1 === k0 ? h0 : h0 + (h1 - h0) * (km - k0) / (k1 - k0);
  }
  return marks[marks.length - 1][1];
}

const ADJ: Record<string, [string, Edge][]> = {};
EDGES.forEach(e => { (ADJ[e[0]] = ADJ[e[0]] || []).push([e[1], e]); (ADJ[e[1]] = ADJ[e[1]] || []).push([e[0], e]); });
const SPT: Record<string, { dist: Record<string, number>; next: Record<string, [string, Edge]> }> = {};

/** Roads the admin marked closed right now (by road name): routes go round them while there is another way. */
export const CLOSED = new Set<string>();
/** Closed stretches between two towns ("CHL-RKT"), both directions. */
export const CLOSED_EDGES = new Set<string>();
export function setClosedRoads(roads: string[], stretches: [string, string][] = []) {
  CLOSED.clear(); roads.forEach(r => CLOSED.add(r));
  CLOSED_EDGES.clear(); stretches.forEach(([a, b]) => { CLOSED_EDGES.add(`${a}-${b}`); CLOSED_EDGES.add(`${b}-${a}`); });
  for (const k in SPT) delete SPT[k]; resetTripCache();
}
/** What a closure is called: the road, or the road between two towns. */
export const closureLabel = (road: string, a?: string, b?: string) => a && b && NODE_INFO[a] && NODE_INFO[b] ? `${road} (${NODE_INFO[a][0]} – ${NODE_INFO[b][0]})` : road;
/** The closure a leg runs into, if any. */
export const legClosure = (l: { a: string; b: string; road: string }) => CLOSED.has(l.road) ? l.road : CLOSED_EDGES.has(`${l.a}-${l.b}`) ? closureLabel(l.road, ...([l.a, l.b].sort() as [string, string]) as [string, string]) : null;

/** The roads a road name is made of ('M-1 + Swat Motorway' is M-1 and Swat Motorway). */
export const roadParts = (road: string) => road.split(/ [/+] /);
const avoids = (road: string, avoid: string[]) => roadParts(road).some(r => avoid.includes(r));

/** The road the traveller picked over the fastest one, for one trip: the roads it keeps off. */
let PICK: { key: string; origin: string; avoid: string[] } | null = null;
/** Motorways (motorbikes aren't allowed on them). The M-8 in Balochistan is a two-lane highway that bikes use. */
export const MOTORWAYS = [...new Set(EDGES.flatMap(e => roadParts(e[6])))].filter(r => (/^M-\d+$/.test(r) && r !== 'M-8') || /Motorway$/.test(r));
/** The trip is on a motorbike: every route keeps off the motorways. */
let BIKE = false;
export interface RoadPick { at: string; avoid: string[] }
/** Use the traveller's road choice for the trip in `s` (from `s.roadPick`, if it's still for this trip). */
export function setRoutePick(s: { corridor: string; origin: string | null; roadPick?: RoadPick | null; vehicle?: string }) {
  const at = `${s.corridor}|${s.origin ?? ''}`;
  BIKE = s.vehicle === 'bike';
  PICK = s.roadPick && s.roadPick.at === at && s.roadPick.avoid.length ? { key: s.corridor, origin: s.origin ?? '', avoid: s.roadPick.avoid } : null;
}
export const pickAt = (s: { corridor: string; origin: string | null }) => `${s.corridor}|${s.origin ?? ''}`;
/** Run `f` with the road choice of `s`, then put back the one before (plans for other trips don't keep it). */
function withPick<T>(s: TripState, f: () => T): T { const prev = PICK, bike = BIKE; setRoutePick(s); try { return f(); } finally { PICK = prev; BIKE = bike; } }
const pickFor = (key: string, origin: string | null) => [...(BIKE ? MOTORWAYS : []), ...(PICK && PICK.key === key && PICK.origin === (origin ?? '') ? PICK.avoid : [])];

/** Dijkstra from `dest` over roads open in `month` (and not closed, unless `anyway`). */
function shortest(dest: string, month: number, anyway = false, avoid: string[] = []) {
  const key = dest + '|' + month + (anyway ? '|any' : '') + (avoid.length ? '|' + avoid.join(',') : ''); if (SPT[key]) return SPT[key];
  const dist: Record<string, number> = { [dest]: 0 }, next: Record<string, [string, Edge]> = {}, done = new Set<string>();
  while (true) {
    let u: string | null = null; for (const k in dist) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k;
    if (u === null) break; done.add(u); const uu = u;
    (ADJ[uu] || []).forEach(([v, e]) => { if ((e[7] && !e[7].includes(month)) || (!anyway && (CLOSED.has(e[6]) || CLOSED_EDGES.has(`${uu}-${v}`))) || (avoid.length && avoids(e[6], avoid))) return; const d = dist[uu] + e[2] / e[3]; if (dist[v] === undefined || d < dist[v]) { dist[v] = d; next[v] = [uu, e]; } });
  }
  return (SPT[key] = { dist, next });
}

const GENERIC = new Set(['valley', 'lakes', 'plains', 'meadows', 'meadow', 'river', 'waterfall', 'glacier']);
export const jeepMatch = (j: [string, string, ...unknown[]], p: Place) => {
  const a = j[1].toLowerCase(), b = p[0].toLowerCase();
  // Words that name a kind of place ("Basho Valley", "Soq Valley") don't make two places the same.
  return a.includes(b) || b.includes(a) || a.split(/[^a-z]+/).some(w => w.length >= 5 && !GENERIC.has(w) && b.includes(w));
};
export function scheduledPlaces(D: Dest, m: number, n: number) {
  if (!n) return (D.places || []).filter(p => inM(m, p[3])).slice(0, 1);
  return dayGroups(D, m, n).days.flatMap(d => d.list);
}

export interface AirOption { dep: string; arr: string; fare: number; km: number; pp: number; score: number }
/** Cheapest flight option from the origin's nearest major airport, with coach to the airport if needed. */
export function airFor(key: string, origin: string | null): AirOption | null {
  const D = DST(key), fares = D.air && FARES[D.air]; if (!fares) return null; const o = cityOr(origin);
  const opts = Object.entries(AIRPORTS).filter(([k, v]) => fares[k] && v[0] !== D.air).map(([k, [dep, la, lo]]) => {
    const km = hav(o.lat, o.lon, la, lo) * 1.3, pp = km < 40 ? 0 : Math.round(km * PR.airportCoach / 100) * 100 * 2;
    return { dep, arr: D.air as string, fare: fares[k], km, pp, score: fares[k] * 2 + pp };
  });
  return opts.length ? opts.sort((a, b) => a.score - b.score)[0] : null;
}

const legStopH = (l: Leg) => stopsOn(l).reduce((a, x) => a + (STOP_DUR[x[1]] || 15), 0) / 60;
/** A night on the road the traveller can add to a driving day (towns about halfway), or the one they chose. */
export interface RoadNight {
  dir: 'out' | 'back'; options: { node: string; town: string }[]; chosen: string | null;
  /** Where the night could be instead, in one day's drive from where the day starts ('' = all the way to the end of the drive). */
  next?: { node: string; town: string; h: number; long: boolean; dark: boolean }[];
  /** Tonight's town ('' = the end of the drive), and the traveller's own stops before today, which stay. */
  tonight?: string; keep?: string[];
  /** Where today's drive starts, and whether the traveller chose to drive on without the usual night stop. */
  from?: string; thru?: boolean;
}
const CANT_SLEEP = new Set(['RKT', 'DEST', 'HOME']);
/** Where a leg-list may be cut for the night: after leg i (each value is a leg index). */
const legAt = (legs: Leg[], n: string) => legs.findIndex((l, j) => l.b === n && j < legs.length - 1);
/**
 * Nights on the road: the traveller's chosen towns, and between them the fewest stops that fit (worked out
 * again, so a night in Mansehra moves the next one on to Chilas, not back to Naran). Coming home (`back`),
 * the drive between chosen towns is split in the direction it's driven.
 */
function withBreaks(legs: Leg[], cuts: number[], nodes: string[], W: number, back = false) {
  const chosen = [...new Set(nodes.map(n => legAt(legs, n)).filter(i => i >= 0))].sort((a, b) => a - b);
  // 'thru:MNS': the traveller drives on from Mansehra without the usual night stop (a long day).
  const thru = new Set(nodes.filter(n => n.startsWith('thru:')).map(n => n.slice(5)));
  if (!chosen.length && !thru.size) return cuts;
  const out = new Set(chosen);
  [-1, ...chosen].forEach((b, k) => {
    const end = k < chosen.length ? chosen[k] : legs.length - 1, part = legs.slice(b + 1, end + 1);
    if (!part.length || (thru.has(back ? part[part.length - 1].b : part[0].a) && part.reduce((a, l) => a + l.h, 0) <= LONG_DRIVE_H)) return;
    const rev = back ? part.slice().reverse().map(l => ({ ...l, a: l.b, b: l.a })) : part;
    splitDays(rev, W).cuts.forEach(c => out.add(b + 1 + (back ? part.length - 2 - c : c)));
  });
  return [...out].sort((a, b) => a - b);
}
/**
 * The towns a driving day could end in instead: from where it starts, any town (not Raikot Bridge) at least an hour
 * on, up to a full day's drive, and the end of the drive if it fits in one day. `rest` runs from the day's start to the end.
 */
function nightsAhead(rest: Leg[], W: number, sunset: number) {
  let h = 0, span = 0; const out: { node: string; town: string; h: number; long: boolean; dark: boolean }[] = [];
  for (let j = 0; j < rest.length; j++) {
    const l = rest[j]; h += l.h; span += l.h + legStopH(l);
    // A long day, for those who'd rather drive on than add a night: up to 12.5 h at the wheel, leaving at 4:30 am,
    // with breakfast and lunch on the way (about 30 min more than the road stops). Offered if it's in within 2 h of sunset, and marked when it's after dark.
    const long = h > MAX_DRIVE_H + 0.5 || span > W, inAt = 4.5 + span + 0.5;
    if (h > LONG_DRIVE_H || (long && inAt > sunset + 2)) break;
    const end = j === rest.length - 1, n = l.b, dark = long && inAt > sunset;
    if (end) out.push({ node: '', town: '', h, long, dark });
    else if (h >= 1 && !CANT_SLEEP.has(n) && !n.startsWith('@') && NODE_INFO[n]) out.push({ node: n, town: NODE_INFO[n][0], h, long, dark });
  }
  return out;
}
const LONG_DRIVE_H = 12.5;
/** Towns where a long driving day could stop for the night: at least 1.5 h from either end, nearest the middle first. */
function roadNight(ls: Leg[], dir: 'out' | 'back', chosen: string[], endsAt: string): RoadNight | undefined {
  const mine = chosen.find(n => n === endsAt) || null, total = ls.reduce((a, l) => a + l.h, 0);
  if (!mine && total < 4.5) return undefined;
  let h = 0; const opts: { node: string; town: string; d: number }[] = [];
  ls.slice(0, -1).forEach(l => { h += l.h; const n = l.b; if (!CANT_SLEEP.has(n) && !n.startsWith('@') && NODE_INFO[n] && h >= 1.5 && total - h >= 1.5) opts.push({ node: n, town: NODE_INFO[n][0], d: Math.abs(h - total / 2) }); });
  if (!mine && !opts.length) return undefined;
  return { dir, options: opts.sort((a, b) => a.d - b.d).slice(0, 3).map(({ node, town }) => ({ node, town })), chosen: mine };
}

/** A day's night choices: other towns to end it in, as well as the halfway towns. */
const withNext = (rn: RoadNight | undefined, dir: 'out' | 'back', more: Partial<RoadNight>): RoadNight | undefined => {
  const next = (more.next || []).filter(x => x.node !== more.tonight);
  return next.length || rn ? { ...(rn || { dir, options: [], chosen: null }), ...more, next } : undefined;
};

/** Fewest driving days so each day fits ≤10 h at the wheel and ends before the daylight window W closes. */
function splitDays(legs: Leg[], W: number) {
  const n = legs.length, canCut = (i: number) => !['RKT', 'DEST', 'HOME'].includes(legs[i].b) && !legs[i].b.startsWith('@'), pre = [0], preS = [0];
  legs.forEach((l, i) => { pre.push(pre[i] + l.h); preS.push(preS[i] + legStopH(l)); });
  const drive = (i: number, j: number) => pre[j + 1] - pre[i], span = (i: number, j: number) => drive(i, j) + preS[j + 1] - preS[i];
  const ok = (i: number, j: number) => i === j || (drive(i, j) <= MAX_DRIVE_H + 0.5 && span(i, j) <= W);
  for (let L = 1; L <= n; L++) {
    const best = Array.from({ length: L + 1 }, () => new Array<number>(n).fill(Infinity)), from = Array.from({ length: L + 1 }, () => new Array<number>(n).fill(-1));
    for (let j = 0; j < n; j++) if (ok(0, j)) best[1][j] = span(0, j);
    for (let k = 2; k <= L; k++) for (let j = 0; j < n; j++) for (let i = 0; i < j; i++) {
      if (!canCut(i) || best[k - 1][i] === Infinity || !ok(i + 1, j)) continue;
      const v = Math.max(best[k - 1][i], span(i + 1, j)); if (v < best[k][j]) { best[k][j] = v; from[k][j] = i; }
    }
    if (best[L][n - 1] < Infinity) { const cuts: number[] = []; let j = n - 1; for (let k = L; k > 1; k--) { j = from[k][j]; cuts.unshift(j); } return { L, cuts, maxSpan: best[L][n - 1] }; }
  }
  return { L: n, cuts: legs.slice(0, -1).map((_, i) => i).filter(canCut), maxSpan: 99 };
}

function attachTo(lat: number, lon: number, mtn: boolean) {
  return Object.keys(NODES).map(n => ({ n, air: hav(lat, lon, NODES[n][0], NODES[n][1]) })).sort((a, b) => a.air - b.air).filter((x, i, arr) => i < 4 && x.air <= arr[0].air * 1.5 + 20)
    .map(x => { const mt = mtn || MTN_NODES.has(x.n); return { ...x, mtn: mt, local: x.air < 8 ? 0 : x.air * (mt ? 1.6 : 1.3) }; });
}

export interface Trip extends Dest {
  from: string; to: string; km: number; kmStr: string; flatKm: number; mtnKm: number; hours: number; hrs: string; tolls: [string, number][];
  legs: Leg[]; cuts: number[]; via: string; legDays: number; minDays: number; live: { km: number; ratio: number; ignored?: boolean } | null; tiles: number;
}
const TRIP_CACHE: Record<string, Trip> = {};
/** Forget computed trips, e.g. after a live route arrives or prices change. */
export function resetTripCache() { for (const k in TRIP_CACHE) delete TRIP_CACHE[k]; }
/** Closed roads this trip would normally take (it goes round them, or uses them when there's no other way). */
export const closedOnRoute = (key: string, origin: string | null, month: number) => CLOSED.size || CLOSED_EDGES.size ? [...new Set(tripFrom(key, cityOr(origin), month, true, pickFor(key, origin)).legs.map(legClosure).filter((r): r is string => !!r))] : [];
LIVE.routeHooks.add(resetTripCache);

/** The towns a trip's roads pass through, so the map's road follows the day plan (at most 23, evenly picked). */
/** The way a road really goes between two towns (Babusar's bends, the M-2 by Bhera), for that road, else the pair's main road. */
export function shapeBetween(a: string, b: string, road: string): [number, number][] {
  const main = !MAIN_ROAD[`${a}-${b}`] || MAIN_ROAD[`${a}-${b}`] === road;
  const fwd = ROAD_SHAPES[`${a}-${b}|${road}`] || (main ? ROAD_SHAPES[`${a}-${b}`] : undefined), back = ROAD_SHAPES[`${b}-${a}|${road}`] || (main ? ROAD_SHAPES[`${b}-${a}`] : undefined);
  return fwd || (back ? [...back].reverse() : []);
}
/** The towns on the way, with road shapes between them. `at` places other stops (a circuit's '@hunza'); the start and end are left out. */
function viaOf(legs: Leg[], at: (n: string) => [number, number] | null = n => NODES[n] || null) {
  const pts: { p: [number, number]; town: boolean }[] = [];
  const seq = legs.length ? [legs[0].a, ...legs.map(l => l.b)] : [];
  seq.forEach((n, i) => {
    const p = i > 0 && i < seq.length - 1 || NODES[n] ? at(n) : null;
    if (p && seq.indexOf(n) === i) pts.push({ p, town: true });
    const next = seq[i + 1]; if (!next) return;
    shapeBetween(n, next, legs[i].road).forEach(q => pts.push({ p: q, town: false }));
  });
  // At most 23 points: road shapes always stay, towns are thinned evenly.
  let keep = pts;
  if (pts.length > 23) {
    const towns = pts.filter(x => x.town), room = Math.max(2, 23 - (pts.length - towns.length));
    const pick = new Set(Array.from({ length: room }, (_, i) => towns[Math.round(i * (towns.length - 1) / Math.max(1, room - 1))]));
    keep = pts.filter(x => !x.town || pick.has(x)).slice(0, 23);
  }
  const ids = legs.flatMap(l => [l.a, l.b]).filter((n, i, a) => n !== 'HOME' && n !== 'DEST' && NODES[n] && a.indexOf(n) === i);
  return { id: ids.join(',') + (keep.some(x => !x.town) ? '+shape' : ''), pts: keep.map(x => x.p) };
}
/** A circuit's live road: from home round its places and back home, through the same towns as the plan. */
export function loopRoad(s: TripState) {
  const L = circuit(s); if (!L) return null;
  const o = cityOr(s.origin), legs = L.hops.flatMap(h => h.legs);
  const via = viaOf(legs, n => n === 'HOME' || n === 'DEST' ? null : n.startsWith('@') ? [DST(n.slice(1)).lat, DST(n.slice(1)).lon] : NODES[n] || null);
  const id = 'loop:' + L.order.join(',');
  return { key: routeKey(o.n, id, via.id + '|' + L.order.join(',')), via: { id: via.id + '|' + L.order.join(','), pts: via.pts }, to: { ...DST(s.corridor), id, lat: o.lat, lon: o.lon } };
}
/** The live-road key for whatever the plan is: one place there and back, or a circuit. */
export const planRoadKey = (s: TripState) => withPick(s, () => loopRoad(s)?.key ?? liveRoadKey(s.corridor, s.origin, mon(s)));
/** The towns on the way for a trip, as routeFetch wants them. */
export const roadVia = (key: string, origin: string | null, month: number) => viaOf(trip(key, origin, month).legs);
/** The live-road key for a trip, matching the day plan's roads. */
export const liveRoadKey = (key: string, origin: string | null, month: number) => routeKey(cityOr(origin).n, key, roadVia(key, origin, month).id);

/** Road trip from `origin` to destination `key` in `month`, using the road table, corrected by the live OSRM distance when close. */
export function trip(key: string, origin: string | null, month = 7): Trip {
  return tripFrom(key, cityOr(origin), month, false, pickFor(key, origin));
}

export interface RoadOption { avoid: string[]; trip: Trip }
const tollOf = (tr: Trip) => tr.tolls.reduce((a, x) => a + x[1], 0);
/**
 * Other sensible roads for a trip: for each main road on the fastest route (80 km or more of it), the quickest
 * way that keeps off it. Offered when it's no more than 2 h slower, not much longer, and good for something:
 * shorter (GT Road beside the M-2), cheaper (no tolls), or keeping off a mountain pass (the KKH beside Babusar).
 */
export function routeOptions(key: string, origin: string | null, month: number): { best: Trip; options: RoadOption[] } {
  const o = cityOr(origin), best = tripFrom(key, o, month), seen = new Set([roadSig(best)]), options: RoadOption[] = [];
  const on = (r: string) => best.legs.filter(l => roadParts(l.road).includes(r));
  [...new Set(best.legs.filter(l => l.road !== 'Local roads').flatMap(l => roadParts(l.road)))].filter(r => on(r).reduce((a, l) => a + l.km, 0) >= 80).forEach(r => {
    const alt = tripFrom(key, o, month, false, [r]), sig = roadSig(alt);
    if (seen.has(sig)) return; seen.add(sig);
    const worth = alt.km < best.km - 20 || tollOf(alt) < tollOf(best) - 300 || on(r).some(l => l.mtn);
    if (worth && alt.hours - best.hours <= 2 && alt.km - best.km <= Math.max(100, best.km * 0.2)) options.push({ avoid: [r], trip: alt });
  });
  return { best, options: options.sort((a, b) => a.trip.hours - b.trip.hours).slice(0, 2) };
}
/** Which roads a trip takes, to tell two routes apart. */
export const roadSig = (tr: Trip) => tr.legs.map(l => `${l.a}-${l.b}:${l.road}`).join('|');
/** What sets route `a` apart from `b`: its own roads, longest first, and the first town only it goes through ("GT Road (N-5)" by Gujranwala). */
export function roadsOnlyIn(a: Trip, b: Trip) {
  const pair = (l: Leg) => [l.a, l.b].sort().join('-') + l.road, inB = new Set(b.legs.map(pair)), townsB = new Set(b.legs.flatMap(l => [l.a, l.b])), km: Record<string, number> = {};
  const own = a.legs.filter(l => l.road !== 'Local roads' && !inB.has(pair(l)));
  own.forEach(l => { km[l.road] = (km[l.road] || 0) + l.km; });
  const town = own.flatMap(l => [l.a, l.b]).find(n => NODE_INFO[n] && !townsB.has(n));
  return { roads: Object.keys(km).sort((x, y) => km[y] - km[x]), via: town ? NODE_INFO[town][0] : null };
}

/** Road trip to destination `key` from any point `o` (a city, or another destination on a circuit). */
export function tripFrom(key: string, o: { n: string; lat: number; lon: number }, month = 7, anyway = false, avoid: string[] = BIKE ? MOTORWAYS : []): Trip {
  const ck = `${key}|${o.n}|${month}${anyway ? '|any' : ''}${avoid.length ? '|' + avoid.join(',') : ''}`; if (TRIP_CACHE[ck]) return TRIP_CACHE[ck];
  const D = DST(key);
  const oc = attachTo(o.lat, o.lon, false), dc = D.node ? [{ n: D.node, local: 0, mtn: MTN_NODES.has(D.node) }] : attachTo(D.lat, D.lon, (D.ft ?? D.ftEst ?? 0) > 3000);
  let best: { st: typeof oc[number]; d: typeof dc[number]; tot: number } | null = null;
  dc.forEach(d => { const { dist } = shortest(d.n, month, anyway, avoid); oc.forEach(st => { if (dist[st.n] === undefined) return; const tot = st.local / (st.mtn ? 30 : 55) + dist[st.n] + d.local / (d.mtn ? 30 : 55); if (!best || tot < best.tot) best = { st, d, tot }; }); });
  // A closed road with no way round: plan on it anyway (the closure shows as a warning).
  // No way round the roads the traveller would rather skip: back to the usual roads.
  if (!best && avoid.length) return (TRIP_CACHE[ck] = tripFrom(key, o, month, anyway));
  if (!best && !anyway) return (TRIP_CACHE[ck] = tripFrom(key, o, month, true));
  const { st: start, d: end } = best!, { next } = shortest(end.n, month, anyway, avoid);
  let flat = 0, mtn = 0, hours = 0; const tolls: [string, number][] = [], via: string[] = [], legs: Leg[] = [];
  const addLocal = (a: string, b: string, x: { local: number; mtn: boolean }) => { const sp = x.mtn ? 30 : 55; legs.push({ a, b, km: x.local, h: x.local / sp, road: 'Local roads', mtn: x.mtn }); hours += x.local / sp; if (x.mtn) mtn += x.local; else flat += x.local; };
  if (start.local > 0) addLocal('HOME', start.n, start);
  let n = start.n;
  while (n !== end.n) {
    const [m, e] = next[n]; if (e[5]) mtn += e[2]; else flat += e[2]; hours += e[2] / e[3];
    legs.push({ a: n, b: m, km: e[2], h: e[2] / e[3], road: e[6], months: e[7], mtn: !!e[5] });
    if (e[4]) tolls.push([e[6], e[4]]); if (!via.includes(e[6])) via.push(e[6]); n = m;
  }
  if (end.local > 0) addLocal(end.n, 'DEST', end);
  if (!legs.length) addLocal('HOME', 'DEST', { local: Math.max(10, hav(o.lat, o.lon, D.lat, D.lon) * 1.3), mtn: false });
  const lvR = LIVE.route[routeKey(o.n, D.id, viaOf(legs).id)]; let live: Trip['live'] = null;
  if (lvR && lvR.status === 'ok') {
    const ratio = lvR.data.km / Math.max(1, flat + mtn);
    if (ratio > 0.85 && ratio < 1.15) { legs.forEach(l => { l.km *= ratio; l.h *= ratio; }); flat *= ratio; mtn *= ratio; hours *= ratio; live = { km: lvR.data.km, ratio }; }
    else live = { km: lvR.data.km, ratio, ignored: true };
  }
  const km = Math.max(10, Math.round((flat + mtn) / 5) * 5), sp = splitDays(legs, Math.min(12, SUNSET[month - 1] - 0.5 - 5));
  return (TRIP_CACHE[ck] = { ...D, from: o.n, to: D.name, km, kmStr: fmtN(km), flatKm: flat, mtnKm: mtn, hours, hrs: D.hub !== undefined ? t('{n} h drive + jeep', { n: Math.round(hours) }) : t('{n} h drive', { n: Math.round(hours) }),
    tolls, legs, cuts: sp.cuts, via: via.length ? via.slice(0, 4).join(' · ') : t('Local roads'), legDays: sp.L, minDays: sp.L * 2 + 1, live, tiles: Math.round(km / 3 + 40) });
}

const hotelFor = (list: Hotel[], tier: string) => list.find(h => h[1].toLowerCase() === tier) || list.find(h => h[1] === 'Standard') || list[0];
export interface Stay { town: string; place: string; name: string; note: string; tier: string; alts: string; href: string; lat: number; lon: number; curated: boolean }
function stayAt(node: string | null, key: string, tier: TierId, isDest: boolean): Stay {
  const D = DST(key), town = isDest || !node ? D.town : NODE_INFO[node][0], ft = isDest || !node ? D.ft : NODE_INFO[node][1];
  const list = isDest ? D.hotels : node ? STOP_HOTELS[node] : null, place = `${town}${ft != null ? ` · ${fmtN(ft)} ft` : ''}`;
  const [lat, lon] = isDest || !node ? [D.lat, D.lon] : NODES[node];
  if (!list) return { town, place, name: t('Hotels in {place}', { place: town }), note: t('Opens a Google Maps search'), tier: t('Search'), alts: '', href: mapsQ('hotels in ' + town), lat, lon, curated: false };
  const h = hotelFor(list, tier), alts = list.filter(x => x !== h).map(x => x[0]).join(' · ');
  return { town, place, name: h[0], note: t(h[2]), tier: h[1], alts: alts ? t('Also: {list}', { list: alts }) : '', href: mapsQ(h[0]), lat, lon, curated: true };
}

export type DayKind = 'drive' | 'explore' | 'return' | 'fly' | 'arrive' | 'transfer';
/** Where a driving day goes and when: used for weather along the road. */
export interface Track { legs: Leg[]; coords: [number, number][]; marks: [number, number][]; dep: number; sunset: number; sunrise: number }
export interface PlanDay { kind: DayKind; title: string; meta: string; note: string; stops: StopItem[]; stay: Stay | null; tip?: string; offer?: string; side?: { id: string; base: string; sleeping: boolean }; roadNight?: RoadNight; dest?: string; timing?: DayClock; long?: string; depart?: { at: number; rec: number; own: boolean }; num?: number; date?: string; iso?: string; track?: Track }

/**
 * The places for each of n days at a destination: its usual day trips first (the places open this
 * month, in visiting order), then the rest spread over the days left. Also what doesn't fit.
 */
/** "Blind Lake (Zharba Tso)" and "Blind Lake" are the same place. */
const placeKey = (name: string) => name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * On a trip to several places, a sight two of them list (Shigar Fort from Skardu and from Shigar) is seen
 * once: from the place whose name it carries, else the nearest. Returns, for each place, what to leave out.
 */
export function sharedPlaces(ids: string[], m: number): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = Object.fromEntries(ids.map(k => [k, new Set<string>()]));
  const owners = new Map<string, string[]>();
  ids.forEach(k => placesFor(DST(k), m).forEach(p => { const key = placeKey(p[0]); owners.set(key, [...(owners.get(key) || []), k]); }));
  owners.forEach((ks, key) => {
    if (ks.length < 2) return;
    const named = ks.find(k => key.includes(placeKey(DST(k).name)) || key.includes(placeKey(DST(k).town)));
    const pin = ks.map(k => PLACE_INFO[`${k}|${placesFor(DST(k), m).find(p => placeKey(p[0]) === key)![0]}`]).find(i => i?.lat != null);
    const near = pin ? ks.slice().sort((a, b) => hav(pin.lat!, pin.lon!, DST(a).lat, DST(a).lon) - hav(pin.lat!, pin.lon!, DST(b).lat, DST(b).lon))[0] : ks[ks.length - 1];
    const keep = named || near;
    ks.filter(k => k !== keep).forEach(k => out[k].add(key));
  });
  return out;
}

export function dayGroups(D: Dest, m: number, n: number, skip = '', elsewhere?: Set<string>): { days: { list: Place[]; note: string; stay: string; fixed?: boolean; leave?: number }[]; extra: Place[] } {
  // Places seen from another base on the same trip are left out here.
  const pl = placesFor(D, m).filter(p => !elsewhere?.has(placeKey(p[0]))), byName = new Map(pl.map(p => [p[0], p]));
  const fixed: { list: Place[]; note: string; stay: string; fixed?: boolean; leave?: number }[] = (D.days || []).filter(d => !skip || d.stay !== skip).map(d => ({ list: d.places.map(x => byName.get(x)).filter((p): p is Place => !!p), note: d.note || '', stay: d.stay || '', fixed: true, leave: d.leave }))
    // A place on two of the given days (Passu Cones on the way to Khunjerab too) is shown on the first only.
    .map((d, _, all) => ({ ...d, list: d.list.filter(p => !all.slice(0, all.indexOf(d)).some(e => e.list.includes(p))) })).filter(d => d.list.length);
  const skipped = new Set((D.days || []).filter(d => skip && d.stay === skip).flatMap(d => d.places));
  // Places in the same spot (two tombs in one complex) go on the same day.
  const pin = (p: Place) => PLACE_INFO[`${D.id}|${p[0]}`];
  const together = (p: Place, q: Place) => { const a = pin(p), b = pin(q); return a?.lat != null && b?.lat != null && hav(a.lat, a.lon!, b.lat, b.lon!) < 0.2; };
  const given = new Set(fixed.flatMap(d => d.list.map(p => p[0])));
  pl.filter(p => !given.has(p[0]) && !skipped.has(p[0])).forEach(p => { const d = fixed.find(d => d.list.some(q => together(p, q))); if (d) d.list.splice(d.list.findIndex(q => together(p, q)) + 1, 0, p); });
  const used = new Set(fixed.flatMap(d => d.list.map(p => p[0]))), rest = pl.filter(p => !used.has(p[0]) && !skipped.has(p[0]));
  const days = fixed.slice(0, n), left = n - days.length;
  if (left > 0 && rest.length) {
    const per = Math.max(1, Math.min(4, Math.ceil(rest.length / left)));
    const groups: Place[][] = [];
    rest.forEach(p => { const g = groups.find(g => g.some(q => together(p, q))); if (g) g.push(p); else groups.push([p]); });
    let cur: Place[] = [];
    groups.forEach(g => {
      if (cur.length && cur.length + g.length > per) { if (days.length >= n - 1) return; days.push({ list: cur, note: '', stay: '' }); cur = []; }
      cur.push(...g);
    });
    if (cur.length) days.push({ list: cur, note: '', stay: '' });
  }
  while (days.length < n) days.push({ list: [], note: '', stay: '' });
  const shown = new Set(days.flatMap(d => d.list.map(p => p[0])));
  return { days, extra: [...fixed.slice(n).flatMap(d => d.list), ...rest].filter(p => !shown.has(p[0])) };
}

function exploreDays(D: Dest, m: number, n: number, tier: TierId, over?: string | null, first = 0, departAt?: Record<number, number>, elsewhere?: Set<string>, sides: string[] = []): PlanDay[] {
  // A night at a nearby place takes two of the days: drive there and see it, then the rest of it and back.
  const K = over && n >= 2 && (D.days || []).some(d => d.stay === over) ? DST(over) : null;
  const out: PlanDay[] = []; if (!n) return out;
  // Day trips to nearby places on the trip (Shigar from Skardu) take a day each, leaving at least one here.
  const nSide = Math.min(sides.length, n > sides.length ? sides.length : Math.max(1, n - 1)), trips = sides.slice(0, nSide).map(k => sideDay(D, DST(k), m, tier));
  const skip = new Set([...(elsewhere || []), ...(SEEN || []), ...trips.flatMap(x => [...x.covered])]);
  const g = dayGroups(D, m, Math.max(0, n - nSide - (K ? 2 : 0)), K ? K.id : '', skip), spare = [...g.extra];
  const pinOf = (p: Place): StopItem => {
    const jp = (D.jeeps || []).find(x => inM(m, x[4]) && jeepMatch(x, p));
    return { time: '', kind: 'pin' as const, label: p[0], note: [t(p[1]), t(p[2])].filter(Boolean).join(' · ') + `${jp ? ` · ${t('local jeep {price}, included', { price: fmt(jp[3]) })}` : ''}`, href: p[4] };
  };
  // A full day the traveller can trim: a day back early gets places not yet in the plan, nearest first, while it ends by about 5:30 pm.
  const end = Math.min(17.5, SUNSET[m - 1] - 0.5), clk = { dest: D.id, sunset: SUNSET[m - 1], sunrise: SUNRISE[m - 1] };
  const near = (a: Place, b: Place) => { const i = PLACE_INFO[`${D.id}|${a[0]}`], j = PLACE_INFO[`${D.id}|${b[0]}`]; return i?.lat != null && j?.lat != null ? hav(i.lat, i.lon!, j.lat, j.lon!) : 50; };
  g.days.forEach((day, di) => {
    // Places spread over later days (not the usual day plans) can move up, so days come full and the rest are free.
    const later = () => g.days.slice(di + 1).filter(d => !d.fixed);
    const pool = () => [...spare, ...later().flatMap(d => d.list)];
    if (!day.list.length || !pool().length) return;
    const timed = (l: Place[]) => timeDay(l.map(pinOf), { ...clk, leave: day.leave ?? 9 }), backOf = (l: Place[]) => timed(l).back;
    // Short, or waiting long for a sunset stop.
    const short = (l: Place[]) => { const r = timed(l); return r.back < end - 1 || r.idle >= 1.5; };
    while (pool().length && short(day.list)) {
      const next = pool().sort((a, b) => Math.min(...day.list.map(q => near(a, q))) - Math.min(...day.list.map(q => near(b, q))))
        .find(p => backOf([...day.list, p]) <= Math.max(end, backOf(day.list)) && timed([...day.list, p]).idle <= timed(day.list).idle);
      if (!next) break;
      day.list = [...day.list, next];
      if (spare.includes(next)) spare.splice(spare.indexOf(next), 1); else later().forEach(d => { d.list = d.list.filter(p => p !== next); });
    }
  });
  // Days left with nothing to see go last, as free days at the end of the stay.
  g.days.sort((a, b) => +!a.list.length - +!b.list.length);
  const extra = spare.map(p => p[0]);
  g.days.forEach(day => {
    // The owner's day plans keep their order; researched ones (not checked yet) are put in route order.
    const list = day.list, given = new Set(day.fixed && D.checked !== false ? (D.days || []).flatMap(x => x.places) : []);
    const stops: StopItem[] = list.length ? list.map(p => ({ ...pinOf(p), ...(given.has(p[0]) ? { keep: true } : {}) })) : [{ time: t('All day'), kind: 'pin', label: t('Free day'), note: t('Rest, shop, or go back to a favourite spot') }];
    stops.push({ time: t('Food'), kind: 'food', label: t('Eat local'), note: D.eat ? t(D.eat) : D.eat });
    const tip = day.note ? t(day.note) : '';
    out.push({ kind: 'explore', title: list.length ? t('Explore {place}', { place: D.town }) : t('Free day in {place}', { place: D.town }), meta: list.length ? (list.length > 1 ? t('{n} places · local car or jeep', { n: list.length }) : t('{n} place · local car or jeep', { n: list.length })) : t('Nothing scheduled'), note: tip, tip, offer: day.stay || undefined, stops, stay: stayAt(null, D.id, tier, true), dest: D.id,
      ...(list.length ? { timing: { dest: D.id, leave: day.leave ?? 9, sunset: SUNSET[m - 1], sunrise: SUNRISE[m - 1] } } : {}) });
  });
  // This place's own sights count as shown first, so a day trip's drive doesn't stop at them on the way past.
  const mark = (ds: PlanDay[]) => ds.forEach(d => d.stops.forEach(x => { if (x.kind === 'pin' || x.kind === 'view') SEEN?.add(placeKey(x.label)); }));
  mark(out);
  // The night away goes where its day trip would have been: after the usual day trips, before free days.
  if (K) { const at = g.days.filter(d => d.fixed).length; out.splice(at, 0, ...overnightDays(D, K, m, tier, departAt?.[first + at])); }
  // Day trips go after the first day here.
  if (trips.length) { const at = Math.min(1, out.length); out.splice(at, 0, ...trips.map((x, i) => x.make(departAt?.[first + at + i]))); }
  // Clock times, now each day's number (and any time the traveller chose for it) is known.
  out.forEach((d, k) => {
    if (d.kind !== 'explore' || !d.timing) return;
    const own = departAt?.[first + k], rec = d.timing.leave, at = own ?? rec, r = timeDay(d.stops.filter(x => x.kind === 'pin'), { ...d.timing, leave: at }, d.stops.filter(x => x.kind !== 'pin'));
    Object.assign(d, { stops: r.stops, long: r.warn, timing: { ...d.timing, leave: at }, depart: { at, rec, own: own != null } });
  });
  if (extra.length && out.length) { const o = out[out.length - 1]; o.note = (o.note ? o.note + ' ' : '') + t('More with an extra day: {list}.', { list: extra.join(', ') }); }
  mark(out);
  return out;
}

/**
 * A day trip from a base to a nearby place: there after breakfast, its sights, and back for the night.
 * Sights on the way back (closer to the base, like Sarfaranga desert from Shigar) come last, near sunset.
 */
function sideDay(B: Dest, X: Dest, m: number, tier: TierId) {
  const ls = hopLegs(tripFrom(X.id, pointOf(B.id), m), '@' + B.id, '@' + X.id), back = ls.slice().reverse().map(l => ({ ...l, a: l.b, b: l.a }));
  const pinOf = (d: Dest, p: Place) => PLACE_INFO[`${d.id}|${p[0]}`];
  const near = (d: Dest, p: Place) => { const i = pinOf(d, p) || pinOf(X, p) || pinOf(B, p); return i?.lat != null ? hav(i.lat, i.lon!, d.lat, d.lon) : null; };
  // The place's own sights (its first day's), then base sights on the way back, at most five in all.
  const own = dayGroups(X, m, 1).days[0]?.list || [], ownKeys = new Set(own.map(p => placeKey(p[0])));
  const onWay = placesFor(B, m).filter(p => !ownKeys.has(placeKey(p[0])) && placesFor(X, m).some(q => placeKey(q[0]) === placeKey(p[0])))
    .concat(placesFor(B, m).filter(p => /desert/i.test(p[0]) && !ownKeys.has(placeKey(p[0])) && (near(X, p) ?? 99) < 30))
    .filter((p, i, a) => a.findIndex(q => placeKey(q[0]) === placeKey(p[0])) === i);
  const list = [...own, ...onWay].slice(0, 5)
    .sort((a, b) => (+/desert/i.test(a[0]) - +/desert/i.test(b[0])) || ((near(X, a) ?? 0) - (near(X, b) ?? 0)));
  const covered = new Set(list.map(p => placeKey(p[0])));
  const make = (own?: number): PlanDay => {
    const set = SUNSET[m - 1], rec = recDep(ls, set), dep = own ?? Math.min(rec, 8.5), r = dayStops(ls, B.town, X.town, dep, set);
    const items = r.items.filter(x => !(x.kind === 'food' && x.label === t('Dinner'))).map(x => x.kind === 'bed' ? { ...x, kind: 'go' as const, arrive: true, note: '' } : x);
    const pins: StopItem[] = list.map(p => ({ time: '', kind: 'pin', label: p[0], note: [t(p[1]), t(p[2])].filter(Boolean).join(' · '), href: p[4] }));
    const backH = back.reduce((a, l) => a + l.h, 0);
    const desert = list.find(p => /desert/i.test(p[0]));
    return { kind: 'drive', title: t('Day trip to {place}', { place: X.name }), meta: t('{km} km each way · back to {place} for the night', { km: fmtN(Math.round(r.km)), place: B.town }), note: desert ? t('{place} on the way back: best in the late-afternoon light.', { place: desert[0] }) : '',
      stops: [...items, ...pins, { time: '', kind: 'go', label: t('Back to {place}', { place: B.town }), note: t('About {time}', { time: dur(backH) }), driveH: backH }, { time: '7:30 pm', kind: 'food', label: t('Dinner'), note: t('In {place}', { place: B.town }) }],
      stay: stayAt(null, B.id, tier, true), dest: X.id, side: { id: X.id, base: B.id, sleeping: false }, depart: { at: dep, rec: Math.min(rec, 8.5), own: own != null } };
  };
  return { covered, make };
}

/** Drive from a place to a nearby one and see it, a night there, then the rest of it and back. */
function overnightDays(D: Dest, K: Dest, m: number, tier: TierId, own?: number): PlanDay[] {
  const ls = hopLegs(tripFrom(K.id, pointOf(D.id), m), '@' + D.id, '@' + K.id), set = SUNSET[m - 1];
  const rec = recDep(ls, set), dep = own ?? rec, r = dayStops(ls, D.town, K.town, dep, set), onRoad = new Set(r.items.map(x => x.label));
  const kp = placesFor(K, m).filter(p => !onRoad.has(p[0])), first = kp.slice(1, 4), second = [kp[0], ...kp.slice(4, 5)].filter(Boolean);
  const pin = (p: Place, time: string): StopItem => ({ time, kind: 'pin', label: p[0], note: [t(p[1]), t(p[2])].filter(Boolean).join(' · '), href: p[4] });
  const hours = Math.round(ls.reduce((a, l) => a + l.h, 0) * 2) / 2;
  return [
    { kind: 'drive', title: `${D.town} → ${K.town}`, depart: { at: dep, rec, own: own != null }, meta: t('{km} km on the road, with stops · night in {place}', { km: fmtN(Math.round(r.km / 5) * 5), place: K.town }), note: '', stops: [...r.items, ...first.map((p, j) => pin(p, t(SLOTS[j === first.length - 1 && j > 0 ? 3 : 2])))], stay: stayAt(null, K.id, tier, true) },
    { kind: 'drive', title: `${K.town} → ${D.town}`, meta: t('Morning in {place}, back in the afternoon', { place: K.town }), note: '', stops: [...second.map((p, j) => pin(p, t(SLOTS[j]))), { time: t('Afternoon'), kind: 'go', label: t('Drive back to {place}', { place: D.town }), note: t('About {h} h on the same road', { h: String(hours) }) }], stay: stayAt(null, D.id, tier, true) }
  ];
}

export interface Note { icon: string; color: string; text: string }
export function seasonInfo(s: TripState, key: string): Note[] {
  const D = DST(key), m = mon(s), notes: Note[] = [], Mo = MONTH_FULL[m - 1];
  if (D.best) notes.push(D.best.includes(m) ? { icon: 'ph-sun', color: 'var(--g)', text: t('{month} is a good time for {place} ({range}).', { month: Mo, place: D.name, range: rangeTxt(D.best) }) } : { icon: 'ph-calendar-x', color: 'var(--amb)', text: t('{month} is outside the best season for {place} ({range}).', { month: Mo, place: D.name, range: rangeTxt(D.best) }) });
  if (D.warn && D.warn[0].includes(m)) notes.push({ icon: 'ph-warning', color: 'var(--cor)', text: D.warn[1] });
  if (s.vehicle !== 'air') {
    const now = trip(key, s.origin, m), open = trip(key, s.origin, 7);
    const shut = [...new Set(open.legs.filter(l => l.months && !l.months.includes(m)).map(l => l.road))], seas = [...new Set(now.legs.filter(l => l.months).map(l => l.road))];
    // Say when the closed road is open, so "closed in November" isn't read as the months it's shut.
    const openTxt = shut.map(r => { const l = open.legs.find(x => x.road === r && x.months); return l ? t('{road} (open {from} to {to})', { road: r, from: MONTH_FULL[l.months![0] - 1], to: MONTH_FULL[l.months![l.months!.length - 1] - 1] }) : r; });
    if (shut.length) notes.push({ icon: 'ph-road-horizon', color: 'var(--cor)', text: t('{roads} is closed in {month}. The route goes another way: {km} km and about {time} longer each way.', { roads: openTxt.join(', '), month: Mo, km: fmtN(Math.max(0, now.km - open.km)), time: dur(Math.max(0, now.hours - open.hours)) }) });
    else if (seas.length) {
      // First and last open month: snow can still close the pass.
      const edge = seas.filter(r => { const l = now.legs.find(x => x.road === r && x.months); return l && (l.months![0] === m || l.months![l.months!.length - 1] === m); });
      notes.push(edge.length ? { icon: 'ph-road-horizon', color: 'var(--amb)', text: t('{roads} usually opens or closes around {month}: snow can close it. Check before you go; the KKH via Besham is the other way.', { roads: edge.join(', '), month: Mo }) }
        : { icon: 'ph-road-horizon', color: 'var(--sky)', text: t('{roads} open in {month}. Cross high passes before the afternoon.', { roads: seas.join(', '), month: Mo }) });
    }
  }
  const f = seasonFactor(D, m);
  if (f > 1) notes.push({ icon: 'ph-trend-up', color: 'var(--amb)', text: t('Peak season: hotel rates about {pct}% higher. Book early.', { pct: Math.round((f - 1) * 100) }) });
  else if (f < 1) notes.push({ icon: 'ph-trend-down', color: 'var(--g)', text: t('Off season: hotel rates about {pct}% lower, and some places are closed.', { pct: Math.round((1 - f) * 100) }) });
  const cl = [...(D.places || []).filter(p => p[3] && !p[3].includes(m)).map(p => p[0]), ...(D.jeeps || []).filter(j => j[4] && !j[4].includes(m)).map(j => j[1])]
    .filter((x, i, a) => !a.some((y, k) => k !== i && ((x !== y && x.includes(y)) || (x === y && k < i))));
  if (cl.length) notes.push({ icon: 'ph-prohibit', color: 'var(--cor)', text: t('Not possible in {month}: {list}.', { month: Mo, list: cl.join(', ') }) });
  const sun = sunTimes(D.lat, D.lon, s.startDate);
  notes.push({ icon: 'ph-sun-horizon', color: 'var(--vio)', text: t('Sunrise {rise}, sunset {set} in {place} on {date}.', { rise: clock(sun.rise), set: clock(sun.set), place: D.town, date: dayLabel(s.startDate, 0) }) });
  return notes;
}

export interface Plan { days: PlanDay[]; total: number; sunset: number; rec: number; dep: number; late: boolean; hasDrive: boolean; air: AirOption | null; /** A circuit: the days go round a loop, not out and back. */ loop?: boolean }
export function buildPlan(s: TripState): Plan { return withPick(s, () => planFor(s)); }
function planFor(s: TripState): Plan {
  const outer = SEEN; SEEN = new Set();
  try { return s.abroad ? abroadPlan(s) : planOf(s); } finally { SEEN = outer; }
}

/** Flying in from abroad: a day to land and rest in the arrival city, the trip from there, and the flight home from it. */
function abroadPlan(s: TripState): Plan {
  const o = cityOr(s.origin), m = mon(s), D = DST(s.corridor), here = !circuit(s) && trip(s.corridor, s.origin, m).hours < 0.5;
  const node = Object.keys(NODE_INFO).find(k => NODE_INFO[k][0] === o.n);
  const stay: Stay = here ? stayAt(null, s.corridor, s.tier, true) : node ? stayAt(node, s.corridor, s.tier, false)
    : { town: o.n, place: o.n, name: t('Hotels in {place}', { place: o.n }), note: t('Opens a Google Maps search'), tier: t('Search'), alts: '', href: mapsQ('hotels in ' + o.n), lat: o.lat, lon: o.lon, curated: false };
  const land: PlanDay = { kind: 'arrive', title: t('Land in {city}', { city: o.n }), meta: t('Rest after the flight'), note: t('A long flight and a time change: keep today easy. The trip starts tomorrow morning.'), stay,
    stops: [{ time: '', kind: 'plane', label: t('Land at {city} airport', { city: o.n }), note: t('Get a local SIM and some cash (PKR) at the airport') },
      { time: '', kind: 'go', label: t('Taxi to your hotel'), note: t('From the airport taxi desk or a ride app') },
      { time: t('Evening'), kind: 'bed', label: t('Rest'), note: t('An early night: tomorrow is a full day') }] };
  // Departure times are kept by the day's place in the whole trip; the trip after landing counts from 0.
  const shift = (r?: Record<number, number>) => r && Object.fromEntries(Object.entries(r).map(([k, v]) => [+k - 1, v] as const).filter(([k]) => k >= 0));
  let rest: Plan | null = null;
  // Flying north from Lahore or Karachi: a day to get to Islamabad first, and back the same way on the last day.
  if (viaIsb(s) && s.days >= 3) {
    const air = ISB_BY_AIR(o.n), isb = stayAt('ISB', s.corridor, s.tier, false), road = trip('islamabad', o.n, m);
    const hop: PlanDay = air
      ? { kind: 'transfer', title: t('{from} → {to} by air', { from: o.n, to: 'Islamabad' }), meta: t('About 2 h flight'), note: t('Flights to Gilgit and Skardu leave from Islamabad.'), stay: isb,
        stops: [{ time: '8:00 am', kind: 'go', label: t('{airport} airport', { airport: o.n }), note: t('Check in 90 minutes before departure') }, { time: '9:30 am', kind: 'plane', label: t('Fly to {place}', { place: 'Islamabad' }), note: '' }, { time: '12:00 pm', kind: 'bed', label: t('Transfer to your stay'), note: t('Rest; tomorrow’s flight is early') }] }
      : { kind: 'transfer', title: t('{from} → {to} by road', { from: o.n, to: 'Islamabad' }), meta: t('{km} km on the motorway · about {time}', { km: road.kmStr, time: dur(road.hours) }), note: t('Flights to Gilgit and Skardu leave from Islamabad.'), stay: isb,
        stops: [{ time: '9:00 am', kind: 'go', label: t('Leave {place}', { place: o.n }), note: t('By car with driver, or the Daewoo coach') }, { time: '', kind: 'food', label: t('Lunch'), note: t('Bhera service area on the M-2') }, { time: clock(9 + road.hours + 0.75), kind: 'bed', label: t('Arrive {place}', { place: 'Islamabad' }), note: t('Rest; tomorrow’s flight is early') }] };
    const r = planOf({ ...s, origin: 'Islamabad', abroad: false, days: s.days - 2, startDate: isoOff(s.startDate, 2), departAt: shift(shift(s.departAt)) });
    const end = r.days[r.days.length - 1];
    end.stops = [...end.stops, air ? { time: '', kind: 'plane', label: t('Fly {from} → {to}', { from: 'Islamabad', to: o.n }), note: t('Book a flight a few hours after you land from the north') } : { time: '', kind: 'go', label: t('Drive {from} → {to}', { from: 'Islamabad', to: o.n }), note: t('About {time} on the motorway', { time: dur(road.hours) }) }];
    rest = { ...r, days: [hop, ...r.days] };
  } else if (s.days >= 2) {
    if (here) { const ds = exploreDays(D, m, s.days - 1, s.tier, s.overnight, 1, s.departAt, undefined, sideTrips(s)[s.corridor]); rest = { days: ds, total: ds.length, sunset: sunTimes(D.lat, D.lon, s.startDate).set, rec: 6, dep: 6, late: false, hasDrive: false, air: null }; }
    else rest = planOf({ ...s, abroad: false, days: s.days - 1, startDate: isoOff(s.startDate, 1), departAt: shift(s.departAt) });
  }
  const days = [land, ...(rest?.days || []).map(d => ({ ...d, stops: d.stops.map(x => x.kind === 'food' && x.note === t('At home') ? { ...x, note: t('At your hotel') } : x) }))];
  const last = days[days.length - 1];
  last.stops = [...last.stops, { time: '', kind: 'plane', label: t('Flight home from {city}', { city: o.n }), note: t('Book it for late tonight or tomorrow: roads and flights can be delayed.') }];
  days.forEach((d, i) => { d.num = i + 1; d.date = dayLabel(s.startDate, i); d.iso = isoOff(s.startDate, i); });
  return { ...(rest || { sunset: 18, rec: 6, dep: 6, late: false, hasDrive: false, air: null }), days, total: days.length };
}

function planOf(s: TripState): Plan {
  const L = circuit(s); if (L) return buildCircuitPlan(s, L);
  const key = s.corridor, D = DST(key), m = mon(s), c = trip(key, s.origin, m), legs = c.legs, o = cityOr(s.origin);
  const at = (n: string): [number, number] => n === 'HOME' ? [o.lat, o.lon] : n === 'DEST' ? [D.lat, D.lon] : NODES[n];
  // Real sunset where each driving day ends, on that day's date.
  const sunOn = (n: string, day: number) => { const [la, lo] = at(n); return sunTimes(la, lo, isoOff(s.startDate, day)); };
  let sunset = sunOn('DEST', 0).set;
  const nm = (n: string) => n === 'DEST' ? D.town : n === 'HOME' ? c.from : NODE_INFO[n][0];
  const notes = (roads: string[]) => [...roads.map(r => ROAD_NOTE[r]), roads.some(r => SECURITY_AREAS.some(a => a.on && a.roads.includes(r))) ? RISK_ROAD_NOTE : ''].filter(Boolean).map(n => t(n)).join(' ');
  const elderNote = (roads: string[], last: boolean) => s.elders && (roads.some(r => /Babusar/.test(r)) || (last && (D.ft || 0) >= 7000)) ? t('Elders: high altitude. Go slow, keep water and any BP or heart medicine handy.') : '';
  const days: PlanDay[] = [];
  const finish = (extra: Partial<Plan>): Plan => { days.forEach((d, i) => { d.num = i + 1; d.date = dayLabel(s.startDate, i); d.iso = isoOff(s.startDate, i); }); return { days, total: days.length, sunset, rec: 6, dep: 6, late: false, hasDrive: false, air: null, ...extra }; };
  if (s.vehicle === 'air') {
    const a = airFor(key, s.origin);
    if (a) {
      const tn = D.airNote ? t(D.airNote) : t('Airport → hotel by taxi'), north = (D.ft || 0) >= 4000;
      days.push({ kind: 'fly', title: t('{from} → {to} by air', { from: a.dep, to: a.arr }), meta: t('About 1–2 h flight · {note}', { note: tn }), note: [a.pp ? t('{from} → {airport} airport by coach first.', { from: c.from, airport: a.dep }) : '', north ? t('Northern flights are weather-dependent. Keep a buffer day.') : ''].filter(Boolean).join(' '),
        stops: [{ time: '6:00 am', kind: 'go', label: t('{airport} airport', { airport: a.dep }), note: t('Check in 90 minutes before departure') }, { time: '7:30 am', kind: 'plane', label: t('Fly to {place}', { place: a.arr }), note: north ? t('Scenic on a clear day') : '' }, { time: '9:30 am', kind: 'bed', label: t('Transfer to your stay'), note: tn }], stay: stayAt(null, key, s.tier, true) });
      days.push(...exploreDays(D, m, Math.max(0, s.days - 2), s.tier, s.overnight, days.length, s.departAt, undefined, sideTrips(s)[key]));
      days.push({ kind: 'fly', title: t('{from} → {to} by air', { from: a.arr, to: a.dep }), meta: t('Morning flight'), note: '', stops: [{ time: '6:00 am', kind: 'go', label: t('Leave for {airport} airport', { airport: a.arr }), note: north ? t('Morning flights are the most reliable') : '' }, { time: '8:00 am', kind: 'plane', label: t('Fly to {place}', { place: a.dep }), note: north ? t('If cancelled, the next flight or the road is the fallback') : '' }], stay: null });
      return finish({ air: a });
    }
  }
  // A day out: there and back the same day (up to about 3 h each way), the places in between, dinner at home.
  if (s.days === 1 && c.hours <= DAY_OUT_H && D.hub === undefined) {
    const sun = sunOn('DEST', 0), back = legs.slice().reverse().map(l => ({ ...l, a: l.b, b: l.a })), backH = back.reduce((a, l) => a + l.h, 0);
    const rec = Math.min(8.5, recDep(legs, sun.set)), dep = s.departAt?.[0] ?? s.depart ?? rec, r = dayStops(legs, c.from, D.town, dep, sun.set);
    const items = r.items.filter(x => !(x.kind === 'food' && x.label === t('Dinner'))).map(x => x.kind === 'bed' ? { ...x, kind: 'go' as const, arrive: true, note: '' } : x);
    // As many of the place's sights as fit before heading home by about an hour after sunset.
    const list = placesFor(D, m).slice(0, 8), visitOf = (p: Place) => (PLACE_INFO[`${D.id}|${p[0]}`]?.visit || 60) / 60 + 0.33;
    while (list.length > 1 && r.arrive + list.reduce((a, p) => a + visitOf(p), 0) + backH > sun.set + 1) list.pop();
    const pins: StopItem[] = list.map(p => ({ time: '', kind: 'pin', label: p[0], note: [t(p[1]), t(p[2])].filter(Boolean).join(' · '), href: p[4] }));
    // Lunch after the place where midday falls.
    let h = r.arrive, at_ = pins.length; list.some((p, i) => { h += visitOf(p); if (h >= 12.5) { at_ = i + 1; return true; } return false; });
    if (h >= 12 || r.arrive < 12) pins.splice(at_, 0, { time: '', kind: 'food', label: t('Lunch'), note: t('Near {place}', { place: (list[at_ - 1] || list[0])?.[0] || D.town }) });
    days.push({ kind: 'drive', title: t('{from} → {to} and back', { from: c.from, to: D.town }), meta: t('{km} km each way · home the same night', { km: c.kmStr }), note: '', dest: D.id,
      stops: [...items, ...pins, { time: '', kind: 'go', label: t('Back to {place}', { place: c.from }), note: t('About {time}', { time: dur(backH) }), driveH: backH }, { time: '8:30 pm', kind: 'food', label: t('Dinner'), note: t('At home') }],
      stay: null, depart: { at: dep, rec, own: s.departAt?.[0] != null }, track: { legs, coords: [at(legs[0].a), ...legs.map(l => at(l.b))], marks: r.marks, dep, sunset: sun.set, sunrise: sun.rise } });
    return finish({ sunset: sun.set, rec, dep, hasDrive: true });
  }
  // Driving days, split where the day is too long and where the traveller chose to stop for the night (going and coming back can differ).
  const brk = (dir: 'out' | 'back') => breaksOf(s, dir);
  const split = (cuts: number[]) => {
    const bounds = [-1, ...cuts, legs.length - 1], segs: { ls: Leg[]; roads: string[]; last: boolean; toNode: string; from: string; to: string }[] = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const ls = legs.slice(bounds[i] + 1, bounds[i + 1] + 1), last = i === bounds.length - 2, toNode = legs[bounds[i + 1]].b;
      segs.push({ ls, roads: [...new Set(ls.map(l => l.road))], last, toNode, from: i === 0 ? c.from : nm(legs[bounds[i]].b), to: last ? D.town : nm(toNode) });
    }
    return { bounds, segs };
  };
  const W = W_OF(m), { segs, bounds: ob } = split(withBreaks(legs, c.cuts, brk('out'), W)), { segs: bsegs, bounds: bb } = split(withBreaks(legs, c.cuts, brk('back'), W, true));
  const flip = (ls: Leg[]) => ls.slice().reverse().map(l => ({ ...l, a: l.b, b: l.a }));
  // Where each driving day could end instead, and the traveller's own stops before it (which stay put).
  // Where a node sits along the legs: -1 for the start, else the leg that ends there.
  const pos = (n: string) => n === legs[0].a ? -1 : legAt(legs, n.replace(/^thru:/, ''));
  const outNight = (i: number, sunset: number): Partial<RoadNight> => {
    const from = ob[i] < 0 ? legs[0].a : legs[ob[i]].b;
    return { next: nightsAhead(legs.slice(ob[i] + 1), W, sunset), tonight: segs[i].last ? '' : segs[i].toNode, from, thru: brk('out').includes('thru:' + from),
      keep: brk('out').filter(n => n.startsWith('thru:') ? n !== 'thru:' + from && pos(n.slice(5)) < ob[i] : legAt(legs, n) >= 0 && legAt(legs, n) <= ob[i]) };
  };
  const backNight = (i: number, sunset: number): Partial<RoadNight> => {
    const from = legs[bb[i + 1]].b;
    return { next: nightsAhead(flip(legs.slice(0, bb[i + 1] + 1)), W, sunset), tonight: i === 0 ? '' : legs[bb[i]].b, from, thru: brk('back').includes('thru:' + from),
      keep: brk('back').filter(n => n.startsWith('thru:') ? n !== 'thru:' + from && pos(n.slice(5)) > bb[i + 1] : legAt(legs, n) >= bb[i + 1]) };
  };
  const free = Math.max(0, s.days - segs.length - bsegs.length);
  // Day index and end point of every driving day, out and back.
  const outDays = segs.map((g, i) => ({ g, day: i, end: g.toNode === legs[legs.length - 1].b && g.last ? 'DEST' : g.toNode }));
  const backDays = bsegs.map((g, i) => ({ g, day: segs.length + free + (bsegs.length - 1 - i), end: i === 0 ? 'HOME' : legs[bb[i]].b }));
  const suns = new Map([...outDays, ...backDays].map(x => [x.day, sunOn(x.end, x.day)]));
  sunset = Math.min(...[...suns.values()].map(x => x.set));
  const spans = [...outDays, ...backDays].map(x => ({ span: dayStops(x.g.ls, '', '', 6, 30).arrive - 6, set: suns.get(x.day)!.set }));
  const rec = Math.max(4.5, Math.min(8, Math.floor(Math.min(...spans.map(x => x.set - 0.5 - x.span)) * 2) / 2)), dep = s.depart ?? rec;
  // Each driving day has its own suggested time; a time chosen for the day, or for the whole trip, wins.
  const recAt = new Map([...outDays.map(x => [x.day, recDep(x.g.ls, suns.get(x.day)!.set)] as const), ...backDays.map((x, i) => [x.day, recDep(bsegs[i].ls.slice().reverse().map(l => ({ ...l, a: l.b, b: l.a })), suns.get(x.day)!.set)] as const)]);
  const depAt = (day: number) => s.departAt?.[day] ?? s.depart ?? recAt.get(day) ?? rec;
  const departOf = (day: number) => ({ at: depAt(day), rec: recAt.get(day) ?? rec, own: s.departAt?.[day] != null });
  const coordsOf = (ls: Leg[]): [number, number][] => [at(ls[0].a), ...ls.map(l => at(l.b))];
  let late = false;
  const meta = (r: ReturnType<typeof dayStops>) => t('{km} km · {drive} driving + {stops} stops', { km: fmtN(r.km < 20 ? r.km : Math.round(r.km / 5) * 5), drive: dur(r.driveH), stops: dur(r.stopMin / 60) });
  outDays.forEach(({ g, day }) => {
    const sun = suns.get(day)!, r = dayStops(g.ls, g.from, g.to, depAt(day), sun.set); late = late || r.late;
    days.push({ kind: 'drive', title: `${g.from} → ${g.to}`, meta: meta(r), stops: r.items, depart: departOf(day), roadNight: withNext(roadNight(g.ls, 'out', brk('out'), g.toNode), 'out', outNight(day, sun.set)), track: { legs: g.ls, coords: coordsOf(g.ls), marks: r.marks, dep: depAt(day), sunset: sun.set, sunrise: sun.rise },
      note: [notes(g.roads), g.last && D.hub !== undefined ? t('Park at Raikot Bridge, jeep to Tato (1.5 h), then a 2–3 h hike.') : '', elderNote(g.roads, g.last)].filter(Boolean).join(' '),
      stay: g.last ? stayAt(null, key, s.tier, true) : stayAt(g.toNode, key, s.tier, false) });
  });
  if (!free && days.length) { const pl = placesFor(D, m).find(p => !SEEN?.has(placeKey(p[0]))); if (pl) SEEN?.add(placeKey(pl[0])); if (pl) days[days.length - 1].stops.push({ time: t('Evening'), kind: 'pin', label: pl[0], note: [pl[1], pl[2]].filter(Boolean).join(' · '), href: pl[4] }); }
  days.push(...exploreDays(D, m, free, s.tier, s.overnight, days.length, s.departAt, undefined, sideTrips(s)[key]));
  for (let i = bsegs.length - 1; i >= 0; i--) {
    const g = bsegs[i], bd = backDays[i].day, back = g.ls.slice().reverse().map(l => ({ ...l, a: l.b, b: l.a })), sun = suns.get(bd)!, r = dayStops(back, g.to, g.from, depAt(bd), sun.set); late = late || r.late;
    days.push({ kind: 'return', title: `${g.to} → ${g.from}`, meta: meta(r), stops: r.items, note: '', depart: departOf(bd), stay: i === 0 ? null : stayAt(bsegs[i - 1].toNode, key, s.tier, false), roadNight: withNext(roadNight(back, 'back', brk('back'), back[back.length - 1].b), 'back', backNight(i, sun.set)),
      track: { legs: back, coords: coordsOf(back), marks: r.marks, dep: depAt(bd), sunset: sun.set, sunrise: sun.rise } });
  }
  return finish({ rec, dep, late, hasDrive: segs.length > 0 });
}

/** Seats a group takes in a car: two small children share one. */
export const seatsFor = (o: { adults: number; kids: number; elders: number }) => o.adults + o.elders + Math.ceil(o.kids / 2);
/** Cars (or bikes) the group needs: a Corolla takes 5 with the driver, a Prado 7, a hired car 4 besides its driver. */
export const vehiclesFor = (o: { adults: number; kids: number; elders: number }, v: { cap?: number }) => Math.max(1, Math.ceil(seatsFor(o) / (v.cap || 4)));

export interface CostRow { icon: string; label: string; detail: string; val: number }
export interface Cost { rows: CostRow[]; total: number; ok: boolean; minDays: number; why: string }
export const coachFare = (c: Trip) => Math.round((c.flatKm * PR.coachFlat + c.mtnKm * PR.coachMtn) / 100) * 100;

/**
 * Rooms for the group: the suggested number (doubles for two adults, kids on extra beds; or family
 * rooms for up to 4), or the number asked for, with extra beds for anyone the beds don't cover.
 */
export function roomPlan(o: Pick<TripState, 'adults' | 'kids' | 'elders' | 'groupSize' | 'rooms' | 'roomCount'>) {
  const AD = (o.adults ?? o.groupSize ?? 2) + (o.elders || 0), K = o.kids || 0, P = AD + K, shared = o.rooms === 'shared';
  const auto = shared ? Math.max(1, Math.ceil(P / 4)) : Math.max(1, Math.ceil(AD / 2));
  const r = o.roomCount && o.roomCount > 0 ? Math.min(20, Math.round(o.roomCount)) : auto;
  // A family room sleeps 4. A double sleeps 2 adults and one kid sharing; anyone else gets an extra bed.
  const extra = shared ? Math.max(0, P - 4 * r) : Math.max(0, AD - 2 * r) + Math.max(0, K - r);
  return { r, auto, extra, crowded: extra > r, people: P };
}

export function costFor(o: TripState): Cost { return withPick(o, () => costOf(o)); }
function costOf(o: TripState): Cost {
  // Flying north after landing in Lahore or Karachi: the trip from Islamabad, plus getting there and back, and a day for it.
  if (viaIsb(o)) {
    const r = costFor({ ...o, origin: 'Islamabad', hop: true } as TripState), P = (o.adults ?? o.groupSize ?? 2) + (o.elders || 0), K = o.kids || 0, from = o.origin!;
    const row: CostRow = ISB_BY_AIR(from)
      ? { icon: 'ph-airplane-tilt', label: 'To Islamabad', detail: t('{from} ⇄ {to} by air · {price} one way (tentative)', { from, to: 'Islamabad', price: fmt(FARES.Islamabad.KHI) }), val: FARES.Islamabad.KHI * 2 * (P + K * 0.75) }
      : { icon: 'ph-bus', label: 'To Islamabad', detail: t('{from} ⇄ {to} by coach · {price} return per person', { from, to: 'Islamabad', price: fmt(coachFare(trip('islamabad', from, mon(o))) * 2) }), val: coachFare(trip('islamabad', from, mon(o))) * 2 * (P + K * 0.5) };
    const minDays = r.minDays + 1, rows = [row, ...r.rows];
    return { ...r, rows, total: rows.reduce((a, x) => a + x.val, 0), minDays, ok: r.ok && o.days >= minDays };
  }
  const A = o.adults ?? o.groupSize ?? 2, K = o.kids || 0, E = o.elders || 0, P = A + K + E, AD = A + E;
  const M = mon(o), c = trip(o.corridor, o.origin, M), L = circuit(o), sf = seasonFactor(c, M), sfTxt = sf > 1 ? ` · ${t('peak +{pct}%', { pct: Math.round((sf - 1) * 100) })}` : sf < 1 ? ` · ${t('off-season −{pct}%', { pct: Math.round((1 - sf) * 100) })}` : '';
  // A circuit goes round once; a single place is there and back.
  const flatKm = L ? L.flatKm : c.flatKm * 2, mtnKm = L ? L.mtnKm : c.mtnKm * 2, tollList = L ? L.tolls : c.tolls.concat(c.tolls);
  const v = VEH[o.vehicle], tr = TIERS[o.tier], rt = L ? L.km : c.km * 2, rows: CostRow[] = [], nights = Math.max(o.days === 1 ? 0 : 1, o.days - 1);
  // Near places: a day out (up to about 3 h each way) or a two-day trip (up to about 4½ h).
  const shortMin = L || c.hub !== undefined ? 0 : c.hours <= DAY_OUT_H ? 1 : c.hours <= SHORT2_H ? 2 : 0;
  let minDays = L ? L.minDays : shortMin || c.minDays, ok = o.days >= minDays, why = '';
  const kidTxt = (pct: string) => K ? ` + ${K > 1 ? t('{n} kids at {pct}', { n: K, pct }) : t('{n} kid at {pct}', { n: K, pct })}` : '';
  const adults = (n: number) => n > 1 ? t('{n} adults', { n }) : t('{n} adult', { n });
  const jeeps = (n: number) => n > 1 ? t('{n} jeeps', { n }) : t('{n} jeep', { n });
  const nightsTxt = nights > 1 ? t('{n} nights', { n: nights }) : t('{n} night', { n: nights });
  if (o.vehicle === 'air') {
    const a = airFor(o.corridor, o.origin);
    if (!a) { ok = false; why = 'No airport'; minDays = 0; rows.push({ icon: 'ph-airplane-tilt', label: 'Flights', detail: t('No airport near {place}', { place: c.name }), val: 0 }); }
    else {
      minDays = 3; ok = o.days >= 3;
      rows.push({ icon: 'ph-airplane-tilt', label: 'Flights', detail: `${a.dep} ⇄ ${a.arr} · ${t('about {price} one way (tentative)', { price: fmt(a.fare) })} × ${adults(AD)}${kidTxt('75%')}`, val: a.fare * 2 * (AD + K * 0.75) });
      if (a.pp) rows.push({ icon: 'ph-bus', label: 'To the airport', detail: t('{from} ⇄ {to} by coach · {price} return per person', { from: c.from, to: a.dep, price: fmt(a.pp) }), val: a.pp * P });
      // Days in the north: not the day landing in Pakistan, nor the day getting to Islamabad.
      const cars = Math.max(1, Math.ceil(seatsFor(o) / 4)), cd = Math.max(1, o.days - (o.abroad ? 1 : 0) - ((o as { hop?: boolean }).hop ? 1 : 0));
      rows.push({ icon: 'ph-steering-wheel', label: 'Car + driver there', detail: cars > 1 ? t('{n} cars × {days} days × {price}, fuel included', { n: cars, days: cd, price: fmt(PR.localCar) }) : t('{n} car × {days} days × {price}, fuel included', { n: cars, days: cd, price: fmt(PR.localCar) }), val: cars * cd * PR.localCar });
    }
  } else if (o.vehicle === 'public') {
    const fare = L ? coachFare({ flatKm, mtnKm } as Trip) : coachFare(c);
    rows.push({ icon: 'ph-bus', label: 'Transport', detail: L ? `${t('Coaches {price} for the whole route', { price: fmt(fare) })} × ${adults(AD)}${kidTxt(t('half fare'))}` : `${t('Coach {price} each way', { price: fmt(fare) })} × ${adults(AD)}${kidTxt(t('half fare'))}`, val: fare * (L ? 1 : 2) * (AD + K * 0.5) });
  } else {
    const units = vehiclesFor(o, v), per = flatKm / (v.mileage || 1) + mtnKm / (v.mtn || 1), price = v.diesel ? PR.diesel : PR.petrol, bike = o.vehicle === 'bike';
    if (v.rate) rows.push({ icon: v.icon, label: 'Rental', detail: t('{n} × {vehicle} · ({rate} + {allow} driver) × {days} days', { n: units, vehicle: v.short, rate: fmt(v.rate), allow: fmtN(v.allow || 0), days: o.days }), val: units * (v.rate + (v.allow || 0)) * o.days });
    rows.push({ icon: 'ph-gas-pump', label: 'Fuel', detail: `${fmtN(rt)} km · ${units > 1 ? `${bike ? t('{n} bikes', { n: units }) : t('{n} vehicles', { n: units })} × ` : ''}${v.diesel ? t('{litres} L diesel (about {flat} km/L on the plains, {mtn} in the mountains)', { litres: fmtN(per), flat: String(v.mileage), mtn: String(v.mtn) }) : t('{litres} L petrol (about {flat} km/L on the plains, {mtn} in the mountains)', { litres: fmtN(per), flat: String(v.mileage), mtn: String(v.mtn) })}`, val: per * units * price });
    const tollSum = tollList.reduce((a, b) => a + b[1], 0) * units * (v.tollX || 1);
    if (o.vehicle === 'bike') rows.push({ icon: 'ph-road-horizon', label: 'Tolls', detail: `${t('Motorways closed to bikes')} · GT Road / N-5`, val: 0 });
    else rows.push({ icon: 'ph-road-horizon', label: 'Tolls', detail: (tollList.length ? [...new Set(tollList.map(x => x[0]))].join(' + ') : t('No tolled roads')) + ` · ${L ? t('whole route') : t('return')}${units > 1 ? ` × ${units}` : ''}${v.tollX ? ` · ${t('coaster rate')}` : ''}`, val: tollSum });
  }
  const rp = roomPlan(o);
  if (!nights) { /* a day out: no hotel */ } else if (o.rooms === 'shared') {
    const { r, extra } = rp;
    rows.push({ icon: 'ph-bed', label: 'Stay', detail: `${r > 1 ? t('{n} family rooms (up to 4)', { n: r }) : t('{n} family room (up to 4)', { n: r })}${extra ? ` + ${extra > 1 ? t('{n} extra beds', { n: extra }) : t('{n} extra bed', { n: extra })}` : ''} × ${nightsTxt} · ${tr.label}${sfTxt}`, val: (r * tr.night * 1.5 + extra * tr.night * 0.2) * nights * sf });
  } else {
    const { r, extra } = rp;
    rows.push({ icon: 'ph-bed', label: 'Stay', detail: `${r > 1 ? t('{n} doubles', { n: r }) : t('{n} double', { n: r })}${extra ? ` + ${extra > 1 ? t('{n} extra beds', { n: extra }) : t('{n} extra bed', { n: extra })}` : ''} × ${nightsTxt} · ${tr.label}${sfTxt}`, val: (r * tr.night + extra * tr.night * 0.2) * nights * sf });
  }
  rows.push({ icon: 'ph-fork-knife', label: 'Meals', detail: `${adults(AD)}${kidTxt('60%')} × ${t('{n} days', { n: o.days })}`, val: tr.meal * o.days * (AD + K * 0.6) });
  if ((L ? L.order.some(k => DST(k).hub !== undefined) : c.hub !== undefined) && o.vehicle !== 'suv' && o.vehicle !== 'rent4x4') { const j = jeepsFor(P); rows.push({ icon: 'ph-jeep', label: 'Local jeep', detail: `Raikot Bridge ⇄ Tato · ${jeeps(j)} × ${fmt(PR.raikotJeep)}`, val: j * PR.raikotJeep }); }
  const add = plannedJeeps(o, c, M);
  if (add.length) { const j = jeepsFor(P); rows.push({ icon: 'ph-jeep', label: 'Jeep trips', detail: `${add.map(x => x[1]).join(', ')} · ${jeeps(j)}`, val: add.reduce((a, x) => a + x[3], 0) * j }); }
  if (o.vehicle === 'air' && (o.extra || []).some(k => k !== o.corridor && !sideIds(o).has(k))) { ok = false; why = 'Flights are for one place'; }
  // From abroad: one more day to land and rest, and the flight to Pakistan is the traveller's own.
  if (o.abroad) { minDays = Math.max(2, minDays + 1); ok = ok && o.days >= minDays; rows.push({ icon: 'ph-globe-hemisphere-east', label: 'Flight to Pakistan', detail: t('Book it yourself: fares from abroad change too often to guess'), val: 0 }); }
  return { rows, total: rows.reduce((a, r) => a + r.val, 0), ok, minDays, why };
}

/** Free days at the destination once driving (or flying) days are taken out. */
export const freeDays = (o: TripState, c: Trip): number => { if (o.abroad) return Math.max(0, freeDays({ ...o, abroad: false, origin: viaIsb(o) ? 'Islamabad' : o.origin }, viaIsb(o) ? trip(o.corridor, 'Islamabad', mon(o)) : c) - 1 - (viaIsb(o) ? 1 : 0)); const L = circuit(o); return L ? Math.max(0, o.days - L.legDays) : o.vehicle === 'air' && airFor(o.corridor, o.origin) ? Math.max(0, o.days - 2) : Math.max(0, o.days - 2 * c.legDays); };
/** Local jeep trips needed for places that are in the plan this month. */
export function plannedJeeps(o: TripState, c: Trip, M: number): Jeep[] {
  const L = circuit(o);
  if (L) { const alloc = circuitAlloc(o, L); return L.order.flatMap((k, i) => { const D = DST(k), sched = scheduledPlaces(D, M, alloc[i]); return (D.jeeps || []).filter(x => inM(M, x[4]) && sched.some(p => jeepMatch(x, p))); }); }
  const sched = scheduledPlaces(c, M, freeDays(o, c));
  return (c.jeeps || []).filter(x => inM(M, x[4]) && sched.some(p => jeepMatch(x, p)));
}

export interface Suggestion extends TripConfig { corridor: string; key: string; total: number; ok: boolean; minDays: number; why: string; best?: boolean }
/** Options for the suggestions step: trip styles for one destination, or the best style per destination. */
export function suggestions(s: TripState & { pickId: string | null }) {
  const cost = (corridor: string, cf: TripConfig): Suggestion => { const r = costFor({ ...s, corridor, ...(s.abroad && s.airAuto ? { origin: bestAirport(corridor, mon(s)) } : {}), vehicle: cf.vehicle, tier: cf.tier, extra: s.mode === 'know' ? s.extra : [] }); return { ...cf, corridor, key: corridor + ':' + cf.id, total: r.total, ok: r.ok, minDays: r.minDays, why: r.why }; };
  // Without a spending limit, the chosen kind of stay decides: only those styles, cheapest first.
  const limit = s.capOn !== false, all = configsFor(s), inTier = all.filter(cf => cf.tier === s.tier), cfgs = limit || !inTier.length ? all : inTier;
  const price = (k: string, list: TripConfig[]) => list.map(cf => cost(k, cf)).filter(x => !x.why).sort((a, b) => a.total - b.total);
  // If the chosen kind of stay can't be done in these days, show every way rather than none.
  const priced = (k: string) => { const ps = price(k, cfgs); return cfgs === all || ps.some(x => x.ok) ? ps : price(k, all); };
  const fits = (x: Suggestion) => x.ok && (!limit || x.total <= s.cap);
  let list: Suggestion[];
  if (s.mode === 'know') {
    const opts = priced(s.dest), fit = opts.filter(fits), fly = flyNorth(s, s.dest) ? fit.find(x => x.vehicle === 'air') : undefined, best = fly || (fit.length ? (limit ? fit[fit.length - 1] : fit[0]) : null);
    list = opts.slice().reverse(); list.forEach(x => { x.best = x === best; });
  } else {
    // With a wish (autumn colours, snow…) only places that have it are suggested; others only fill a short list.
    const wished = new Set(s.wish && s.wish !== 'any' ? wishPlaces(s.wish).map(p => p.id) : []), inW = (x: Suggestion) => wished.has(x.corridor) ? 1 : 0;
    const pool = [...new Set([...wished, ...SUGGEST_POOL])].filter(k => (s.abroad || DST(k).name !== s.origin) && (!wished.size || wished.has(k) || wished.size < 3));
    // Each place's best style: the fullest that fits, else the cheapest that has enough days, else the quickest.
    list = pool.map(k => { const ps = priced(k), fit = ps.filter(fits), ok = ps.filter(x => x.ok), fly = flyNorth(s, k) ? fit.find(x => x.vehicle === 'air') : undefined; return fly ? fly : fit.length ? (limit ? fit[fit.length - 1] : fit[0]) : ok.length ? ok[0] : ps.slice().sort((a, b) => a.minDays - b.minDays)[0]; }).filter(Boolean);
    const inS = (x: Suggestion) => { const b = DST(x.corridor).best; return !b || b.includes(mon(s)) ? 1 : 0; };
    list.sort((a, b) => (inW(b) - inW(a)) || (+fits(b) - +fits(a)) || (inS(b) - inS(a)) || (+b.ok - +a.ok) || (fits(a) ? b.total - a.total : a.minDays - b.minDays || a.total - b.total)); list = list.slice(0, 8);
    list.forEach((x, i) => { x.best = i === 0 && fits(x); });
  }
  const okDesc = list.filter(x => x.ok), cheapestOk = s.mode === 'know' ? okDesc[okDesc.length - 1] : okDesc.slice().sort((a, b) => a.total - b.total)[0];
  const sel = list.find(x => x.key === s.pickId) || list.find(x => x.best) || cheapestOk || list[0];
  return { list, sel };
}


// ---- Circuits: more than one place on a trip (Naran, Hunza and Skardu together) ----------

/** One stretch of a circuit: from home or a place to the next place, or back home. */
/** `short`: a hop between two places of under 1½ hours' driving, done on the morning of a day there, not as a day of its own. */
export interface Hop { to: string; legs: Leg[]; km: number; flatKm: number; mtnKm: number; hours: number; tolls: [string, number][]; days: number; short?: boolean }
export interface Circuit { order: string[]; hops: Hop[]; km: number; flatKm: number; mtnKm: number; hours: number; tolls: [string, number][]; legDays: number; minDays: number }
const CIRCUITS: Record<string, Circuit | null> = {};
LIVE.routeHooks.add(() => { for (const k in CIRCUITS) delete CIRCUITS[k]; });

/** Where a destination is, as a starting point for the next stretch. */
const pointOf = (k: string) => { const D = DST(k); return { n: '@' + k, lat: D.lat, lon: D.lon }; };
const W_OF = (m: number) => Math.min(12, SUNSET[m - 1] - 0.5 - 5);

/** A stretch's legs, with the start and end named for the circuit ('@hunza', 'HOME'). */
function hopLegs(tr: Trip, from: string, to: string, reverse = false): Leg[] {
  const name = (n: string) => n === 'HOME' ? from : n === 'DEST' ? to : n;
  const ls = tr.legs.map(l => ({ ...l, a: name(l.a), b: name(l.b) }));
  return reverse ? ls.slice().reverse().map(l => ({ ...l, a: l.b, b: l.a })) : ls;
}
function hopOf(legs: Leg[], to: string, m: number): Hop {
  const flat = legs.filter(l => !l.mtn).reduce((a, l) => a + l.km, 0), mtn = legs.filter(l => l.mtn).reduce((a, l) => a + l.km, 0);
  const tolls: [string, number][] = []; legs.forEach(l => { const e = EDGES.find(e => (e[0] === l.a && e[1] === l.b) || (e[0] === l.b && e[1] === l.a)); if (e && e[4]) tolls.push([e[6], e[4]]); });
  return { to, legs, km: flat + mtn, flatKm: flat, mtnKm: mtn, hours: legs.reduce((a, l) => a + l.h, 0), tolls, days: splitDays(legs, W_OF(m)).L };
}

/** Places on the trip within 1½ hours' drive of another one: by default seen on a day trip from it. */
const SIDE_H = 1.5, COMFORT_H = 3, DAYTRIP_H = 3.5;
/** Short trips: there and back in a day up to this far (hours each way), or in two days up to SHORT2_H. */
export const DAY_OUT_H = 3.25, SHORT2_H = 4.5;

/** A sensible trip length: the driving days there and back, plus a few days to see the place (3 to 10 in all). */
export function usualDays(dest: string, origin: string | null, month: number) {
  const c = trip(dest, origin, month);
  return Math.max(3, Math.min(10, c.legDays * 2 + 3));
}

/** Day trips to offer on a free day at `base`: other places within about 3 h, good this month and not on the trip yet, nearest first. */
export function dayTripOptions(base: string, m: number, skip: string[]): { id: string; name: string; hours: number }[] {
  const B = DST(base);
  return DESTS.filter(d => d.id !== base && !skip.includes(d.id) && DST(d.id).hub === undefined && inM(m, d.best) && hav(B.lat, B.lon, d.lat, d.lon) < 110)
    .map(d => ({ id: d.id, name: d.name, hours: tripFrom(d.id, pointOf(base), m).hours }))
    .filter(x => x.hours <= 3).sort((a, b) => a.hours - b.hours).slice(0, 3);
}
const SIDES: Record<string, Record<string, string[]>> = {};
export function sideTrips(s: TripState): Record<string, string[]> {
  const extra = (s.extra || []).filter((k, i, a) => k && k !== s.corridor && a.indexOf(k) === i).slice(0, 3), m = mon(s);
  const ck = `${s.corridor}|${extra.join(',')}|${(s.sleepAt || []).join(',')}|${m}|${s.comfort ? 'c' : ''}|${(s.dayTrips || []).join(',')}`; if (ck in SIDES) return SIDES[ck];
  const out: Record<string, string[]> = {}, bases = [s.corridor, ...extra];
  extra.forEach(k => {
    // Places reached by jeep and a hike (Fairy Meadows) are never a day trip: people stay the night.
    if ((s.sleepAt || []).includes(k) || DST(k).hub !== undefined) return;
    const near = bases.filter(b => b !== k && !Object.values(out).flat().includes(b)).map(b => ({ b, h: tripFrom(k, pointOf(b), m).hours })).sort((a, b) => a.h - b.h)[0];
    if (near && near.h <= ((s.dayTrips || []).includes(k) ? DAYTRIP_H : s.comfort ? COMFORT_H : SIDE_H)) (out[near.b] = out[near.b] || []).push(k);
  });
  return (SIDES[ck] = out);
}
const sideIds = (s: TripState) => new Set(Object.values(sideTrips(s)).flat());

/** The circuit for a trip with more than one place: the shortest order, each stretch, and home. Null for one place. */
export function circuit(s: TripState): Circuit | null {
  // Nearby places seen on day trips aren't stops of the circuit.
  const sides = sideIds(s), extra = (s.extra || []).filter((k, i, a) => k && k !== s.corridor && a.indexOf(k) === i).slice(0, 3).filter(k => !sides.has(k));
  if (!extra.length || s.vehicle === 'air') return null;
  const m = mon(s), ck = `${s.origin}|${s.corridor}|${extra.join(',')}|${m}`; if (ck in CIRCUITS) return CIRCUITS[ck];
  const places = [s.corridor, ...extra], home = cityOr(s.origin);
  const out = (k: string) => trip(k, s.origin, m), between = (a: string, b: string) => tripFrom(b, pointOf(a), m);
  // Try every order (at most 4 places, 24 orders) and keep the shortest loop.
  const perms = (xs: string[]): string[][] => xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
  const loopKm = (o: string[]) => out(o[0]).km + o.slice(1).reduce((a, k, i) => a + between(o[i], k).km, 0) + out(o[o.length - 1]).km;
  // Equal loops: visit the nearest place first (Naran on the way up, not on the way back).
  const score = (o: string[]) => loopKm(o) + out(o[0]).km * 0.02;
  const order = perms(places).reduce((best, o) => score(o) < score(best) ? o : best);
  const hops: Hop[] = [hopOf(hopLegs(out(order[0]), 'HOME', '@' + order[0]), order[0], m)];
  for (let i = 1; i < order.length; i++) hops.push(hopOf(hopLegs(between(order[i - 1], order[i]), '@' + order[i - 1], '@' + order[i]), order[i], m));
  hops.push(hopOf(hopLegs(out(order[order.length - 1]), 'HOME', '@' + order[order.length - 1], true), 'HOME', m));
  void home;
  // Skardu → Shigar is under an hour: no driving day for it, just a morning drive on the first day there.
  hops.forEach((h, i) => { if (i > 0 && i < hops.length - 1 && h.hours <= 1.5) { h.short = true; h.days = 0; } });
  const sum = (f: (h: Hop) => number) => hops.reduce((a, h) => a + f(h), 0), legDays = sum(h => h.days);
  return (CIRCUITS[ck] = { order, hops, km: Math.round(sum(h => h.km) / 5) * 5, flatKm: sum(h => h.flatKm), mtnKm: sum(h => h.mtnKm), hours: sum(h => h.hours), tolls: hops.flatMap(h => h.tolls), legDays, minDays: legDays + 1 });
}

/** Free days at each place on a circuit: everyone gets one if there are enough, the rest go to places with more to see. */
/** Driving days there and back for a one-place trip, with its nights on the road (cheap: no full plan). */
export function drivingDays(s: TripState) {
  return withPick(s, () => { const m = mon(s), c = trip(s.corridor, s.origin, m), W = W_OF(m); return withBreaks(c.legs, c.cuts, breaksOf(s, 'out'), W).length + withBreaks(c.legs, c.cuts, breaksOf(s, 'back'), W, true).length + 2; });
}
/** Towns the traveller chose to stop at for the night, going ('out') or on the way home ('back'). */
const breaksOf = (s: TripState, dir: 'out' | 'back') => (s.breaks || []).filter(b => b.startsWith(dir + ':')).map(b => b.slice(dir.length + 1));
/** Where a circuit's stretch is split into driving days: where it must be, and where the traveller chose. */
function hopCuts(s: TripState, L: Circuit, h: Hop, m: number) {
  const sp = splitDays(h.legs, W_OF(m));
  const back = h === L.hops[L.hops.length - 1];
  // The last stretch already runs towards home, so it's split as it is.
  return { cuts: withBreaks(h.legs, sp.cuts, breaksOf(s, back ? 'back' : 'out'), W_OF(m)), base: sp.cuts.length };
}

export function circuitAlloc(s: TripState, L: Circuit) {
  // Nights the traveller added on the road take days from the places.
  const m0 = mon(s), added = L.hops.filter(h => !h.short).reduce((a, h) => { const c = hopCuts(s, L, h, m0); return a + c.cuts.length - c.base; }, 0);
  let free = Math.max(0, s.days - L.legDays - added);
  const m = mon(s), st = sideTrips(s), w = L.order.map(k => Math.max(1, placesFor(DST(k), m).length) + (st[k] || []).length * 3), out = L.order.map(() => 0);
  for (let i = 0; i < out.length && free > 0; i++) { out[i]++; free--; }
  while (free > 0) { const i = w.map((x, j) => x / (out[j] + 1)).reduce((b, x, j, a) => x > a[b] ? j : b, 0); out[i]++; free--; }
  return out;
}

/** Day by day for a circuit: drive to each place, explore it, drive on, and home by the shortest way. */
function buildCircuitPlan(s: TripState, L: Circuit): Plan {
  const m = mon(s), o = cityOr(s.origin), alloc = circuitAlloc(s, L), shared = sharedPlaces(L.order, m);
  const at = (n: string): [number, number] => n === 'HOME' ? [o.lat, o.lon] : n.startsWith('@') ? [DST(n.slice(1)).lat, DST(n.slice(1)).lon] : NODES[n];
  const nm = (n: string) => n === 'HOME' ? o.n : n.startsWith('@') ? DST(n.slice(1)).town : NODE_INFO[n][0];
  const notes = (roads: string[]) => [...roads.map(r => ROAD_NOTE[r]), roads.some(r => SECURITY_AREAS.some(a => a.on && a.roads.includes(r))) ? RISK_ROAD_NOTE : ''].filter(Boolean).map(n => t(n)).join(' ');
  const coordsOf = (ls: Leg[]): [number, number][] => [at(ls[0].a), ...ls.map(l => at(l.b))];
  // Each stretch split into driving days.
  const segsOf = (h: Hop) => {
    const bounds = [-1, ...hopCuts(s, L, h, m).cuts, h.legs.length - 1];
    return bounds.slice(0, -1).map((b, i) => { const ls = h.legs.slice(b + 1, bounds[i + 1] + 1); return { ls, roads: [...new Set(ls.map(l => l.road))], from: nm(ls[0].a), to: nm(ls[ls.length - 1].b), end: ls[ls.length - 1].b }; });
  };
  type Seg = ReturnType<typeof segsOf>[number];
  const days: PlanDay[] = [], driving: { seg: Seg; kind: DayKind; day: number; stayKey: string | null }[] = [];
  // First pass: which day each drive falls on, so sunsets and the departure time can be worked out.
  let dayNo = 0;
  L.hops.forEach((h, hi) => {
    const segs = h.short ? [] : segsOf(h), last = hi === L.hops.length - 1;
    segs.forEach((g, gi) => driving.push({ seg: g, kind: last ? 'return' : 'drive', day: dayNo + gi, stayKey: gi === segs.length - 1 ? (last ? null : h.to) : '' }));
    dayNo += segs.length + (last ? 0 : alloc[hi]);
  });
  const sunAt = (n: string, d: number) => { const [la, lo] = at(n); return sunTimes(la, lo, isoOff(s.startDate, d)); };
  const spans = driving.map(x => ({ span: dayStops(x.seg.ls, '', '', 6, 30).arrive - 6, set: sunAt(x.seg.end, x.day).set }));
  const rec = Math.max(4.5, Math.min(8, Math.floor(Math.min(...spans.map(x => x.set - 0.5 - x.span)) * 2) / 2)), dep = s.depart ?? rec;
  const recAt = new Map(driving.map(x => [x.day, recDep(x.seg.ls, sunAt(x.seg.end, x.day).set)] as const));
  const depAt = (day: number) => s.departAt?.[day] ?? s.depart ?? recAt.get(day) ?? rec;
  let late = false, sunset = 24;
  const meta = (r: ReturnType<typeof dayStops>) => t('{km} km · {drive} driving + {stops} stops', { km: fmtN(r.km < 20 ? r.km : Math.round(r.km / 5) * 5), drive: dur(r.driveH), stops: dur(r.stopMin / 60) });
  /** A short hop: drive in the morning, then the first day's places at the new place; or, with no day there, drive over in the evening. */
  const shortHop = (h: Hop, n: number): PlanDay[] => {
    const D = DST(h.to), from = nm(h.legs[0].a), i = days.length;
    if (!n) {
      const prev = days[days.length - 1];
      if (prev) { prev.stops.push({ time: t('Evening'), kind: 'go', label: t('Drive to {place}', { place: D.town }), note: t('{km} km · {time}', { km: fmtN(Math.round(h.km)), time: dur(h.hours) }) }); prev.stay = stayAt(null, h.to, s.tier, true); }
      return [];
    }
    const ex = exploreDays(D, m, n, s.tier, null, i, s.departAt, shared[h.to], sideTrips(s)[h.to]), first = ex[0], sun = sunAt('@' + h.to, i), rd = recDep(h.legs, sun.set), dp = s.departAt?.[i] ?? s.depart ?? rd;
    const r = dayStops(h.legs, from, D.town, dp, sun.set);
    // The day's places follow arrival; the driving-day page gives them their times.
    const pins = first.stops.filter(x => x.kind === 'pin' && x.label !== t('Free day')).map(x => ({ ...x, time: '' }));
    const base = L.order[L.order.indexOf(h.to) - 1] || '';
    return [{ kind: 'drive', title: `${from} → ${D.town}`, meta: meta(r), note: first.note, tip: first.tip, offer: first.offer, side: base ? { id: h.to, base, sleeping: true } : undefined, stops: [...r.items, ...pins], stay: stayAt(null, h.to, s.tier, true),
      depart: { at: dp, rec: rd, own: s.departAt?.[i] != null }, track: { legs: h.legs, coords: coordsOf(h.legs), marks: r.marks, dep: dp, sunset: sun.set, sunrise: sun.rise } }, ...ex.slice(1)];
  };
  let k = 0;
  L.hops.forEach((h, hi) => {
    const last = hi === L.hops.length - 1, segs = h.short ? [] : segsOf(h);
    if (h.short) { days.push(...shortHop(h, alloc[hi])); return; }
    segs.forEach((g, gi) => {
      const x = driving[k++], sun = sunAt(g.end, x.day), r = dayStops(g.ls, g.from, g.to, depAt(x.day), sun.set); late = late || r.late; sunset = Math.min(sunset, sun.set);
      const arrives = gi === segs.length - 1;
      // Nights: at the next place when a stretch ends there, else in the town where the day's drive stops.
      const stay = arrives ? (last ? null : stayAt(null, h.to, s.tier, true)) : stayAt(g.end, s.corridor, s.tier, false);
      days.push({ kind: x.kind, title: `${g.from} → ${g.to}`, meta: meta(r), stops: r.items, note: notes(g.roads), stay, roadNight: roadNight(g.ls, last ? 'back' : 'out', breaksOf(s, last ? 'back' : 'out'), g.end), depart: { at: depAt(x.day), rec: recAt.get(x.day) ?? rec, own: s.departAt?.[x.day] != null }, track: { legs: g.ls, coords: coordsOf(g.ls), marks: r.marks, dep: depAt(x.day), sunset: sun.set, sunrise: sun.rise } });
    });
    if (last) return;
    const D = DST(h.to);
    if (!alloc[hi] && days.length) { const pl = placesFor(D, m).find(p => !SEEN?.has(placeKey(p[0]))); if (pl) SEEN?.add(placeKey(pl[0])); if (pl) days[days.length - 1].stops.push({ time: t('Evening'), kind: 'pin', label: pl[0], note: [pl[1], pl[2]].filter(Boolean).join(' · '), href: pl[4] }); }
    days.push(...exploreDays(D, m, alloc[hi], s.tier, null, days.length, s.departAt, shared[h.to], sideTrips(s)[h.to]));
  });
  days.forEach((d, i) => { d.num = i + 1; d.date = dayLabel(s.startDate, i); d.iso = isoOff(s.startDate, i); });
  return { days, total: days.length, sunset, rec, dep, late, hasDrive: true, air: null, loop: true };
}
