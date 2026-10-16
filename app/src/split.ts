// The group's expenses as a view-only link: one person keeps the list, everyone else can open it and see
// who paid what and who owes whom. The whole list travels in the link, so nobody needs to sign in.
import { b64, unb64 } from './trips';
import { balances, settleBalances, type Expense, type Payment } from './run';

export interface SplitSnapshot { title: string; people: string[]; shares: Record<string, number>; expenses: Expense[]; payments: Payment[]; at: string }

export function splitUrl(s: SplitSnapshot) {
  const d = { t: s.title, p: s.people, s: s.shares, at: s.at,
    e: s.expenses.map(e => [e.amount, e.cat, e.note, e.payer, e.date, ...(e.split ? [e.split] : [])]),
    y: s.payments.map(p => [p.from, p.to, p.amount, p.date]) };
  return `${location.origin}/split?d=${b64(JSON.stringify(d))}`;
}

const str = (v: unknown, n = 80) => typeof v === 'string' ? v.slice(0, n) : '';
export function splitFromUrl(q: string | null): SplitSnapshot | null {
  if (!q) return null;
  try {
    const d = JSON.parse(unb64(q));
    const people = (Array.isArray(d.p) ? d.p : []).filter((x: unknown) => typeof x === 'string').slice(0, 20).map((x: string) => x.slice(0, 30));
    if (!people.length) return null;
    const shares: Record<string, number> = {};
    for (const [k, v] of Object.entries(d.s && typeof d.s === 'object' ? d.s : {})) if (typeof v === 'number' && v >= 1 && v <= 20) shares[k.slice(0, 30)] = Math.round(v);
    const expenses: Expense[] = (Array.isArray(d.e) ? d.e : []).slice(0, 500).filter((e: unknown[]) => Array.isArray(e) && isFinite(e[0] as number) && (e[0] as number) > 0)
      .map((e: unknown[], i: number) => ({ id: String(i), amount: Math.round(e[0] as number), cat: str(e[1], 30) || 'Other', note: str(e[2]), payer: str(e[3], 30), date: str(e[4], 10),
        ...(Array.isArray(e[5]) ? { split: (e[5] as unknown[]).filter(x => typeof x === 'string').map(x => (x as string).slice(0, 30)) } : {}) }));
    const payments: Payment[] = (Array.isArray(d.y) ? d.y : []).slice(0, 200).filter((p: unknown[]) => Array.isArray(p) && isFinite(p[2] as number))
      .map((p: unknown[], i: number) => ({ id: String(i), from: str(p[0], 30), to: str(p[1], 30), amount: Math.round(p[2] as number), date: str(p[3], 10) }));
    return { title: str(d.t) || 'Trip', people, shares, expenses, payments, at: str(d.at, 30) };
  } catch { return null; }
}

/** Balances and who still owes whom, for a snapshot or the live list. */
export function settle(s: Pick<SplitSnapshot, 'people' | 'shares' | 'expenses' | 'payments'>) {
  const rows = balances(s.people, s.shares, s.expenses, s.payments);
  return { rows, owes: settleBalances(Object.fromEntries(rows.map(r => [r.name, r.net]))) };
}
