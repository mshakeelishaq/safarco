import { css } from '../lib/css';
import type { Api, View } from '../view';

export function OfflineTab({ v, api }: { v: View; api: Api }) {
  const { c, off } = v;
  return (
    <div data-screen-label="Offline mode">
      <div style={css('height:250px;position:relative;pointer-events:none')}>
        <div style={css('position:absolute;left:22px;right:22px;top:58px;text-shadow:var(--tsh)')}>
          <div style={css('font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--amb2)')}>{c.from} → {c.to}</div>
          <h1 style={css('margin:6px 0 0;font-family:var(--fontH);font-weight:600;font-size:26px;letter-spacing:-.02em')}>Offline survival</h1>
        </div>
      </div>
      <div style={css('padding:4px 16px 150px;display:flex;flex-direction:column;gap:14px;pointer-events:auto;background:var(--bg)')}>
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

        <h2 style={css('font-size:14px;font-weight:700;color:var(--mute);margin:8px 4px 0')}>Emergency</h2>
        <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          {v.helplines.map(h => (
            <a key={h.num} href={h.href} style={css('display:flex;align-items:center;gap:12px;padding:14px;border-radius:22px;background:linear-gradient(160deg,rgba(255,107,91,.18),rgba(255,107,91,.05));border:1px solid rgba(255,107,91,.3);text-decoration:none;color:var(--ink)')}>
              <div style={css('width:38px;height:38px;flex:none;border-radius:13px;background:linear-gradient(135deg,#FF8A6B,#FF4F7B);display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff')}><i className="ph-fill ph-phone-call" /></div>
              <div style={css('min-width:0')}><div style={css('font-family:var(--fontH);font-size:17px;font-weight:600;font-variant-numeric:tabular-nums')}>{h.num}</div><div style={css('font-size:12px;font-weight:600;color:var(--ink2)')}>{h.label}</div></div>
            </a>
          ))}
        </div>

        <h2 style={css('font-size:14px;font-weight:700;color:var(--mute);margin:8px 4px 0')}>Stays in {c.town}</h2>
        {v.hotels.map(h => (
          <div key={h.name} style={css('border-radius:26px;padding:16px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;gap:12px')}>
            <div style={css('display:flex;align-items:center;gap:12px')}>
              <div style={css(`width:46px;height:46px;flex:none;border-radius:15px;background:${h.grad};display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)`)}><i className="ph-fill ph-bed" /></div>
              <div style={css('flex:1;min-width:0')}><div style={css('font-size:15px;font-weight:800')}>{h.name}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:2px')}>{h.note}</div></div>
              <div style={css(`flex:none;font-size:11px;font-weight:800;padding:4px 8px;border-radius:8px;background:var(--fill);color:${h.tierC}`)}>{h.tier}</div>
            </div>
            <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px')}>
              <a href={h.mapUrl} target="_blank" rel="noopener" style={css('height:46px;border-radius:15px;background:var(--fill);border:1px solid var(--line);color:var(--ink);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none')}><i className="ph-fill ph-map-pin" style={css('color:var(--g)')} />Reviews<i className="ph-bold ph-arrow-up-right" /></a>
              <a href={h.checkUrl} target="_blank" rel="noopener" style={css('height:46px;border-radius:15px;background:var(--fill);border:1px solid var(--line);color:var(--ink);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none')}><i className="ph-fill ph-tag" style={css('color:var(--g)')} />Check prices<i className="ph-bold ph-arrow-up-right" /></a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
