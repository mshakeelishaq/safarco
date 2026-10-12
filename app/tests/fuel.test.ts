// Fuel on the road: SafarCo's notes for long empty stretches, and live pumps placed along each day.
import { describe, expect, it } from 'vitest';
import { EDGES } from '../src/engine/data';
import { FUEL_GAPS, fuelByDay, fuelNotes, project } from '../src/engine/fuel';
import { LIVE, placesKey, type Spot } from '../src/engine/live';
import type { Plan } from '../src/engine/engine';
import type { RoutePoint } from '../src/weather/route';
import { UR } from '../src/i18n/ur';

const leg = (a: string, b: string, km: number) => ({ a, b, km, h: km / 40, road: 'Test road' });
const pump = (lat: number, lon: number, name = 'PSO'): Spot => ({ name, lat, lon, km: 0, type: 'Fuel', address: '' });
const pt = (day: number, lat: number, lon: number, outbound = true) => ({ day, lat, lon, outbound, km: 0, iso: '', offsetH: 0, label: '', mtn: false }) as RoutePoint;

describe('fuel notes', () => {
  it('names where to fill up, in the direction of travel', () => {
    expect(fuelNotes([leg('NRN', 'CHL', 115)])[0]).toMatch(/^Fill up in Naran\. No proper pump over Babusar/);
    expect(fuelNotes([leg('CHL', 'NRN', 115)])[0]).toMatch(/^Fill up in Chilas\./);
    expect(fuelNotes([leg('LHR', 'ISB', 375)])).toEqual([]);
  });
  it('only covers real roads, all translated', () => {
    const roads = new Set(EDGES.flatMap(e => [`${e[0]}-${e[1]}`, `${e[1]}-${e[0]}`]));
    expect(Object.keys(FUEL_GAPS).filter(k => !roads.has(k))).toEqual([]);
    expect(Object.values(FUEL_GAPS).map(g => g[2]).filter(n => !(n in UR))).toEqual([]);
  });
});

describe('pumps along the road', () => {
  it('places a point along a line and measures how far off it is', () => {
    const p = project([[70, 30], [70, 31]], 30.5, 70.01);
    expect(p.along).toBeGreaterThan(54); expect(p.along).toBeLessThan(57);
    expect(p.off).toBeGreaterThan(0.9); expect(p.off).toBeLessThan(1.0);
  });

  it('keeps pumps on the road, groups close ones and warns about long gaps', () => {
    const road: [number, number][] = [[70, 30], [70, 31]];
    const track = { legs: [leg('XA', 'XB', 110)], coords: [], marks: [], dep: 6, sunset: 18, sunrise: 6 };
    const plan = { days: [{ kind: 'drive', title: 'Alpha → Beta', meta: '', note: '', stops: [], stay: null, track }, { kind: 'return', title: 'Beta → Alpha', meta: '', note: '', stops: [], stay: null, track }] } as unknown as Plan;
    const pts = [pt(0, 30, 70), pt(0, 31, 70), pt(1, 31, 70, false), pt(1, 30, 70, false)];
    LIVE.places[placesKey('fuel', 30, 70)] = { status: 'ok', data: [pump(30.05, 70), pump(30.06, 70.001, 'Shell'), pump(30.5, 70.2, 'Far away')] };
    LIVE.places[placesKey('fuel', 31, 70)] = { status: 'ok', data: [pump(30.05, 70)] };
    const f = fuelByDay(plan, pts, road);
    const out = f.get(0)!, back = f.get(1)!;
    expect(out.stops).toHaveLength(1);
    expect(out.stops[0].count).toBe(2);
    expect(out.stops[0].at).toBeGreaterThanOrEqual(5); expect(out.stops[0].at).toBeLessThanOrEqual(7);
    expect(out.gaps.join()).toMatch(/No pump on the map for about 105 km after/);
    // The way back counts from the other end.
    expect(back.stops[0].at).toBeGreaterThan(100);
    expect(back.gaps.join()).toMatch(/for the first 105 km/);
  });

  it('shows only the notes until the road has loaded', () => {
    const track = { legs: [leg('NRN', 'CHL', 115)], coords: [], marks: [], dep: 6, sunset: 18, sunrise: 6 };
    const plan = { days: [{ kind: 'drive', title: 'Naran → Chilas', meta: '', note: '', stops: [], stay: null, track }] } as unknown as Plan;
    const f = fuelByDay(plan, [pt(0, 34.9, 73.65), pt(0, 35.4, 74.1)], null).get(0)!;
    expect(f.stops).toEqual([]); expect(f.gaps).toEqual([]); expect(f.loading).toBe(false);
    expect(f.notes[0]).toMatch(/Babusar/);
  });
});
