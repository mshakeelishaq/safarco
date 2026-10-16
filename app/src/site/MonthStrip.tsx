// A place through the year: one photo per month, a row of month buttons, opening on this month.
import { useState } from 'react';
import { MON } from '../engine/data';
import { IG_HANDLE } from '../contact';
import { nowMonth } from './data';

export function MonthStrip({ title, photos }: { title: string; photos: { src: string; caption: string }[] }) {
  const [m, setM] = useState(nowMonth() - 1), ph = photos[m];
  return (
    <div className="slides">
      <h3 style={{ fontSize: 22, margin: '0 0 12px' }}>{title}</h3>
      <div className="chips" role="group" aria-label="Month" style={{ marginBottom: 12, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
        {MON.map((mo, i) => <button key={mo} className="chip" style={{ flex: 'none' }} aria-pressed={i === m} onClick={() => setM(i)}>{mo}</button>)}
      </div>
      <div className="slides-stage">
        {photos.map((p, k) => <img key={p.src} src={p.src} alt={p.caption} loading={k === m ? 'eager' : 'lazy'} className={k === m ? 'on' : ''} aria-hidden={k !== m} />)}
      </div>
      <div className="slides-cap" aria-live="polite">{ph.caption} <span>· © {IG_HANDLE}</span></div>
    </div>
  );
}
