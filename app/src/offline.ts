// "Download for offline": saves the map style, the vector and terrain tiles along
// the trip's route (zoom 6–10), and the trip's road and weather data into the
// Cache API. The service worker (public/sw.js) serves them when there is no signal.
import { DEM_TILES, MAP_STYLE } from './mapConfig';

export const OFFLINE_CACHE = 'safarco-offline';
const META = 'safarco-offline-meta';
const ZOOMS = [6, 7, 8, 9, 10];

const tileOf = (lon: number, lat: number, z: number) => {
  const n = 2 ** z, x = Math.floor((lon + 180) / 360 * n), r = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n);
  return [Math.max(0, Math.min(n - 1, x)), Math.max(0, Math.min(n - 1, y))];
};

/** Tiles touching the route, plus a one-tile margin, for each zoom. */
export function tilesAlong(coords: [number, number][], zooms = ZOOMS) {
  const out = new Set<string>();
  for (const z of zooms) {
    for (let i = 0; i < coords.length; i++) {
      const [a, b] = [coords[i], coords[Math.min(i + 1, coords.length - 1)]], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (360 / 2 ** z / 4)));
      for (let k = 0; k <= steps; k++) {
        const [x, y] = tileOf(a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps, z);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) out.add(`${z}/${x + dx}/${y + dy}`);
      }
    }
  }
  return [...out];
}

const fill = (tpl: string, zxy: string) => { const [z, x, y] = zxy.split('/'); return tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y); };

async function styleUrls() {
  const style = await (await fetch(MAP_STYLE)).json();
  const urls = [MAP_STYLE], tileTpls: string[] = [];
  for (const src of Object.values<any>(style.sources || {})) {
    if (src.url) { urls.push(src.url); const tj = await (await fetch(src.url)).json(); if (src.type === 'vector') tileTpls.push(...(tj.tiles || []).slice(0, 1)); }
    else if (src.type === 'vector' && src.tiles) tileTpls.push(src.tiles[0]);
  }
  if (style.sprite) for (const sp of (Array.isArray(style.sprite) ? style.sprite.map((s: any) => s.url) : [style.sprite])) urls.push(sp + '.json', sp + '.png', sp + '@2x.json', sp + '@2x.png');
  if (style.glyphs) {
    const stacks = new Set<string>();
    for (const l of style.layers || []) { const f = l.layout?.['text-font']; if (Array.isArray(f) && f.every((x: unknown) => typeof x === 'string')) stacks.add(f.join(',')); }
    stacks.forEach(st => urls.push(style.glyphs.replace('{fontstack}', encodeURIComponent(st)).replace('{range}', '0-255')));
  }
  return { urls, tileTpls };
}

export interface OfflineProgress { done: number; total: number; bytes: number }

export async function downloadOffline(coords: [number, number][], extra: string[], onProgress: (p: OfflineProgress) => void, signal: AbortSignal) {
  if (!('caches' in window)) throw new Error('This browser can’t save maps offline.');
  const cache = await caches.open(OFFLINE_CACHE);
  const { urls, tileTpls } = await styleUrls();
  const tiles = tilesAlong(coords);
  const all = [...new Set([...urls, ...extra, ...tiles.flatMap(t => [...tileTpls.map(tpl => fill(tpl, t)), fill(DEM_TILES, t)])])];
  const p: OfflineProgress = { done: 0, total: all.length, bytes: 0 };
  onProgress(p);
  let next = 0, failed = 0;
  const worker = async () => {
    while (next < all.length && !signal.aborted) {
      const url = all[next++];
      try {
        const hit = await cache.match(url);
        if (hit) p.bytes += +(hit.headers.get('content-length') || 0) || (await hit.clone().blob()).size;
        else { const r = await fetch(url, { signal }); if (r.ok) { p.bytes += (await r.clone().blob()).size; await cache.put(url, r); } else failed++; }
      } catch { if (!signal.aborted) failed++; }
      p.done++; onProgress(p);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (signal.aborted) throw new Error('Cancelled');
  if (failed > all.length * 0.2) throw new Error('Too many map tiles failed to download. Check your connection and try again.');
  const meta = { mb: p.bytes / 1e6, at: Date.now() };
  try { localStorage.setItem(META, JSON.stringify(meta)); } catch { /* storage blocked */ }
  return meta;
}

export async function clearOffline() {
  try { localStorage.removeItem(META); } catch { /* storage blocked */ }
  if ('caches' in window) await caches.delete(OFFLINE_CACHE);
}

export function savedOffline(): { mb: number } | null {
  try { const m = JSON.parse(localStorage.getItem(META) || 'null'); return m && typeof m.mb === 'number' ? m : null; } catch { return null; }
}
