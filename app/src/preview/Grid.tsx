// The destinations, as big photo cards in two columns (the second set lower). While the page scrolls the photos
// bend back a little, as if the page were paper, and settle flat when it stops. Hovering shows the place's next
// photo. Filters by season; in-season places first.
import { useEffect, useMemo, useRef, useState } from 'react';
import { planHref } from '../site/Hero';
import { FILTERS, fits, gridOrder, inSeason, thumb, type Filter, type RingDest } from './data';

const FIRST = 10;

function Card({ d, i }: { d: RingDest; i: number }) {
  const el = useRef<HTMLAnchorElement>(null), [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const e = el.current; if (!e) return;
    if (!('IntersectionObserver' in window)) { e.classList.add('in'); return; }
    const io = new IntersectionObserver(([x]) => { if (x.isIntersecting) { e.classList.add('in'); io.disconnect(); } }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(e); return () => io.disconnect();
  }, []);
  const tags = [inSeason(d) ? 'In season now' : d.when.replace(/^Best /, 'Best '), `${d.days} days`, d.province];
  return (
    <a ref={el} href={`/destinations/${d.id}`} className={`gd-card${i % 2 ? ' low' : ''}`} data-cursor="View">
      <div className="gd-media" style={{ backgroundImage: `url(${thumb(d.photos[0])})` }}>
        <img src={d.photos[0]} alt="" loading="lazy" decoding="async" className={loaded ? 'ok' : ''} onLoad={() => setLoaded(true)} />
        {d.photos[1] && <img src={d.photos[1]} alt="" loading="lazy" decoding="async" className="gd-alt" />}
      </div>
      <div className="gd-tags">{tags.join(' • ')}</div>
      <div className="gd-name">{d.name}</div>
      <span className="gd-plan" onClick={e => { e.preventDefault(); location.href = planHref({ to: d.id }); }} data-cursor="Plan">Plan this trip →</span>
    </a>
  );
}

export function Grid({ dests }: { dests: RingDest[] }) {
  const [f, setF] = useState<Filter>('All'), [all, setAll] = useState(false), root = useRef<HTMLDivElement>(null);
  const list = useMemo(() => gridOrder(dests.filter(d => fits(d, f))), [dests, f]);
  const shown = all ? list : list.slice(0, FIRST);

  // The bend: follows how fast the page scrolls, eased, and back to flat at rest.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0, y = scrollY, bend = 0, lastT = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.max(1, now - lastT), v = (scrollY - y) / dt; y = scrollY; lastT = now;
      bend += (Math.max(-14, Math.min(14, v * 9)) - bend) * 0.12;
      if (Math.abs(bend) < 0.02) bend = 0;
      root.current?.style.setProperty('--bend', bend.toFixed(3));
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section id="where" className="gd" ref={root}>
      <div className="gd-head">
        <h2>Where to next</h2>
        <p>Pakistan’s best places, with the ones at their best right now first. Tap one for its guide, or plan the trip.</p>
      </div>
      <div className="gd-filters" role="tablist" aria-label="Show places for">
        {FILTERS.map(x => <button key={x} role="tab" aria-selected={f === x} className={f === x ? 'on' : ''} onClick={() => { setF(x); setAll(false); }} data-cursor="Show">{x}<sup>{dests.filter(d => fits(d, x)).length}</sup></button>)}
      </div>
      <div className="gd-grid" key={f}>
        {shown.map((d, i) => <Card key={d.id} d={d} i={i} />)}
      </div>
      {!all && list.length > FIRST && <button className="gd-more" onClick={() => setAll(true)} data-cursor="More">All {list.length} destinations +</button>}
    </section>
  );
}
