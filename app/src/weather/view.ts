// What the trip screen shows about weather: the road day by day, passes, the destination,
// air quality, a weather-aware departure time and a packing list.
import type { Plan, TripState } from '../engine/engine';
import { clock, dayLabel, fmtN, isoAdd } from '../engine/format';
import { WMO } from '../engine/live';
import { DST, cityOr } from '../engine/places';
import { t } from '../i18n';
import { airQuality, bestDeparture, pointWx, type Flag, type PointWx, type RoutePoint, type WeatherPlan } from './route';

export const wxText = (c: number | null) => c == null ? '' : c === 0 ? t('Clear') : c <= 2 ? t('Partly cloudy') : c === 3 ? t('Cloudy') : c <= 48 ? t('Fog') : c <= 57 ? t('Drizzle') : c <= 67 ? t('Rain') : c <= 77 ? t('Snow') : c <= 82 ? t('Showers') : c <= 86 ? t('Snow showers') : t('Thunderstorm');
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
    const sky = x ? wxText(x.code).toLowerCase() || t('no data') : '';
    const text = x ? `${x.typical ? t('Usually {weather}', { weather: sky }) : sky}${x.typical ? ` · ${fmtT(x.hi)}/${fmtT(x.lo)}` : ''}${x.gust != null && !x.typical && x.gust >= 35 ? ` · ${t('gusts {n} km/h', { n: Math.round(x.gust) })}` : ''}` : t('Loading…');
    st.samples.push({ key: `${p.day}-${p.km}-${p.label}`, time: clock(hour), label: p.pass ? `${p.label} · ${fmtN(p.ft!)} ft` : p.label, icon, color: x ? color : 'var(--mute)', temp: fmtT(x?.temp), text, flags: x?.flags || [] });
    // One line per place, worst hazard first: "2:50 pm · Babusar Top: snow on the road, icy road risk".
    if (x?.flags.length && !st.flags.some(g => g.key === `${p.day}-${p.label}`)) {
      const fl = [...x.flags].sort((a, b) => (a.level === 'danger' ? 0 : 1) - (b.level === 'danger' ? 0 : 1));
      st.flags.push({ key: `${p.day}-${p.label}`, level: fl[0].level, icon: fl[0].icon, text: `${x.typical ? '' : `${clock(hour)} · `}${p.label}: ${fl.map((f, i) => i ? f.text.charAt(0).toLowerCase() + f.text.slice(1) : f.text).join(', ')}` });
    }
    strips.set(p.day, st);
    if (p.outbound) mapPts.push({ lat: p.lat, lon: p.lon, color: wxColor(x), label: p.label, day: p.day, text: `${t('Day {n}', { n: p.day + 1 })} · ${clock(hour)} · ${p.label}: ${x ? `${fmtT(x.temp)}, ${wxText(x.code).toLowerCase()}${x.flags.length ? ` · ${x.flags.map(f => f.text).join(', ')}` : ''}` : t('no weather yet')}` });
  }

  // Passes on the route, at the hour you cross.
  const passes = all.filter(a => a.p.pass).map(({ p, x }) => ({
    key: `${p.day}-${p.label}`, name: p.label, ft: `${fmtN(p.ft!)} ft`, when: t('Day {n} · {date} · around {time}', { n: p.day + 1, date: dayLabel(p.iso, 0), time: clock(plan.dep + p.offsetH) }),
    icon: WMO(x?.code ?? null)[0], color: wxColor(x), temp: fmtT(x?.temp),
    text: !x ? t('Loading…') : x.typical
      ? t('Usually {hi} by day, {lo} at night. Snow on these dates in {n} of the last {years} years.', { hi: fmtT(x.hi), lo: fmtT(x.lo), n: String(x.snowYears), years: String(x.years) })
      : [wxText(x.code), x.gust != null ? t('gusts {n} km/h', { n: Math.round(x.gust) }) : '', x.snow > 0 ? t('{n} cm snow per hour', { n: x.snow.toFixed(1) }) : '', x.prob != null ? t('{pct}% chance of rain or snow', { pct: x.prob }) : '',
        x.freeze != null ? (x.freeze < (p.ft! * 0.3048) ? t('freezing level {ft} ft, below the pass', { ft: fmtN(Math.round(x.freeze / 0.3048 / 100) * 100) }) : t('freezing level {ft} ft', { ft: fmtN(Math.round(x.freeze / 0.3048 / 100) * 100) })) : ''].filter(Boolean).join(' · '),
    flags: x?.flags || [], typical: !!x?.typical
  }));

  // The destination, day by day (forecast where it reaches, typical after that).
  const destDays = plan.days.map((d, i) => {
    const x = pointWx(w, { iso: d.iso!, lat: D.lat, lon: D.lon, mtn: (D.ft || 0) >= 4000 }, 13, bike);
    if (!x) return null;
    const [icon, color] = WMO(x.code);
    const wet = x.typical ? (x.snowYears ? t('Snow {n}/{years} yrs', { n: x.snowYears, years: String(x.years) }) : x.rainYears ? t('Rain {n}/{years} yrs', { n: x.rainYears, years: String(x.years) }) : '') : x.prob != null && x.prob >= 30 ? t('{pct}% rain', { pct: x.prob }) : '';
    return { key: d.iso!, snowy: !!(x.typical && x.snowYears), day: dayLabel(d.iso!, 0).split(' ').slice(0, 2).join(' '), icon, color, hi: x.hi != null ? Math.round(x.hi) : null, lo: x.lo != null ? Math.round(x.lo) : null, wet, typical: x.typical, idx: i };
  });
  const destKnown = destDays.filter((x): x is NonNullable<typeof x> => !!x);

  // Air quality.
  const aq = airQuality(w);
  const m = +s.startDate.slice(5, 7), plains = [cityOr(s.origin), ...plan.days.filter(d => d.stay).map(d => ({ lat: d.stay!.lat, lon: d.stay!.lon }))].some(p => p.lat < 33.9 && p.lon > 70 && p.lon < 75.5);
  const smogSeason = [11, 12, 1].includes(m) && plains;
  const aqNote = aq.rows.length ? '' : smogSeason ? t('November to January is smog season in Punjab, especially Lahore. The air-quality forecast appears 5 days before you travel.') : aq.inRange ? '' : t('Air-quality forecasts appear 5 days before you travel.');

  // Departure time that dodges the worst weather.
  const depart = bestDeparture(w, plan, points, bike);

  // Packing list from the coldest, hottest and wettest parts of the trip.
  const temps = all.map(a => a.x).filter((x): x is PointWx => !!x);
  const coldest = all.reduce<{ t: number; where: string } | null>((a, { p, x }) => { const t = x ? (x.typical ? x.lo! : Math.min(x.temp ?? 99, x.lo ?? 99)) : 99; return t < (a?.t ?? 99) ? { t, where: p.label } : a; }, null);
  const destLo = destKnown.reduce((a, x) => Math.min(a, x.lo ?? 99), 99), destHi = destKnown.reduce((a, x) => Math.max(a, x.hi ?? -99), -99);
  const minT = Math.min(coldest?.t ?? 99, destLo), maxT = Math.max(...temps.map(x => x.typical ? x.hi! : x.temp ?? -99), destHi);
  const wet = temps.some(x => x.flags.some(f => f.kind === 'rain') || (x.code != null && x.code >= 51)) || destKnown.some(x => x.wet);
  const snowy = temps.some(x => x.flags.some(f => f.kind === 'snow' || f.kind === 'ice')) || destKnown.some(x => x.snowy);
  const highFt = Math.max(D.ft || 0, ...points.filter(p => p.ft).map(p => p.ft!));
  const north = points.some(p => p.mtn) || (D.ft || 0) >= 4000;
  const coldWhere = coldest && coldest.t === minT ? coldest.where : D.town;
  const pack: { key: string; item: string; why: string }[] = [];
  const add = (key: string, item: string, why: string) => pack.push({ key, item, why });
  const known = temps.length > 0 || destKnown.length > 0;
  if (known && minT <= 0) add('down', t('Down jacket, gloves and a warm hat'), t('Down to {temp}° at {place}', { temp: Math.round(minT), place: coldWhere }));
  else if (known && minT <= 8) add('jacket', t('Warm jacket or fleece'), t('Down to {temp}° at {place}', { temp: Math.round(minT), place: coldWhere }));
  else if (known && minT <= 15) add('sweater', t('A sweater for evenings'), t('Evenings around {temp}°', { temp: Math.round(minT) }));
  if (known && maxT >= 35) add('heat', t('Light cotton clothes, a cap and 2–3 litres of water per person a day'), t('Up to {temp}° on the way', { temp: Math.round(maxT) }));
  if (wet) add('rain', t('Rain jacket or umbrella'), t('Rain expected on some days'));
  if (snowy) add('snow', t('Waterproof boots; ask locally about snow chains before mountain roads'), t('Snow or ice possible'));
  if (highFt >= 9000) add('sun', t('Sunscreen and sunglasses'), t('Strong sun at {ft} ft', { ft: fmtN(highFt) }));
  if (highFt >= 11000) add('alt', t('Water and light snacks for high passes; go slowly if you feel dizzy'), t('Crossing {ft} ft', { ft: fmtN(highFt) }));
  if (s.elders) add('meds', t('BP and heart medicines, and any regular medicines'), t('Elders travelling at altitude'));
  if (s.kids && north) add('kids', t('Snacks and travel-sickness tablets for winding roads'), t('Kids on mountain roads'));
  if (aq.rows.some(r => r.bad) || smogSeason) add('mask', t('N95 masks'), smogSeason ? t('Smog season in Punjab') : t('Unhealthy air forecast'));
  add('id', t('CNIC (and passport for foreign visitors)'), north ? t('Checkposts on northern roads') : t('Hotels ask for ID'));
  add('power', t('Power bank and the offline map (Offline tab)'), north ? t('Little signal past Chilas and in valleys') : t('For long drives'));
  if (north) add('cash', t('Enough cash'), t('ATMs are few in the mountains'));
  add('firstaid', t('First-aid kit'), t('Always'));

  const anyFc = !!w.fcStart, loading = points.some(p => !strips.get(p.day)?.samples.length) || [...strips.values()].some(st => st.loading);
  return {
    strips, mapPts, passes, destDays: destKnown, destLoading: !destKnown.length,
    aq: { ...aq, note: aqNote }, depart, pack,
    note: anyFc ? (w.needTypical ? t('Hourly forecast where it reaches (until {date}); typical weather for later days.', { date: dayLabel(isoAdd(15), 0) }) : t('Hourly forecast from Open-Meteo. Most reliable 3–5 days ahead.')) : t('Your dates are more than 16 days away, so this shows what the last 5 years were like on the same dates. The hourly forecast appears 16 days before you travel.'),
    /** True when every day is typical weather (no forecast yet); use this rather than matching the note text. */
    typicalOnly: !anyFc,
    loading
  };
}
export type WeatherView = ReturnType<typeof weatherView>;
