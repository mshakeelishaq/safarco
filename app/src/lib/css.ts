import type { CSSProperties } from 'react';

// The design is written as inline CSS strings. css() turns one into a React style
// object so the screens can keep the design's exact declarations.
const cache = new Map<string, CSSProperties>();

const camel = (p: string) => p.startsWith('--') ? p : p.replace(/^-(webkit|moz|ms)-/, (_, v: string) => v[0].toUpperCase() + v.slice(1) + '-').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

export function css(src: string): CSSProperties {
  const hit = cache.get(src); if (hit) return hit;
  const out: Record<string, string> = {};
  let depth = 0, start = 0;
  const take = (end: number) => {
    const decl = src.slice(start, end), i = decl.indexOf(':');
    if (i > 0) out[camel(decl.slice(0, i).trim())] = decl.slice(i + 1).trim();
    start = end + 1;
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '(') depth++; else if (ch === ')') depth--; else if (ch === ';' && depth === 0) take(i);
  }
  take(src.length);
  if (cache.size > 4000) cache.clear();
  cache.set(src, out as CSSProperties);
  return out as CSSProperties;
}
