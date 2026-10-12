// What this traveller has already rated or skipped, kept on the device so the
// "How was your trip?" card only asks once. Also kept in memory for browsers that block storage.
const KEY = 'safarco-rated';
const mem = new Set<string>();
const read = (): string[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

/** One review per hotel or driver per person, so rating any stay counts for all of them. */
export const ratedKey = (kind: string, id: string) => `${kind}:${id}`;
export const isRated = (key: string) => mem.has(key) || read().includes(key);
export function markRated(key: string) {
  mem.add(key);
  const list = read(); if (list.includes(key)) return;
  try { localStorage.setItem(KEY, JSON.stringify([...list, key].slice(-500))); } catch { /* storage blocked */ }
}
/** For tests: forget everything. */
export const clearRated = () => { mem.clear(); try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } };
