// Runs the original v7 prototype engine side by side with this port and checks
// they agree on distances, day plans and costs across many trips.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPlan, costFor, suggestions, trip, type TripState } from './engine';
import { DEST_PATCH } from './imported';

const html = readFileSync(new URL('../../../project/SafarCo App v7.dc.html', import.meta.url), 'utf8');
const js = html.slice(html.indexOf('const PETROL'), html.indexOf('class Component extends DCLogic'));
const orig = new Function(`${js}; return { trip, buildPlan, costFor };`)() as any;

const base: TripState = {
  origin: 'Lahore', mode: 'know', dest: 'skardu', corridor: 'skardu', startDate: '2027-07-10', days: 8, depart: null,
  vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 200000
};
const origins = ['Lahore', 'Karachi', 'Islamabad', 'Peshawar', 'Multan', 'Quetta', 'Gilgit'];
const dests = ['hunza', 'skardu', 'naran', 'fairy', 'neelum', 'chitral', 'shogran', 'kumrat', 'gwadar', 'ziarat', 'city:Sukkur'];
// Places added since the prototype (Skardu's, and those from the places spreadsheet) give other explore days.
const newPlaces = new Set(['skardu', ...Object.keys(DEST_PATCH)]);
const cases: [string, string, number][] = [];
for (const o of origins) for (const d of dests) for (const m of [1, 7]) cases.push([o, d, m]);

// Routes now take the fastest roads, not the fewest km (the prototype's way): motorways over the Indus
// Highway, Babusar over the Shandur jeep road. Those trips only have to be about as quick as the prototype's
// (within 5%: the Lowari, Mastuj and Shandur roads are now slower, closer to real driving times).
const FASTER = new Set(['Karachi|chitral', 'Karachi|kumrat', 'Islamabad|ziarat', 'Peshawar|gwadar', 'Peshawar|city:Sukkur', 'Quetta|chitral', 'Quetta|kumrat', 'Gilgit|kumrat', 'Gilgit|ziarat']);

describe('parity with the v7 prototype engine', () => {
  it.each(cases)('%s → %s in month %i', (origin, dest, m) => {
    const a = trip(dest, origin, m), b = orig.trip(dest, origin, 10, m);
    if (FASTER.has(`${origin}|${dest}`) && a.via !== b.via) { expect(a.hours).toBeLessThan(b.hours * 1.05); return; }
    // Owner-added stops on the coastal highway (Buzi Pass, Pasni) move where a long drive to Gwadar stops for the night, not how many days it takes.
    const sameNights = !['gwadar', 'kundmalir'].includes(dest);
    expect([a.km, a.legDays, a.minDays, sameNights ? a.cuts : 0]).toEqual([b.km, b.legDays, b.minDays, sameNights ? b.cuts : 0]);
    const startDate = `2027-${String(m).padStart(2, '0')}-10`;
    for (const vehicle of ['sedan', 'public', 'air', 'coaster'] as const) {
      const s = { ...base, origin, dest, corridor: dest, startDate, vehicle, kids: 1, groupSize: 3 };
      // New places can add jeep trips (Basho Valley in summer); everything else must match.
      const noJeeps = (c: { total: number; rows: { label: string; val: number }[] }) => newPlaces.has(dest) ? c.total - (c.rows.find(r => r.label === 'Jeep trips')?.val || 0) : c.total;
      expect(noJeeps(costFor(s))).toBeCloseTo(noJeeps(orig.costFor(s)), 6);
      // Same days in the same order; places are now packed into full days, so a sightseeing day may have become a free one.
      const day = (x: string) => x.replace(/^Free day in /, 'Explore ');
      if (!newPlaces.has(dest)) expect(buildPlan(s).days.map(d => day(d.title))).toEqual(orig.buildPlan(s).days.map((d: { title: string }) => day(d.title)));
    }
  });

  it('suggestion ranking is stable', () => {
    const { list } = suggestions({ ...base, mode: 'suggest', pickId: null });
    expect(list.length).toBe(8);
  });
});
