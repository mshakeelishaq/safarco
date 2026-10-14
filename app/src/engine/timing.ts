// Clock times for a day of sightseeing from the hotel: the drive to each place, time there, lunch,
// a sunset place timed for the light, the drive back, and a warning when the day runs long.
import { PLACE_INFO } from './data';
import type { PlaceInfo } from './imported';
import { clock, dur, hav } from './format';
import { DST } from './places';
import { t } from '../i18n';
import type { StopItem } from './engine';

/** What a sightseeing day needs to be timed: where the hotel is, when to leave, and sunset. */
export interface DayClock { dest: string; leave: number; sunset: number; sunrise?: number }

const SPEED: Record<string, number> = { walk: 4, car: 30, rough: 20, '4x4': 15, jeep: 15, boat: 15, chairlift: 10 };
const infoOf = (dest: string, name: string): PlaceInfo | undefined =>
  PLACE_INFO[`${dest}|${name}`] || PLACE_INFO[Object.keys(PLACE_INFO).find(k => k.endsWith('|' + name)) || ''];

/** "30 km · 45 min", "1 h by jeep", "2–3 h hike" → hours, if the note gives a time. */
function hoursIn(note: string) {
  const h = /(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*h\b/.exec(note), m = /(\d+)\s*min\b/.exec(note);
  return (h ? +(h[2] || h[1]) : 0) + (m ? +m[1] / 60 : 0) || null;
}
const isHike = (note: string) => /hike|trek|walk up|on foot.*\d+\s*h/i.test(note);
/** Usual time at a place, in hours. */
function visitOf(name: string, note: string, i?: PlaceInfo) {
  if (isHike(note)) return Math.max(1.5, hoursIn(note) || 2, (i?.visit || 0) / 60);
  if (i?.visit) return i.visit / 60;
  return /meadow|valley|base camp|glacier|lake/i.test(name) ? 1.25 : /bazaar|museum|fort|palace|mosque/i.test(name) ? 1 : /view|point|bridge|gate|rock/i.test(name) ? 0.5 : 0.75;
}
const atSunset = (name: string, i?: PlaceInfo) => /desert|sunset/i.test(name) || i?.tod === 'sunset';

export interface TimedDay { stops: StopItem[]; back: number; warn: string; idle: number }

/**
 * Times a day's places, in the order given (a sunset place last). Each pin keeps its label, note and link.
 * `rest` (food tips and the like) follows the drive back.
 */
export function timeDay(pins: StopItem[], c: DayClock, rest: StopItem[] = []): TimedDay {
  // Some places have no road at all (Fairy Meadows): every move there is on foot.
  const D = DST(c.dest), onFoot = D.hub !== undefined, plains = (D.ft ?? D.ftEst ?? 0) < 1500, list = [...pins].map((p, j) => ({ p, j, i: infoOf(c.dest, p.label) }));
  list.sort((a, b) => +atSunset(a.p.label, a.i) - +atSunset(b.p.label, b.i) || a.j - b.j);
  // Road time between two points: the place's own figure from the hotel, else a winding-road estimate.
  let walked = false;
  const legH = (from: PlaceInfo | null, to: PlaceInfo | undefined, note: string) => {
    walked = false;
    if (onFoot) { const a = from?.lat != null ? from : { lat: D.lat, lon: D.lon }; return to?.lat != null ? hav(a.lat!, a.lon!, to.lat, to.lon!) * 1.3 / 3 : 0.25; }
    if (!from && to?.min) return to.min / 60;
    // Plains roads (Punjab, Sindh, the coast) are faster than mountain ones.
    const a = from?.lat != null ? from : { lat: D.lat, lon: D.lon }, car = plains ? 50 : 30, sp = !to?.access || to.access === 'car' || to.access === 'walk' ? car : SPEED[to.access] || 30;
    if (to?.lat != null && a.lat != null) { const km = hav(a.lat, a.lon!, to.lat, to.lon!) * 1.35; walked = km < 1.2; return walked ? km / 4 : km / sp; }
    if (!from && to?.km) return to.km / sp;
    return !from ? Math.min(hoursIn(note.split('·')[0]) ?? 0.33, 3) : 0.25;
  };
  const out: StopItem[] = [];
  let idle = 0, h = c.leave, lunch = false, prev: PlaceInfo | null = null, prevName = '';
  // A sunrise view is seen at first light, before breakfast.
  const dawn = list.filter(x => /sunrise/i.test(x.p.label));
  dawn.forEach(({ p }) => out.push({ ...p, time: clock((c.sunrise ?? 5.5) - 0.25), dur: t('At first light, before breakfast') }));
  list.splice(0, list.length, ...list.filter(x => !dawn.includes(x)));
  out.push({ time: clock(h), kind: 'go', label: t('Leave {place}', { place: D.town }), note: t('After breakfast at your hotel') });
  const drive = (x: number, walk = onFoot) => { if (x >= 0.08) out.push({ isDrive: true, walk: walk || walked, kind: 'drive', time: '', label: walk || walked ? t('{time} walk', { time: dur(x) }) : t('{time} drive', { time: dur(x) }), note: '' }); h += x; };
  const eat = (where: string) => { out.push({ time: clock(h), kind: 'food', label: t('Lunch'), note: where ? t('Near {place}', { place: where }) : '', dur: t('{n} min stop', { n: 45 }) }); h += 0.75; lunch = true; };
  list.forEach(({ p, i }) => {
    const note = p.note || '', go = legH(prev, i, note), stay = visitOf(p.label, note, i);
    // Lunch around midday, before a place that would push it past two.
    if (!lunch && prevName && (h >= 12 || (h + go + stay > 14 && h >= 11.5))) eat(prevName);
    if (atSunset(p.label, i)) {
      // Arrive for the last hour of light; time to spare before that is free.
      const want = c.sunset - Math.max(stay, 1) - go;
      if (want - h >= 1) { out.push({ time: clock(h), kind: 'tea', label: t('Free time'), note: t('Rest, or a cup of tea, before the sunset stop'), dur: dur(want - h) }); idle += want - h; h = want; }
    }
    drive(go);
    out.push({ ...p, time: clock(h), dur: t('About {time} here', { time: dur(stay) }) });
    h += stay; prev = i?.lat != null ? i : prev; prevName = p.label;
  });
  // Lunch after the last place, or packed when the day is out over midday with nowhere to stop.
  if (!lunch && prevName && h >= 12 && h <= 15.5) eat(prevName);
  else if (!lunch && c.leave < 12 && h > 15.5) out.splice(1, 0, { time: '', kind: 'food', label: t('Packed lunch'), note: t('Long stretch without a town at midday: carry food and water') });
  const last = prev as PlaceInfo | null;
  drive(last ? (last.min && !onFoot ? last.min / 60 : legH(last, { lat: D.lat, lon: D.lon }, '')) : 0.33);
  out.push({ time: clock(h), kind: 'bed', label: t('Back at your hotel'), note: t('In {place}', { place: D.town }) });
  // Back early with nothing more planned: the afternoon is free, and the places nearby can fill it.
  if (h < Math.min(15, c.sunset - 2)) out.push({ time: clock(h + 0.5), kind: 'tea', label: t('Free afternoon'), note: t('Rest, walk the bazaar, or add a place from the list below') });
  const dark = h > c.sunset + 0.5, long = h - c.leave > 11;
  const warn = long ? t('Long day: back about {time}. Leave earlier or drop a place.', { time: clock(h) }) : dark ? t('Back about {time}, after dark. Keep a torch and drive slowly.', { time: clock(h) }) : '';
  return { stops: [...out, ...rest.map(x => x.kind === 'food' && !x.time.includes(':') ? { ...x, time: clock(Math.max(h + 0.75, 19.5)) } : x)], back: h, warn, idle };
}
