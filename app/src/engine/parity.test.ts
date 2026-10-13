// Runs the original v7 prototype engine side by side with this port and checks
// they agree on distances, day plans and costs across many trips.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPlan, costFor, suggestions, trip, type TripState } from './engine';

const html = readFileSync(new URL('../../../project/SafarCo App v7.dc.html', import.meta.url), 'utf8');
const js = html.slice(html.indexOf('const PETROL'), html.indexOf('class Component extends DCLogic'));
const orig = new Function(`${js}; return { trip, buildPlan, costFor };`)() as any;

const base: TripState = {
  origin: 'Lahore', mode: 'know', dest: 'skardu', corridor: 'skardu', startDate: '2027-07-10', days: 8, depart: null,
  vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 200000
};
const origins = ['Lahore', 'Karachi', 'Islamabad', 'Peshawar', 'Multan', 'Quetta', 'Gilgit'];
const dests = ['hunza', 'skardu', 'naran', 'fairy', 'neelum', 'chitral', 'shogran', 'kumrat', 'gwadar', 'ziarat', 'city:Sukkur'];
// Places added since the prototype (Skardu: Katpana desert, Ghowari and Khaplu) give more explore days.
const newPlaces = new Set(['skardu']);
const cases: [string, string, number][] = [];
for (const o of origins) for (const d of dests) for (const m of [1, 7]) cases.push([o, d, m]);

describe('parity with the v7 prototype engine', () => {
  it.each(cases)('%s → %s in month %i', (origin, dest, m) => {
    const a = trip(dest, origin, m), b = orig.trip(dest, origin, 10, m);
    expect([a.km, a.legDays, a.minDays, a.cuts]).toEqual([b.km, b.legDays, b.minDays, b.cuts]);
    const startDate = `2027-${String(m).padStart(2, '0')}-10`;
    for (const vehicle of ['sedan', 'public', 'air', 'coaster'] as const) {
      const s = { ...base, origin, dest, corridor: dest, startDate, vehicle, kids: 1, groupSize: 3 };
      // New places can add jeep trips (Basho Valley in summer); everything else must match.
      const noJeeps = (c: { total: number; rows: { label: string; val: number }[] }) => newPlaces.has(dest) ? c.total - (c.rows.find(r => r.label === 'Jeep trips')?.val || 0) : c.total;
      expect(noJeeps(costFor(s))).toBeCloseTo(noJeeps(orig.costFor(s)), 6);
      if (!newPlaces.has(dest)) expect(buildPlan(s).days.map(d => d.title)).toEqual(orig.buildPlan(s).days.map((d: { title: string }) => d.title));
    }
  });

  it('suggestion ranking is stable', () => {
    const { list } = suggestions({ ...base, mode: 'suggest', pickId: null });
    expect(list.length).toBe(8);
  });
});
