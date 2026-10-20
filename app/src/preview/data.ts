// The preview's destination ring: every destination with photos of its own, a few photos each, and the groups
// the ring can be sorted into (season, region, days from Islamabad).
import { DESTS } from '../engine/data';
import { DST, rangeTxt } from '../engine/places';
import { trip } from '../engine/engine';
import { GALLERY, ownPhoto } from '../photos';
import { provinceOf, PROVINCES } from '../site/data';

export type GroupBy = 'season' | 'region' | 'days';
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All year'] as const;
const SEASON_OF: Record<number, (typeof SEASONS)[number]> = { 3: 'Spring', 4: 'Spring', 5: 'Spring', 6: 'Summer', 7: 'Summer', 8: 'Summer', 9: 'Autumn', 10: 'Autumn', 11: 'Autumn', 12: 'Winter', 1: 'Winter', 2: 'Winter' };
const DAYS = ['2 to 3 days', '4 to 5 days', '6 days or more'] as const;

/** A small copy for the ring (scripts/thumbs.py), the full photo for the preview card. */
export const thumb = (src: string) => src.replace(/^\/photos\//, '/photos/t/');

export interface RingDest { id: string; name: string; region: string; when: string; days: number; photos: string[]; season: string; province: string; dayGroup: string }

function seasonOf(best: number[]) {
  if (!best.length || best.length >= 11) return 'All year';
  const n: Record<string, { count: number; last: number }> = {};
  best.forEach((m, i) => { const s = (n[SEASON_OF[m]] ||= { count: 0, last: 0 }); s.count++; s.last = i; });
  // The season with most good months; a tie goes to the later one in the range (autumn over summer for Hunza).
  return Object.entries(n).sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last)[0][0];
}

let cache: RingDest[] | null = null;
export function ringDests(month = new Date().getMonth() + 1): RingDest[] {
  if (cache) return cache;
  cache = DESTS.map(d => {
    const own = [ownPhoto(d.id, month), ...(GALLERY[d.id] || []).map(g => g.src)].filter((x): x is string => !!x && x.startsWith('/photos/'));
    const photos = [...new Set(own)].slice(0, 3);
    const D = DST(d.id), best = D.best || [];
    let days = 3; try { days = d.id === 'islamabad' ? 2 : trip(d.id, 'Islamabad', 7).minDays; } catch { /* keep 3 */ }
    return { id: d.id, name: D.name, region: D.region, when: best.length ? rangeTxt(best).replace(/^best/, 'Best') : 'Good all year', days, photos, season: seasonOf(best), province: provinceOf(D.region),
      dayGroup: days <= 3 ? DAYS[0] : days <= 5 ? DAYS[1] : DAYS[2] };
  }).filter(d => d.photos.length);
  return cache;
}

export const GROUPS: Record<GroupBy, readonly string[]> = { season: SEASONS, region: PROVINCES, days: DAYS };

/** The grid's filters: a place counts for a season if any of its best months fall in it. */
export const FILTERS = ['All', 'Spring', 'Summer', 'Autumn', 'Winter'] as const;
export type Filter = (typeof FILTERS)[number];
const MONTHS: Record<Exclude<Filter, 'All'>, number[]> = { Spring: [3, 4, 5], Summer: [6, 7, 8], Autumn: [9, 10, 11], Winter: [12, 1, 2] };
export const fits = (d: RingDest, f: Filter) => f === 'All' || !DST(d.id).best?.length || MONTHS[f].some(m => DST(d.id).best!.includes(m));
const FAV = ['hunza', 'skardu', 'naran', 'khaplu', 'kalam', 'fairy', 'neelum', 'chitral', 'passu', 'nagar', 'shogran', 'swat', 'murree', 'nathia', 'lahore', 'karachi', 'gwadar', 'mohenjo'];
/** In season now first (SafarCo's favourites leading), then the rest by name. */
export function gridOrder(ds: RingDest[], month = new Date().getMonth() + 1) {
  const now = (d: RingDest) => !DST(d.id).best?.length || DST(d.id).best!.includes(month), rank = (d: RingDest) => { const i = FAV.indexOf(d.id); return i < 0 ? 99 : i; };
  return [...ds].sort((a, b) => Number(now(b)) - Number(now(a)) || rank(a) - rank(b) || a.name.localeCompare(b.name));
}
export const inSeason = (d: RingDest, month = new Date().getMonth() + 1) => !DST(d.id).best?.length || DST(d.id).best!.includes(month);
export const groupOf = (d: RingDest, by: GroupBy) => by === 'season' ? d.season : by === 'region' ? d.province : d.dayGroup;
