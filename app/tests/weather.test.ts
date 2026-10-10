import { describe, expect, it } from 'vitest';
import { buildPlan, type TripState } from '../src/engine/engine';
import { clock, isoAdd } from '../src/engine/format';
import { LIVE } from '../src/engine/live';
import { sunTimes } from '../src/engine/sun';
import { bestDeparture, flagsFor, pointWx, routePoints, weatherPlan } from '../src/weather/route';
import { weatherView } from '../src/weather/view';

const base: TripState = {
  origin: 'Lahore', mode: 'know', dest: 'skardu', corridor: 'skardu', startDate: isoAdd(3), days: 8, depart: null,
  vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 1, groupSize: 3, rooms: 'separate', cap: 300000
};

/** A fake Open-Meteo answer for `n` locations: calm weather, except `hook` can change any hour. */
function fakeForecast(n: number, start: string, end: string, hook?: (loc: number, iso: string, h: number, r: Record<string, number>) => void) {
  const days: string[] = []; for (let d = new Date(start + 'T00:00'); d <= new Date(end + 'T00:00'); d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10));
  return Array.from({ length: n }, (_, loc) => {
    const time: string[] = [], cols: Record<string, number[]> = { temperature_2m: [], precipitation: [], precipitation_probability: [], snowfall: [], weather_code: [], wind_gusts_10m: [], visibility: [], freezing_level_height: [] };
    days.forEach(iso => { for (let h = 0; h < 24; h++) {
      const r: Record<string, number> = { temperature_2m: 20, precipitation: 0, precipitation_probability: 0, snowfall: 0, weather_code: 0, wind_gusts_10m: 10, visibility: 20000, freezing_level_height: 4500 };
      hook?.(loc, iso, h, r);
      time.push(`${iso}T${String(h).padStart(2, '0')}:00`); Object.keys(cols).forEach(k => cols[k].push(r[k]));
    } });
    return { hourly: { time, ...cols }, daily: { time: days, temperature_2m_max: days.map(() => 25), temperature_2m_min: days.map(() => 10), precipitation_sum: days.map(() => 0), precipitation_probability_max: days.map(() => 0), snowfall_sum: days.map(() => 0), weather_code: days.map(() => 0), wind_gusts_10m_max: days.map(() => 10), uv_index_max: days.map(() => 5) } };
  });
}

describe('sunrise and sunset', () => {
  it('match published times for Lahore', () => {
    expect(clock(sunTimes(31.55, 74.34, '2026-06-21').set)).toBe('7:11 pm');
    expect(clock(sunTimes(31.55, 74.34, '2026-12-21').rise)).toBe('6:58 am');
  });
});

describe('weather along the route', () => {
  const plan = buildPlan(base), points = routePoints(base, plan, null);

  it('samples every driving day, in order, including Babusar Top at its height', () => {
    const drives = plan.days.filter(d => d.track).length;
    expect(new Set(points.map(p => p.day)).size).toBe(drives);
    const babusar = points.filter(p => p.pass === 'Babusar Top');
    expect(babusar.length).toBe(2); // there and back
    expect(babusar[0].ft).toBe(13690);
    for (const d of new Set(points.map(p => p.day))) {
      const hs = points.filter(p => p.day === d).map(p => p.offsetH);
      expect(hs).toEqual([...hs].sort((a, b) => a - b));
    }
  });

  it('reads the forecast at the hour you pass, and flags snow on the pass', () => {
    const w = weatherPlan(base, plan, points);
    expect(w.urls.fcRoad).toContain('hourly=');
    expect(w.urls.fcPass).toContain('elevation=4173');
    LIVE.rw[w.urls.fcRoad!] = { status: 'ok', data: fakeForecast(w.road.length, w.fcStart!, w.fcEnd!) };
    LIVE.rw[w.urls.fcPass!] = { status: 'ok', data: fakeForecast(w.passes.length, w.fcStart!, w.fcEnd!, (_l, _iso, h, r) => { if (h >= 12) { r.temperature_2m = -1; r.snowfall = 1.2; r.precipitation = 1.5; r.weather_code = 73; } }) };
    const pass = points.find(p => p.pass)!, hour = plan.dep + pass.offsetH;
    const x = pointWx(w, pass, hour, false)!;
    expect(x.typical).toBe(false);
    if (hour >= 12) expect(x.flags.map(f => f.kind)).toEqual(expect.arrayContaining(['snow', 'ice']));
    // Leaving late enough to reach the pass after noon gets an earlier suggestion.
    const late = buildPlan({ ...base, depart: 9 }), lp = routePoints({ ...base, depart: 9 }, late, null);
    const lw = weatherPlan({ ...base, depart: 9 }, late, lp);
    LIVE.rw[lw.urls.fcRoad!] = LIVE.rw[w.urls.fcRoad!]; LIVE.rw[lw.urls.fcPass!] = LIVE.rw[w.urls.fcPass!];
    const lpass = lp.find(p => p.pass)!;
    expect(9 + lpass.offsetH).toBeGreaterThanOrEqual(12);
    expect(pointWx(lw, lpass, 9 + lpass.offsetH, false)!.flags.map(f => f.kind)).toContain('snow');
    const b = bestDeparture(lw, late, lp, false);
    expect(b).not.toBeNull();
    expect(b!.dep).toBeLessThan(9);
    expect(b!.text).toMatch(/Babusar Top/);
    const view = weatherView(base, plan, points, w);
    expect(view.pack.map(p => p.key)).toEqual(expect.arrayContaining(['meds', 'id', 'cash']));
    expect(view.mapPts.length).toBeGreaterThan(5);
  });

  it('uses the last 5 years for trips beyond the forecast', () => {
    const far = { ...base, startDate: isoAdd(60) }, fp = buildPlan(far), w = weatherPlan(far, fp, routePoints(far, fp, null));
    expect(w.fcStart).toBeNull();
    expect(w.urls.arch.length).toBe(5);
  });
});

describe('hazard flags', () => {
  it('cover storms, landslides, fog, heat and wind', () => {
    const k = (x: Parameters<typeof flagsFor>[0], mtn = false, bike = false) => flagsFor(x, mtn, bike).map(f => `${f.kind}:${f.level}`);
    const calm = { temp: 20, code: 0, precip: 0, snow: 0, gust: 10, vis: 20000 };
    expect(k(calm)).toEqual([]);
    expect(k({ ...calm, code: 95 })).toEqual(['storm:danger']);
    expect(k({ ...calm, precip: 3 }, true)).toEqual(['rain:danger']);
    expect(k({ ...calm, vis: 150 })).toEqual(['fog:danger']);
    expect(k({ ...calm, temp: 44 })).toEqual(['heat:danger']);
    expect(k({ ...calm, gust: 45 })).toEqual([]);
    expect(k({ ...calm, gust: 45 }, false, true)).toEqual(['wind:caution']);
  });
});
