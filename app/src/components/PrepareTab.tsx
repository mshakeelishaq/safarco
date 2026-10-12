// The Prepare tab: what to know before you go, the packing list, offline maps and help on the road.
import { css } from '../lib/css';
import { t } from '../i18n';
import type { Api, View } from '../view';
import { Fold, Footer, PackingCard, Ratings, TabHero, tripGlance } from './TripTab';
import { Notes } from './Onboarding';

/** Everything worth knowing before the trip, most serious first. */
function precautions(v: View) {
  const out: { key: string; icon: string; color: string; text: string }[] = [];
  const add = (icon: string, color: string, text: string) => { if (text && !out.some(x => x.text === text)) out.push({ key: String(out.length), icon, color, text }); };
  tripGlance(v).warnings.forEach(w => add('ph-warning', 'var(--cor)', w));
  v.plan.days.forEach((d, i) => {
    d.fuel?.notes.concat(d.fuel.gaps).forEach(n => add('ph-gas-pump', 'var(--amb2)', t('Day {n}: {text}', { n: i + 1, text: n })));
    d.strip?.flags.filter(f => f.level !== 'danger').forEach(f => add(f.icon, 'var(--amb2)', t('Day {n}: {text}', { n: i + 1, text: f.text })));
    // Notes for elders on high passes; the road descriptions stay on the day pages.
    if (d.note && v.s.elders && /altitude|BP|unchai/i.test(d.note)) add('ph-heartbeat', 'var(--amb2)', t('Day {n}: {text}', { n: i + 1, text: d.note }));
  });
  if (v.gate.show && v.gate.title) add('ph-jeep', 'var(--amb2)', `${v.gate.title} ${v.gate.msg || ''}`.trim());
  return out;
}

export function PrepareTab({ v, api }: { v: View; api: Api }) {
  const { off } = v, glance = tripGlance(v), list = precautions(v);
  const seasonRest = [...v.seasonNotes, ...v.liveRoadNotes].filter(n => !list.some(x => x.text === n.text));
  return (
    <div data-screen-label="Prepare">
      <TabHero v={v} title={t('Prepare')} sub={t('What to know, what to pack, and help on the road.')} />
      <div className="sc-flow" style={css('padding:4px 16px 150px;display:flex;flex-direction:column;gap:12px;pointer-events:auto;background:var(--bg)')}>
        <Fold icon="ph-shield-warning" iconColor={list.some(x => x.color === 'var(--cor)') ? 'var(--cor)' : 'var(--amb2)'} title={t('Things to know')} summary={list.length ? (list.length > 1 ? t('{n} notes', { n: list.length }) : t('1 note')) : t('All clear')} summaryColor={list.some(x => x.color === 'var(--cor)') ? 'var(--cor)' : undefined}>
          {list.length ? <div style={css('display:flex;flex-direction:column;gap:10px')}>
            {list.map(x => <div key={x.key} style={css('display:flex;gap:10px;align-items:flex-start')}><i className={`ph-fill ${x.icon}`} style={css(`font-size:18px;color:${x.color};flex:none;margin-top:1px`)} /><div style={css(`font-size:13px;font-weight:700;line-height:1.45;color:${x.color === 'var(--cor)' ? 'var(--cor)' : 'var(--ink2)'}`)}>{x.text}</div></div>)}
          </div> : <div style={css('font-size:13px;font-weight:600;color:var(--ink2)')}>{t('No warnings for your dates so far. Check again the day before you leave.')}</div>}
        </Fold>

        {v.wx.passes.length > 0 && (
          <Fold icon="ph-mountains" title={t('Mountain passes')} summary={glance.passWarn ? (glance.passWarn > 1 ? t('{n} warnings', { n: glance.passWarn }) : t('1 warning')) : t('{n} on route', { n: v.wx.passes.length })} summaryColor={glance.passWarn ? 'var(--cor)' : undefined}>
            <div style={css('display:flex;flex-direction:column;gap:12px')}>
              {v.wx.passes.map(p => (
                <div key={p.key} style={css(`padding:12px;border-radius:18px;background:var(--fill);border-left:4px solid ${p.color}`)}>
                  <div style={css('display:flex;align-items:center;gap:10px')}>
                    <i className={`ph-duotone ${p.icon}`} style={css(`font-size:28px;color:${p.color};flex:none`)} />
                    <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:800')}>{p.name} <span style={css('font-weight:600;color:var(--mute);font-size:12px')}>· {p.ft}</span></div><div style={css('font-size:12px;font-weight:600;color:var(--mute);margin-top:1px')}>{p.when}</div></div>
                    <div style={css('flex:none;font-family:var(--fontH);font-size:22px;font-weight:600')}>{p.temp}</div>
                  </div>
                  <div style={css('font-size:12px;font-weight:600;color:var(--ink2);margin-top:8px;line-height:1.45')}>{p.text}</div>
                  {p.flags.map(f => <div key={f.text} style={css(`display:flex;gap:6px;align-items:center;margin-top:6px;font-size:12px;font-weight:800;color:${f.level === 'danger' ? 'var(--cor)' : 'var(--amb2)'}`)}><i className={`ph-fill ${f.icon}`} />{f.text}</div>)}
                </div>
              ))}
            </div>
            <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:10px;line-height:1.45')}>{t('Weather at each pass\'s real height. Passes can close at short notice: check with local police before you set off.')}</div>
          </Fold>
        )}
        {seasonRest.length > 0 && <Fold icon="ph-calendar-blank" iconColor="var(--amb2)" title={t('Season and road notes')} summary={t('{n} notes', { n: seasonRest.length })}>
          <div style={css('display:flex;flex-direction:column;gap:10px')}><Notes notes={seasonRest} /></div>
        </Fold>}
        {(v.wx.aq.rows.length > 0 || v.wx.aq.note) && (
          <Fold icon="ph-wind" iconColor="var(--sky)" title={t('Air quality')} summary={v.wx.aq.rows.some(r => r.bad) ? t('Unhealthy') : v.wx.aq.rows[0]?.label || t('Smog season')} summaryColor={v.wx.aq.rows.some(r => r.bad) ? 'var(--cor)' : undefined}>
            {v.wx.aq.rows.length > 0 && <div style={css('display:flex;flex-direction:column;gap:8px')}>
              {v.wx.aq.rows.map(r => (
                <div key={r.key} style={css('display:flex;align-items:center;gap:10px')}>
                  <span style={css(`flex:none;min-width:44px;padding:4px 6px;border-radius:9px;background:var(--fill);color:${r.color};font-size:13px;font-weight:800;text-align:center;font-variant-numeric:tabular-nums`)}>{r.aqi}</span>
                  <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{r.place} <span style={css('font-weight:600;color:var(--mute);font-size:12px')}>· {r.date}</span></div><div style={css(`font-size:12px;font-weight:700;color:${r.color}`)}>{r.label} · PM2.5 {r.pm} µg/m³</div></div>
                </div>
              ))}
            </div>}
            {v.wx.aq.note && <div style={css('font-size:13px;font-weight:600;color:var(--ink2);margin-top:8px;line-height:1.45')}>{v.wx.aq.note}</div>}
            {v.wx.aq.rows.some(r => r.bad) && <div style={css('font-size:12px;font-weight:700;color:var(--cor);margin-top:8px;line-height:1.45')}>{t('Unhealthy air: wear N95 masks outdoors, keep car windows closed, and take care with children and elders.')}</div>}
            <div style={css('font-size:10px;font-weight:600;color:var(--mute);margin-top:8px')}>{t('US AQI, highest of the day · Open-Meteo (CAMS)')}</div>
          </Fold>
        )}

        <PackingCard v={v} />

        <h2 style={css('font-size:14px;font-weight:700;color:var(--mute);margin:8px 4px 0')}>{t('Offline maps for no-signal areas')}</h2>
        <section style={css('border-radius:30px;padding:22px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;text-align:center')}>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v.s.offline === 'ready' ? 100 : v.s.progress} style={css(`position:relative;width:148px;height:148px;border-radius:50%;background:${off.ring};box-shadow:0 0 50px -10px ${off.glow};display:flex;align-items:center;justify-content:center`)}>
            <div style={css('width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 30%,var(--sheet),var(--sheet));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:inset 0 2px 0 var(--fill)')}>
              <i className={`ph-fill ${off.icon}`} style={css(`font-size:34px;color:${off.iconC}`)} />
              <div style={css('font-family:var(--fontH);font-size:15px;font-weight:600;font-variant-numeric:tabular-nums')}>{off.pct}</div>
            </div>
          </div>
          <h2 style={css('margin:16px 0 0;font-size:18px;font-weight:800')}>{off.title}</h2>
          <div style={css('font-size:13px;color:var(--mute);font-weight:500;margin-top:4px;line-height:1.45;max-width:270px')}>{off.sub}</div>
          <button onClick={api.toggleOffline} disabled={v.s.offline === 'downloading'} style={css(`margin-top:18px;width:100%;height:54px;border-radius:18px;border:${off.btnBorder};background:${off.btnBg};color:${off.btnFg};font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:${off.btnShadow}`)}><i className={`ph-bold ${off.btnIcon}`} />{off.btnLabel}</button>
        </section>

        <h2 style={css('font-size:14px;font-weight:700;color:var(--mute);margin:8px 4px 0')}>{t('Emergency')}</h2>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          {v.helplines.map(h => (
            <a key={h.num} href={h.href} style={css('display:flex;align-items:center;gap:12px;padding:14px;border-radius:22px;background:linear-gradient(160deg,rgba(255,107,91,.18),rgba(255,107,91,.05));border:1px solid rgba(255,107,91,.3);text-decoration:none;color:var(--ink)')}>
              <div style={css('width:38px;height:38px;flex:none;border-radius:13px;background:linear-gradient(135deg,#FF8A6B,#FF4F7B);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff')}><i className="ph-fill ph-phone-call" /></div>
              <div style={css('min-width:0')}><div style={css('font-family:var(--fontH);font-size:17px;font-weight:600;font-variant-numeric:tabular-nums')}>{h.num}</div><div style={css('font-size:12px;font-weight:600;color:var(--ink2)')}>{h.label}</div></div>
            </a>
          ))}
        </div>

        {v.drivers.length > 0 && (
          <Fold icon="ph-jeep" iconColor="var(--amb2)" title={t('Trusted drivers and jeeps')} summary={t('{n} on your route', { n: v.drivers.length })}>
            <div style={css('display:flex;flex-direction:column;gap:12px')}>
              {v.drivers.map(x => (
                <div key={x.key}>
                <div style={css('display:flex;align-items:center;gap:10px')}>
                  <div style={css('flex:1;min-width:0')}>
                    <div style={css('display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;color:var(--g);letter-spacing:.04em;text-transform:uppercase')}><i className="ph-fill ph-seal-check" />{t('Recommended by SafarCo')}</div>
                    <div style={css('font-size:14px;font-weight:800;line-height:1.3')}>{x.name} <span style={css('font-weight:600;color:var(--mute);font-size:12px')}>· {x.area}</span></div>
                    <div style={css('font-size:12px;color:var(--ink2);font-weight:600;margin-top:1px')}>{x.vehicle}{x.rate ? ` · ${x.rate}` : ''}</div>
                    {x.note && <div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px;line-height:1.4')}>{x.note}</div>}
                  </div>
                  {x.tel && <a href={x.tel} aria-label={t('Call {name}', { name: x.name })} style={css('flex:none;width:40px;height:40px;border-radius:13px;background:var(--fill);border:1px solid var(--line);color:var(--ink);display:flex;align-items:center;justify-content:center;font-size:18px')}><i className="ph-fill ph-phone" /></a>}
                  {x.wa && <a href={x.wa} target="_blank" rel="noopener" aria-label={t('WhatsApp {name}', { name: x.name })} style={css('flex:none;width:40px;height:40px;border-radius:13px;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px')}><i className="ph-fill ph-whatsapp-logo" /></a>}
                </div>
                <Ratings r={x.rating} onRate={x.review} />
                </div>
              ))}
            </div>
            <div style={css('font-size:11px;font-weight:600;color:var(--mute);margin-top:12px;line-height:1.45')}>{t('Drivers SafarCo knows. Agree the price and route before you set off.')}</div>
          </Fold>
        )}
        <Footer />
      </div>
    </div>
  );
}
