// What the trip screen shows about weather: the road day by day, passes, the destination,
// air quality, a weather-aware departure time and a packing list.
import type { Plan, TripState } from '../engine/engine';
import { clock, dayLabel, fmtN, isoAdd } from '../engine/format';
import { WMO } from '../engine/live';
import { DST, cityOr } from '../engine/places';
import { airQuality, bestDeparture, pointWx, type Flag, type PointWx, type RoutePoint, type WeatherPlan } from './route';

export const wxText = (c: number | null) => c == null ? '' : c === 0 ? 'Clear' : c <= 2 ? 'Partly cloudy' : c === 3 ? 'Cloudy' : c <= 48 ? 'Fog' : c <= 57 ? 'Drizzle' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : c <= 86 ? 'Snow showers' : 'Thunderstorm';
/** Colour on the map and in the strips: worst hazard first, then the sky. */
export const wxColor = (x: PointWx | null) => {
  if (!x) return '#9AA3AB';
  if (x.flags.some(f => f.level === 'danger')) return '#E5484D';
  if (x.flags.some(f => f.kind === 'snow') || (x.code != null && x.code >= 71 && x.code <= 86 && x.code !== 80 && x.code !== 81 && x.code !== 82)) return '#5BB8F5';
  if (x.flags.some(f => f.kind === 'rain') || (x.code != null && ((x.code >= 51 && x.code <= 67) || (x.code >= 80 && x.code <= 82)))) return '#2F6FED';
  if (x.flags.some(f => f.kind === 'fog')) return '#8E8E93';
  if (x.flags.length) return '#F2A007';
  return '#2EB67D';
};

const fmtT = (t: number | null | undefined) => t == null ? '–' : `${Math.round(t)}°`;

export function weatherView(s: TripState, plan: Plan, points: RoutePoint[], w: WeatherPlan) {
  const bike = s.vehicle === 'bike', D = DST(s.corridor);
  const atPoint = (p: RoutePoint) => pointWx(w, p, plan.dep + p.offsetH, bike);

  // Road strips, one per driving day.
  const strips = new Map<number, { samples: { key: string; time: string; label: string; icon: string; color: string; temp: string; text: string; flags: Flag[] }[]; flags: { key: string; level: Flag['level']; icon: string; text: string }[]; typical: boolean; loading: boolean }>();
  const mapPts: { lat: number; lon: number; color: string; label: string; text: string; day: number }[] = [];
  const all: { p: RoutePoint; x: PointWx | null }[] = [];
  for (const p of points) {
    const x = atPoint(p), hour = plan.dep + p.offsetH, [icon, color] = WMO(x?.code ?? null);
    all.push({ p, x });
    const st = strips.get(p.day) || { samples: [], flags: [], typical: false, loading: false };
    st.typical = st.typical || !!x?.typical; st.loading = st.loading || !x;
    const text = x ? `${x.typical ? 'Usually ' : ''}${wxText(x.code).toLowerCase() || 'no data'}${x.typical ? ` · ${fmtT(x.hi)}/${fmtT(x.lo)}` : ''}${x.gust != null && !x.typical && x.gust >= 35 ? ` · gusts ${Math.round(x.gust)} km/h` : ''}` : 'Loading…';
    st.samples.push({ key: `${p.day}-${p.km}-${p.label}`, time: clock(hour), label: p.pass ? `${p.label} · ${fmtN(p.ft!)} ft` : p.label, icon, color: x ? color : 'var(--mute)', temp: fmtT(x?.temp), text, flags: x?.flags || [] });
    // One line per place, worst hazard first: "2:50 pm · Babusar Top: snow on the road, icy road risk".
    if (x?.flags.length && !st.flags.some(g => g.key === `${p.day}-${p.label}`)) {
      const fl = [...x.flags].sort((a, b) => (a.level === 'danger' ? 0 : 1) - (b.level === 'danger' ? 0 : 1));
      st.flags.push({ key: `${p.day}-${p.label}`, level: fl[0].level, icon: fl[0].icon, text: `${x.typical ? '' : `${clock(hour)} · `}${p.label}: ${fl.map((f, i) => i ? f.text.charAt(0).toLowerCase() + f.text.slice(1) : f.text).join(', ')}` });
    }
    strips.set(p.day, st);
    if (p.outbound) mapPts.push({ lat: p.lat, lon: p.lon, color: wxColor(x), label: p.label, day: p.day, text: `Day ${p.day + 1} · ${clock(hour)} · ${p.label}: ${x ? `${fmtT(x.temp)}, ${wxText(x.code).toLowerCase()}${x.flags.length ? ` · ${x.flags.map(f => f.text).join(', ')}` : ''}` : 'no weather yet'}` });
  }

  // Passes on the route, at the hour you cross.
  const passes = all.filter(a => a.p.pass).map(({ p, x }) => ({
    key: `${p.day}-${p.label}`, name: p.label, ft: `${fmtN(p.ft!)} ft`, when: `Day ${p.day + 1} · ${dayLabel(p.iso, 0)} · around ${clock(plan.dep + p.offsetH)}`,
    icon: WMO(x?.code ?? null)[0], color: wxColor(x), temp: fmtT(x?.temp),
    text: !x ? 'Loading…' : x.typical
      ? `Usually ${fmtT(x.hi)} by day, ${fmtT(x.lo)} at night. Snow on these dates in ${x.snowYears} of the last ${x.years} years.`
      : [wxText(x.code), x.gust != null ? `gusts ${Math.round(x.gust)} km/h` : '', x.snow > 0 ? `${x.snow.toFixed(1)} cm snow per hour` : '', x.prob != null ? `${x.prob}% chance of rain or snow` : '',
        x.freeze != null ? (x.freeze < (p.ft! * 0.3048) ? `freezing level ${fmtN(Math.round(x.freeze / 0.3048 / 100) * 100)} ft, below the pass` : `freezing level ${fmtN(Math.round(x.freeze / 0.3048 / 100) * 100)} ft`) : ''].filter(Boolean).join(' · '),
    flags: x?.flags || [], typical: !!x?.typical
  }));

  // The destination, day by day (forecast where it reaches, typical after that).
  const destDays = plan.days.map((d, i) => {
    const x = pointWx(w, { iso: d.iso!, lat: D.lat, lon: D.lon, mtn: (D.ft || 0) >= 4000 }, 13, bike);
    if (!x) return null;
    const [icon, color] = WMO(x.code);
    const wet = x.typical ? (x.snowYears ? `Snow ${x.snowYears}/${x.years} yrs` : x.rainYears ? `Rain ${x.rainYears}/${x.years} yrs` : '') : x.prob != null && x.prob >= 30 ? `${x.prob}% rain` : '';
    return { key: d.iso!, day: dayLabel(d.iso!, 0).split(' ').slice(0, 2).join(' '), icon, color, hi: x.hi != null ? Math.round(x.hi) : null, lo: x.lo != null ? Math.round(x.lo) : null, wet, typical: x.typical, idx: i };
  });
  const destKnown = destDays.filter((x): x is NonNullable<typeof x> => !!x);
  const fcCount = destKnown.filter(x => !x.typical).length, typCount = destKnown.length - fcCount;
  const source = fcCount && typCount ? `Forecast for ${fcCount} day${fcCount > 1 ? 's' : ''}, then typical for these dates (${w.years[w.years.length - 1]}–${w.years[0]})`
    : fcCount ? 'Forecast · Open-Meteo' : typCount ? `Typical for these dates, ${w.years[w.years.length - 1]}–${w.years[0]} · Open-Meteo` : '';
  const destSummary = destKnown.length ? (() => {
    const hi = destKnown.map(x => x.hi!).filter(x => x != null), lo = destKnown.map(x => x.lo!).filter(x => x != null);
    const rng = (a: number[]) => Math.min(...a) === Math.max(...a) ? `${a[0]}` : `${Math.min(...a)} to ${Math.max(...a)}`;
    return hi.length ? `Highs ${rng(hi)}°C, lows ${rng(lo)}°C.${Math.min(...lo) <= 0 ? ' Below freezing at night.' : ''}` : '';
  })() : '';

  // Air quality.
  const aq = airQuality(w);
  const m = +s.startDate.slice(5, 7), plains = [cityOr(s.origin), ...plan.days.filter(d => d.stay).map(d => ({ lat: d.stay!.lat, lon: d.stay!.lon }))].some(p => p.lat < 33.9 && p.lon > 70 && p.lon < 75.5);
  const smogSeason = [11, 12, 1].includes(m) && plains;
  const aqNote = aq.rows.length ? '' : smogSeason ? 'November to January is smog season in Punjab, especially Lahore. The air-quality forecast appears 5 days before you travel.' : aq.inRange ? '' : 'Air-quality forecasts appear 5 days before you travel.';

  // Departure time that dodges the worst weather.
  const depart = bestDeparture(w, plan, points, bike);

  // Packing list from the coldest, hottest and wettest parts of the trip.
  const temps = all.map(a => a.x).filter((x): x is PointWx => !!x);
  const coldest = all.reduce<{ t: number; where: string } | null>((a, { p, x }) => { const t = x ? (x.typical ? x.lo! : Math.min(x.temp ?? 99, x.lo ?? 99)) : 99; return t < (a?.t ?? 99) ? { t, where: p.label } : a; }, null);
  const destLo = destKnown.reduce((a, x) => Math.min(a, x.lo ?? 99), 99), destHi = destKnown.reduce((a, x) => Math.max(a, x.hi ?? -99), -99);
  const minT = Math.min(coldest?.t ?? 99, destLo), maxT = Math.max(...temps.map(x => x.typical ? x.hi! : x.temp ?? -99), destHi);
  const wet = temps.some(x => x.flags.some(f => f.kind === 'rain') || (x.code != null && x.code >= 51)) || destKnown.some(x => x.wet);
  const snowy = temps.some(x => x.flags.some(f => f.kind === 'snow' || f.kind === 'ice')) || destKnown.some(x => /Snow/.test(x.wet));
  const highFt = Math.max(D.ft || 0, ...points.filter(p => p.ft).map(p => p.ft!));
  const north = points.some(p => p.mtn) || (D.ft || 0) >= 4000;
  const coldWhere = coldest && coldest.t === minT ? coldest.where : D.town;
  const pack: { key: string; item: string; why: string }[] = [];
  const add = (key: string, item: string, why: string) => pack.push({ key, item, why });
  const known = temps.length > 0 || destKnown.length > 0;
  if (known && minT <= 0) add('down', 'Down jacket, gloves and a warm hat', `Down to ${Math.round(minT)}° at ${coldWhere}`);
  else if (known && minT <= 8) add('jacket', 'Warm jacket or fleece', `Down to ${Math.round(minT)}° at ${coldWhere}`);
  else if (known && minT <= 15) add('sweater', 'A sweater for evenings', `Evenings around ${Math.round(minT)}°`);
  if (known && maxT >= 35) add('heat', 'Light cotton clothes, a cap and 2–3 litres of water per person a day', `Up to ${Math.round(maxT)}° on the way`);
  if (wet) add('rain', 'Rain jacket or umbrella', 'Rain expected on some days');
  if (snowy) add('snow', 'Waterproof boots; ask locally about snow chains before mountain roads', 'Snow or ice possible');
  if (highFt >= 9000) add('sun', 'Sunscreen and sunglasses', `Strong sun at ${fmtN(highFt)} ft`);
  if (highFt >= 11000) add('alt', 'Water and light snacks for high passes; go slowly if you feel dizzy', `Crossing ${fmtN(highFt)} ft`);
  if (s.elders) add('meds', 'BP and heart medicines, and any regular medicines', 'Elders travelling at altitude');
  if (s.kids && north) add('kids', 'Snacks and travel-sickness tablets for winding roads', 'Kids on mountain roads');
  if (aq.rows.some(r => r.bad) || smogSeason) add('mask', 'N95 masks', smogSeason ? 'Smog season in Punjab' : 'Unhealthy air forecast');
  add('id', 'CNIC (and passport for foreign visitors)', north ? 'Checkposts on northern roads' : 'Hotels ask for ID');
  add('power', 'Power bank and the offline map (Offline tab)', north ? 'Little signal past Chilas and in valleys' : 'For long drives');
  if (north) add('cash', 'Enough cash', 'ATMs are few in the mountains');
  add('firstaid', 'First-aid kit', 'Always');

  const anyFc = !!w.fcStart, loading = points.some(p => !strips.get(p.day)?.samples.length) || [...strips.values()].some(st => st.loading);
  return {
    strips, mapPts, passes, destDays: destKnown, destSource: source, destSummary, destLoading: !destKnown.length,
    aq: { ...aq, note: aqNote }, depart, pack,
    note: anyFc ? (w.needTypical ? `Hourly forecast where it reaches (until ${dayLabel(isoAdd(15), 0)}); typical weather for later days.` : 'Hourly forecast from Open-Meteo. Most reliable 3–5 days ahead.') : 'Your dates are more than 16 days away, so this shows what the last 5 years were like on the same dates. The hourly forecast appears 16 days before you travel.',
    loading
  };
}
export type WeatherView = ReturnType<typeof weatherView>;
