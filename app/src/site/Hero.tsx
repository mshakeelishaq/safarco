// The home page's top: five photos for the season, a plan bar, and the visitor's little traveller walking the road.
import { useEffect, useReducer, useRef, useState } from 'react';
import { A } from './Site';
import { DESTS } from '../engine/data';
import { CITIES } from '../engine/places';
import { IG_HANDLE, IG_PROFILE } from '../contact';
import { TravellerFig } from '../components/TravellerFig';
import { heroSrcSet } from '../photos';
import { onTraveller, travellerNow } from '../traveller';

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: { id: SeasonId; label: string }[] = [{ id: 'spring', label: 'Spring' }, { id: 'summer', label: 'Summer' }, { id: 'autumn', label: 'Autumn' }, { id: 'winter', label: 'Winter' }];
/** Five of SafarCo's own photos for each season, each linked to its guide. */
export const SLIDES: Record<SeasonId, { src: string; place: string; id: string; pos?: string }[]> = {
  spring: [
    { src: '/photos/blossom.webp', place: 'Blossom under the snow peaks', id: 'hunza' },
    { src: '/photos/islamabad-jacaranda-path.webp', place: 'Jacaranda in Islamabad', id: 'islamabad' },
    { src: '/photos/model-town-04-apr.webp', place: 'Model Town Park, Lahore', id: 'lahore' },
    { src: '/photos/mushkpuri-daisies-mist.webp', place: 'Mushkpuri meadow, Nathia Gali', id: 'nathia' },
    { src: '/photos/islamabad-blossom-park.webp', place: 'White blossom in Islamabad', id: 'islamabad' }
  ],
  summer: [
    { src: '/photos/attabad-summer-cones.webp', place: 'Attabad Lake, Hunza', id: 'hunza' },
    { src: '/photos/ratti-gali-lake-flowers.webp', place: 'Ratti Gali Lake, Neelum', id: 'neelum' },
    { src: '/photos/saif-ul-malook-snow-peaks.webp', place: 'Lake Saif-ul-Malook, Naran', id: 'naran' },
    { src: '/photos/deosai-sheosar-horses.webp', place: 'Sheosar Lake, Deosai', id: 'skardu' },
    { src: '/photos/phander-lake-poplars.webp', place: 'Phander Lake, Ghizer', id: 'phander' }
  ],
  autumn: [
    { src: '/photos/autumn-hunza.webp', place: 'Hunza and Rakaposhi', id: 'hunza', pos: '50% 40%' },
    { src: '/photos/shangrila-autumn.webp', place: 'Shangrila, Skardu', id: 'skardu' },
    { src: '/photos/ghowari-poplar-avenue.webp', place: 'Ghowari poplars, Khaplu', id: 'khaplu' },
    { src: '/photos/hunza-autumn-peaks.webp', place: 'Nagar Valley', id: 'nagar' },
    { src: '/photos/naran-autumn-road.webp', place: 'The road into Naran', id: 'naran' }
  ],
  winter: [
    { src: '/photos/kaghan-winter-village.webp', place: 'Kaghan under snow', id: 'naran' },
    { src: '/photos/sharda-winter-valley.webp', place: 'Sharda, Neelum Valley', id: 'neelum' },
    { src: '/photos/shogran-winter-aerial.webp', place: 'Shogran', id: 'shogran' },
    { src: '/photos/murree-winter-snow-road.webp', place: 'Snow on the Murree road', id: 'murree' },
    { src: '/photos/lahore-winter-fog-road.webp', place: 'Winter fog in Lahore', id: 'lahore' }
  ]
};
export const seasonNow = (m = new Date().getMonth() + 1): SeasonId => (m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter');
export const SLIDE_MS = 6500;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useTraveller() {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => onTraveller(bump), []);
  return travellerNow();
}

/** The planner, from the website: with the chosen traveller, and the city, place and date when given. */
export function planHref(p: { from?: string; to?: string; date?: string } = {}) {
  const q = new URLSearchParams();
  if (p.to) q.set('go', p.to); else q.set('start', '1');
  if (p.from) q.set('from', p.from);
  if (p.date) q.set('date', p.date);
  const who = localStorageTraveller(); if (who) q.set('as', who);
  return `/plan?${q}`;
}
const localStorageTraveller = () => { try { return localStorage.getItem('safarco-traveller'); } catch { return null; } };

function PlanBar() {
  const [from, setFrom] = useState(() => { try { return localStorage.getItem('safarco-from') || ''; } catch { return ''; } });
  const [to, setTo] = useState(''), [date, setDate] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const city = CITIES.find(c => c.n.toLowerCase() === from.trim().toLowerCase())?.n;
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (city) { try { localStorage.setItem('safarco-from', city); } catch { /* storage blocked */ } }
    location.href = planHref({ from: city, to: to || undefined, date: date && date >= today ? date : undefined });
  };
  const dests = DESTS.filter(d => !d.id.startsWith('city:')).slice().sort((a, b) => a.name.localeCompare(b.name));
  return (
    <form className="planbar" onSubmit={go} aria-label="Plan a trip">
      <label className="pb-f"><span><i className="ph-fill ph-map-pin" />From</span>
        <input list="pb-cities" value={from} onChange={e => setFrom(e.target.value)} placeholder="Your city" autoComplete="off" />
        <datalist id="pb-cities">{CITIES.map(c => <option key={c.n} value={c.n} />)}</datalist>
      </label>
      <label className="pb-f"><span><i className="ph-fill ph-mountains" />To</span>
        <select value={to} onChange={e => setTo(e.target.value)}>
          <option value="">Anywhere: suggest one</option>
          {dests.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <label className="pb-f"><span><i className="ph-fill ph-calendar-blank" />When</span>
        <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} />
      </label>
      <button className="btn btn-sun pb-go" type="submit">Plan my trip <i className="ph-bold ph-arrow-right" /></button>
    </form>
  );
}

/** The road along the bottom of the photo, and the traveller on it: drifting towards the mouse, walking on its own, or with the scroll on phones. */
function RoadWalker() {
  const who = useTraveller(), box = useRef<HTMLDivElement>(null), fig = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(1200);
  const H = 64, y = (x: number) => 38 + 9 * Math.sin(x / 150) + 4 * Math.sin(x / 61);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = box.current, f = fig.current, hero = el?.closest('.hero2') as HTMLElement | null; if (!el || !f || !hero) return;
    const width = () => el.clientWidth;
    let x = width() * 0.12, target = width() * 0.3, dir = 1, wait = 0, mouse: number | null = null, raf = 0, last = performance.now();
    const place = () => { f.style.transform = `translate(${x - 30}px, ${y(x) - 57}px) scaleX(${dir})`; };
    if (reduced()) { place(); return; }
    const fast = who === 'family' || who === 'biker';
    const hover = matchMedia('(hover: hover)').matches;
    const onMove = (e: MouseEvent) => { const r = el.getBoundingClientRect(); mouse = Math.max(30, Math.min(r.width - 30, e.clientX - r.left)); };
    const onLeave = () => { mouse = null; };
    const onScroll = () => { if (hover) return; const p = Math.min(1, scrollY / Math.max(1, hero.offsetHeight * 0.8)); target = width() * (0.08 + 0.84 * p); wait = 90; };
    hero.addEventListener('mousemove', onMove); hero.addEventListener('mouseleave', onLeave); addEventListener('scroll', onScroll, { passive: true });
    const tick = (now: number) => {
      const dt = Math.min(50, now - last) / 16.7; last = now;
      if (mouse != null) target = mouse;
      else if (Math.abs(target - x) < 3) { if (wait > 0) wait -= dt; else { target = width() * (0.06 + Math.random() * 0.88); wait = 60 + Math.random() * 120; } }
      const d = target - x, step = (fast ? 3.2 : 1.7) * dt, moving = Math.abs(d) > 2;
      if (moving) { x += Math.sign(d) * Math.min(Math.abs(d), step); dir = d > 0 ? 1 : -1; }
      f.classList.toggle('walking', moving);
      place(); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); hero.removeEventListener('mousemove', onMove); hero.removeEventListener('mouseleave', onLeave); removeEventListener('scroll', onScroll); };
  }, [who]);
  const d = Array.from({ length: Math.ceil(w / 16) + 1 }, (_, i) => { const x = Math.min(w, i * 16); return `${i ? 'L' : 'M'}${x.toFixed(0)} ${y(x).toFixed(1)}`; }).join(' ');
  return (
    <div className="road" ref={box} aria-hidden="true">
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`}>
        <path d={d} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="10" strokeLinecap="round" />
        <path d={d} fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
      </svg>
      <div className="walker" ref={fig}><TravellerFig id={who} size={60} /></div>
    </div>
  );
}

export function Hero() {
  const [season, setSeason] = useState<SeasonId>(seasonNow), [i, setI] = useState(0), [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set([SLIDES[seasonNow()][0].src]));
  const slides = SLIDES[season], n = slides.length, touch = useRef<number | null>(null);
  const show = (k: number) => setI((k + n) % n);
  // Each photo loads when it's next, so the page opens on one photo.
  useEffect(() => { setSeen(s => new Set([...s, slides[i].src, slides[(i + 1) % n].src])); }, [i, slides, n]);
  // The photo moves on when its progress line fills (paused while the mouse is over the photo).
  const pick = (id: SeasonId) => { setSeason(id); setI(0); };
  const cur = slides[i], href = DESTS.some(d => d.id === cur.id) ? `/destinations/${cur.id}` : '/destinations';
  return (
    <section className="hero2" data-season={season} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={e => { const s = touch.current; touch.current = null; if (s == null) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); }}
      aria-roledescription="carousel" aria-label={`${SEASONS.find(s => s.id === season)!.label} in Pakistan`}>
      <div className="h-slides">
        {slides.map((s, k) => <div key={season + s.src} className={`h-slide${k === i ? ' on' : ''}`} aria-hidden={k !== i}>
          {seen.has(s.src) && <img src={s.src} srcSet={heroSrcSet(s.src)} sizes="100vw" alt={k === i ? s.place : ''} fetchPriority={k === 0 ? 'high' : 'low'} style={{ objectPosition: s.pos || 'center' }} />}
        </div>)}
      </div>
      <div className="h-shade" />
      <div className="site-wrap h-body">
        <div className="kicker h-kicker">Pakistan trip planner</div>
        <h1>Your days. Your budget. Your perfect trip across Pakistan.</h1>
        <p className="lead">Tell SafarCo where you’re starting, how many days you have and what you want to see. Get the whole trip: the route, every stop, where to stay and what it costs.</p>
        <PlanBar />
        <div className="hero-trust"><span><i className="ph-fill ph-check-circle" />Free</span><span><i className="ph-fill ph-check-circle" />No sign-up</span><span><i className="ph-fill ph-check-circle" />{DESTS.length} destinations</span><span><i className="ph-fill ph-check-circle" />Works offline</span>
          <a href="/plan?start=quick" className="h-quick"><i className="ph-fill ph-magic-wand" />Or let SafarCo plan it: 2 questions</a></div>
      </div>
      <div className="site-wrap h-foot">
        <div className="h-seasons" role="tablist" aria-label="Season">
          {SEASONS.map(s => <button key={s.id} role="tab" aria-selected={s.id === season} onClick={() => pick(s.id)}>{s.label}</button>)}
        </div>
        <div className="h-bars">
          {slides.map((s, k) => <button key={season + k} onClick={() => show(k)} aria-label={`Photo ${k + 1}: ${s.place}`} aria-current={k === i}>
            <span className={k < i ? 'full' : k === i ? `run${paused ? ' hold' : ''}` : ''} style={k === i ? { animationDuration: `${SLIDE_MS}ms` } : undefined} key={k === i ? `${season}-${i}` : k}
              onAnimationEnd={k === i ? () => show(i + 1) : undefined} />
          </button>)}
        </div>
        <div className="h-cap"><A href={href}>{cur.place} · {SEASONS.find(s => s.id === season)!.label}</A><a href={IG_PROFILE} target="_blank" rel="noreferrer"><i className="ph-fill ph-instagram-logo" />{IG_HANDLE}</a></div>
      </div>
      <RoadWalker />
    </section>
  );
}
