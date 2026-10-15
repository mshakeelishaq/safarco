// What to eat at each place: dishes, where to find them and a line about each, plus travellers' approved tips to add.
import { useState } from 'react';
import { css } from '../../lib/css';
import { allDests, baseFood, type ContentEdits } from '../../content';
import { FOOD, type Food } from '../../engine/food';
import { DST } from '../../engine/places';
import type { FoodTip } from '../../cloud';
import { H2, Tag, box, btn, small, text } from './ui';
import type { Edit } from './PlacesTab';

export function FoodTab({ c, edit, tips }: { c: ContentEdits; edit: Edit; tips: FoodTip[] | null }) {
  const [id, setId] = useState('hunza');
  const ids = [...new Set([...allDests().map(d => d.id), ...Object.keys(FOOD)])].sort((a, b) => DST(a).name.localeCompare(DST(b).name));
  const list: Food[] = c.food[id] ?? baseFood(id), edited = id in c.food;
  const set = (l: Food[]) => edit(cc => { cc.food[id] = l; });
  const approved = (tips || []).filter(x => x.dest === id && x.status === 'approved');
  return (
    <section style={box}>
      <H2 sub="Shown on each day at the place, under “Food to try”. Dishes and areas last longer than single restaurants; travellers’ approved tips can be added below.">Food</H2>
      <select value={id} onChange={e => setId(e.target.value)} style={text}>{ids.map(k => <option key={k} value={k}>{DST(k).name}{c.food[k] ? ' · edited' : ''}</option>)}</select>
      <div style={css('display:flex;gap:8px;align-items:center;margin:12px 0 6px')}>
        <b>{DST(id).name}</b>{edited && <Tag tone="amb">Edited</Tag>}<span style={css('flex:1')} />
        {edited && <button onClick={() => edit(cc => { delete cc.food[id]; })} style={small}>Undo edits</button>}
      </div>
      {list.map((f, i) => (
        <div key={i} style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;padding:8px 0;border-bottom:1px solid var(--line)')}>
          <input value={f[0]} placeholder="Dish" onChange={e => set(list.map((x, j) => j === i ? [e.target.value, x[1], x[2]] : x))} style={text} />
          <input value={f[1]} placeholder="Where to find it" onChange={e => set(list.map((x, j) => j === i ? [x[0], e.target.value, x[2]] : x))} style={text} />
          <input value={f[2]} placeholder="A line about it" onChange={e => set(list.map((x, j) => j === i ? [x[0], x[1], e.target.value] : x))} style={text} />
          <div style={css('display:flex;gap:6px')}><button disabled={!i} onClick={() => { const l = [...list]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; set(l); }} style={small}>↑ Up</button>
          <button onClick={() => set(list.filter((_, j) => j !== i))} style={small}>Remove</button></div>
        </div>
      ))}
      {!list.length && <p style={css('color:var(--mute)')}>No food list here yet.</p>}
      <button onClick={() => set([...list, ['', '', '']])} style={btn(false)}>+ Add a dish</button>
      {approved.length > 0 && <div style={css('margin-top:16px')}>
        <div style={css('font-size:13px;font-weight:800;margin-bottom:6px')}>Travellers’ approved tips here</div>
        {approved.map(x => (
          <div key={x.id} style={css('display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px')}>
            <span style={css('flex:1')}><b>{x.name}</b>{x.dish ? ` · ${x.dish}` : ''}{x.note ? <span style={css('color:var(--mute)')}> · {x.note}</span> : null}</span>
            <button onClick={() => set([...list, [x.dish || `Food at ${x.name}`, x.name, x.note.slice(0, 160)]])} style={small}>Add to the list</button>
          </div>
        ))}
      </div>}
    </section>
  );
}
