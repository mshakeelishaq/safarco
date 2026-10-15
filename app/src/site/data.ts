// What the website shows about each destination, from the same guides the planner uses (with the admin's edits).
import { DESTS, riskOf } from '../engine/data';
import { DST, rangeTxt } from '../engine/places';
import { highlightIn, highlightsOf, monthsLabel } from '../engine/seasons';
import { airFor, trip } from '../engine/engine';
import { FOOD } from '../engine/food';
import { cardPhoto, ownPhoto } from '../photos';
import { fmtN } from '../engine/format';

export const PROVINCES = ['Gilgit-Baltistan', 'Khyber Pakhtunkhwa', 'Azad Kashmir', 'Punjab and Islamabad', 'Sindh', 'Balochistan'] as const;
export type Province = typeof PROVINCES[number];
export const provinceOf = (region: string): Province =>
  /GB|Gilgit|Baltistan/.test(region) ? 'Gilgit-Baltistan' : /KP|Khyber/.test(region) ? 'Khyber Pakhtunkhwa' : /Kashmir|AJK/.test(region) ? 'Azad Kashmir'
    : /Sindh/.test(region) ? 'Sindh' : /Balochistan/.test(region) ? 'Balochistan' : 'Punjab and Islamabad';

export const nowMonth = () => new Date().getMonth() + 1;
export const photoOf = (id: string, m = nowMonth()) => ownPhoto(id) || cardPhoto(id, m);
const best = (id: string) => DST(id).best || [];

/** A destination as a card: photo, one line, best months. */
export function card(id: string, m = nowMonth()) {
  const D = DST(id), h = highlightIn(id, m) || highlightsOf(id)[0], b = best(id);
  return { id, name: D.name, region: D.region, province: provinceOf(D.region), photo: photoOf(id, m), line: h?.text || (D.places[0] ? `${D.places[0][0]}: ${D.places[0][2]}` : ''),
    when: b.length ? rangeTxt(b).replace(/^best/, 'Best') : 'Good all year', inSeason: !b.length || b.includes(m), risk: riskOf(id)?.short || '', href: `/destinations/${id}` };
}
export const allCards = () => DESTS.map(d => card(d.id)).sort((a, b) => a.name.localeCompare(b.name));
/** In season now, SafarCo's favourites first. */
export function bestNow(n = 6) {
  const m = nowMonth(), fav = ['hunza', 'skardu', 'naran', 'kalam', 'fairy', 'neelum', 'chitral', 'khaplu', 'passu', 'shogran', 'murree', 'nathia', 'lahore', 'karachi', 'gwadar', 'mohenjo'];
  const rank = (id: string) => { const i = fav.indexOf(id); return i < 0 ? 99 : i; };
  return DESTS.filter(d => (best(d.id).includes(m) || highlightIn(d.id, m)) && !riskOf(d.id)).map(d => card(d.id, m)).sort((a, b) => rank(a.id) - rank(b.id)).slice(0, n);
}

/** Everything the guide page needs. */
export function guide(id: string) {
  const D = DST(id), m = nowMonth();
  const from = ['Islamabad', 'Lahore', 'Karachi'].map(city => { const t = trip(id, city, 7); return { city, km: fmtN(t.km), hours: t.hours, days: t.legDays, same: t.hours < 0.5 }; }).filter(x => !x.same);
  const air = airFor(id, 'Islamabad');
  return {
    ...card(id), D, best: best(id), warn: D.warn, highlights: highlightsOf(id).map(h => ({ ...h, when: monthsLabel(h.months) })),
    places: D.places.filter(p => !/^Top sights in|^Where to eat in/.test(p[0])).map(p => ({ name: p[0], where: p[1], note: p[2], months: p[3] ? monthsLabel(p[3]) : '', href: p[4] })),
    food: FOOD[id] || [], hotels: D.hotels || [], from, air: air ? `${air.dep} → ${air.arr}` : '', ft: D.ft, town: D.town,
    note: D.guideNote || '', checked: D.checked !== false, inSeasonNow: !best(id).length || best(id).includes(m), risk: riskOf(id) || null
  };
}
