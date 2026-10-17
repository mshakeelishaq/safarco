// The four travellers, drawn small and flat in the brand colours. `moving` makes legs walk and wheels turn.
import type { TravellerId } from '../traveller';

const TEAL = '#0B5F7C', RED = '#E8624A', GOLD = '#F5B83D', SKIN = '#E7B089', DARK = '#1F2A30', WHITE = '#FFFFFF';

const Wheel = ({ x, y, r = 6 }: { x: number; y: number; r?: number }) => (
  <g className="tf-wheel">
    <circle cx={x} cy={y} r={r} fill={DARK} /><circle cx={x} cy={y} r={r * 0.45} fill="#C9D3D6" />
    <rect x={x - 0.6} y={y - r} width="1.2" height={r * 2} fill={DARK} opacity=".5" />
  </g>
);

/** A walker: legs, body, head, and what they carry. */
const Walker = ({ x, coat, bag, hat }: { x: number; coat: string; bag?: string; hat?: string }) => (
  <g transform={`translate(${x} 0)`}>
    <g className="tf-leg-a"><rect x="-2.6" y="30" width="3.4" height="13" rx="1.6" fill={DARK} /></g>
    <g className="tf-leg-b"><rect x="-0.8" y="30" width="3.4" height="13" rx="1.6" fill="#33424A" /></g>
    {bag && <rect x="-9.5" y="17" width="7.5" height="12" rx="2.5" fill={bag} />}
    {bag && <rect x="-9" y="27.5" width="6.5" height="2.5" rx="1" fill="#C98E1E" />}
    <rect x="-4.5" y="16" width="9" height="16" rx="4" fill={coat} />
    <circle cx="0.5" cy="11" r="5" fill={SKIN} />
    {hat ? <path d="M-5 9.5 Q0.5 2 6 9.5 Z" fill={hat} /> : <path d="M-4.5 10 Q0.5 4.5 5.5 9 Q2 7.5 -4.5 10 Z" fill={DARK} />}
    <circle cx="3" cy="11" r="0.8" fill={DARK} />
  </g>
);

export function TravellerFig({ id, size = 48, moving = false, className = '' }: { id: TravellerId; size?: number; moving?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`tf${moving ? ' tf-moving' : ''} ${className}`} aria-hidden="true">
      {id === 'backpacker' && <Walker x={25} coat={TEAL} bag={GOLD} hat={RED} />}
      {id === 'couple' && <>
        <Walker x={17} coat={RED} />
        <Walker x={31} coat={TEAL} hat={GOLD} />
        <path d="M20 25 Q24 27 28 25" stroke={SKIN} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </>}
      {id === 'family' && <g className="tf-bob">
        <rect x="11" y="10" width="22" height="5" rx="1.5" fill={GOLD} /><rect x="14" y="7" width="9" height="4" rx="1" fill={RED} />
        <path d="M5 33 L7 22 Q8 16 14 16 L32 16 Q36 16 38.5 21 L43 25 Q45 26 45 29 L45 33 Z" fill={TEAL} />
        <path d="M10 22 L11.5 18.5 L21 18.5 L21 22 Z" fill="#BFE3EE" /><path d="M23.5 22 L23.5 18.5 L31.5 18.5 Q34 18.5 35.5 22 Z" fill="#BFE3EE" />
        <circle cx="16.5" cy="20.5" r="2" fill={SKIN} /><circle cx="28.5" cy="20.5" r="2" fill={SKIN} />
        <rect x="41" y="26" width="3" height="2" rx="1" fill={GOLD} />
        <Wheel x={14} y={34} /><Wheel x={36} y={34} />
      </g>}
      {id === 'biker' && <g className="tf-bob">
        <Wheel x={11} y={36} r={7} /><Wheel x={37} y={36} r={7} />
        <path d="M11 36 L20 28 L31 28 L37 36" stroke={DARK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M17 27 Q22 22 30 24 L33 28 L18 30 Z" fill={RED} />
        <path d="M33 22 L36 21" stroke={DARK} strokeWidth="2.4" strokeLinecap="round" />
        <rect x="21" y="13" width="7" height="13" rx="3.5" fill={TEAL} transform="rotate(14 24 19)" />
        <path d="M27 18 L34 21" stroke={TEAL} strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="9.5" r="5.2" fill={GOLD} /><path d="M25 8 L29.5 8.5 L29 11 L25 11 Z" fill={DARK} />
        <rect x="15" y="20" width="7" height="6" rx="1.5" fill={WHITE} opacity=".9" transform="rotate(14 18 23)" />
      </g>}
    </svg>
  );
}
