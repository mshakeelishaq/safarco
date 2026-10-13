// Circuits: more than one place on one trip, in the shortest order, home by the shortest way.
import { describe, expect, it } from 'vitest';
import { buildPlan, circuit, costFor, trip, type TripState } from '../src/engine/engine';

const base: TripState = { origin: 'Lahore', mode: 'know', dest: 'hunza', corridor: 'hunza', startDate: '2027-07-10', days: 10, depart: null,
  vehicle: 'suv', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 600000 };

describe('circuits', () => {
  it('orders Naran, Hunza and Skardu as one loop, nearest first', () => {
    const L = circuit({ ...base, extra: ['skardu', 'naran'] })!;
    expect(L.order).toEqual(['naran', 'hunza', 'skardu']);
    expect(L.hops.map(h => h.to)).toEqual(['naran', 'hunza', 'skardu', 'HOME']);
    // The loop is shorter than three separate there-and-back trips.
    const separate = ['naran', 'hunza', 'skardu'].reduce((a, k) => a + 2 * trip(k, 'Lahore', 7).km, 0);
    expect(L.km).toBeLessThan(separate);
  });
  it('plans every place with nights there, and ends at home', () => {
    const p = buildPlan({ ...base, extra: ['skardu', 'naran'] });
    expect(p.loop).toBe(true);
    expect(p.days).toHaveLength(10);
    const towns = new Set(p.days.flatMap(d => d.stay ? [d.stay.town] : []));
    ['Naran', 'Karimabad, Hunza', 'Skardu'].forEach(t => expect(towns.has(t)).toBe(true));
    expect(p.days[p.days.length - 1].kind).toBe('return');
    expect(p.days[p.days.length - 1].stay).toBeNull();
  });
  it('costs the loop once, not there and back', () => {
    const one = costFor(base), loop = costFor({ ...base, extra: ['skardu', 'naran'] });
    const fuel = (c: typeof one) => c.rows.find(r => r.label === 'Fuel')!.val;
    expect(fuel(loop)).toBeGreaterThan(fuel(one));
    expect(fuel(loop)).toBeLessThan(fuel(one) * 2);
    expect(costFor({ ...base, extra: ['skardu', 'naran'], days: 5 }).ok).toBe(false);
  });
  it('keeps one-place trips and flights as they were', () => {
    expect(circuit(base)).toBeNull();
    expect(circuit({ ...base, vehicle: 'air', extra: ['naran'] })).toBeNull();
    expect(costFor({ ...base, vehicle: 'air', extra: ['naran'] }).ok).toBe(false);
  });
});
