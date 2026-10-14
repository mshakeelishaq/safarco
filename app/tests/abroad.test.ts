import { describe, expect, it } from 'vitest';
import { bestAirport, buildPlan, configsFor, costFor } from '../src/engine/engine';
describe('flying in from abroad', () => {
  const base = { origin: 'Islamabad', mode: 'know' as const, startDate: '2027-07-10', depart: null, vehicle: 'rentcar' as const, tier: 'standard' as const, adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate' as const, cap: 300000, abroad: true, airAuto: true };
  it('picks the arrival airport nearest the place', () => {
    expect(bestAirport('hunza')).toBe('Islamabad');
    expect(bestAirport('multan')).toBe('Lahore');
    expect(bestAirport('kundmalir')).toBe('Karachi');
  });
  it('starts with a day to land and rest, and ends with the flight home', () => {
    const p = buildPlan({ ...base, dest: 'hunza', corridor: 'hunza', days: 8 });
    expect(p.days[0].kind).toBe('arrive');
    expect(p.days[0].stay?.town).toBe('Islamabad');
    expect(p.days[1].title.startsWith('Islamabad →')).toBe(true);
    expect(p.days.at(-1)!.stops.at(-1)!.label).toBe('Flight home from Islamabad');
    expect(p.days.map(d => d.num)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('a city break in the arrival city has no drive to itself', () => {
    const p = buildPlan({ ...base, origin: 'Lahore', dest: 'lahore', corridor: 'lahore', days: 3 });
    expect(p.days.map(d => d.kind)).toEqual(['arrive', 'explore', 'explore']);
  });
  it('needs one more day, offers no own car, and leaves the flight to Pakistan out of the total', () => {
    const home = costFor({ ...base, abroad: false, dest: 'multan', corridor: 'multan', origin: 'Lahore', days: 3 });
    const away = costFor({ ...base, dest: 'multan', corridor: 'multan', origin: 'Lahore', days: 3 });
    expect(away.minDays).toBe(home.minDays + 1);
    expect(away.rows.find(r => r.label === 'Flight to Pakistan')?.val).toBe(0);
    expect(configsFor({ have: 'any', groupSize: 2, abroad: true }).some(cf => cf.vehicle === 'sedan' || cf.vehicle === 'suv')).toBe(false);
  });
});

describe('security advisory', () => {
  it('marks the Makran coast and its road', async () => {
    const { SECURITY, ROAD_NOTE } = await import('../src/engine/data');
    const { UR } = await import('../src/i18n/ur');
    expect(SECURITY.dests).toEqual(expect.arrayContaining(['kundmalir', 'gwadar']));
    for (const x of [SECURITY.text, SECURITY.short, ROAD_NOTE['Makran Coastal Hwy']]) expect(UR[x]).toBeTruthy();
    const p = buildPlan({ origin: 'Karachi', mode: 'know', dest: 'gwadar', corridor: 'gwadar', startDate: '2027-01-10', days: 5, depart: null, vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 300000 });
    expect(p.days[0].note).toContain('Security risk area');
  });
});
