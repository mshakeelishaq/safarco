// Before, during and after the trip: phases, the checklist, today's day, expenses and settling up.
import { beforeEach, describe, expect, it } from 'vitest';
import { daysBetween, getRun, phaseOf, runKey, settleUp, updateRun } from '../src/run';
import { initialState } from '../src/state';
import { buildView, type Api } from '../src/view';
import { isoAdd } from '../src/engine/format';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
beforeEach(() => mem.clear());

describe('trip phases', () => {
  it('knows before, during and after', () => {
    expect(phaseOf('2026-11-02', 7, '2026-11-01')).toBe('before');
    expect(phaseOf('2026-11-02', 7, '2026-11-02')).toBe('during');
    expect(phaseOf('2026-11-02', 7, '2026-11-08')).toBe('during');
    expect(phaseOf('2026-11-02', 7, '2026-11-09')).toBe('after');
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
  });
});

describe('settling up', () => {
  it('evens out who paid what with the fewest payments', () => {
    const p = settleUp({ Ali: 30000, Sara: 0, Omar: 0 });
    expect(p).toEqual([{ from: 'Sara', to: 'Ali', amount: 10000 }, { from: 'Omar', to: 'Ali', amount: 10000 }]);
    expect(settleUp({ Ali: 5000 })).toEqual([]);
    expect(settleUp({ Ali: 100, Sara: 100 })).toEqual([]);
  });
});

const api = { set: () => {}, later: () => {}, toggleOffline: () => {} } as unknown as Api;
const base = { ...initialState(), screen: 'app' as const, origin: 'Lahore', mode: 'know' as const, dest: 'hunza', corridor: 'hunza', vehicle: 'suv' as const, days: 7 };

describe('get ready', () => {
  it('shows a checklist once the plan is locked, grouped by when', () => {
    const s = { ...base, startDate: isoAdd(20) };
    expect(buildView(s, api).trip.getReady!.locked).toBe(false);
    updateRun(runKey(s), () => ({ locked: isoAdd(0) }));
    const g = buildView(s, api).trip.getReady!;
    expect(g.locked).toBe(true);
    expect(g.countdown).toBe('20 days to go');
    expect(g.groups.map(x => x.key)).toEqual(['0', '7', '3', '1']);
    expect(g.groups.flatMap(x => x.tasks.map(k => k.key))).toEqual(expect.arrayContaining(['book', 'car', 'cash', 'offline', 'fuel']));
    g.groups[0].tasks[0].toggle!();
    expect(getRun(runKey(s)).ticks).toContain('book');
  });
});

describe('on the road', () => {
  it('shows today’s day with its stops, and no checklist', () => {
    const s = { ...base, startDate: isoAdd(-1) };
    const v = buildView(s, api);
    expect(v.trip.phase).toBe('during');
    expect(v.trip.getReady).toBeNull();
    expect(v.trip.today!.num).toBe(2);
    expect(v.trip.today!.stops.length).toBeGreaterThan(1);
    v.trip.today!.stops[1].toggle();
    expect(getRun(runKey(s)).stops).toContain(`1|${v.trip.today!.stops[1].label}`);
  });
  it('records a check-in and writes the WhatsApp message', () => {
    const s = { ...base, startDate: isoAdd(0) };
    const r = buildView(s, api).trip.checkIn('Naran');
    expect(r.msg).toMatch(/^Reached Naran safely/);
    expect(r.wa).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(getRun(runKey(s)).checkins[0].place).toBe('Naran');
  });
});

describe('expenses and the trip summary', () => {
  it('compares spending with the plan and sums it up afterwards', () => {
    const s = { ...base, startDate: isoAdd(-10) };
    updateRun(runKey(s), () => ({ people: ['Ali', 'Sara'], expenses: [{ id: 'a', amount: 20000, cat: 'Fuel', note: '', payer: 'Ali', date: '' }, { id: 'b', amount: 6000, cat: 'Meals', note: '', payer: 'Sara', date: '' }] }));
    const v = buildView(s, api);
    expect(v.trip.expenses.spent).toBe(26000);
    expect(v.trip.expenses.cats.find(c => c.key === 'Fuel')!.spent).toBe(20000);
    expect(v.trip.expenses.settle[0]).toMatchObject({ from: 'Sara', to: 'Ali', amount: 7000 });
    expect(v.trip.phase).toBe('after');
    expect(v.trip.memories!.money).toMatch(/under the plan/);
  });
});

describe('Plan it for me', () => {
  const pick = async (origin: string, mood: string, start: string) => {
    const { buildView } = await import('../src/view'); const { initialState } = await import('../src/state');
    let st: any = { ...initialState(), screen: 'onboard', quick: true, step: 0, origin, startDate: start };
    const api: any = { set: (p: any) => { st = { ...st, ...p }; } };
    buildView(st, api).wishOpts.find((w: any) => w.key === mood)!.onClick(); st.step = 1; buildView(st, api).next();
    return st;
  };
  it('a quick escape from Islamabad is Murree for 3 days, the northern adventure is Hunza', async () => {
    const a = await pick('Islamabad', 'escape', '2026-11-06'); expect([a.dest, a.days, a.screen]).toEqual(['murree', 3, 'app']);
    const b = await pick('Lahore', 'north', '2027-07-10'); expect([b.dest, b.vehicle]).toEqual(['hunza', 'sedan']);
  }, 60000);
  it('short trips: a food trip from Lahore is Gujranwala, a day out from Karachi is Thatta, home the same night', async () => {
    const a = await pick('Lahore', 'food', '2026-11-07'); expect([a.dest, a.days]).toEqual(['city:Gujranwala', 1]);
    const b = await pick('Karachi', 'dayout', '2026-11-07'); expect([b.dest, b.days]).toEqual(['thatta', 1]);
  }, 60000);
});
