// /preview: a first look at the new SafarCo website. Planning first: the season's photos sliding behind the title,
// "Plan your trip in 2 minutes" and the plan bar; then every destination as big photo cards. The current website stays as it is.
import { useEffect, useMemo, useRef, useState } from 'react';
import { planHref, seasonNow, SEASONS, SLIDE_MS, SLIDES, type SeasonId } from '../site/Hero';
import { Grid } from './Grid';
import { ringDests } from './data';
import { DESTS } from '../engine/data';
import { CITIES } from '../engine/places';
import './preview.css';

const fine = () => matchMedia('(pointer: fine)').matches;

/** A dot that follows the mouse and grows into a label over photos and links (mouse only). */
function Cursor() {
  const el = useRef<HTMLDivElement>(null), [label, setLabel] = useState('');
  useEffect(() => {
    if (!fine()) return;
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, raf = 0;
    const mv = (e: PointerEvent) => { x = e.clientX; y = e.clientY; const t = (e.target as Element)?.closest?.('[data-cursor]'); setLabel(t ? t.getAttribute('data-cursor') || '' : ''); };
    const frame = () => { raf = requestAnimationFrame(frame); cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; if (el.current) el.current.style.transform = `translate(${cx}px, ${cy}px)`; };
    addEventListener('pointermove', mv); raf = requestAnimationFrame(frame);
    return () => { removeEventListener('pointermove', mv); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={el} className={`pv-cursor${label ? ' big' : ''}`} aria-hidden="true"><span>{label}</span></div>;
}

/** The main thing: from, to, when, and straight into the planner (the planner asks the rest). */
function PlanBar({ barRef }: { barRef: React.RefObject<HTMLFormElement | null> }) {
  const [from, setFrom] = useState(() => { try { return localStorage.getItem('safarco-from') || ''; } catch { return ''; } });
  const [to, setTo] = useState(''), [date, setDate] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const city = CITIES.find(c => c.n.toLowerCase() === from.trim().toLowerCase())?.n;
  const dests = useMemo(() => DESTS.filter(d => !d.id.startsWith('city:')).slice().sort((a, b) => a.name.localeCompare(b.name)), []);
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (city) { try { localStorage.setItem('safarco-from', city); } catch { /* storage blocked */ } }
    location.href = planHref({ from: city, to: to || undefined, date: date && date >= today ? date : undefined });
  };
  return (
    <form ref={barRef} className="pv-plan" onSubmit={go} aria-label="Plan a trip">
      <label><span>From</span><input list="pv-cities" value={from} onChange={e => setFrom(e.target.value)} placeholder="Your city" autoComplete="off" /><datalist id="pv-cities">{CITIES.map(c => <option key={c.n} value={c.n} />)}</datalist></label>
      <label><span>To</span><select value={to} onChange={e => setTo(e.target.value)}><option value="">Anywhere: suggest one</option>{dests.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <label><span>When</span><input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} /></label>
      <button type="submit" data-cursor="Go">Plan my trip <span aria-hidden="true">→</span></button>
    </form>
  );
}

/** The current site's cover: the season's photos, one after another (crossfade and a slow zoom), with season tabs,
 * progress lines and the place's name. Pauses under the mouse; swipe on phones. */
function Slides({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<SeasonId>(seasonNow), [i, setI] = useState(0), [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set([SLIDES[seasonNow()][0].src]));
  const slides = SLIDES[season], n = slides.length, touch = useRef<number | null>(null);
  const show = (k: number) => setI((k + n) % n);
  // Each photo loads when it's next, so the page opens on one photo.
  useEffect(() => { setSeen(s => new Set([...s, slides[i].src, slides[(i + 1) % n].src])); }, [i, slides, n]);
  const cur = slides[i], label = SEASONS.find(s => s.id === season)!.label;
  return (
    <section className="pv-hero" data-season={season} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={e => { const s0 = touch.current; touch.current = null; if (s0 == null) return; const dx = e.changedTouches[0].clientX - s0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); }}
      aria-roledescription="carousel" aria-label={`${label} in Pakistan`}>
      <div className="pv-slides">
        {slides.map((s, k) => <div key={season + s.src} className={`pv-slide${k === i ? ' on' : ''}`} aria-hidden={k !== i}>
          {seen.has(s.src) && <img src={s.src} alt={k === i ? s.place : ''} fetchPriority={k === 0 ? 'high' : 'low'} style={{ objectPosition: s.pos || 'center' }} />}
        </div>)}
      </div>
      <div className="pv-shade" />
      {children}
      <div className="pv-foot">
        <div className="pv-seasons" role="tablist" aria-label="Season">
          {SEASONS.map(s => <button key={s.id} role="tab" aria-selected={s.id === season} onClick={() => { setSeason(s.id); setI(0); }} data-cursor="Season">{s.label}</button>)}
        </div>
        <div className="pv-bars">
          {slides.map((s, k) => <button key={season + k} onClick={() => show(k)} aria-label={`Photo ${k + 1}: ${s.place}`} aria-current={k === i} data-cursor="Photo">
            <span className={k < i ? 'full' : k === i ? `run${paused ? ' hold' : ''}` : ''} style={k === i ? { animationDuration: `${SLIDE_MS}ms` } : undefined} key={k === i ? `${season}-${i}` : k}
              onAnimationEnd={k === i ? () => show(i + 1) : undefined} />
          </button>)}
        </div>
        <a className="pv-cap" href={DESTS.some(d => d.id === cur.id) ? `/destinations/${cur.id}` : '#where'} data-cursor="View">{cur.place} · {label}</a>
      </div>
    </section>
  );
}

export function Preview() {
  const season = seasonNow(), dests = useMemo(() => ringDests(), []);
  const [ready, setReady] = useState(false);
  // The pinned "Plan a trip" shows once the plan bar has scrolled away.
  const bar = useRef<HTMLFormElement>(null), [pin, setPin] = useState(false);
  useEffect(() => {
    document.title = 'SafarCo, see Pakistan (preview)';
    const h = document.documentElement; h.classList.add('pv-root'); if (fine()) h.classList.add('pv-fine');
    const t = setTimeout(() => setReady(true), 60);
    return () => { clearTimeout(t); h.classList.remove('pv-root', 'pv-fine'); };
  }, []);
  useEffect(() => {
    const b = bar.current; if (!b || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setPin(!e.isIntersecting && e.boundingClientRect.top < 0)); io.observe(b);
    return () => io.disconnect();
  }, []);
  const Season = season[0].toUpperCase() + season.slice(1);
  const bestNow = dests.filter(d => d.season === Season).slice(0, 3).map(d => d.name).join(', ');

  return (
    <div className="pv" data-season={season}>
      <Cursor />
      <header className="pv-frame pv-top">
        <a href="/preview" className="pv-mark" data-cursor="Top">SafarCo<sup>PK</sup></a>
        <nav><a href="#where" data-cursor="Go">Destinations</a><a href="/" data-cursor="Back">Current site</a></nav>
      </header>
      <a href={planHref()} className={`pv-pin${pin ? ' show' : ''}`} aria-hidden={!pin} tabIndex={pin ? 0 : -1} data-cursor="Plan">Plan a trip <span aria-hidden="true">→</span></a>
      <footer className="pv-frame pv-bottom">
        <span><b>{Season} now</b>{bestNow ? ` · best: ${bestNow}` : ''}</span>
        <span>Preview · © 2026 SafarCo</span>
      </footer>

      <Slides>
        <div className={`pv-body${ready ? ' in' : ''}`}>
          <div className="pv-kicker">Pakistan trip planner</div>
          <h1><span>See</span><span>Pakistan</span></h1>
          <p className="pv-sub">Plan your trip in 2 minutes</p>
          <PlanBar barRef={bar} />
          <div className="pv-trust"><span>Free</span><span>No sign-up</span><span>{DESTS.length} destinations</span><a href="/plan?start=quick" data-cursor="Go">Not sure where? Answer 2 questions</a></div>
        </div>
      </Slides>

      <Grid dests={dests} />

      <section className="pv-end">
        <h2>Your days<br />Your budget<br />Your perfect trip</h2>
        <p>The route, the nights, the stops and the cost, in one plan.</p>
        <a href={planHref()} className="pv-cta" data-cursor="Go">Plan my trip →</a>
        <div className="pv-note">A preview of the new SafarCo website. <a href="/">Back to the current site</a></div>
      </section>
    </div>
  );
}
