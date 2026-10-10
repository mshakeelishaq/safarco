// Cities and destinations: the built-in list plus places added from OpenStreetMap search.
import { BASE_CITIES, CITY_AIR, DESTS, MONTH_FULL, NODES, NODE_INFO, PROV_FT, type DestInput, type Hotel, type Jeep, type Place, type Terrain } from './data';
import { fmtN, hav, inM, mapsQ } from './format';

export interface City { n: string; p: string; lat: number; lon: number; osm?: boolean }
export const CITIES: City[] = BASE_CITIES.map(([n, p, lat, lon]) => ({ n, p, lat, lon }));
export const CITY: Record<string, City> = Object.fromEntries(CITIES.map(c => [c.n, c]));

export function addPlace(name: string, prov: string, lat: number | string, lon: number | string): City {
  if (CITY[name]) return CITY[name];
  const c = { n: name, p: prov, lat: +lat, lon: +lon, osm: true }; CITIES.push(c); CITY[name] = c; return c;
}
export const cityOr = (name: string | null | undefined) => (name && CITY[name]) || CITY.Islamabad;

export const nearestCity = (lat: number, lon: number) => {
  let best = CITIES[0], bd = 1e9;
  CITIES.forEach(c => { const d = hav(lat, lon, c.lat, c.lon); if (d < bd) { bd = d; best = c; } });
  return { city: best, d: bd };
};

export interface Dest extends DestInput {
  town: string; ft: number | null; label: string; peakLabel: string; icon: string; terrain: Terrain;
  jeeps: Jeep[]; hotels: Hotel[] | null; best: number[] | null; warn: [number[], string] | null; places: Place[]; eat: string;
}

function autoTerrain(d: DestInput): Terrain {
  const ft = d.ft ?? d.ftEst ?? 800, seed = (d.name.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % 97) / 7;
  return { seed, amp: Math.max(2.2, Math.min(12, ft / 800)), rise: Math.max(.3, Math.min(4.2, ft / 2600)), wig: Math.sin(seed * 3) * 1.3 };
}
function finishDest(d: DestInput): Dest {
  const town = d.town || d.name, ft = d.ft ?? null;
  const out = { icon: 'ph-mountains', jeeps: [], hotels: null, best: null, warn: null, ...d, town, ft, label: d.name, peakLabel: `${town}${ft != null ? ` · ${fmtN(ft)} ft` : ''}` } as Dest;
  if (!out.terrain) out.terrain = autoTerrain(out);
  if (!out.places) out.places = [[`Top sights in ${d.name}`, 'Google Maps', 'No guide for this place yet', null, mapsQ('things to do in ' + d.name)], [`Where to eat in ${d.name}`, 'Google Maps', 'Local restaurants and street food', null, mapsQ('best food in ' + d.name)]];
  if (!out.eat) out.eat = `Ask locals for the best food in ${d.name}`;
  return out;
}

const CORR: Record<string, Dest> = {};
DESTS.forEach(d => { CORR[d.id] = finishDest(d); });

/** A destination by id: one of the detailed guides, or "city:<name>" for any city. */
export function DST(id: string): Dest {
  if (CORR[id]) return CORR[id];
  const n = String(id).replace(/^city:/, ''), c = CITY[n] || CITY.Islamabad, near = Object.keys(NODES).find(k => hav(c.lat, c.lon, NODES[k][0], NODES[k][1]) < 8);
  return (CORR[id] = finishDest({ id, name: c.n, region: c.p, lat: c.lat, lon: c.lon, ft: near ? NODE_INFO[near][1] : null, ftEst: PROV_FT[c.p], node: near || null, air: CITY_AIR[c.n] || null, generic: true, icon: 'ph-buildings' }));
}

export const CITY_DUP = new Set(DESTS.flatMap(d => [d.name, (d.town || d.name).split(',')[0]]));
export const placesFor = (D: Dest, m: number) => (D.places || []).filter(p => inM(m, p[3]));

/** Hotel price multiplier for the month: mountain peak season +30%, winter −20%; hot south −15% in summer. */
export const seasonFactor = (D: { ft: number | null; ftEst?: number; lat: number }, m: number) => {
  const ft = D.ft ?? D.ftEst ?? 0;
  if (ft >= 4000) return [6, 7, 8].includes(m) ? 1.3 : [12, 1, 2].includes(m) ? 0.8 : 1;
  if (D.lat < 30 && ft < 1500) return [5, 6, 7, 8].includes(m) ? 0.85 : 1;
  return 1;
};

export const rangeTxt = (b: number[]) => {
  const runs: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const p = m === 1 ? 12 : m - 1;
    if (b.includes(m) && !b.includes(p)) { let e = m; while (b.includes(e % 12 + 1)) e = e % 12 + 1; runs.push(e === m ? MONTH_FULL[m - 1] : `${MONTH_FULL[m - 1]} to ${MONTH_FULL[e - 1]}`); }
  }
  return runs.length ? 'best ' + runs.join(' and ') : 'good all year';
};
