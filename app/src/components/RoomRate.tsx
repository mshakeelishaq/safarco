// The room rate for the trip: the usual rates to pick from (backpacker, standard, standard plus, premium), or your own.
import { useState } from 'react';
import { css } from '../lib/css';
import { t } from '../i18n';
import type { View } from '../view';

export function RoomRate({ v }: { v: View }) {
  const r = v.roomRate, [draft, setDraft] = useState('');
  const save = () => { const n = Number(draft.replace(/[^\d]/g, '')); if (n > 0) { r.setOwn(n); setDraft(''); } };
  return (
    <div>
      <div style={css('display:flex;align-items:baseline;justify-content:space-between;gap:8px')}>
        <div style={css('font-size:14px;font-weight:800')}>{t('Room rate')}</div>
        <div style={css('font-size:15px;font-weight:800;font-variant-numeric:tabular-nums')}>{t('{amount} a night', { amount: r.value })}</div>
      </div>
      <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:2px;line-height:1.4')}>{r.note}</div>
      <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px')}>
        {r.presets.map(p => <button key={p.key} onClick={p.apply} aria-pressed={p.on} style={css(`padding:9px 11px;border-radius:14px;border:1px solid ${p.on ? 'var(--g)' : 'var(--line2)'};background:${p.on ? 'rgba(46,229,157,.12)' : 'var(--fill)'};color:var(--ink);text-align:left;cursor:pointer;font:inherit`)}>
          <div style={css('font-size:13px;font-weight:800')}>{p.label}</div>
          <div style={css('font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--g);margin-top:1px')}>{p.amount}</div>
          <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:2px')}>{p.sub}</div>
        </button>)}
      </div>
      <div style={css('display:flex;gap:8px;margin-top:10px')}>
        <input inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} placeholder={r.own ? t('Your rate: {amount}', { amount: r.value }) : t('Your own rate, e.g. 7500')} aria-label={t('Your own room rate')}
          style={css('flex:1;min-width:0;height:42px;padding:0 12px;border-radius:13px;border:1px solid var(--line2);background:var(--card);color:var(--ink);font:inherit;font-size:14px')} />
        <button onClick={save} disabled={!draft.trim()} style={css(`height:42px;padding:0 14px;border-radius:13px;border:0;background:var(--cta);color:var(--onCta);font-size:13px;font-weight:800;cursor:pointer;opacity:${draft.trim() ? 1 : .5}`)}>{t('Use')}</button>
        {r.own && <button onClick={r.reset} style={css('height:42px;padding:0 12px;border-radius:13px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer')}>{t('Reset')}</button>}
      </div>
    </div>
  );
}
