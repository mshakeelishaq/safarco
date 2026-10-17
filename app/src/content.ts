// The admin's changes to the guides: places, food, destination details, security areas and closed roads.
// Stored in Supabase (app_config "content") and laid over the built-in guides when SafarCo opens, so a
// change shows without a new release. Every apply starts again from the built-in guides.
import { DESTS, PLACE_INFO, POP_DEST, SECURITY_AREAS, SUGGEST_POOL, type DestInput, type Hotel, type Place, type SecurityArea } from './engine/data';
import type { PlaceInfo } from './engine/imported';
import { FOOD, type Food } from './engine/food';
import { rebuildDests } from './engine/places';
import { closureLabel, resetTripCache, setClosedRoads } from './engine/engine';
import { PHOTO_EDITS } from './photos';
import { UR } from './i18n/ur';

/** A place as the admin edits it. `lat`/`lon` pin it on the map; `visit` is minutes there. */
export interface PlaceEdit { name: string; where: string; note: string; months: number[] | null; lat?: number; lon?: number; visit?: number; access?: string }
export interface DestEdit {
  /** Switched off: not offered anywhere (saved trips still open). */
  off?: boolean;
  best?: number[] | null;
  warn?: { months: number[]; text: string } | null;
  guideNote?: string;
  eat?: string;
  hotels?: Hotel[];
  photo?: string;
}
export interface ContentEdits {
  places: Record<string, { add: PlaceEdit[]; edit: Record<string, PlaceEdit>; hide: string[] }>;
  food: Record<string, Food[]>;
  dests: Record<string, DestEdit>;
  /** Replaces the built-in security areas when set. */
  security: SecurityArea[] | null;
  /** Closed roads: the whole road, or just `from`–`to` (two towns on it); ends by itself after `until` (YYYY-MM-DD). */
  closures: { road: string; note: string; from?: string; to?: string; until?: string }[];
  /** Roman Urdu for the admin's own text, by its English. */
  ur: Record<string, string>;
  saved?: string;
}
export const NO_CONTENT: ContentEdits = { places: {}, food: {}, dests: {}, security: null, closures: [], ur: {} };

// The built-in guides, kept to start from on every apply.
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const BASE = { dests: clone(DESTS), info: clone(PLACE_INFO), food: clone(FOOD), security: clone(SECURITY_AREAS), pop: [...POP_DEST], pool: [...SUGGEST_POOL] };
const addedUr: string[] = [];

/** The built-in guide for a destination, before the admin's edits (for the admin page). */
export const baseDest = (id: string) => BASE.dests.find(d => d.id === id);
export const baseInfo = (id: string, name: string): PlaceInfo | undefined => BASE.info[`${id}|${name}`];
export const baseFood = (id: string): Food[] => BASE.food[id] || [];
export const baseSecurity = (): SecurityArea[] => clone(BASE.security);
export const allDests = () => BASE.dests;

let current: ContentEdits = NO_CONTENT;
export const content = () => current;
/** Notes for roads closed now, by road name. */
export const CLOSED_NOTES: Record<string, string> = {};

const pin = (lat?: number, lon?: number) => lat != null && lon != null && isFinite(lat) && isFinite(lon) ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : undefined;
const num = (v: unknown) => typeof v === 'number' && isFinite(v) ? v : undefined;
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const months = (v: unknown) => Array.isArray(v) ? [...new Set(v.filter(m => Number.isInteger(m) && m >= 1 && m <= 12))].sort((a, b) => a - b) : null;

/** Checks and cleans saved edits (they come from the database, so nothing is trusted). */
export function cleanContent(raw: unknown): ContentEdits {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<ContentEdits>;
  const place = (p: Partial<PlaceEdit>): PlaceEdit | null => {
    const name = str(p?.name, 80); if (!name) return null;
    const ms = months(p.months);
    return { name, where: str(p.where, 60), note: str(p.note, 300), months: ms && ms.length && ms.length < 12 ? ms : null, lat: num(p.lat), lon: num(p.lon), visit: num(p.visit), access: p.access ? str(p.access, 12) : undefined };
  };
  const places: ContentEdits['places'] = {};
  Object.entries(r.places || {}).slice(0, 200).forEach(([id, v]) => {
    const add = (Array.isArray(v?.add) ? v.add : []).slice(0, 60).map(place).filter((x): x is PlaceEdit => !!x);
    const edit = Object.fromEntries(Object.entries(v?.edit || {}).slice(0, 200).map(([k, e]) => [str(k, 80), place(e)]).filter(([, e]) => e)) as Record<string, PlaceEdit>;
    const hide = (Array.isArray(v?.hide) ? v.hide : []).map(x => str(x, 80)).filter(Boolean).slice(0, 200);
    if (add.length || Object.keys(edit).length || hide.length) places[str(id, 40)] = { add, edit, hide };
  });
  const food = Object.fromEntries(Object.entries(r.food || {}).slice(0, 200).map(([id, list]) => [str(id, 40),
    (Array.isArray(list) ? list : []).slice(0, 20).map(f => [str(f?.[0], 80), str(f?.[1], 80), str(f?.[2], 160)] as Food).filter(f => f[0])]));
  const dests = Object.fromEntries(Object.entries(r.dests || {}).slice(0, 200).map(([id, d]) => {
    const o: DestEdit = {};
    if (d?.off) o.off = true;
    if (d && 'best' in d) { const b = months(d.best); o.best = b && b.length ? b : null; }
    if (d && 'warn' in d) o.warn = d.warn && str(d.warn.text, 200) ? { months: months(d.warn.months) || [], text: str(d.warn.text, 200) } : null;
    if (d?.guideNote != null) o.guideNote = str(d.guideNote, 400);
    if (d?.eat != null) o.eat = str(d.eat, 160);
    if (Array.isArray(d?.hotels)) o.hotels = d.hotels.slice(0, 12).map(h => [str(h?.[0], 80), ['Budget', 'Standard', 'Premium'].includes(h?.[1]) ? h[1] : 'Standard', str(h?.[2], 160)] as Hotel).filter(h => h[0]);
    if (d?.photo && /^(https:\/\/|\/photos\/)/.test(d.photo)) o.photo = str(d.photo, 400);
    return [str(id, 40), o];
  }));
  const security = Array.isArray(r.security) ? r.security.slice(0, 20).map((a, i) => ({
    id: str(a?.id, 40) || `area${i}`, name: str(a?.name, 60) || 'Area', on: a?.on !== false,
    dests: (Array.isArray(a?.dests) ? a.dests : []).map(x => str(x, 40)).filter(Boolean), roads: (Array.isArray(a?.roads) ? a.roads : []).map(x => str(x, 60)).filter(Boolean),
    nodes: (Array.isArray(a?.nodes) ? a.nodes : []).map(x => str(x, 6)).filter(Boolean), short: str(a?.short, 80) || 'Security risk area: check before you go', text: str(a?.text, 500)
  })) : null;
  const closures = (Array.isArray(r.closures) ? r.closures : []).slice(0, 40).map(c => ({ road: str(c?.road, 60), note: str(c?.note, 200),
    ...(c?.from && c?.to ? { from: str(c.from, 6), to: str(c.to, 6) } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(str(c?.until, 10)) ? { until: str(c.until, 10) } : {}) })).filter(c => c.road);
  const ur = Object.fromEntries(Object.entries(r.ur || {}).slice(0, 2000).map(([k, v]) => [str(k, 500), str(v, 600)]).filter(([k, v]) => k && v));
  return { places, food, dests, security, closures, ur, saved: r.saved ? str(r.saved, 30) : undefined };
}

/** One destination with the admin's place changes: hidden places out, edits in, new places added; day plans follow renames. */
function withPlaces(d: DestInput, e: ContentEdits['places'][string] | undefined) {
  if (!e) return;
  const hide = new Set(e.hide), ren = new Map<string, string>();
  const asPlace = (p: PlaceEdit, old?: Place): Place => [p.name, p.where, p.note, p.months, pin(p.lat, p.lon) || old?.[4]];
  const info = (p: PlaceEdit, from?: string) => {
    const k = `${d.id}|${p.name}`, base = from ? PLACE_INFO[`${d.id}|${from}`] : undefined;
    const i: PlaceInfo = { ...(base || {}), ...(p.lat != null && p.lon != null ? { lat: p.lat, lon: p.lon } : {}), ...(p.visit ? { visit: p.visit } : {}), ...(p.access ? { access: p.access } : {}), checked: true };
    if (p.months) i.months = p.months;
    PLACE_INFO[k] = i;
  };
  d.places = (d.places || []).filter(p => !hide.has(p[0])).map(p => {
    const x = e.edit[p[0]]; if (!x) return p;
    if (x.name !== p[0]) ren.set(p[0], x.name);
    info(x, p[0]); return asPlace(x, p);
  });
  e.add.forEach(p => { if (!d.places!.some(q => q[0] === p.name)) { d.places!.push(asPlace(p)); info(p); } });
  if (d.days) d.days = d.days.map(x => ({ ...x, places: x.places.filter(n => !hide.has(n)).map(n => ren.get(n) || n) })).filter(x => x.places.length);
}

/** Lay the admin's edits over the built-in guides (from scratch each time) and refresh everything that depends on them. */
export function applyContent(raw: unknown) {
  const c = cleanContent(raw); current = c;
  // Start again from the built-in guides.
  for (const k in PLACE_INFO) delete PLACE_INFO[k];
  Object.assign(PLACE_INFO, clone(BASE.info));
  for (const k in FOOD) delete FOOD[k];
  Object.assign(FOOD, clone(BASE.food));
  const all = clone(BASE.dests);
  all.forEach(d => {
    withPlaces(d, c.places[d.id]);
    const e = c.dests[d.id]; if (!e) return;
    if (e.best !== undefined) d.best = e.best;
    if (e.warn !== undefined) d.warn = e.warn ? [e.warn.months, e.warn.text] : null;
    if (e.guideNote !== undefined) d.guideNote = e.guideNote || undefined;
    if (e.eat) d.eat = e.eat;
    if (e.hotels) d.hotels = e.hotels.length ? e.hotels : null;
  });
  Object.entries(c.food).forEach(([id, list]) => { if (list.length) FOOD[id] = list; else delete FOOD[id]; });
  // Places switched off leave every list, but stay findable by id for saved trips.
  const off = new Set(Object.entries(c.dests).filter(([, e]) => e.off).map(([id]) => id));
  rebuildDests(all);
  DESTS.splice(0, DESTS.length, ...all.filter(d => !off.has(d.id)));
  POP_DEST.splice(0, POP_DEST.length, ...BASE.pop.filter(k => !off.has(k)));
  SUGGEST_POOL.splice(0, SUGGEST_POOL.length, ...BASE.pool.filter(k => !off.has(k)));
  for (const k in PHOTO_EDITS) delete PHOTO_EDITS[k];
  Object.entries(c.dests).forEach(([id, e]) => { if (e.photo) PHOTO_EDITS[id] = e.photo; });
  SECURITY_AREAS.splice(0, SECURITY_AREAS.length, ...(c.security || clone(BASE.security)));
  for (const k in CLOSED_NOTES) delete CLOSED_NOTES[k];
  // Closures past their "until" date have reopened by themselves.
  const today = new Date().toISOString().slice(0, 10), open = c.closures.filter(x => !x.until || x.until >= today);
  open.forEach(x => { CLOSED_NOTES[closureLabel(x.road, ...(x.from && x.to ? [x.from, x.to].sort() : [])) ] = x.note; });
  setClosedRoads(open.filter(x => !x.from || !x.to).map(x => x.road), open.filter(x => x.from && x.to).map(x => [x.from!, x.to!] as [string, string]));
  // The admin's Roman Urdu, without overwriting the app's own.
  addedUr.splice(0).forEach(k => delete UR[k]);
  Object.entries(c.ur).forEach(([en, ur]) => { if (!(en in UR)) { UR[en] = ur; addedUr.push(en); } });
  resetTripCache();
  return c;
}
