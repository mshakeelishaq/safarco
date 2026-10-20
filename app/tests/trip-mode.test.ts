// Before, during and after the trip: phases, the checklist, today's day, expenses and settling up.
import { beforeEach, describe, expect, it } from 'vitest';
import { balances, daysBetween, getRun, moveRun, phaseOf, runKey, settleUp, updateRun } from '../src/run';
import { settle, splitFromUrl, splitUrl } from '../src/split';
import { roadVia } from '../src/engine/engine';
import { NODES } from '../src/engine/data';
import { initialState } from '../src/state';
import { buildView, type Api } from '../src/view';
import { isoAdd } from '../src/engine/format';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
beforeEach(() => mem.clear());

describe('the road on the map and in Google Maps', () => {
  it('goes to Phander in summer over Babusar and Gilgit, the same way as the day plan', () => {
    const s = { ...base, dest: 'phander', corridor: 'phander', startDate: '2026-07-10', days: 8 };
    const v = buildView(s, api);
    expect(v.plan.days.slice(0, 3).map(d => d.title)).toEqual(['Lahore → Mansehra', 'Mansehra → Chilas', 'Chilas → Phander']);
    const link = decodeURIComponent((v as unknown as { routeLink: string }).routeLink);
    expect(link).toContain(`${NODES.NRN[0].toFixed(4)},${NODES.NRN[1].toFixed(4)}`);
    expect(link).not.toContain(`${NODES.CTR[0].toFixed(4)},${NODES.CTR[1].toFixed(4)}`);
    const via = roadVia('phander', 'Lahore', 7);
    expect(via.id.replace(/[+-].*/, '').split(',')).toEqual(expect.arrayContaining(['NRN', 'CHL', 'GLT', 'PHD']));
    // The Babusar road's own shape goes along, with Babusar Top on it.
    expect(via.pts).toContainEqual([35.146, 74.047]);
  });
});

describe('changing the dates', () => {
  it('moves the checklist, expenses and family link to the new dates', () => {
    const a = { origin: 'Lahore', corridor: 'hunza', startDate: '2025-11-02' }, b = { ...a, startDate: '2025-11-09' };
    updateRun(runKey(a), () => ({ locked: '2026-10-01', ticks: ['family'], people: ['Ali', 'Sara'], followId: '11111111-2222-3333-4444-555555555555' }));
    localStorage.setItem('safarco-pack:hunza|2025-11-02', '["jacket"]');
    expect(moveRun(a, b)).toBe(true);
    expect(getRun(runKey(b))).toMatchObject({ locked: '2026-10-01', ticks: ['family'], people: ['Ali', 'Sara'], followId: '11111111-2222-3333-4444-555555555555' });
    expect(getRun(runKey(a)).locked).toBeNull();
    expect(localStorage.getItem('safarco-pack:hunza|2025-11-09')).toBe('["jacket"]');
    // A trip already on the new dates keeps its own progress.
    updateRun(runKey(a), () => ({ ticks: ['other'] }));
    expect(moveRun(a, b)).toBe(false);
    expect(getRun(runKey(b)).ticks).toEqual(['family']);
  });
});

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
  it('splits a cost only between the people in it, by their shares', () => {
    const people = ['Ali', 'Sara', 'Omar'], shares = { Sara: 2 };
    const ex = [{ id: '1', amount: 40000, cat: 'Stay', note: '', payer: 'Ali', date: '' }, { id: '2', amount: 3000, cat: 'Meals', note: '', payer: 'Omar', date: '', split: ['Ali', 'Omar'] }];
    const r = balances(people, shares, ex);
    expect(r.map(x => x.share)).toEqual([11500, 20000, 11500]);
    expect(r.map(x => x.net)).toEqual([28500, -20000, -8500]);
    const { owes } = settle({ people, shares, expenses: ex, payments: [] });
    expect(owes).toEqual([{ from: 'Sara', to: 'Ali', amount: 20000 }, { from: 'Omar', to: 'Ali', amount: 8500 }]);
    const after = settle({ people, shares, expenses: ex, payments: [{ id: 'p', from: 'Sara', to: 'Ali', amount: 20000, date: '' }] });
    expect(after.owes).toEqual([{ from: 'Omar', to: 'Ali', amount: 8500 }]);
  });
  it('carries the whole list in a view-only link', () => {
    (globalThis as any).location = { origin: 'https://www.safarco.pk' };
    const snap = { title: 'Hunza', people: ['Ali', 'Sara'], shares: { Sara: 2 }, at: '2026-10-16T10:00:00Z',
      expenses: [{ id: 'x', amount: 1200, cat: 'Fuel', note: 'Fuel at Besham', payer: 'Ali', date: '2026-10-15', split: ['Ali'] }], payments: [{ id: 'y', from: 'Sara', to: 'Ali', amount: 500, date: '2026-10-16' }] };
    const url = splitUrl(snap), back = splitFromUrl(new URL(url).searchParams.get('d'))!;
    expect(url.startsWith('https://www.safarco.pk/split?d=')).toBe(true);
    expect(back.people).toEqual(['Ali', 'Sara']);
    expect(back.shares).toEqual({ Sara: 2 });
    expect(back.expenses[0]).toMatchObject({ amount: 1200, note: 'Fuel at Besham', payer: 'Ali', split: ['Ali'] });
    expect(back.payments[0]).toMatchObject({ from: 'Sara', to: 'Ali', amount: 500 });
    expect(splitFromUrl('nonsense')).toBeNull();
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
  it('tells family when you arrive for the night, and when you are home', () => {
    const s = { ...base, startDate: isoAdd(0) };
    const a = buildView(s, api).trip.today!.arrival!;
    expect(a.home).toBe(false);
    expect(a.done).toBe(false);
    const r = buildView(s, api).trip.checkIn(a.place, true);
    expect(r.msg).toMatch(new RegExp(`^Arrived safely at ${a.place} ✅ Staying here tonight\\.`));
    expect(r.label).toBe(`Arrived safely at ${a.place}`);
    expect(buildView(s, api).trip.today!.arrival!.done).toBe(true);
    const last = { ...base, startDate: isoAdd(-6) };
    const h = buildView(last, api).trip.today!.arrival!;
    expect(h).toMatchObject({ home: true, place: 'Lahore' });
    expect(buildView(last, api).trip.checkIn('Lahore', true).msg).toMatch(/^Home safely ✅/);
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

describe('changing the trip length by several days', () => {
  it('goes from 8 days to 5 one choice at a time, and from 8 to 12 in one go', () => {
    let st: any = { ...base, startDate: '2026-07-10', days: 8, sheet: 'lessdays' as const, lessTo: 5 };
    const set = (p: any) => { st = { ...st, ...p }; };
    const v = buildView(st, { ...api, set } as Api);
    expect(v.lessDays!.target).toBe(5);
    expect(v.lessDays!.left).toBe(3);
    expect(v.lessDays!.items.some(x => x.key === 'auto')).toBe(true);
    v.lessDays!.items[0].apply();
    expect(st.days).toBe(7);
    expect(st.sheet).toBe('lessdays'); // still asking: two more to take out
    buildView(st, { ...api, set } as Api).lessDays!.items.find(x => x.key === 'auto')!.apply();
    expect(st.days).toBe(5);
    expect(st.sheet).toBe('none');
    st = { ...base, startDate: '2026-07-10', days: 8, sheet: 'moredays' as const, addDays: 4 };
    const m = buildView(st, { ...api, set } as Api).moreDays!;
    expect(m.totals).toEqual([9, 10, 11, 12, 13, 14]);
    m.sections.find(x => x.key === 'relax')!.items[0].apply();
    expect(st.days).toBe(12);
  });
});

describe('planning and the trip kept apart', () => {
  it('shows the trip tools only once the plan is locked or the trip has begun', () => {
    const plan = { ...base, corridor: 'naran', dest: 'naran', startDate: isoAdd(25) };
    expect(buildView(plan, api).trip.live).toBe(false);
    buildView(plan, api).trip.getReady!.lock();
    expect(buildView(plan, api).trip.live).toBe(true);
    expect(buildView({ ...base, startDate: isoAdd(-1) }, api).trip.live).toBe(true);
  });
});
