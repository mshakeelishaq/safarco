// Places at each destination: add one, edit its name, note, pin, months and time there, or hide it.
import { useState } from 'react';
import { css } from '../../lib/css';
import { baseDest, baseInfo, type ContentEdits, type PlaceEdit } from '../../content';
import type { Place } from '../../engine/data';
import { DestPicker, H2, Months, Tag, TextUr, box, btn, lbl, parsePin, row2, small, text } from './ui';

export type Edit = (f: (c: ContentEdits) => void) => void;
const ACCESS: [string, string][] = [['', 'Not set'], ['car', 'Car'], ['rough', 'Car, rough road'], ['4x4', '4x4'], ['jeep', 'Local jeep only'], ['walk', 'On foot / hike'], ['boat', 'Boat'], ['chairlift', 'Chairlift']];
const empty = (): PlaceEdit => ({ name: '', where: '', note: '', months: null });
const same = (a: PlaceEdit, b: PlaceEdit) => JSON.stringify(a) === JSON.stringify(b);

/** A built-in place as an editable record (its pin from the facts table or its map link). */
export function fromBase(id: string, p: Place): PlaceEdit {
  const i = baseInfo(id, p[0]), pin = i?.lat != null ? [i.lat, i.lon!] as const : parsePin(p[4] || '');
  return { name: p[0], where: p[1] || '', note: p[2] || '', months: p[3] ?? null, ...(pin ? { lat: pin[0], lon: pin[1] } : {}), ...(i?.visit ? { visit: i.visit } : {}), ...(i?.access ? { access: i.access } : {}) };
}

function PlaceForm({ start, onSave, onCancel, ur, setUr }: { start: PlaceEdit; onSave: (p: PlaceEdit) => void; onCancel: () => void; ur: Record<string, string>; setUr: (en: string, v: string, from?: string) => void }) {
  const [p, setP] = useState(start), [pinTxt, setPinTxt] = useState(start.lat != null ? `${start.lat}, ${start.lon}` : '');
  const pin = parsePin(pinTxt), bad = !!pinTxt.trim() && !pin;
  return (
    <div style={css('display:grid;gap:10px;padding:14px;margin:8px 0;border-radius:16px;background:var(--fill);border:1px solid var(--line2)')}>
      <div style={row2}>
        <label style={lbl}>Name<input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} style={text} autoFocus /></label>
        <label style={lbl}>How far / how to get there<input value={p.where} placeholder="12 km · 30 min, or On foot" onChange={e => setP({ ...p, where: e.target.value })} style={text} /></label>
      </div>
      <TextUr label="What it is (shown under the name)" value={p.note} onChange={v => setP({ ...p, note: v })} ur={ur} setUr={setUr} long placeholder="Turquoise lake below Passu; boat rides in summer." />
      <div style={row2}>
        <label style={lbl}>Map pin: “lat, lon” or a Google Maps link
          <input value={pinTxt} onChange={e => setPinTxt(e.target.value)} placeholder="36.3155, 74.8563" style={{ ...text, borderColor: bad ? 'var(--cor)' : undefined }} />
          {bad ? <span style={css('color:var(--cor)')}>Can’t read a pin in Pakistan from this.</span> : pin ? <a href={`https://www.google.com/maps/search/?api=1&query=${pin[0]},${pin[1]}`} target="_blank" rel="noreferrer" style={css('color:var(--g)')}>Check on Google Maps ↗</a> : <span>Without a pin, the plan can’t time the drive.</span>}
        </label>
        <label style={lbl}>Time there (minutes)<input type="number" min={0} value={p.visit || ''} onChange={e => setP({ ...p, visit: +e.target.value || undefined })} style={text} /></label>
        <label style={lbl}>Getting there<select value={p.access || ''} onChange={e => setP({ ...p, access: e.target.value || undefined })} style={text}>{ACCESS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      <div style={lbl}>Open or worth it in (leave all off for all year)<Months value={p.months} onChange={months => setP({ ...p, months })} /></div>
      <div style={css('display:flex;gap:8px;flex-wrap:wrap')}>
        <button disabled={!p.name.trim() || bad} onClick={() => onSave({ ...p, name: p.name.trim(), lat: pin?.[0], lon: pin?.[1] })} style={btn(true)}>Done</button>
        <button onClick={onCancel} style={btn(false)}>Cancel</button>
      </div>
    </div>
  );
}

export function PlacesTab({ c, edit, setUr }: { c: ContentEdits; edit: Edit; setUr: (en: string, v: string, from?: string) => void }) {
  const [id, setId] = useState('hunza'), [q, setQ] = useState(''), [open, setOpen] = useState<string | null>(null);
  const D = baseDest(id), pe = c.places[id] || { add: [], edit: {}, hide: [] };
  const at = (cc: ContentEdits) => (cc.places[id] ||= { add: [], edit: {}, hide: [] });
  const tidy = (cc: ContentEdits) => { const x = cc.places[id]; if (x && !x.add.length && !Object.keys(x.edit).length && !x.hide.length) delete cc.places[id]; };
  const rows = [
    ...(D?.places || []).map(p => { const b = fromBase(id, p), e = pe.edit[p[0]]; return { key: 'b:' + p[0], orig: p[0], cur: e || b, base: b, edited: !!e, hidden: pe.hide.includes(p[0]), added: -1 }; }),
    ...pe.add.map((p, i) => ({ key: 'a:' + i, orig: '', cur: p, base: p, edited: false, hidden: false, added: i }))
  ].filter(r => !q || `${r.cur.name} ${r.cur.note}`.toLowerCase().includes(q.toLowerCase()));
  const count = (d: string) => { const x = c.places[d]; const n = x ? x.add.length + Object.keys(x.edit).length + x.hide.length : 0; return n ? `${n} change${n > 1 ? 's' : ''}` : ''; };
  return (
    <section style={box}>
      <H2 sub="Every place SafarCo suggests for a destination. Edit, hide or add places, and they change in the app as soon as you save. Day plans follow a new name; a hidden place leaves every plan.">Places</H2>
      <DestPicker value={id} onChange={v => { setId(v); setOpen(null); }} mark={count} />
      <div style={css('display:flex;gap:8px;margin-top:10px;flex-wrap:wrap')}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a place here…" style={{ ...text, flex: '1 1 200px', width: 'auto' }} />
        <button onClick={() => setOpen('new')} style={btn(true)}>+ Add a place</button>
      </div>
      {open === 'new' && <PlaceForm start={empty()} ur={c.ur} setUr={setUr} onCancel={() => setOpen(null)} onSave={p => { edit(cc => { at(cc).add.push(p); }); setOpen(null); }} />}
      <div style={css('margin-top:10px')}>
        {rows.map(r => (
          <div key={r.key} style={css(`padding:10px 0;border-bottom:1px solid var(--line);opacity:${r.hidden ? .5 : 1}`)}>
            <div style={css('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
              <b style={css('font-size:15px')}>{r.cur.name}</b>
              {r.added >= 0 && <Tag tone="g">Added</Tag>}{r.edited && <Tag tone="amb">Edited</Tag>}{r.hidden && <Tag tone="cor">Hidden</Tag>}
              {r.cur.lat == null && <Tag>No pin</Tag>}{r.cur.months && <Tag>{r.cur.months.length} months</Tag>}
              <span style={css('flex:1')} />
              {!r.hidden && <button onClick={() => setOpen(open === r.key ? null : r.key)} style={small}>Edit</button>}
              {r.added < 0 && <button onClick={() => edit(cc => { const x = at(cc); x.hide = r.hidden ? x.hide.filter(n => n !== r.orig) : [...x.hide, r.orig]; tidy(cc); })} style={small}>{r.hidden ? 'Show again' : 'Hide'}</button>}
              {r.edited && <button onClick={() => edit(cc => { delete at(cc).edit[r.orig]; tidy(cc); })} style={small}>Undo edits</button>}
              {r.added >= 0 && <button onClick={() => { if (confirm(`Remove “${r.cur.name}”?`)) edit(cc => { at(cc).add.splice(r.added, 1); tidy(cc); }); }} style={small}>Remove</button>}
            </div>
            <div style={css('font-size:13px;color:var(--mute);margin-top:3px;line-height:1.45')}>{[r.cur.where, r.cur.note].filter(Boolean).join(' · ') || 'No note'}</div>
            {open === r.key && <PlaceForm start={r.cur} ur={c.ur} setUr={setUr} onCancel={() => setOpen(null)} onSave={p => {
              edit(cc => { const x = at(cc); if (r.added >= 0) x.add[r.added] = p; else if (same(p, r.base)) delete x.edit[r.orig]; else x.edit[r.orig] = p; tidy(cc); });
              setOpen(null);
            }} />}
          </div>
        ))}
        {!rows.length && <p style={css('color:var(--mute)')}>No places match.</p>}
      </div>
    </section>
  );
}
