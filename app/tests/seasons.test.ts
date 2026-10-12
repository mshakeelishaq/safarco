// The season guide: highlights agree with each destination's months, labels read well,
// and trips get an honest season badge with in-season alternatives.
import { describe, expect, it } from 'vitest';
import { DESTS } from '../src/engine/data';
import { HIGHLIGHTS, monthsLabel, nextStartIn, seasonPicks } from '../src/engine/seasons';
import { initialState, type AppState } from '../src/state';
import { buildView, type Api } from '../src/view';

const calls: Record<string, unknown>[] = [];
const api = { set: (p: Record<string, unknown>) => calls.push(p), later: () => {}, locate: () => {}, setPeople: () => {}, toggleOffline: () => {}, share: () => {}, newTrip: () => {} } as unknown as Api;
const view = (p: Partial<AppState>) => buildView({ ...initialState(), screen: 'app', origin: 'Lahore', mode: 'know', days: 7, vehicle: 'sedan', tier: 'standard', ...p }, api);

describe('season data', () => {
  it('only recommends a destination in its good months, or says why with a caution', () => {
    for (const [id, hs] of Object.entries(HIGHLIGHTS)) {
      const d = DESTS.find(x => x.id === id);
      expect(d, id).toBeTruthy();
      for (const h of hs) for (const m of h.months) {
        const fine = (d!.best || []).includes(m) && !(d!.warn && d!.warn[0].includes(m));
        if (!fine) expect(h.caution, `${id} in month ${m}`).toBeTruthy();
      }
    }
  });
  it('labels months, including split and year-crossing ranges', () => {
    expect(monthsLabel([4])).toBe('Apr');
    expect(monthsLabel([12, 1, 2])).toBe('Dec–Feb');
    expect(monthsLabel([12, 1, 2, 5, 6, 7, 8, 9])).toBe('Dec–Feb, May–Sep');
  });
  it('finds the next start date in a season, at least a week ahead', () => {
    expect(nextStartIn([10, 11], new Date('2026-10-12T12:00'))).toBe('2026-10-19');
    expect(nextStartIn([12, 1, 2], new Date('2026-10-12T12:00'))).toBe('2026-12-10');
    expect(nextStartIn([4], new Date('2026-10-12T12:00'))).toBe('2027-04-10');
  });
  it('puts the right places in each season', () => {
    const names = (s: Parameters<typeof seasonPicks>[0]) => seasonPicks(s).map(p => p.name);
    expect(names('autumn')).toEqual(expect.arrayContaining(['Hunza', 'Skardu', 'Phander & Ghizer']));
    expect(names('summer')).toEqual(expect.arrayContaining(['Naran', 'Kalam', 'Kumrat Valley', 'Neelum Valley']));
    expect(names('winter')).toEqual(expect.arrayContaining(['Murree', 'Nathia Gali', 'Malam Jabba', 'Gwadar', 'Kund Malir', 'Karachi']));
    expect(new Set(names('autumn')).size).toBe(names('autumn').length);
    // Snow trips that need care come after the easy ones.
    const w = seasonPicks('winter'); expect(w.findIndex(p => !!p.h.caution)).toBeGreaterThan(w.findIndex(p => !p.h.caution));
  });
});

describe('season badge on a trip', () => {
  it('says when it is a great time', () => {
    expect(view({ dest: 'hunza', corridor: 'hunza', startDate: '2027-10-15' }).tripSeason).toMatchObject({ tone: 'good' });
    expect(view({ dest: 'hunza', corridor: 'hunza', startDate: '2027-10-15' }).tripSeason!.text).toMatch(/Great time to go: golden poplars/);
  });
  it('warns about snow trips but still allows them', () => {
    const t = view({ dest: 'kalam', corridor: 'kalam', startDate: '2027-01-10' }).tripSeason!;
    expect(t.tone).toBe('care');
    expect(t.text).toMatch(/Bahrain/);
  });
  it('offers in-season places when the month is wrong', () => {
    const t = view({ dest: 'hunza', corridor: 'hunza', startDate: '2027-01-10' }).tripSeason!;
    expect(t.tone).toBe('off');
    expect(t.text).toMatch(/January isn’t a good time for Hunza/);
    expect(t.alts.length).toBeGreaterThan(0);
    expect(t.alts.map(a => a.name)).not.toContain('Murree'); // snow trips with cautions aren't offered as easy swaps
    calls.length = 0; t.alts[0].onClick();
    expect(calls[0]).toMatchObject({ corridor: t.alts[0].key });
  });
  it('picking from the guide moves the dates into the best months', () => {
    const v = view({ dest: 'hunza', corridor: 'hunza', startDate: '2027-01-10' });
    const pick = v.guide.seasons.find(s => s.id === 'summer')!.picks.find(p => p.name === 'Naran')!;
    calls.length = 0; pick.onPick();
    const p = calls[0] as { corridor: string; startDate: string; guide: boolean };
    expect(p.corridor).toBe('naran'); expect(p.guide).toBe(false);
    expect([6, 7, 8]).toContain(+p.startDate.slice(5, 7));
  });
});
