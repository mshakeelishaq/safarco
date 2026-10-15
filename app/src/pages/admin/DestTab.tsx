// Destination details: shown or not, best months, a warning, the road note, food line, hotels and photo.
import { useState } from 'react';
import { css } from '../../lib/css';
import { baseDest, type DestEdit } from '../../content';
import { ownPhoto } from '../../photos';
import type { Hotel } from '../../engine/data';
import { DestPicker, H2, Months, Tag, TextUr, box, btn, lbl, row2, small, text } from './ui';
import type { Edit } from './PlacesTab';
import type { ContentEdits } from '../../content';

export function DestTab({ c, edit, setUr }: { c: ContentEdits; edit: Edit; setUr: (en: string, v: string, from?: string) => void }) {
  const [id, setId] = useState('hunza');
  const D = baseDest(id)!, e = c.dests[id] || {};
  const set = (f: (d: DestEdit) => void) => edit(cc => { const d = (cc.dests[id] ||= {}); f(d); if (!Object.keys(d).length) delete cc.dests[id]; });
  const best = 'best' in e ? e.best ?? null : D.best ?? null;
  const warn = 'warn' in e ? e.warn : D.warn ? { months: D.warn[0], text: D.warn[1] } : null;
  const guide = e.guideNote ?? D.guideNote ?? '', eat = e.eat ?? D.eat ?? '', hotels: Hotel[] = e.hotels ?? D.hotels ?? [], photo = e.photo ?? '';
  const mark = (d: string) => c.dests[d]?.off ? 'switched off' : c.dests[d] ? 'edited' : '';
  return (
    <section style={box}>
      <H2 sub="What travellers see about the destination itself. Leave a field as it is to keep SafarCo’s own text.">Destinations</H2>
      <DestPicker value={id} onChange={setId} mark={mark} />
      <div style={css('display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:14px 0 4px')}>
        <b style={css('font-size:17px')}>{D.name}</b><span style={css('color:var(--mute);font-size:13px')}>{D.region}</span>
        {D.checked === false && <Tag tone="amb">From research, not checked</Tag>}{c.dests[id] && <Tag tone="amb">Edited</Tag>}
        <span style={css('flex:1')} />
        {c.dests[id] && <button onClick={() => { if (confirm(`Go back to SafarCo’s own details for ${D.name}?`)) edit(cc => { delete cc.dests[id]; }); }} style={small}>Undo all edits</button>}
      </div>

      <label style={css('display:flex;gap:10px;align-items:center;padding:12px;border-radius:14px;background:var(--fill);margin:10px 0;font-weight:700;cursor:pointer')}>
        <input type="checkbox" checked={!e.off} onChange={ev => set(d => { if (ev.target.checked) delete d.off; else d.off = true; })} style={css('width:20px;height:20px')} />
        <span>Show {D.name} in the app<span style={css('display:block;font-size:12px;color:var(--mute);font-weight:600')}>Off: not suggested or listed anywhere. Trips people already saved still open.</span></span>
      </label>

      <div style={css('display:grid;gap:14px')}>
        <div style={lbl}>Best months<Months value={best} onChange={v => set(d => { d.best = v; })} /></div>
        <div style={css('display:grid;gap:8px;padding:12px;border-radius:14px;border:1px solid var(--line)')}>
          <div style={lbl}>Warning months (for example snow or heat)<Months none="No warning months" value={warn?.months?.length ? warn.months : null} onChange={v => set(d => { d.warn = { months: v || [], text: warn?.text || '' }; })} /></div>
          <TextUr label="Warning text" value={warn?.text || ''} onChange={v => set(d => { d.warn = v ? { months: warn?.months || [], text: v } : null; })} ur={c.ur} setUr={setUr} placeholder="Very cold in winter. Many hotels close." />
        </div>
        <TextUr label="Road and season note (for guides from research)" value={guide} onChange={v => set(d => { d.guideNote = v; })} ur={c.ur} setUr={setUr} long />
        <TextUr label="What to eat, in one line" value={eat} onChange={v => set(d => { d.eat = v; })} ur={c.ur} setUr={setUr} />
        <div style={row2}>
          <label style={lbl}>Photo: a web link (https://…) or /photos/…
            <input value={photo} onChange={ev => set(d => { if (ev.target.value) d.photo = ev.target.value; else delete d.photo; })} placeholder="https://…/hunza.jpg" style={text} />
          </label>
          {(photo || ownPhoto(id)) && <img src={photo || ownPhoto(id)} alt="" style={css('width:100%;max-height:140px;object-fit:cover;border-radius:12px')} />}
        </div>
        <div>
          <div style={css('font-size:12px;font-weight:700;color:var(--mute);margin-bottom:6px')}>Hotels suggested in the plan (first that matches the traveller’s level)</div>
          {hotels.map((h, i) => (
            <div key={i} style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;padding:8px 0;border-bottom:1px solid var(--line)')}>
              <input value={h[0]} placeholder="Hotel name" onChange={ev => set(d => { const l = [...hotels]; l[i] = [ev.target.value, h[1], h[2]]; d.hotels = l; })} style={text} />
              <select value={h[1]} onChange={ev => set(d => { const l = [...hotels]; l[i] = [h[0], ev.target.value, h[2]]; d.hotels = l; })} style={text}><option>Budget</option><option>Standard</option><option>Premium</option></select>
              <input value={h[2]} placeholder="Why it’s good" onChange={ev => set(d => { const l = [...hotels]; l[i] = [h[0], h[1], ev.target.value]; d.hotels = l; })} style={text} />
              <button onClick={() => set(d => { d.hotels = hotels.filter((_, j) => j !== i); })} style={small}>Remove</button>
            </div>
          ))}
          <button onClick={() => set(d => { d.hotels = [...hotels, ['', 'Standard', '']]; })} style={btn(false)}>+ Add hotel</button>
        </div>
      </div>
    </section>
  );
}
