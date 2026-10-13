// The Budget tab: the total against the budget, where the money goes, cheaper or better ways, and the rates used.
import { css } from '../lib/css';
import { t } from '../i18n';
import type { Api, View } from '../view';
import { BannerCard, Fold, Footer, TabHero } from './TripTab';
import { ExpensesCard } from './TripMode';

export function BudgetTab({ v }: { v: View; api: Api }) {
  const b = v.budget;
  return (
    <div data-screen-label="Budget">
      <TabHero v={v} title={t('Budget')} sub={v.tripSummary} />
      <div className="sc-flow" style={css('padding:4px 16px 150px;display:flex;flex-direction:column;gap:12px;pointer-events:auto;background:var(--bg)')}>
        <section aria-label={t('Total cost')} style={css(`border-radius:30px;padding:18px;background:var(--card);border:1px solid var(--line);box-shadow:${v.budgetShadow};transition:box-shadow .4s`)}>
          <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px')}>
            <div style={css('font-size:13px;font-weight:800;color:var(--mute)')}>{t('Whole trip, everyone')}</div>
            {v.capOn && <div style={css(`display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:11px;background:${v.health.bg};color:${v.health.fg};font-size:12px;font-weight:800`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:${v.health.fg}`)} />{v.health.label}</div>}
          </div>
          <div style={css('display:flex;align-items:baseline;gap:8px;margin-top:8px;flex-wrap:wrap')}>
            <span style={css('font-size:15px;font-weight:800;color:var(--mute)')}>PKR</span>
            <span style={css('font-family:var(--fontH);font-weight:600;font-size:38px;letter-spacing:-.03em;font-variant-numeric:tabular-nums;background:var(--ng3);-webkit-background-clip:text;background-clip:text;color:transparent')}>{v.totalNum}</span>
            <span style={css('font-size:15px;font-weight:800;color:var(--mute);font-variant-numeric:tabular-nums')}>≈ {v.totalUsd}</span>
          </div>
          {v.capOn ? <>
            <div style={css('font-size:13px;color:var(--mute);font-weight:600;font-variant-numeric:tabular-nums')}>{t('{amount} per person · {pct}% of {cap} budget', { amount: v.perPersonStr, pct: v.capPct, cap: v.capStr })}</div>
            <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v.barPct)} aria-label={t('Share of budget')} style={css('height:8px;border-radius:4px;background:var(--fill2);margin:12px 0 4px;overflow:hidden')}><div style={css(`height:100%;width:${v.barPct}%;border-radius:4px;background:${v.health.fg};transition:width .6s cubic-bezier(.2,.8,.2,1)`)} /></div>
            <button onClick={v.capToggle.onClick} style={css('margin-top:6px;padding:0;border:0;background:none;color:var(--mute);font-size:12px;font-weight:800;cursor:pointer;text-decoration:underline')}>{v.capToggle.label}</button>
          </> : <div style={css('display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap')}>
            <div style={css('font-size:13px;color:var(--mute);font-weight:600;font-variant-numeric:tabular-nums')}>{t('{amount} per person', { amount: v.perPersonStr })}</div>
            <button onClick={v.capToggle.onClick} style={css('height:36px;padding:0 12px;border-radius:11px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px')}><i className="ph-fill ph-wallet" />{t('Set a spending limit')}</button>
          </div>}

          <h2 style={css('margin:20px 0 0;font-size:14px;font-weight:800')}>{t('Where the money goes')}</h2>
          <div role="img" aria-label={b.segs.map(x => `${x.label} ${x.share}`).join(', ')} style={css('display:flex;gap:2px;height:22px;margin-top:10px')}>
            {b.segs.map((x, i) => <div key={x.key} title={`${x.label}: ${x.amount} (${x.share})`} style={css(`flex:${x.pct} 1 0;min-width:4px;background:${x.color};border-radius:${i === 0 ? '6px 0 0 6px' : i === b.segs.length - 1 ? '0 6px 6px 0' : '0'};transition:flex .5s`)} />)}
          </div>
          <div style={css('display:flex;flex-direction:column;gap:2px;margin-top:10px')}>
            {b.segs.map(x => (
              <div key={x.key} style={css('display:flex;align-items:center;gap:10px;min-height:32px')}>
                <span style={css(`width:12px;height:12px;flex:none;border-radius:4px;background:${x.color}`)} />
                <span style={css('flex:1;min-width:0;font-size:14px;font-weight:700')}>{x.label}</span>
                <span style={css('flex:none;font-size:12px;font-weight:700;color:var(--mute);font-variant-numeric:tabular-nums;min-width:36px;text-align:right')}>{x.share}</span>
                <span style={css('flex:none;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;min-width:96px;text-align:right')}>{x.amount}</span>
              </div>
            ))}
          </div>
        </section>

        <ExpensesCard v={v} />

        {v.tip.show && <BannerCard b={v.tip} center><button onClick={v.tip.apply} style={css('flex:none;height:44px;padding:0 14px;border-radius:14px;border:0;background:var(--ink);color:var(--bg);font-size:13px;font-weight:800;cursor:pointer')}>{v.tip.cta}</button></BannerCard>}

        {b.others.length > 0 && (
          <Fold icon="ph-arrows-left-right" iconColor="var(--sky)" title={t('Other ways to do this trip')} summary={t('Tap to switch')}>
            <div style={css('display:flex;flex-direction:column;gap:8px')}>
              {b.others.map(o => (
                <button key={o.key} onClick={o.onClick} style={css('display:flex;align-items:center;gap:10px;min-height:56px;padding:8px 12px;border-radius:16px;border:1px solid var(--line2);background:var(--fill);color:var(--ink);text-align:left;cursor:pointer')}>
                  <span style={css('flex:1;min-width:0')}><span style={css('display:block;font-size:14px;font-weight:800')}>{o.name}</span><span style={css('display:block;font-size:12px;font-weight:600;color:var(--mute);margin-top:1px')}>{o.sub}</span></span>
                  <span style={css('flex:none;text-align:right')}><span style={css('display:block;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums')}>{o.amount}</span><span style={css(`display:block;font-size:11px;font-weight:800;color:${o.cheaper ? 'var(--g)' : 'var(--mute)'}`)}>{o.diff}{o.fits ? '' : ' · ' + t('over budget')}</span></span>
                </button>
              ))}
            </div>
          </Fold>
        )}

        <Fold icon="ph-receipt" title={t('Every cost, line by line')} summary={`PKR ${v.totalNum}`} summaryColor="var(--ink)">
          <div style={css('display:flex;flex-direction:column;gap:12px')}>
            {v.rows.map(r => (
              <div key={r.label} style={css('display:flex;align-items:center;gap:12px')}>
                <div style={css(`width:38px;height:38px;flex:none;border-radius:12px;background:${r.grad};display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)`)}><i className={`ph-fill ${r.icon}`} /></div>
                <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{r.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;font-variant-numeric:tabular-nums')}>{r.detail}</div></div>
                <div style={css('text-align:right')}><div style={css('font-size:14px;font-weight:800;font-variant-numeric:tabular-nums')}>{r.amount}</div><div style={css('font-size:11px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums')}>{r.amountUsd}</div></div>
              </div>
            ))}
          </div>
          {v.rates.length > 0 && <>
            <h3 style={css('margin:20px 0 0;font-size:13px;font-weight:700;color:var(--mute)')}>{t('Rates for your transport')}</h3>
            <div style={css('font-size:12px;color:var(--mute);font-weight:600;margin-top:4px;line-height:1.45')}>{v.ratesNote}</div>
            <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:12px')}>
              {v.rates.map(r => (
                <div key={r.label} style={css('display:flex;align-items:center;gap:12px')}>
                  <div style={css('width:38px;height:38px;flex:none;border-radius:12px;background:var(--fill);display:flex;align-items:center;justify-content:center;font-size:19px;color:var(--sky)')}><i className={`ph-fill ${r.icon}`} /></div>
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{r.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;line-height:1.4')}>{r.sub}</div></div>
                  <div style={css('flex:none;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap')}>{r.amount}</div>
                </div>
              ))}
            </div>
          </>}
          {v.hasJeeps && <>
            <h3 style={css('margin:20px 0 0;font-size:13px;font-weight:700;color:var(--mute)')}>{t('Local jeeps (added for places in your plan)')}</h3>
            <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:12px')}>
              {v.jeeps.map(j => (
                <div key={j.key} style={css('display:flex;align-items:center;gap:12px')}>
                  <div style={css('width:38px;height:38px;flex:none;border-radius:12px;background:linear-gradient(135deg,#FFB547,#FF7A3D);display:flex;align-items:center;justify-content:center;font-size:19px;color:#fff')}><i className="ph-fill ph-jeep" /></div>
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{j.label}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;line-height:1.4')}>{j.sub}</div></div>
                  <span style={css(`flex:none;height:40px;padding:0 12px;border-radius:13px;border:${j.border};background:${j.bg};color:${j.fg};font-size:12px;font-weight:800;white-space:nowrap;display:flex;align-items:center;box-sizing:border-box`)}>{j.cta}</span>
                </div>
              ))}
            </div>
          </>}
          <div style={css('font-size:10px;font-weight:600;color:var(--mute);margin-top:14px')}>{v.fxNote} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener" style={css('color:inherit')}>{t('Rates by Exchange Rate API')}</a></div>
        </Fold>

        <Fold icon="ph-seal-check" title={t('About these numbers')} summary={v.priceNotes.every(n => n.ok) ? t('Prices checked') : t('Some not checked')} summaryColor={v.priceNotes.every(n => n.ok) ? 'var(--g)' : 'var(--amb2)'}>
          <div style={css('font-size:12px;font-weight:600;color:var(--ink2);line-height:1.5')}>{t('Live: road distance and route (OpenRouteService), weather (Open-Meteo), places and hotels (OpenStreetMap), dollar rate. Prices that change by operator come from SafarCo’s price list:')}</div>
          <div style={css('display:flex;flex-direction:column;gap:8px;margin-top:12px')}>
            {v.priceNotes.map(n => (
              <div key={n.key} style={css('display:flex;gap:10px;align-items:flex-start')}>
                <i className={`ph-fill ${n.ok ? 'ph-seal-check' : 'ph-clock-countdown'}`} style={css(`font-size:17px;color:${n.ok ? 'var(--g)' : 'var(--amb)'};flex:none;margin-top:1px`)} />
                <div style={css('font-size:12px;font-weight:600;line-height:1.45;color:var(--ink2)')}><b>{n.label}</b> · {n.checked} · {n.source}</div>
              </div>
            ))}
          </div>
        </Fold>
        <Footer />
      </div>
    </div>
  );
}
