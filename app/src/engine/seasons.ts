// When each destination is at its best, and why. Months are 1-12. A highlight with a
// `caution` is worth going for (snow, festivals) but needs care; the app always says so.
// These sit alongside each destination's `best` and `warn` months in data.ts.
import { DESTS, MON } from './data';
import { isoOf } from './format';
import { IMPORTED_HIGHLIGHTS } from './imported';

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export interface Season { id: SeasonId; label: string; months: number[]; icon: string; color: string; blurb: string }
export const SEASONS: Season[] = [
  { id: 'spring', label: 'Spring', months: [3, 4, 5], icon: 'ph-flower', color: '#E85D9A', blurb: 'Blossom in the northern valleys, pleasant days in the cities.' },
  { id: 'summer', label: 'Summer', months: [6, 7, 8], icon: 'ph-sun', color: '#F2A007', blurb: 'Green meadows, lakes and cool air while the plains are hot. All high passes open.' },
  { id: 'autumn', label: 'Autumn', months: [9, 10, 11], icon: 'ph-leaf', color: '#D9731A', blurb: 'Golden poplars across Gilgit-Baltistan, clear skies and quieter roads.' },
  { id: 'winter', label: 'Winter', months: [12, 1, 2], icon: 'ph-snowflake', color: '#3B8DFF', blurb: 'Snowfall in the hills and mild, sunny beaches on the coast.' }
];
export const seasonOf = (m: number) => SEASONS.find(s => s.months.includes(m))!;

/** `wish` is set for imported highlights, which say what they are rather than leaving it to the text. */
export interface Highlight { months: number[]; season: SeasonId; text: string; caution?: string; wish?: WishId }

const H = (months: number[], season: SeasonId, text: string, caution?: string): Highlight => ({ months, season, text, caution });
export const BASE_HIGHLIGHTS: Record<string, Highlight[]> = {
  hunza: [H([4], 'spring', 'Cherry and apricot blossom under snowy peaks'), H([6, 7, 8], 'summer', 'Long days, Attabad Lake and Khunjerab Pass open'), H([10], 'autumn', 'Golden poplars and clear views of Rakaposhi'), H([11], 'autumn', 'Last of the autumn gold', 'Cold nights, and Khunjerab Pass closes at the end of November.')],
  skardu: [H([4], 'spring', 'Apricot blossom in Shigar and Skardu'), H([7, 8], 'summer', 'Deosai Plains in flower and open'), H([10, 11], 'autumn', 'Autumn gold in Shigar, Khaplu and Ghowari, and the Kachura lakes')],
  khaplu: [H([4], 'spring', 'Apricot blossom in Khaplu and the Barah valley'), H([10, 11], 'autumn', 'Golden fields along the Shyok and the tall golden poplars of Ghowari')],
  passu: [H([4], 'spring', 'Blossom in Gojal'), H([10], 'autumn', 'Golden poplars under the Passu Cones'), H([11], 'autumn', 'Late autumn in Gojal', 'Very cold nights and many guesthouses closing.')],
  phander: [H([6, 7, 8], 'summer', 'Trout lakes and the Shandur polo festival (early July)'), H([10], 'autumn', 'The golden valley of Ghizer')],
  naltar: [H([6, 7, 8, 9], 'summer', 'Naltar’s coloured lakes and pine forest'), H([1, 2], 'winter', 'Skiing and deep snow', 'The jeep road can close after heavy snow: check before you go.')],
  fairy: [H([6, 7, 8, 9], 'summer', 'Nanga Parbat views from the meadows')],
  rama: [H([7, 8], 'summer', 'Rama Meadows and Deosai in flower')],
  naran: [H([6, 7, 8], 'summer', 'Lake Saif-ul-Malook, Lalazar and Babusar Pass open')],
  shogran: [H([5, 6, 7, 8, 9], 'summer', 'Siri Paye meadows in green and the Kiwai waterfall')],
  kalam: [H([6, 7, 8], 'summer', 'Mahodand Lake and the Ushu forest'), H([12, 1, 2], 'winter', 'Snow in Kalam town', 'Snow often blocks the road above Bahrain: check before you go.')],
  malam: [H([12, 1, 2], 'winter', 'Snow and the ski slopes'), H([6, 7, 8], 'summer', 'Chairlift rides and cool air')],
  kumrat: [H([6, 7, 8], 'summer', 'Pine forest and the river at Kumrat'), H([12, 1, 2], 'winter', 'Deep snow in the Kumrat forest', 'The road past Thal is usually snowbound: go with a local jeep and check before you go.')],
  neelum: [H([5, 6, 7, 8, 9], 'summer', 'Green valley, Arang Kel and Ratti Gali Lake'), H([10], 'autumn', 'Autumn colours along the river'), H([12, 1, 2], 'winter', 'Snowfall in lower Neelum (Keran, Sharda)', 'Roads beyond Sharda close with snow.')],
  kalash: [H([5], 'spring', 'Joshi spring festival (mid-May)'), H([6, 7, 8], 'summer', 'Green valleys and the Uchal harvest festival (August)')],
  chitral: [H([5, 6, 7, 8, 9], 'summer', 'Tirich Mir views and the Kalash valleys nearby')],
  murree: [H([6, 7, 8], 'summer', 'Cool hill air close to Islamabad'), H([12, 1, 2], 'winter', 'Snowfall in the hills', 'Snow brings traffic jams: check the snow advisory and avoid weekends.')],
  nathia: [H([5, 6, 7, 8], 'summer', 'Pine trails and Mushkpuri'), H([12, 1, 2], 'winter', 'Snowfall in the Galiyat', 'Roads get icy: drive slowly and carry chains.')],
  ziarat: [H([6, 7, 8], 'summer', 'Juniper forest and cool air'), H([12, 1], 'winter', 'Snowfall in the juniper forest', 'Freezing nights and icy roads.')],
  gwadar: [H([11, 12, 1, 2], 'winter', 'Mild, sunny beaches and the Hammerhead')],
  kundmalir: [H([11, 12, 1, 2], 'winter', 'Beach days on the Makran coast and Hingol')],
  karachi: [H([12, 1, 2], 'winter', 'Beach weather, Clifton and the food streets')],
  mohenjo: [H([12, 1, 2], 'winter', 'Cool days for the ancient city')],
  lahore: [H([2, 3], 'spring', 'Pleasant weather, gardens in bloom'), H([10], 'autumn', 'Mild days before the smog season')],
  islamabad: [H([3, 4], 'spring', 'White blossom in the parks (March) and purple jacaranda along the avenues (late April)'), H([5, 6], 'summer', 'Golden amaltas blossom along the roads (late May and June)'), H([10, 11], 'autumn', 'Clear, mild days for the hills and red and gold trees across the city')]
};
/** The app's own highlights, plus imported ones for destinations that have none. */
export const HIGHLIGHTS: Record<string, Highlight[]> = { ...(IMPORTED_HIGHLIGHTS as Record<string, Highlight[]>), ...BASE_HIGHLIGHTS };

const ord = (months: number[]) => months.map(m => MON[m - 1]);
/** "Apr", "Jun–Aug", "Dec–Feb" or, for split lists, "Dec–Feb, May–Sep". Months are read in the given order. */
export function monthsLabel(months: number[]) {
  const runs: number[][] = [];
  months.forEach(m => { const r = runs.at(-1); if (r && m === r.at(-1)! % 12 + 1) r.push(m); else runs.push([m]); });
  return runs.map(r => r.length === 1 ? ord(r)[0] : `${ord(r)[0]}–${ord(r).at(-1)}`).join(', ');
}

export const highlightsOf = (id: string) => HIGHLIGHTS[id] || [];

/** An icon and colour that say what a highlight is: beach, snow, blossom, autumn colours, festival or the season. */
export function iconFor(h: Highlight): { icon: string; color: string } {
  const t = h.text.toLowerCase();
  if (/beach|coast/.test(t)) return { icon: 'ph-umbrella-simple', color: '#0FA6B8' };
  if (/snow|ski/.test(t)) return { icon: 'ph-snowflake', color: '#3B8DFF' };
  if (/blossom|bloom/.test(t)) return { icon: 'ph-flower', color: '#E85D9A' };
  if (/festival/.test(t)) return { icon: 'ph-confetti', color: '#9B5DE5' };
  if (/ancient|heritage|ruins/.test(t)) return { icon: 'ph-bank', color: '#A0703C' };
  if (/golden|autumn|colours/.test(t)) return { icon: 'ph-leaf', color: '#D9731A' };
  const s = SEASONS.find(x => x.id === h.season)!;
  return { icon: s.icon, color: s.color };
}
/** The highlight for a destination in a month, if it has one. */
export const highlightIn = (id: string, m: number) => highlightsOf(id).find(h => h.months.includes(m)) || null;

/** Everything worth visiting in a season, in the order the guide shows it (no caution first). */
export function seasonPicks(season: SeasonId) {
  // One card per place: its easy highlight if it has one (Hunza in October rather than November).
  return DESTS.flatMap(d => highlightsOf(d.id).filter(h => h.season === season).sort((a, b) => +!!a.caution - +!!b.caution).slice(0, 1).map(h => ({ id: d.id, name: d.name, region: d.region, h })))
    .sort((a, b) => +!!a.h.caution - +!!b.h.caution);
}

/** The first trip start date (YYYY-MM-DD) in one of `months`, at least a week from `today`. */
export function nextStartIn(months: number[], today = new Date()) {
  const d = new Date(today); d.setDate(d.getDate() + 7);
  for (let i = 0; i < 13; i++) {
    const m = d.getMonth() + 1;
    if (months.includes(m)) return isoOf(d);
    d.setMonth(d.getMonth() + 1, 10);
  }
  return isoOf(d);
}

// ---- What the traveller wants to see ----------------------------------------------
export type WishId = 'green' | 'water' | 'blossom' | 'autumn' | 'snow' | 'beach' | 'any';
export interface Wish { id: WishId; icon: string; color: string; grad: string; label: string; tagline: string; months: number[] }
/** The first question: what kind of trip they dream of. Months are when it's really there to see. */
export const WISHES: Wish[] = [
  { id: 'green', icon: 'ph-tree-evergreen', color: '#1baf7a', grad: 'linear-gradient(160deg,#2EC48A,#0E8F68)', label: 'Lush green valleys', tagline: 'Meadows, lakes and pine forest, cool while the plains bake.', months: [5, 6, 7, 8, 9] },
  { id: 'water', icon: 'ph-drop', color: '#1B8FC9', grad: 'linear-gradient(160deg,#5BC6F0,#1767B8)', label: 'Waterfalls and lakes', tagline: 'Turquoise lakes and roaring falls, fullest in the summer melt.', months: [5, 6, 7, 8, 9] },
  { id: 'blossom', icon: 'ph-flower', color: '#E85D9A', grad: 'linear-gradient(160deg,#F59AC0,#D9468A)', label: 'Blossom season', tagline: 'Cherry and apricot flowers under snowy peaks.', months: [4] },
  { id: 'autumn', icon: 'ph-leaf', color: '#D9731A', grad: 'linear-gradient(160deg,#F5B04A,#C9561A)', label: 'Autumn colours', tagline: 'Golden poplars and red orchards across Gilgit-Baltistan.', months: [10, 11] },
  { id: 'snow', icon: 'ph-snowflake', color: '#3B8DFF', grad: 'linear-gradient(160deg,#8CC4FF,#3B6FD8)', label: 'Snowfall', tagline: 'Wake up to white hills and snow on the pine trees.', months: [12, 1, 2] },
  { id: 'beach', icon: 'ph-waves', color: '#0FA6B8', grad: 'linear-gradient(160deg,#5AD1D9,#1B7FB0)', label: 'Sea and beaches', tagline: 'Warm sun on a quiet coast while the north freezes.', months: [11, 12, 1, 2] }
];
export const wishOf = (id: WishId | null | undefined) => WISHES.find(w => w.id === id) || null;

/** Which wishes a highlight fulfils: its main kind, plus lakes and waterfalls where it has them. */
export function wishKinds(h: Highlight): WishId[] {
  if (h.wish) return [h.wish];
  const k = wishKind(h), out = k ? [k] : [];
  if (h.season === 'summer' && /lake|waterfall/i.test(h.text)) out.push('water');
  return out;
}

/** Which wish a highlight fulfils, if any. */
export function wishKind(h: Highlight): WishId | null {
  const x = h.text.toLowerCase();
  if (/beach|coast/.test(x)) return 'beach';
  if (/blossom/.test(x)) return 'blossom';
  // "Snow", "snowfall", "skiing", but not "snowy peaks" behind the blossom.
  if (/\bsnow\b|snowfall|\bski/.test(x)) return 'snow';
  if (/golden|autumn/.test(x)) return 'autumn';
  if (h.season === 'summer' && !/festival|polo/.test(x)) return 'green';
  return null;
}

/** Places to see a wish, the easy ones (no caution) first. */
/** Where most people go for each wish, in that order; other places follow. */
const TOP: Partial<Record<WishId, string[]>> = {
  snow: ['malam', 'neelum', 'murree', 'nathia', 'kalam', 'kumrat'],
  autumn: ['hunza', 'skardu', 'khaplu', 'passu', 'phander', 'neelum']
};
export function wishPlaces(id: WishId) {
  const top = TOP[id] || [], rank = (k: string) => top.includes(k) ? top.indexOf(k) : top.length;
  return DESTS.flatMap(d => {
    const h = highlightsOf(d.id).filter(x => wishKinds(x).includes(id)).sort((a, b) => +!!a.caution - +!!b.caution)[0];
    return h ? [{ id: d.id, name: d.name, h }] : [];
  }).sort((a, b) => rank(a.id) - rank(b.id) || +!!a.h.caution - +!!b.h.caution);
}
