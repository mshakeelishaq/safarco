// A destination's photos as a slideshow: one big photo that moves on by itself, arrows, thumbnails and swipe.
import { useEffect, useRef, useState } from 'react';
import { IG_HANDLE } from '../contact';

export function Slideshow({ photos }: { photos: { src: string; caption: string }[] }) {
  const [i, setI] = useState(0), [paused, setPaused] = useState(false), touch = useRef<number | null>(null);
  const n = photos.length, go = (k: number) => setI((k + n) % n);
  // Moves on every 5 seconds, unless the visitor is looking closely, prefers less motion, or there's one photo.
  useEffect(() => {
    if (n < 2 || paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => go(i + 1), 5000); return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n, paused]);
  if (!n) return null;
  const ph = photos[i];
  return (
    <div className="slides" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onKeyDown={e => { if (e.key === 'ArrowLeft') go(i - 1); if (e.key === 'ArrowRight') go(i + 1); }} tabIndex={0} aria-roledescription="carousel" aria-label="Photos">
      <div className="slides-stage" onTouchStart={e => { touch.current = e.touches[0].clientX; setPaused(true); }}
        onTouchEnd={e => { const s = touch.current; touch.current = null; if (s == null) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); }}>
        {photos.map((p, k) => <img key={p.src} src={p.src} alt={p.caption} loading={k === 0 ? 'eager' : 'lazy'} className={k === i ? 'on' : ''} aria-hidden={k !== i} />)}
        {n > 1 && <>
          <button className="slides-nav prev" onClick={() => go(i - 1)} aria-label="Previous photo"><i className="ph-bold ph-caret-left" /></button>
          <button className="slides-nav next" onClick={() => go(i + 1)} aria-label="Next photo"><i className="ph-bold ph-caret-right" /></button>
          <span className="slides-count">{i + 1} / {n}</span>
        </>}
      </div>
      <div className="slides-cap" aria-live="polite">{ph.caption} <span>· © {IG_HANDLE}</span></div>
      {n > 1 && <div className="slides-thumbs">
        {photos.map((p, k) => <button key={p.src} onClick={() => { go(k); setPaused(true); }} aria-label={`Photo ${k + 1}: ${p.caption}`} aria-current={k === i}><img src={p.src} alt="" loading="lazy" /></button>)}
      </div>}
    </div>
  );
}
