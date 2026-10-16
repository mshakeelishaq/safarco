// /split: the group's expenses, view only. One person keeps the list in SafarCo and sends this link;
// everyone sees who paid what, their share, and who still owes whom. The list is inside the link.
import { Logo } from '../components/Logo';
import { css } from '../lib/css';
import { t } from '../i18n';
import { dayLabel, fmt } from '../engine/format';
import { settle, splitFromUrl } from '../split';

const card = 'border-radius:22px;padding:16px;background:var(--card);border:1px solid var(--line)';
const h2 = css('margin:0 0 8px;font-size:13px;font-weight:800;color:var(--mute);text-transform:uppercase;letter-spacing:.06em');
const catName = (c: string) => t(c === 'Jeeps' ? 'Local jeeps' : c);

export function Split() {
  const s = splitFromUrl(new URLSearchParams(location.search).get('d'));
  const wrap = (children: React.ReactNode) => (
    <div data-sc="1" data-theme="paper" style={css('min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--font)')}>
      <main style={css('max-width:520px;margin:0 auto;padding:24px 16px 48px;display:flex;flex-direction:column;gap:12px')}>
        <div><Logo size={32} /></div>
        {children}
        <a href="/plan?start=1" style={css('align-self:center;margin-top:8px;font-size:13px;font-weight:800;color:var(--g);text-decoration:none')}>{t('Plan your own trip with SafarCo')} →</a>
      </main>
    </div>
  );
  if (!s) return wrap(<div style={css(card)}><h1 style={css('margin:0;font-size:20px')}>{t('This link doesn’t work')}</h1><p style={css('margin:8px 0 0;color:var(--ink2)')}>{t('Ask whoever keeps the expenses to send it again from SafarCo.')}</p></div>);

  const { rows, owes } = settle(s), total = s.expenses.reduce((a, e) => a + e.amount, 0);
  const asOf = s.at ? new Date(s.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  return wrap(<>
    <section style={css(card)}>
      <div style={css('font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--amb2)')}>{t('Trip expenses')}</div>
      <h1 style={css('margin:6px 0 0;font-family:var(--fontH);font-size:26px;font-weight:600;line-height:1.15')}>{s.title}</h1>
      <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:10px;flex-wrap:wrap')}><span style={css('font-family:var(--fontH);font-size:30px;font-weight:600;font-variant-numeric:tabular-nums')}>{fmt(total)}</span><span style={css('font-size:13px;font-weight:700;color:var(--mute)')}>{t('{n} expenses', { n: s.expenses.length })}</span></div>
      {asOf && <div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:4px')}>{t('As of {time}. Only the person keeping the list can change it.', { time: asOf })}</div>}
    </section>

    <section style={css(card)}>
      <h2 style={h2}>{t('To settle up')}</h2>
      {owes.length ? owes.map(o => <div key={o.from + o.to} style={css('display:flex;align-items:center;gap:8px;min-height:40px;font-size:15px;font-weight:800')}><i className="ph-bold ph-arrow-right" style={css('color:var(--g)')} />{t('{from} pays {to} {amount}', { from: o.from, to: o.to, amount: fmt(o.amount) })}</div>)
        : <div style={css('font-size:15px;font-weight:800;color:var(--g)')}>{t('All settled up.')}</div>}
    </section>

    <section style={css(card)}>
      <h2 style={h2}>{t('Who paid what')}</h2>
      {rows.map(r => <div key={r.name} style={css('display:flex;align-items:center;gap:8px;min-height:52px;padding:4px 0;border-bottom:1px solid var(--line)')}>
        <span style={css('flex:1;min-width:0')}>
          <span style={css('display:block;font-size:14px;font-weight:800')}>{r.name}{(s.shares[r.name] || 1) > 1 && <span style={css('color:var(--mute);font-weight:700')}> ×{s.shares[r.name]}</span>}</span>
          <span style={css('display:block;font-size:12px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums')}>{t('paid {paid} · share {share}', { paid: fmt(r.paid), share: fmt(r.share) })}</span>
        </span>
        <span style={css(`min-width:86px;text-align:right;font-size:13px;font-weight:800;color:${r.net > 0 ? 'var(--g)' : r.net < 0 ? 'var(--cor)' : 'var(--mute)'}`)}>{r.net > 0 ? t('gets {amount}', { amount: fmt(r.net) }) : r.net < 0 ? t('owes {amount}', { amount: fmt(-r.net) }) : t('even')}</span>
      </div>)}
    </section>

    <section style={css(card)}>
      <h2 style={h2}>{t('Expenses')}</h2>
      {s.expenses.slice().reverse().map((e, i) => <div key={i} style={css('display:flex;align-items:center;gap:10px;min-height:46px;border-bottom:1px solid var(--line)')}>
        <div style={css('flex:1;min-width:0')}>
          <div style={css('font-size:14px;font-weight:700')}>{e.note || catName(e.cat)}</div>
          <div style={css('font-size:12px;font-weight:600;color:var(--mute)')}>{[e.date ? dayLabel(e.date, 0) : '', e.payer ? t('Paid by {name}', { name: e.payer }) : '', e.split && e.split.length < s.people.length ? t('Split: {names}', { names: e.split.join(', ') }) : ''].filter(Boolean).join(' · ')}</div>
        </div>
        <span style={css('font-size:14px;font-weight:800;font-variant-numeric:tabular-nums')}>{fmt(e.amount)}</span>
      </div>)}
      {s.payments.length > 0 && <>
        <h2 style={{ ...h2, marginTop: 16 }}>{t('Paid back')}</h2>
        {s.payments.map((p, i) => <div key={i} style={css('font-size:13px;font-weight:700;color:var(--ink2);min-height:30px;display:flex;align-items:center;gap:6px')}><i className="ph-fill ph-check-circle" style={css('color:var(--g)')} />{t('{from} paid {to} {amount}', { from: p.from, to: p.to, amount: fmt(p.amount) })}</div>)}
      </>}
    </section>
  </>);
}
