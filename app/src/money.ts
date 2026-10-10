// Rupee and dollar formatting, and honest hotel price ranges.
import { TIERS, type TierId } from './engine/data';
import { fmtN, isoOff } from './engine/format';
import { fxRate } from './engine/live';

export const usd = (pkr: number) => { const v = pkr / fxRate().pkrPerUsd; return '$' + (v >= 100 ? fmtN(Math.round(v / 5) * 5) : fmtN(v)); };
export const pkrUsd = (pkr: number) => `PKR ${fmtN(pkr)} (${usd(pkr)})`;

/** Typical nightly range for a stay level. Live hotel prices aren't available from any free source. */
export function nightRange(tier: TierId, season: number) {
  const base = TIERS[tier].night * season, lo = Math.round(base * 0.7 / 500) * 500, hi = Math.round(base * 1.4 / 500) * 500;
  return { lo, hi, text: `PKR ${fmtN(lo)}–${fmtN(hi)}`, usd: `${usd(lo)}–${usd(hi)}` };
}

/** Booking.com search for a town (or a hotel in it) on the trip's dates. */
export function checkPricesUrl(q: string, checkin: string, nights: number, adults: number, kids: number, rooms: number) {
  const p = new URLSearchParams({ ss: `${q}, Pakistan`, checkin, checkout: isoOff(checkin, Math.max(1, nights)), group_adults: String(adults), group_children: String(kids), no_rooms: String(Math.max(1, rooms)) });
  return `https://www.booking.com/searchresults.html?${p}`;
}
