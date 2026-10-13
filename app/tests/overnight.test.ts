import { describe, expect, it } from 'vitest';
import { buildPlan, type TripState } from '../src/engine/engine';

const base: TripState = {
  origin: 'Islamabad', mode: 'know', dest: 'skardu', corridor: 'skardu', startDate: '2026-11-03', days: 8, depart: null,
  vehicle: 'air', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 200000
};

describe('a night at a nearby place', () => {
  it('offers Khaplu on its day trip from Skardu', () => {
    const d = buildPlan(base).days.find(x => x.offer);
    expect(d?.offer).toBe('khaplu');
    expect(d?.stops[0].label).toMatch(/Khaplu/);
  });

  it('turns the day trip into a drive with a night in Khaplu and a way back', () => {
    const days = buildPlan({ ...base, days: 9, overnight: 'khaplu' }).days, i = days.findIndex(x => x.stay?.town === 'Khaplu');
    expect(i).toBeGreaterThan(0);
    expect(days[i].title).toBe('Skardu → Khaplu');
    expect(days[i].stops.map(x => x.label)).toEqual(expect.arrayContaining(['Keris', 'Ghowari', 'Barah Valley', 'Khaplu Palace', 'Saling']));
    expect(days[i + 1].title).toBe('Khaplu → Skardu');
    expect(days[i + 1].stops[0].label).toBe('Machlu');
    expect(days.some(x => x.offer)).toBe(false);
    // Before free days, and the trip still ends with the flight home.
    expect(days.slice(i + 2, -1).every(x => /Free day|Explore/.test(x.title))).toBe(true);
    expect(days[days.length - 1].kind).toBe('fly');
  });

  it('ignores a night that does not belong to the place', () => {
    const a = buildPlan({ ...base, corridor: 'hunza', dest: 'hunza' }), b = buildPlan({ ...base, corridor: 'hunza', dest: 'hunza', overnight: 'khaplu' });
    expect(b.days.map(x => x.title)).toEqual(a.days.map(x => x.title));
  });
});
