import { describe, expect, it } from 'vitest';
import { suggestions, type TripState } from '../src/engine/engine';

const base: TripState & { pickId: string | null } = {
  origin: 'Lahore', mode: 'know', dest: 'skardu', corridor: 'skardu', startDate: '2027-07-10', days: 8, depart: null,
  vehicle: 'sedan', tier: 'standard', adults: 2, kids: 0, elders: 0, groupSize: 2, rooms: 'separate', cap: 200000, pickId: null
};

describe('kind of stay instead of a budget', () => {
  it('without a limit, shows only the chosen kind of stay and picks its cheapest way', () => {
    for (const tier of ['backpacker', 'standard', 'premium'] as const) {
      const { list, sel } = suggestions({ ...base, tier, capOn: false });
      expect(list.length).toBeGreaterThan(0);
      expect(list.every(x => x.tier === tier)).toBe(true);
      const ok = list.filter(x => x.ok).sort((a, b) => a.total - b.total);
      expect(sel.key).toBe(ok[0].key);
    }
  });

  it('suggests places in the chosen kind of stay, priced, never over a limit that is not set', () => {
    const { list } = suggestions({ ...base, mode: 'suggest', tier: 'premium', capOn: false, cap: 1000 });
    expect(list.every(x => x.tier === 'premium')).toBe(true);
    expect(list.some(x => x.best)).toBe(true);
  });

  it('with a limit, still ranks every style against it', () => {
    const { list } = suggestions({ ...base, capOn: true, cap: 150000 });
    expect(new Set(list.map(x => x.tier)).size).toBeGreaterThan(1);
    const best = list.find(x => x.best);
    if (best) expect(best.total).toBeLessThanOrEqual(150000);
  });
});

describe('rooms', () => {
  it('suggests rooms for the group and prices the ones asked for, with extra beds', async () => {
    const { roomPlan, costFor } = await import('../src/engine/engine');
    const fam = { ...base, adults: 4, kids: 2, groupSize: 6 };
    expect(roomPlan(fam)).toMatchObject({ r: 2, auto: 2, extra: 0 });
    expect(roomPlan({ ...fam, roomCount: 1 })).toMatchObject({ r: 1, extra: 3, crowded: true });
    expect(roomPlan({ ...fam, rooms: 'shared' })).toMatchObject({ r: 2, extra: 0 });
    const stay = (x: object) => costFor({ ...fam, ...x } as never).rows.find(r => r.label === 'Stay')!.val;
    expect(stay({ roomCount: 3 })).toBeGreaterThan(stay({}));
    expect(stay({ roomCount: 1 })).toBeLessThan(stay({}));
  });
});
