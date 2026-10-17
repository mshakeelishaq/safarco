import { describe, expect, it } from 'vitest';
import { TRAVELLERS, travellerPatch } from '../src/traveller';
import { VEH } from '../src/engine/data';

describe('choose your traveller', () => {
  it('each traveller sets a real group, vehicle and stay level for the planner', () => {
    for (const t of TRAVELLERS) {
      const p = t.patch;
      expect(p.groupSize).toBe((p.adults || 0) + (p.kids || 0) + (p.elders || 0));
      expect(Object.keys(VEH)).toContain(p.vehicle);
      expect(['backpacker', 'standard', 'premium']).toContain(p.tier);
    }
  });
  it('ignores an unknown traveller from the address', () => {
    expect(travellerPatch('pilot')).toEqual({});
    expect(travellerPatch(null)).toEqual({});
    expect(travellerPatch('family').vehicle).toBe('suv');
  });
});
