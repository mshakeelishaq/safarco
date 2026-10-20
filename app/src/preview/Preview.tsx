// /preview: a first look at the new SafarCo website (stage 1). The opening (mist parts over the season's photo),
// the hero where a touch brings the colour back, and the destination ring. The current website stays as it is.
import { useEffect, useMemo, useRef, useState } from 'react';
import { planHref, seasonNow, SLIDES, type SeasonId } from '../site/Hero';
import { startFluid, type Fluid } from './fluid';
import { Ring } from './Ring';
import { ringDests, type GroupBy } from './data';
import { ROAD } from './road';
import './preview.css';

const ACCENT: Record<SeasonId, [number, number, number]> = { spring: [0.97, 0.6, 0.72], summer: [0.45, 0.86, 0.6], autumn: [0.98, 0.72, 0.25], winter: [0.62, 0.8, 1] };
const SEEN = 'safarco-preview-intro';
const fine = () => matchMedia('(pointer: fine)').matches;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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

export function Preview() {
  const season = seasonNow(), slide = SLIDES[season][0];
  const canvas = useRef<HTMLCanvasElement>(null), fluid = useRef<Fluid | null>(null), hero = useRef<HTMLElement>(null);
  const [gl, setGl] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<'intro' | 'part' | 'open'>(() => { try { return sessionStorage.getItem(SEEN) || still() ? 'open' : 'intro'; } catch { return 'intro'; } });
  const [by, setBy] = useState<GroupBy>('season'), [active, setActive] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const dests = useMemo(() => ringDests(), []);
  const small = useMemo(() => innerWidth < 760, []);
  const cur = dests.find(d => d.id === active) || null;

  useEffect(() => { document.title = 'SafarCo, see Pakistan (preview)'; const h = document.documentElement; h.classList.add('pv-root'); if (fine()) h.classList.add('pv-fine'); return () => h.classList.remove('pv-root', 'pv-fine'); }, []);

  // The fluid hero: WebGL where it runs well, a plain photo elsewhere.
  useEffect(() => {
    const c = canvas.current; if (!c || still()) { setGl(false); return; }
    const f = startFluid(c, { small }); fluid.current = f; setGl(!!f);
    if (!f) return;
    f.setAccent(ACCENT[season]); f.setFade(phase === 'open' ? 1 : 0);
    const img = new Image(); img.decoding = 'async'; img.src = slide.src; img.onload = () => f.setPhoto(img);
    // Only while the hero is on screen and the tab is open.
    const io = new IntersectionObserver(([e]) => f.setRunning(e.isIntersecting && !document.hidden), { threshold: 0 });
    if (hero.current) io.observe(hero.current);
    const vis = () => f.setRunning(!document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); f.destroy(); fluid.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The opening: the road draws, the mist parts and the colour flows out from the middle, then fades to black and white.
  useEffect(() => {
    if (phase !== 'intro') { if (phase === 'open') fluid.current?.setFade(1); return; }
    const t1 = setTimeout(() => setPhase('part'), 1900);
    return () => clearTimeout(t1);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'part') return;
    try { sessionStorage.setItem(SEEN, '1'); } catch { /* storage blocked */ }
    const f = fluid.current, t0 = performance.now();
    let raf = 0; const fade = () => { const k = Math.min(1, (performance.now() - t0) / 1100); f?.setFade(k * k * (3 - 2 * k)); if (k < 1) raf = requestAnimationFrame(fade); };
    raf = requestAnimationFrame(fade);
    const b = setTimeout(() => f?.burst(), 250), done = setTimeout(() => setPhase('open'), 1500);
    return () => { cancelAnimationFrame(raf); clearTimeout(b); clearTimeout(done); };
  }, [phase]);
  const skip = () => { if (phase === 'intro') setPhase('part'); };

  // Moving over the hero pushes the fluid and leaves colour behind.
  const lastP = useRef<{ x: number; y: number } | null>(null);
  const onMove = (e: React.PointerEvent) => {
    const c = canvas.current, f = fluid.current; if (!c || !f || phase === 'intro') return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, l = lastP.current;
    lastP.current = { x, y };
    if (!l) return;
    const dx = x - l.x, dy = y - l.y; if (Math.abs(dx) + Math.abs(dy) < 0.0008) return;
    f.splat(x, y, dx, dy); if (!touched) setTouched(true);
  };

  const groups: { key: GroupBy; label: string }[] = [{ key: 'season', label: 'Season' }, { key: 'region', label: 'Region' }, { key: 'days', label: 'Days' }];
  const bestNow = dests.filter(d => d.season === season[0].toUpperCase() + season.slice(1)).slice(0, 3).map(d => d.name).join(', ');

  return (
    <div className="pv" data-season={season}>
      <Cursor />

      {/* The frame: the same four corners all the way down. */}
      <header className="pv-frame pv-top">
        <a href="/preview" className="pv-mark" data-cursor="Top">SafarCo<sup>PK</sup></a>
        <nav><a href="#where" data-cursor="Go">Destinations</a><a href={planHref()} data-cursor="Plan">Plan a trip</a><a href="/" data-cursor="Back">Current site</a></nav>
      </header>
      <footer className="pv-frame pv-bottom">
        <span><b>{season[0].toUpperCase() + season.slice(1)} now</b>{bestNow ? ` · best: ${bestNow}` : ''}</span>
        <span>Preview · © 2026 SafarCo</span>
      </footer>

      {phase !== 'open' && (
        <div className={`pv-intro${phase === 'part' ? ' part' : ''}`} onClick={skip} aria-hidden="true">
          <div className="pv-cloud c1" /><div className="pv-cloud c2" /><div className="pv-cloud c3" />
          <div className="pv-intro-mark">
            <svg viewBox="8 -8 88 104" width="64" height="76"><path d={ROAD} className="pv-road" pathLength={1} /></svg>
            <div className="pv-intro-name">SafarCo</div>
          </div>
        </div>
      )}

      <section ref={hero} className="pv-hero" onPointerMove={onMove} onPointerLeave={() => { lastP.current = null; }} data-cursor={gl ? 'Touch' : undefined}>
        <canvas ref={canvas} className="pv-canvas" style={{ opacity: gl === false ? 0 : 1 }} />
        {gl === false && <img className="pv-still" src={slide.src} alt="" />}
        <div className={`pv-hero-text${phase !== 'intro' ? ' in' : ''}`}>
          <h1><span>See</span><span>Pakistan</span></h1>
          <p>Mountains, rivers and roads, planned for you in two minutes.{gl ? <><br /><em>{touched ? 'There it is. Every season has its colour.' : 'Move across the photo to bring its colour back.'}</em></> : null}</p>
        </div>
        <div className="pv-caption">{slide.place}</div>
        <a href="#where" className="pv-down" data-cursor="Scroll">Where to next ↓</a>
      </section>

      <section id="where" className="pv-ring">
        <div className="pv-ring-head"><span>Destinations<sup>{dests.length}</sup></span><span>{small ? 'Swipe to turn · tap a photo' : 'Drag to turn · hover a photo'}</span></div>
        <Ring dests={dests} by={by} active={active} onPick={setActive} onOpen={id => { location.href = `/destinations/${id}`; }} small={small} side={!!cur} />
        <div className={`pv-centre${cur ? ' hide' : ''}`}><h2>Where to next?</h2></div>
        <div className={`pv-card${cur ? ' show' : ''}`}>
          {cur && <>
            <div className="pv-card-region">{cur.region}</div>
            <h3>{cur.name}</h3>
            <img key={cur.photos[0]} src={cur.photos[0]} alt="" />
            <div className="pv-card-facts"><span>{cur.when}</span><span>About {cur.days} days from Islamabad</span></div>
            <div className="pv-card-go"><a href={planHref({ to: cur.id })} data-cursor="Plan">Plan this trip +</a><a href={`/destinations/${cur.id}`} data-cursor="Read">The guide</a></div>
          </>}
        </div>
        <div className="pv-tabs" role="tablist" aria-label="Group the destinations by">
          {groups.map(g => <button key={g.key} role="tab" aria-selected={by === g.key} className={by === g.key ? 'on' : ''} onClick={() => { setBy(g.key); setActive(null); }} data-cursor="Sort">{g.label}</button>)}
        </div>
      </section>

      <section className="pv-end">
        <h2>Plan it in<br />two minutes</h2>
        <p>The route, the nights, the stops, the budget and the weather, in one plan. Free.</p>
        <a href={planHref()} className="pv-cta" data-cursor="Go">Plan a trip</a>
        <div className="pv-note">This is a preview of the new SafarCo website. <a href="/">Back to the current site</a></div>
      </section>
    </div>
  );
}
