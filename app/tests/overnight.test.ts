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
    expect(d?.stops.find(x => x.kind === 'pin')?.label).toMatch(/Khaplu/);
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

describe('a night on the road, by choice', () => {
  const g: TripState = { ...base, vehicle: 'suv', origin: 'Karachi', dest: 'gwadar', corridor: 'gwadar', days: 5, startDate: '2026-11-10', overnight: null };
  it('offers Ormara on the long drive to Gwadar, never adding it by itself', () => {
    const days = buildPlan(g).days;
    expect(days[0].title).toBe('Karachi → Gwadar');
    expect(days[0].roadNight?.options.map(o => o.town)).toContain('Ormara');
  });
  it('breaks the drive there when chosen, going only, and offers to drive through again', () => {
    const days = buildPlan({ ...g, days: 6, breaks: ['out:ORM'] }).days;
    expect(days.slice(0, 2).map(d => d.title)).toEqual(['Karachi → Ormara', 'Ormara → Gwadar']);
    expect(days[0].roadNight?.chosen).toBe('ORM');
    expect(days[days.length - 1].title).toBe('Gwadar → Karachi');
    expect(days.filter(d => d.kind === 'explore')).toHaveLength(3);
  });
});
