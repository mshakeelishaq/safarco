// A trip's progress on this phone: locked or not, checklist ticks, stops ticked off on the road,
// check-ins, expenses, and the family follow link. Kept per trip (start, destination, date).

/** `split` lists who shares this cost; left out, it's everyone on the trip. */
export interface Expense { id: string; amount: number; cat: string; note: string; payer: string; date: string; split?: string[] }
/** Money handed over to settle up: `from` paid `to`. */
export interface Payment { id: string; from: string; to: string; amount: number; date: string }
/** `arrived` marks the end-of-day "arrived safely" check-in. */
export interface Checkin { place: string; at: string; lat?: number; lon?: number; arrived?: boolean }
export interface Run {
  /** The day the plan was locked (YYYY-MM-DD), or null. */
  locked: string | null;
  /** Get-ready tasks done. */
  ticks: string[];
  /** Stops ticked off on the road, as "day|label". */
  stops: string[];
  checkins: Checkin[];
  expenses: Expense[];
  /** Names of the people splitting costs; the first is the phone's owner. */
  people: string[];
  /** How many shares each person pays (a couple or a family can count as 2 or more); 1 if not set. */
  shares: Record<string, number>;
  /** Paid back to each other so far. */
  payments: Payment[];
  /** The family follow link's id on the server, if one was made. */
  followId: string | null;
}
const EMPTY: Run = { locked: null, ticks: [], stops: [], checkins: [], expenses: [], people: [], shares: {}, payments: [], followId: null };

export const runKey = (s: { origin: string | null; corridor: string; startDate: string }) => `${s.origin}|${s.corridor}|${s.startDate}`;
const STORE = 'safarco-run:';
const cache = new Map<string, Run>();
export const RUN_SUBS = new Set<() => void>();

const strs = (v: unknown, max = 200) => Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, max) as string[] : [];
/** Whatever came from storage, made safe to use. */
function clean(raw: unknown): Run {
  const r = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    locked: typeof r.locked === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.locked) ? r.locked : null,
    ticks: strs(r.ticks), stops: strs(r.stops, 500),
    checkins: (Array.isArray(r.checkins) ? r.checkins : []).filter((c: any) => c && typeof c.place === 'string').slice(-50)
      .map((c: any) => ({ place: String(c.place).slice(0, 80), at: String(c.at || ''), ...(isFinite(c.lat) && isFinite(c.lon) ? { lat: +c.lat, lon: +c.lon } : {}), ...(c.arrived === true ? { arrived: true } : {}) })),
    expenses: (Array.isArray(r.expenses) ? r.expenses : []).filter((e: any) => e && isFinite(e.amount) && e.amount > 0).slice(0, 500)
      .map((e: any) => ({ id: String(e.id || Math.random().toString(36).slice(2)), amount: Math.round(+e.amount), cat: String(e.cat || 'Other').slice(0, 30), note: String(e.note || '').slice(0, 80), payer: String(e.payer || '').slice(0, 30), date: String(e.date || '').slice(0, 10), ...(Array.isArray(e.split) ? { split: strs(e.split, 20).map(x => x.slice(0, 30)) } : {}) })),
    people: strs(r.people, 20).map(x => x.slice(0, 30)),
    shares: Object.fromEntries(Object.entries(r.shares && typeof r.shares === 'object' ? r.shares as Record<string, unknown> : {}).filter(([k, v]) => typeof v === 'number' && v >= 1 && v <= 20).slice(0, 20).map(([k, v]) => [k.slice(0, 30), Math.round(v as number)])),
    payments: (Array.isArray(r.payments) ? r.payments : []).filter((p: any) => p && isFinite(p.amount) && p.amount > 0 && typeof p.from === 'string' && typeof p.to === 'string').slice(0, 200)
      .map((p: any) => ({ id: String(p.id || Math.random().toString(36).slice(2)), from: p.from.slice(0, 30), to: p.to.slice(0, 30), amount: Math.round(+p.amount), date: String(p.date || '').slice(0, 10) })),
    followId: typeof r.followId === 'string' && /^[0-9a-f-]{36}$/.test(r.followId) ? r.followId : null
  };
}

export function getRun(key: string): Run {
  let r = cache.get(key);
  if (!r) { try { r = clean(JSON.parse(localStorage.getItem(STORE + key) || 'null')); } catch { r = { ...EMPTY }; } cache.set(key, r); }
  return r;
}
export function updateRun(key: string, fn: (r: Run) => Partial<Run>) {
  const next = { ...getRun(key), ...fn(getRun(key)) };
  cache.set(key, next);
  try { localStorage.setItem(STORE + key, JSON.stringify(next)); } catch { /* storage full or blocked: kept for this visit */ }
  RUN_SUBS.forEach(f => f());
}
/**
 * The trip's dates changed: bring its progress along (checklist, packing, expenses, check-ins,
 * family link), unless the new dates already have their own. True if anything moved.
 */
export function moveRun(from: { origin: string | null; corridor: string; startDate: string }, to: { origin: string | null; corridor: string; startDate: string }) {
  const a = runKey(from), b = runKey(to); if (a === b) return false;
  let moved = false;
  try {
    const old = localStorage.getItem(STORE + a);
    if (old && !localStorage.getItem(STORE + b)) { localStorage.setItem(STORE + b, old); localStorage.removeItem(STORE + a); moved = true; }
    const pa = `safarco-pack:${from.corridor}|${from.startDate}`, pb = `safarco-pack:${to.corridor}|${to.startDate}`, pk = localStorage.getItem(pa);
    if (pk && !localStorage.getItem(pb)) { localStorage.setItem(pb, pk); localStorage.removeItem(pa); moved = true; }
  } catch { /* storage blocked */ }
  if (moved) { cache.delete(a); cache.delete(b); RUN_SUBS.forEach(f => f()); }
  return moved;
}
export const toggle = (list: string[], k: string) => list.includes(k) ? list.filter(x => x !== k) : [...list, k];

/** Before, during or after the trip, by today's date. */
export const phaseOf = (start: string, days: number, today: string) => {
  const d = new Date(start + 'T00:00'), end = new Date(d); end.setDate(end.getDate() + days - 1);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return today < start ? 'before' as const : today > iso(end) ? 'after' as const : 'during' as const;
};
/** Whole days from `a` to `b` (YYYY-MM-DD). */
export const daysBetween = (a: string, b: string) => Math.round((+new Date(b + 'T00:00') - +new Date(a + 'T00:00')) / 864e5);

/** Who pays whom to clear the balances (positive: is owed money), in the fewest payments, largest first. */
export function settleBalances(net: Record<string, number>) {
  const bal = Object.entries(net).map(([n, v]) => ({ n, v }));
  const out: { from: string; to: string; amount: number }[] = [];
  const owe = bal.filter(b => b.v < -0.5).sort((a, b) => a.v - b.v), get = bal.filter(b => b.v > 0.5).sort((a, b) => b.v - a.v);
  let i = 0, j = 0;
  while (i < owe.length && j < get.length) {
    const amt = Math.min(-owe[i].v, get[j].v);
    if (amt >= 1) out.push({ from: owe[i].n, to: get[j].n, amount: Math.round(amt) });
    owe[i].v += amt; get[j].v -= amt;
    if (owe[i].v > -0.5) i++; if (get[j].v < 0.5) j++;
  }
  return out;
}

/** Who pays whom so everyone has paid the same share. `paid` maps each person to what they paid. */
export function settleUp(paid: Record<string, number>) {
  const names = Object.keys(paid); if (names.length < 2) return [];
  const share = names.reduce((a, n) => a + paid[n], 0) / names.length;
  return settleBalances(Object.fromEntries(names.map(n => [n, paid[n] - share])));
}

/**
 * Each person's paid, share and balance. A cost is shared by the people in its `split` (everyone if unset),
 * in proportion to their shares; money already paid back moves the balances.
 */
export function balances(people: string[], shares: Record<string, number>, expenses: Expense[], payments: Payment[] = []) {
  const row = Object.fromEntries(people.map(p => [p, { paid: 0, share: 0, net: 0 }]));
  const w = (p: string) => shares[p] || 1;
  for (const e of expenses) {
    const payer = row[e.payer] ? e.payer : people[0];
    const who = (e.split && e.split.length ? e.split : people).filter(p => row[p]);
    const ws = who.reduce((a, p) => a + w(p), 0) || 1;
    if (row[payer]) row[payer].paid += e.amount;
    for (const p of who) row[p].share += e.amount * w(p) / ws;
  }
  for (const p of people) row[p].net = row[p].paid - row[p].share;
  for (const x of payments) { if (row[x.from]) row[x.from].net += x.amount; if (row[x.to]) row[x.to].net -= x.amount; }
  return people.map(n => ({ name: n, paid: Math.round(row[n].paid), share: Math.round(row[n].share), net: Math.round(row[n].net) }));
}
