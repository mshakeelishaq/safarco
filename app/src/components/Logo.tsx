// The SafarCo logo: the road S that ends at a map pin, with the name beside it.
// "light" is for dark or photo backgrounds; the mark's colours follow it.
import { CO, NAME_W, SAFAR } from './logo-paths';
const ROAD = 'M64 30 C 42 20, 20 30, 32 46 C 42 58, 72 52, 68 72 C 64 88, 36 88, 24 80';

export function LogoMark({ size = 34, light = false }: { size?: number; light?: boolean }) {
  const road = light ? '#fff' : '#0B5F7C', hole = light ? '#0B5F7C' : '#fff';
  return (
    <svg viewBox="14 -3 74 101" width={size * 0.74} height={size} aria-hidden="true" style={{ flex: 'none', overflow: 'visible' }}>
      <path d={ROAD} fill="none" stroke={road} strokeWidth="16" strokeLinecap="round" />
      <path d={ROAD} fill="none" stroke="#F5B83D" strokeWidth="2.4" strokeDasharray="5 5" strokeLinecap="round" />
      <path d="M74 30 C 74 30, 62 18, 62 11 A12 12 0 1 1 86 11 C 86 18, 74 30, 74 30Z" fill="#E8624A" />
      <circle cx="74" cy="11" r="4.2" fill={light ? 'transparent' : hole} />
    </svg>
  );
}

/** The main logo: the road S, then "SafarCo" in the serif (drawn as outlines, so it looks the same everywhere). `size` is the mark's height. */
export function Logo({ size = 34, light = false }: { size?: number; light?: boolean }) {
  // Laid out at 100 px type (as scripts/brand.py does for the brand files): the mark 130 tall, the name 30 after it.
  const MH = 130, s = MH / 101, MW = MH * 74 / 101, X0 = MW + 30, BASE = MH * 0.57 + 33.5, W = X0 + NAME_W;
  const road = light ? '#fff' : '#0B5F7C';
  return (
    <svg viewBox={`0 0 ${W.toFixed(1)} ${MH}`} height={size} width={size * W / MH} role="img" aria-label="SafarCo" style={{ flex: 'none', display: 'block', overflow: 'visible' }}>
      <g transform={`translate(${-14 * s} ${3 * s}) scale(${s})`}>
        <path d={ROAD} fill="none" stroke={road} strokeWidth="16" strokeLinecap="round" />
        <path d={ROAD} fill="none" stroke="#F5B83D" strokeWidth="2.4" strokeDasharray="5 5" strokeLinecap="round" />
        <path d="M74 30 C 74 30, 62 18, 62 11 A12 12 0 1 1 86 11 C 86 18, 74 30, 74 30Z" fill="#E8624A" />
        {!light && <circle cx="74" cy="11" r="4.2" fill="#fff" />}
      </g>
      <g transform={`translate(${X0.toFixed(1)} ${BASE.toFixed(1)})`}>
        <path d={SAFAR} fill={light ? '#fff' : '#13212B'} />
        <path d={CO} fill={light ? '#fff' : '#0B5F7C'} />
      </g>
    </svg>
  );
}
