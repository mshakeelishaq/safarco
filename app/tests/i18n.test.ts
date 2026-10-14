// Roman Urdu: every interface text has a translation (names and brands may stay English),
// translations keep their {placeholders}, and switching language changes the screens' text.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { setLang, t } from '../src/i18n';
import { UR } from '../src/i18n/ur';
import { initialState } from '../src/state';
import { buildView, type Api } from '../src/view';

const SRC = path.resolve(__dirname, '../src');
const files = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'i18n' ? [] : files(path.join(d, e.name))) : /\.tsx?$/.test(e.name) && !e.name.endsWith('.test.ts') ? [path.join(d, e.name)] : []);
const keys = new Set<string>();
for (const f of files(SRC)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\b(?:t|tx)\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'"));

// Texts that are fine in English: names, brands, units and month abbreviations.
const ENGLISH_OK = /^(\{km\} km|\{name\} · \{vehicle\}|\{region\} · \{ft\} ft|~\{n\} MB|Privacy|Privacy policy|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/;
const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

afterEach(() => setLang('en'));

describe('Roman Urdu', () => {
  it('has a translation for every interface text', () => {
    const missing = [...keys].filter(k => !(k in UR) && !ENGLISH_OK.test(k));
    expect(missing).toEqual([]);
  });
  it('keeps every placeholder', () => {
    expect(Object.entries(UR).filter(([k, v]) => ph(k) !== ph(v)).map(([k]) => k)).toEqual([]);
  });
  it('switches the screens’ text and back', () => {
    const api = { set: () => {} } as unknown as Api;
    const s = { ...initialState(), step: 1, screen: 'app' as const, origin: 'Lahore', mode: 'know' as const, dest: 'hunza', corridor: 'hunza', startDate: '2027-10-12', days: 8 };
    expect(buildView(s, api).ob.title).toBe('Which city do you live in?');
    setLang('ur');
    expect(t('Start planning')).toBe('Planning shuru karein');
    expect(buildView({ ...s, lang: 'ur' }, api).ob.title).toBe('Aap kis shehar mein rehte hain?');
    expect(t('Night in {place}', { place: 'Naran' })).toBe('Raat: Naran');
    // Switching language through the app clears cached route texts.
    setLang('en'); const calls: Record<string, unknown>[] = [];
    const v = buildView(s, { set: (p: Record<string, unknown>) => calls.push(p) } as unknown as Api);
    expect(v.pillB).toMatch(/h drive/);
    v.switchLang();
    expect(buildView({ ...s, lang: 'ur' }, api).pillB).toMatch(/ghante drive/);
  });
});

describe('Roman Urdu for guide texts', () => {
  it('has a translation for every place note, day tip, road stop and season note, imported ones too', async () => {
    const { DESTS, EDGE_STOPS } = await import('../src/engine/data');
    const { HIGHLIGHTS } = await import('../src/engine/seasons');
    const all = new Set<string>(), add = (x?: string | null) => { if (x && /[a-z]/i.test(x) && !(x in UR)) all.add(x); };
    for (const D of DESTS) {
      (D.places || []).forEach(p => { add(p[1]); add(p[2]); });
      (D.days || []).forEach(d => add(d.note)); add(D.eat); add(D.airNote); add(D.guideNote); (D.hotels || []).forEach(h => add(h[2])); if (D.warn) add(D.warn[1]);
    }
    Object.values(EDGE_STOPS).flat().forEach(x => add(x[3]));
    Object.values(HIGHLIGHTS).flat().forEach(h => { add(h.text); add(h.caution); });
    expect([...all]).toEqual([]);
  });
});
