// Places the admin can tie hotels, drivers and road alerts to, and the checks that
// decide which of them a trip passes. Distances are straight-line km.
import { DESTS, NODES, NODE_INFO } from './engine/data';
import { hav } from './engine/format';
import { PASSES } from './weather/route';

export interface Area { id: string; name: string; group: 'Destinations' | 'Towns' | 'Passes'; lat: number; lon: number }

const base = (n: string) => n.split(',')[0].trim().toLowerCase();

export const AREAS: Area[] = (() => {
  const out: Area[] = [], seen = new Set<string>();
  const add = (a: Area) => { if (!seen.has(base(a.name))) { seen.add(base(a.name)); out.push(a); } };
  DESTS.forEach(d => add({ id: 'd:' + d.id, name: d.name, group: 'Destinations', lat: d.lat, lon: d.lon }));
  Object.entries(NODES).forEach(([k, [lat, lon]]) => NODE_INFO[k] && add({ id: 'n:' + k, name: NODE_INFO[k][0], group: 'Towns', lat, lon }));
  PASSES.forEach(([name, lat, lon]) => add({ id: 'p:' + name, name, group: 'Passes', lat, lon }));
  return out.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
})();
const BY_ID = new Map(AREAS.map(a => [a.id, a]));
export const areaOf = (id: string) => BY_ID.get(id);

/** Distance in km from a point to a line of [lon, lat] points. */
export function kmFromLine(lat: number, lon: number, line: [number, number][]) {
  if (!line.length) return Infinity;
  if (line.length === 1) return hav(lat, lon, line[0][1], line[0][0]);
  const kx = 111.32 * Math.cos(lat * Math.PI / 180), ky = 110.57;
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const ax = (line[i - 1][0] - lon) * kx, ay = (line[i - 1][1] - lat) * ky, bx = (line[i][0] - lon) * kx, by = (line[i][1] - lat) * ky;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

/** True when any of the areas lies on the route (within 20 km) or near one of the stops (25 km). */
export function onTrip(ids: string[], route: [number, number][], stops: { lat: number; lon: number }[]) {
  return ids.some(id => {
    const a = areaOf(id); if (!a) return false;
    return kmFromLine(a.lat, a.lon, route) <= 20 || stops.some(p => hav(a.lat, a.lon, p.lat, p.lon) <= 25);
  });
}
export const nearPoint = (id: string, lat: number, lon: number, km = 15) => { const a = areaOf(id); return !!a && hav(a.lat, a.lon, lat, lon) <= km; };

/** wa.me link for a Pakistani number written as 0300…, +92 300… or 92300…. */
export function waLink(phone: string) {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '92' + d.slice(1);
  return d.length >= 10 ? `https://wa.me/${d}` : '';
}
export const telLink = (phone: string) => { const d = phone.replace(/[^\d+]/g, ''); return d.length >= 7 ? `tel:${d}` : ''; };
