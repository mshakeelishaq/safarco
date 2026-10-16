// The SafarCo logo: the road S that ends at a map pin, with the name beside it.
// "light" is for dark or photo backgrounds; the mark's colours follow it.
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

export function Logo({ size = 34, light = false }: { size?: number; light?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.26 }}>
      <LogoMark size={size} light={light} />
      <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 800, fontSize: size * 0.68, letterSpacing: '-.02em', lineHeight: 1, color: light ? '#fff' : '#0B5F7C' }}>
        Safar<span style={{ color: light ? '#fff' : '#201E1D' }}>Co</span>
      </span>
    </span>
  );
}
