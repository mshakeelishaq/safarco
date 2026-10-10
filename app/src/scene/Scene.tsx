import { useEffect, useRef, type RefObject } from 'react';
import { css } from '../lib/css';
import type { Theme } from '../state';

interface Props {
  elRef: RefObject<HTMLDivElement | null>;
  corridor: string; theme: Theme; showLabels: boolean; peakLabel: string;
}

interface SceneHandle { setCorridor(key: string): void; dispose(): void }

// Fog, sun and sky-light colours per theme.
const TH3: Record<Theme, [number, number, number]> = {
  daylight: [0xE6F1FA, 0xFFF4E2, 0xFFFFFF], peach: [0xFFE6D6, 0xFFD2B0, 0xFFF4EA], paper: [0xEDECEB, 0xFFF6EA, 0xFFFFFF], dark: [0xEBA27F, 0xFFC48A, 0xCFE3FF]
};

/** The tilted 3D mountain scene behind the top of every screen. Drag to orbit. */
export function Scene({ elRef, corridor, theme, showLabels, peakLabel }: Props) {
  const destRef = useRef<HTMLDivElement>(null), hubRef = useRef<HTMLDivElement>(null);
  const handle = useRef<SceneHandle | null>(null);
  const live = useRef({ showLabels, corridor });
  live.current.showLabels = showLabels;
  const drag = useRef({ az: 0, dragAz: 0, drag: null as null | { x: number; az: number } });

  useEffect(() => {
    let dead = false;
    import('./three-scene').then(({ createScene }) => {
      const el = elRef.current; if (dead || !el) return;
      handle.current = createScene(el, TH3[theme], drag.current, { dest: destRef, hub: hubRef }, () => live.current.showLabels);
      handle.current.setCorridor(live.current.corridor);
    }).catch(e => console.warn('SafarCo scene: ' + (e && e.message)));
    return () => { dead = true; handle.current?.dispose(); handle.current = null; };
    // The scene is rebuilt only when the theme's lighting changes.
  }, [theme, elRef]);

  useEffect(() => { live.current.corridor = corridor; handle.current?.setCorridor(corridor); }, [corridor]);

  return (
    <div ref={elRef}
      onPointerDown={e => { drag.current.drag = { x: e.clientX, az: drag.current.dragAz }; }}
      onPointerMove={e => { const d = drag.current.drag; if (d) drag.current.dragAz = Math.max(-1.1, Math.min(1.1, d.az - (e.clientX - d.x) * .008)); }}
      onPointerUp={() => { drag.current.drag = null; }} onPointerLeave={() => { drag.current.drag = null; }}
      style={css('position:absolute;left:0;top:0;width:100%;height:440px;z-index:0;touch-action:none;cursor:grab;background:var(--skygrad);will-change:transform,opacity')}>
      <div style={css('position:absolute;right:46px;top:250px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(255,236,190,.95) 0%,rgba(255,196,130,.55) 30%,rgba(255,170,110,0) 70%)')} />
      <div ref={destRef} style={css('position:absolute;left:0;top:0;z-index:3;opacity:0;pointer-events:none;transition:opacity .4s')}>
        <div style={css('display:flex;align-items:center;gap:6px;padding:7px 11px 7px 8px;border-radius:14px;background:var(--sheet);backdrop-filter:blur(12px);border:1px solid var(--line2);font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 10px 24px -8px rgba(0,0,0,.5)')}>
          <span style={css('width:18px;height:18px;border-radius:6px;background:linear-gradient(135deg,#FF8A6B,#FF4F7B);display:flex;align-items:center;justify-content:center;font-size:11px')}><i className="ph-fill ph-flag-banner" /></span>{peakLabel}
        </div>
      </div>
      <div ref={hubRef} style={css('position:absolute;left:0;top:0;z-index:3;opacity:0;pointer-events:none;transition:opacity .4s')}>
        <div style={css('display:flex;align-items:center;gap:6px;padding:7px 11px 7px 8px;border-radius:14px;background:linear-gradient(135deg,#FFB547,#FF8A3D);color:#2A1500;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 10px 24px -6px rgba(255,150,60,.7)')}>
          <i className="ph-fill ph-local-parking" style={css('font-size:15px')} />Raikot Bridge · park here
        </div>
      </div>
      <div style={css('position:absolute;left:0;right:0;bottom:0;height:200px;background:linear-gradient(180deg,var(--bg0) 0%,var(--bg75) 55%,var(--bg) 100%);pointer-events:none;z-index:2')} />
    </div>
  );
}
