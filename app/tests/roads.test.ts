import { describe, expect, it } from 'vitest';
import { buildPlan, costFor, roadsOnlyIn, routeOptions, trip, type TripState } from '../src/engine/engine';

const s = (origin: string, dest: string, roadPick: TripState['roadPick'] = null): TripState => ({ origin, mode: 'know', dest, corridor: dest, startDate: '2027-07-10', days: 6, depart: null, vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 300000, roadPick });
const roads = (o: string, d: string) => trip(d, o, 7).legs.map(l => l.road);

describe('which road', () => {
  it('takes the quicker road from each city: M-2 from Lahore, GT Road from Sialkot and Gujranwala', () => {
    expect(roads('Lahore', 'islamabad')).toEqual(['M-2']);
    expect(roads('Sialkot', 'islamabad')).toContain('GT Road (N-5)');
    expect(roads('Gujranwala', 'islamabad')).toEqual(Array(4).fill('GT Road (N-5)'));
    expect(trip('islamabad', 'Gujranwala', 7).km).toBeLessThan(250);
  });
  it('offers the GT Road beside the M-2, and the KKH beside Babusar, but not silly detours', () => {
    const { best, options } = routeOptions('naran', 'Lahore', 7);
    expect(options).toHaveLength(1);
    expect(roadsOnlyIn(options[0].trip, best)).toEqual({ roads: ['GT Road (N-5)'], via: 'Gujranwala' });
    expect(options[0].trip.km).toBeLessThan(best.km);
    expect(routeOptions('hunza', 'Islamabad', 7).options.map(o => roadsOnlyIn(o.trip, trip('hunza', 'Islamabad', 7)).via)).toContain('Besham');
    // Sialkot round by Lahore and the M-2 is far longer and slower: not offered.
    expect(routeOptions('islamabad', 'Sialkot', 7).options).toEqual([]);
  });
  it('a picked road changes the plan and the budget for that trip only', () => {
    const pick = { at: 'naran|Lahore', avoid: ['M-2'] };
    const day1 = (st: TripState) => JSON.stringify(buildPlan(st).days[0]);
    expect(day1(s('Lahore', 'naran', pick))).toContain('GT Road (N-5)');
    expect(day1(s('Lahore', 'naran'))).not.toContain('GT Road (N-5)');
    const tolls = (st: TripState) => costFor(st).rows.find(r => r.label === 'Tolls')!.val;
    expect(tolls(s('Lahore', 'naran', pick))).toBeLessThan(tolls(s('Lahore', 'naran')));
    // A pick for another trip is ignored, and nothing leaks into plain trip() calls afterwards.
    expect(day1(s('Lahore', 'hunza', pick))).not.toContain('GT Road (N-5)');
    expect(roads('Lahore', 'naran')).toContain('M-2');
  });
});
