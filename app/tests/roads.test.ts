import { describe, expect, it } from 'vitest';
import { buildPlan, costFor, drivingDays, roadsOnlyIn, routeOptions, trip, type TripState } from '../src/engine/engine';

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
    const gt = options.find(o => roadsOnlyIn(o.trip, best).via === 'Gujranwala')!;
    expect(roadsOnlyIn(gt.trip, best).roads).toEqual(['GT Road (N-5)']);
    expect(gt.trip.km).toBeLessThan(best.km);
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

describe('nights on the road', () => {
  const plan = (breaks: string[], days = 8) => buildPlan({ ...s('Lahore', 'hunza'), days, breaks }).days.filter(d => d.track).map(d => d.title);
  it('a night in Mansehra moves the next night on, instead of a short day to Naran', () => {
    expect(plan([], 7).slice(0, 2)).toEqual(['Lahore → Naran', 'Naran → Karimabad, Hunza']);
    expect(plan(['out:MNS']).slice(0, 3)).toEqual(['Lahore → Mansehra', 'Mansehra → Chilas', 'Chilas → Karimabad, Hunza']);
    // The traveller can still choose Naran for the second night.
    expect(plan(['out:MNS', 'out:NRN']).slice(0, 3)).toEqual(['Lahore → Mansehra', 'Mansehra → Naran', 'Naran → Karimabad, Hunza']);
  });
  it('offers the towns a day can end in, and counts the days', () => {
    const d2 = buildPlan({ ...s('Lahore', 'hunza'), days: 8, breaks: ['out:MNS'] }).days[1].roadNight!;
    expect(d2.tonight).toBe('CHL');
    expect(d2.next!.map(x => x.town)).toContain('Naran');
    expect(drivingDays({ ...s('Lahore', 'hunza'), breaks: ['out:MNS'] })).toBe(drivingDays({ ...s('Lahore', 'hunza'), breaks: ['out:MNS', 'out:NRN'] }));
  });
});

describe('a long day instead of a night', () => {
  const st = (breaks: string[]) => ({ ...s('Lahore', 'hunza'), days: 8, breaks });
  it('offers Mansehra straight to Hunza as a long day, and drives it without the Chilas night', () => {
    const d2 = buildPlan(st(['out:MNS'])).days[1].roadNight!;
    const hunza = d2.next!.find(x => !x.node)!;
    expect(hunza.long).toBe(true);
    expect(d2.from).toBe('MNS');
    const titles = buildPlan(st(['out:MNS', 'out:thru:MNS'])).days.filter(d => d.track).map(d => d.title);
    expect(titles.slice(0, 2)).toEqual(['Lahore → Mansehra', 'Mansehra → Karimabad, Hunza']);
    expect(drivingDays(st(['out:MNS', 'out:thru:MNS']))).toBe(drivingDays(st(['out:MNS'])) - 1);
  });
});

describe('motorbikes', () => {
  it('keep off every motorway, and cars still take them', () => {
    const bike = { ...s('Lahore', 'naran'), vehicle: 'bike' as const };
    const roadsOf = (st: TripState) => buildPlan(st).days.flatMap(d => d.track?.legs.map(l => l.road) || []);
    const b = roadsOf(bike);
    expect(b.some(r => /^M-\d|Motorway/.test(r))).toBe(false);
    expect(b).toContain('GT Road (N-5)');
    expect(roadsOf(s('Lahore', 'naran'))).toContain('M-2');
    // No motorway tolls for bikes either.
    expect(costFor(bike).rows.find(r => r.label === 'Tolls')!.val).toBe(0);
  });
});

describe('extra days', () => {
  it('a rest day at the place is a real day off, and the other days keep their sightseeing', () => {
    const st = { ...s('Lahore', 'hunza'), days: 8 };
    const plain = buildPlan(st).days, rested = buildPlan({ ...st, rest: { hunza: 1 } }).days;
    expect(rested).toHaveLength(plain.length);
    const r = rested.find(d => d.title.startsWith('Rest day'))!;
    expect(r.title).toBe('Rest day in Karimabad, Hunza');
    expect(r.track).toBeUndefined();
    expect(rested.filter(d => d.kind === 'explore' && !d.title.startsWith('Rest')).length).toBe(plain.filter(d => d.kind === 'explore').length - 1);
  });
  it('never turns every day at a place into rest', () => {
    const days = buildPlan({ ...s('Islamabad', 'murree'), days: 4, rest: { murree: 5 } }).days;
    expect(days.filter(d => d.title.startsWith('Rest')).length).toBeGreaterThan(0);
    expect(days.some(d => d.kind === 'explore' && !d.title.startsWith('Rest'))).toBe(true);
  });
});

describe('the map road on a circuit', () => {
  it('keeps every town on the way home too, and keeps off Babusar when the plan does', async () => {
    const { loopRoad, setRoutePick } = await import('../src/engine/engine');
    const st = { ...s('Lahore', 'hunza'), startDate: '2026-11-14', days: 10, extra: ['skardu', 'khaplu'] };
    setRoutePick(st);
    const r = loopRoad(st)!;
    const besham = r.via.pts.filter(([la, lo]) => Math.abs(la - 34.92) < 0.01 && Math.abs(lo - 72.87) < 0.01).length;
    expect(besham).toBe(2);
    expect(r.via.avoid).toEqual(['babusar', 'deosai']);
    expect(r.via.pts.length).toBeLessThanOrEqual(48);
    // Gilgit to Skardu by Alam Bridge and the Indus (the Jaglot–Skardu Road), nothing on the Deosai plains.
    expect(r.via.pts.some(([la, lo]) => Math.abs(la - 35.765) < 0.01 && Math.abs(lo - 74.598) < 0.01)).toBe(true);
    expect(r.via.pts.some(([la, lo]) => la > 34.85 && la < 35.22 && lo > 75.05 && lo < 75.75)).toBe(false);
  });
});
