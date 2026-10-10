// Procedural terrain for the hero scene: ridged noise shaped around a route line.
import type { Terrain } from '../engine/data';

const hash = (x: number, y: number, s: number) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const ridged = (x: number, y: number, s: number) => { let t = 0, a = .55, f = 1; for (let i = 0; i < 5; i++) { const n = 1 - Math.abs(vnoise(x * f, y * f, s + i * 7) * 2 - 1); t += a * n * n; f *= 2.05; a *= .5; } return t; };
const fbm = (x: number, y: number, s: number) => { let t = 0, a = .5, f = 1; for (let i = 0; i < 4; i++) { t += a * vnoise(x * f, y * f, s + i * 13); f *= 2.1; a *= .5; } return t; };
const sstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const routeXZ = (p: Terrain, t: number): [number, number] => {
  const x = -6 + 9 * t + p.wig * Math.sin(t * Math.PI * 1.7 + p.seed) * 3 * (1 - .6 * t * t);
  return [Math.max(-7, Math.min(3.5, x)), 15 - 20 * t];
};

// Height → colour ramp: river green, forest, meadow, rock, scree, snow.
const STOPS: [number, [number, number, number]][] = [[0, [15, 90, 68]], [1.2, [24, 128, 86]], [2.6, [62, 186, 112]], [4.2, [196, 168, 110]], [6.2, [150, 128, 112]], [8.2, [214, 222, 236]], [10, [255, 255, 255]]];
export function colorAt(h: number, out: Float32Array, i: number) {
  let k = 0; while (k < STOPS.length - 2 && h > STOPS[k + 1][0]) k++;
  const [h0, c0] = STOPS[k], [h1, c1] = STOPS[k + 1], t = Math.max(0, Math.min(1, (h - h0) / (h1 - h0)));
  out[i] = (c0[0] + (c1[0] - c0[0]) * t) / 255; out[i + 1] = (c0[1] + (c1[1] - c0[1]) * t) / 255; out[i + 2] = (c0[2] + (c1[2] - c0[2]) * t) / 255;
}

export function buildTerrain(p: Terrain, pos: { count: number; getX(i: number): number; getZ(i: number): number }) {
  const samples: [number, number][] = []; for (let i = 0; i < 90; i++) samples.push(routeXZ(p, i / 89));
  const hAt = (x: number, z: number) => {
    let best = 1e9, bi = 0;
    for (let i = 0; i < samples.length; i++) { const dx = x - samples[i][0], dz = z - samples[i][1], d = dx * dx + dz * dz; if (d < best) { best = d; bi = i; } }
    const d = Math.sqrt(best), t = bi / 89, floor = .35 + t * p.rise, back = sstep(15, -16, z);
    const m = Math.pow(ridged(x * .075 + p.seed * 3, z * .075, p.seed), 1.7) * p.amp * (.35 + .95 * back) + fbm(x * .22, z * .22, p.seed) * .9;
    return floor + m * sstep(1.3, 6, d);
  };
  const out = new Float32Array(pos.count); for (let i = 0; i < pos.count; i++) out[i] = hAt(pos.getX(i), pos.getZ(i));
  const pts: [number, number, number][] = []; for (let i = 0; i <= 48; i++) { const t = i / 48, [x, z] = routeXZ(p, t); pts.push([x, hAt(x, z) + .32, z]); }
  return { heights: out, pts };
}
