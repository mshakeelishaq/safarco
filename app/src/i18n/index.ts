// Interface language. Text is written in English in the code and wrapped in t(); in Roman Urdu
// it's looked up in ur.ts (by the same English text) and falls back to English if missing.
// Place names stay in English everywhere.
import { UR } from './ur';

export type Lang = 'en' | 'ur';
export const LANGS: { id: Lang; label: string }[] = [{ id: 'en', label: 'English' }, { id: 'ur', label: 'Roman Urdu' }];
const KEY = 'safarco-lang';

let current: Lang = (() => { try { const v = localStorage.getItem(KEY); return v === 'ur' ? 'ur' : 'en'; } catch { return 'en'; } })();
export const lang = () => current;
export function setLang(l: Lang) { current = l; try { localStorage.setItem(KEY, l); } catch { /* storage blocked */ } try { document.documentElement.lang = l === 'ur' ? 'ur-Latn' : 'en'; } catch { /* no document */ } }

/** Translate `en` (with {name} placeholders filled from `vars`) into the current language. */
export function t(en: string, vars?: Record<string, string | number>) {
  let s = current === 'ur' ? UR[en] ?? en : en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}
