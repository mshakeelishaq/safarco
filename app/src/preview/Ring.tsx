// The destination ring: every destination's photos on a slowly turning 3D ring, in groups (season, region or days).
// Changing the grouping flies each photo to its new place. Drag or swipe to turn it; hover (or tap) a photo to see the
// place, click (or tap again) to open its guide. Plain CSS 3D, so it stays light on phones.
import { useEffect, useMemo, useRef } from 'react';
import { GROUPS, groupOf, thumb, type GroupBy, type RingDest } from './data';

const GAP = 3; // empty slots between groups

export function Ring({ dests, by, active, onPick, onOpen, small, side }: { dests: RingDest[]; by: GroupBy; active: string | null; onPick: (id: string | null) => void; onOpen: (id: string) => void; small: boolean; side: boolean }) {
  // Cards in ring order: group by group, place by place, each place's photos together.
  const layout = useMemo(() => {
    const cards: { key: string; id: string; src: string; slot: number }[] = [], labels: { name: string; count: number; mid: number }[] = [];
    let slot = 0;
    for (const g of GROUPS[by]) {
      const ds = dests.filter(d => groupOf(d, by) === g).sort((a, b) => a.name.localeCompare(b.name));
      if (!ds.length) continue;
      const start = slot;
      ds.forEach(d => d.photos.forEach(src => cards.push({ key: d.id + '|' + src, id: d.id, src, slot: slot++ })));
      labels.push({ name: g, count: ds.length, mid: (start + slot - 1) / 2 });
      slot += GAP;
    }
    return { cards, labels, slots: slot };
  }, [dests, by]);
  // Each photo keeps its element (keyed by place and photo), so a new grouping animates it to its new angle.
  const byKey = useMemo(() => new Map(layout.cards.map(c => [c.key, c])), [layout]);
  const allKeys = useMemo(() => dests.flatMap(d => d.photos.map(src => d.id + '|' + src)), [dests]);

  const stage = useRef<HTMLDivElement>(null), labelEls = useRef<(HTMLDivElement | null)[]>([]);
  const spin = useRef({ a: 0, v: 0, drag: null as null | { x: number; a: number; moved: boolean; t: number; last: number }, hover: false, dragged: false, x: 0 });
  const sideRef = useRef(side); sideRef.current = side;
  const R = small ? 230 : 520, TILT = small ? -22 : -16;
  const deg = (slot: number) => (slot / layout.slots) * 360;

  useEffect(() => {
    let raf = 0, last = performance.now();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000), s = spin.current; last = now;
      if (!s.drag) {
        const cruise = still ? 0 : s.hover ? 0.8 : 5;
        s.v += (cruise - s.v) * Math.min(1, dt * 1.6);
        s.a += s.v * dt;
      }
      // With a place's card open on the left (laptops), the ring slides right to make room.
      s.x += ((sideRef.current && !small ? innerWidth * 0.11 : 0) - s.x) * Math.min(1, dt * 4);
      if (stage.current) stage.current.style.transform = `translateX(${s.x}px) translateZ(-${R}px) rotateX(${TILT}deg) rotateY(${-s.a}deg)`;
      layout.labels.forEach((l, i) => { const el = labelEls.current[i]; if (el) el.style.transform = `rotateY(${deg(l.mid)}deg) translateZ(${R + (small ? 70 : 120)}px) rotateY(${s.a - deg(l.mid)}deg) rotateX(${-TILT}deg)`; });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, R, TILT]);

  const down = (e: React.PointerEvent) => { spin.current.drag = { x: e.clientX, a: spin.current.a, moved: false, t: performance.now(), last: e.clientX }; };
  const move = (e: React.PointerEvent) => {
    const d = spin.current.drag; if (!d) return;
    const dx = e.clientX - d.x; if (Math.abs(dx) > 6) d.moved = true;
    const now = performance.now(), k = small ? 0.35 : 0.18;
    spin.current.v = -((e.clientX - d.last) * k) / Math.max(0.008, (now - d.t) / 1000); d.t = now; d.last = e.clientX;
    spin.current.a = d.a - dx * k;
  };
  const up = () => { const d = spin.current.drag; spin.current.drag = null; spin.current.dragged = !!d?.moved; if (d?.moved) spin.current.v = Math.max(-120, Math.min(120, spin.current.v)); };
  // A drag that ends on a photo isn't a click on it.
  const wasDrag = () => { const x = spin.current.dragged; spin.current.dragged = false; return x; };

  return (
    <div className="rg" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={() => { up(); spin.current.hover = false; if (!small) onPick(null); }}
      style={{ ['--R' as string]: `${R}px` }}>
      <div className="rg-stage" ref={stage}>
        {allKeys.map((k, i) => {
          const c = byKey.get(k); if (!c) return null;
          const on = active === c.id;
          return <button key={k} className={`rg-card${on ? ' on' : ''}${active && !on ? ' dim' : ''}`} data-cursor="View"
            style={{ ['--a' as string]: `${deg(c.slot)}deg`, ['--d' as string]: `${(i % 40) * 12}ms` }}
            // Only a real mouse move picks a photo, so the ring sliding under a still mouse doesn't flick between places.
            onPointerMove={e => { if (!small && e.pointerType === 'mouse' && !spin.current.drag && active !== c.id) { spin.current.hover = true; onPick(c.id); } }}
            onClick={() => { if (wasDrag()) return; if (small && active !== c.id) { onPick(c.id); spin.current.hover = true; } else onOpen(c.id); }}
            aria-label={dests.find(d => d.id === c.id)?.name}>
            <img src={thumb(c.src)} alt="" loading="lazy" decoding="async" draggable={false} />
          </button>;
        })}
        {layout.labels.map((l, i) => <div key={l.name} className="rg-label" ref={el => { labelEls.current[i] = el; }}>{l.name}<sup>{l.count}</sup></div>)}
      </div>
    </div>
  );
}
