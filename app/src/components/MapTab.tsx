import { useEffect, useRef } from 'react';
import { LIVE } from '../engine/live';
import { cityOr } from '../engine/places';
import { liveRoadKey } from '../engine/engine';
import { mon } from '../engine/format';
import { css } from '../lib/css';
import { t } from '../i18n';
import { DEM_TILES, MAP_STYLE } from '../mapConfig';
import type { Api, View } from '../view';

type ML = typeof import('maplibre-gl');
const escH = (s: string) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Real 3D map (MapLibre + OpenFreeMap + Terrarium elevation) with the trip route and pins. */
function LiveMap({ v, onFail, fill }: { v: View; onFail: () => void; fill?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const st = useRef<{ ml?: ML; map?: import('maplibre-gl').Map; ok?: boolean; key?: string; wxKey?: string; fuelKey?: string; markers: import('maplibre-gl').Marker[] }>({ markers: [] });
  const { s } = v, rm = v.routeMap, o = cityOr(s.origin), r = LIVE.route[liveRoadKey(s.corridor, s.origin, mon(s))];

  useEffect(() => {
    let dead = false;
    const fail = setTimeout(() => { if (!st.current.ok) onFail(); }, 12000);
    Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'), import('maplibre-gl/dist/maplibre-gl.css')]).then(([ML, worker]) => {
      if (dead || !el.current) return;
      const mod = (ML as unknown as { default?: ML }).default ?? ML;
      mod.setWorkerUrl(worker.default);
      st.current.ml = mod;
      const m = new mod.Map({ container: el.current, style: MAP_STYLE, center: [73.4, 34.2], zoom: 5.4, pitch: 55, bearing: -12, maxPitch: 75, attributionControl: { compact: true } });
      st.current.map = m;
      m.addControl(new mod.NavigationControl({ visualizePitch: true }), 'top-right');
      // If the map style itself can't load (no connection), show the drawn map instead.
      m.on('error', () => { if (!dead && !st.current.ok && !m.isStyleLoaded()) onFail(); });
      m.on('load', () => {
        if (dead) return; st.current.ok = true;
        const dem = { type: 'raster-dem' as const, tiles: [DEM_TILES], encoding: 'terrarium' as const, tileSize: 256, maxzoom: 13, attribution: 'Terrain: Mapzen / AWS' };
        m.addSource('dem', dem); m.addSource('demh', { ...dem });
        const firstSym = (m.getStyle().layers.find(l => l.type === 'symbol') || {}).id;
        m.addLayer({ id: 'hills', type: 'hillshade', source: 'demh', paint: { 'hillshade-exaggeration': 0.45, 'hillshade-shadow-color': '#4A4542' } }, firstSym);
        m.setTerrain({ source: 'dem', exaggeration: 1.5 });
        const acc = getComputedStyle(el.current!).getPropertyValue('--sky').trim() || '#0088B0';
        m.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        m.addLayer({ id: 'route-case', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 8 } });
        m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': acc, 'line-width': 4.5 } });
        m.addSource('wx', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        m.addLayer({ id: 'wx-line', type: 'line', source: 'wx', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 0.9 } });
        m.addLayer({ id: 'wx-pts', type: 'circle', source: 'wx', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 } });
        m.on('click', 'wx-pts', e => { const f = e.features?.[0]; if (f) new mod.Popup({ closeButton: false, maxWidth: '240px' }).setLngLat((f.geometry as unknown as { coordinates: [number, number] }).coordinates).setText(String(f.properties?.text || '')).addTo(m); });
        m.on('mouseenter', 'wx-pts', () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', 'wx-pts', () => { m.getCanvas().style.cursor = ''; });
        // Fuel pumps on the road: small purple dots, tap for the place.
        m.addSource('fuel', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        m.addLayer({ id: 'fuel-pts', type: 'circle', source: 'fuel', minzoom: 6, paint: { 'circle-radius': 5, 'circle-color': '#7B5BFF', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5 } });
        m.on('click', 'fuel-pts', e => { const f = e.features?.[0]; if (f) new mod.Popup({ closeButton: false, maxWidth: '240px' }).setLngLat((f.geometry as unknown as { coordinates: [number, number] }).coordinates).setText(String(f.properties?.text || '')).addTo(m); });
        m.on('mouseenter', 'fuel-pts', () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', 'fuel-pts', () => { m.getCanvas().style.cursor = ''; });
        st.current.key = undefined; update();
      });
    }).catch(() => onFail());
    return () => { dead = true; clearTimeout(fail); st.current.map?.remove(); st.current = { markers: [] }; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = () => {
    const { map: m, ml, ok } = st.current; if (!m || !ml || !ok || !m.getSource('route')) return;
    // Weather colours along the road (way there), redrawn whenever the forecast changes.
    const road: [number, number][] | null = !rm.loop && !rm.isAir && r && r.status === 'ok' ? r.data.coords : null;
    const pts = v.wx.mapPts, wxKey = pts.map(p => p.color + p.text).join('|') + (road ? road.length : 0);
    if (wxKey !== st.current.wxKey) {
      st.current.wxKey = wxKey;
      const feats: { type: 'Feature'; properties: Record<string, string>; geometry: { type: 'LineString'; coordinates: number[][] } | { type: 'Point'; coordinates: number[] } }[] = [];
      // Colour the road itself between weather points (never a straight line across the bends); without the road, just the dots.
      if (road) {
        const near = (lat: number, lon: number) => { let bi = 0, bd = Infinity; road.forEach(([x, y], i) => { const d = (x - lon) ** 2 + (y - lat) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
        const at = pts.map(p => near(p.lat, p.lon));
        for (let i = 0; i < pts.length - 1; i++) {
          if (pts[i].day !== pts[i + 1].day) continue;
          const a = Math.min(at[i], at[i + 1]), b = Math.max(at[i], at[i + 1]); if (b - a < 1) continue;
          feats.push({ type: 'Feature', properties: { color: pts[i].color }, geometry: { type: 'LineString', coordinates: road.slice(a, b + 1) } });
        }
      }
      pts.forEach(p => feats.push({ type: 'Feature', properties: { color: p.color, text: p.text }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } }));
      (m.getSource('wx') as import('maplibre-gl').GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: feats } as never);
    }
    const fuelKey = v.fuelPins.map(p => p.key).join('|');
    if (fuelKey !== st.current.fuelKey) {
      st.current.fuelKey = fuelKey;
      (m.getSource('fuel') as import('maplibre-gl').GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: v.fuelPins.map(p => ({ type: 'Feature', properties: { text: p.text }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })) } as never);
    }
    const key = `${o.n}|${s.corridor}|${(s.extra || []).join()}|${s.startDate}|${s.days}|${s.vehicle}|${r ? r.status : ''}`; if (key === st.current.key) return; st.current.key = key;
    // Until the real road loads (or offline), the line still goes through every town on the plan's roads.
    const coords: [number, number][] = rm.loop ? rm.line.map(p => [p[1], p[0]]) : !rm.isAir && r && r.status === 'ok' ? r.data.coords : rm.isAir ? rm.dots.map(d => [+d.p[1], +d.p[0]]) : rm.line.map(p => [p[1], p[0]]);
    (m.getSource('route') as import('maplibre-gl').GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
    m.setPaintProperty('route-line', 'line-dasharray', rm.isAir ? [2, 1.5] : undefined);
    st.current.markers.forEach(x => x.remove());
    st.current.markers = rm.dots.map(d => {
      const n = document.createElement('div'); n.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none';
      n.innerHTML = `<div style="padding:3px 7px;border-radius:7px;background:var(--sheet);border:1px solid var(--line2);font:700 11px/1.2 var(--font);color:var(--ink);white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.12)">${escH(d.label)}</div><div style="width:12px;height:12px;border-radius:50%;background:${d.color};border:2px solid #FFFFFF;box-shadow:0 0 0 3px ${d.ring}"></div>`;
      return new ml.Marker({ element: n, anchor: 'bottom' }).setLngLat([+d.p[1], +d.p[0]]).addTo(m);
    });
    const b = coords.reduce((bb, c) => bb.extend(c), new ml.LngLatBounds(coords[0], coords[0]));
    m.fitBounds(b, { padding: { top: 70, bottom: 40, left: 40, right: 50 }, duration: 900, maxZoom: 11 });
  };
  useEffect(update);

  return <div ref={el} role="application" aria-label={t('Route map')} style={css(`position:relative;height:${fill ? '100%' : '440px'};border-radius:${fill ? 0 : 20}px;overflow:hidden;background:var(--fill)`)} />;
}

/** What the weather colours on the route mean. */
function WxLegend({ v }: { v: View }) {
  if (!v.wx.mapPts.length) return null;
  const items: [string, string][] = [['#2EB67D', t('Clear')], ['#2F6FED', t('Rain')], ['#5BB8F5', t('Snow')], ['#8E8E93', t('Fog')], ['#F2A007', t('Take care')], ['#E5484D', t('Danger')]];
  return (
    <div style={css('margin:10px 6px 0')}>
      <div style={css('font-size:11px;font-weight:800;color:var(--mute)')}>{v.wx.mapPts.length && v.wx.typicalOnly ? t('Weather on the way there (typical for your dates) · tap a dot for details') : t('Weather on the way there, at the time you pass · tap a dot for details')}</div>
      <div style={css('display:flex;gap:6px 12px;flex-wrap:wrap;margin-top:6px;font-size:11px;font-weight:700;color:var(--mute)')}>{items.map(([c, l]) => <span key={l} style={css('display:flex;align-items:center;gap:5px')}><span style={css(`width:10px;height:10px;border-radius:50%;background:${c}`)} />{l}</span>)}</div>
    </div>
  );
}

/** Hand-drawn tilted map, used when the live map can't load. */
function DrawnMap({ v }: { v: View }) {
  const rm = v.routeMap;
  return <>
    <div style={css('perspective:900px;perspective-origin:50% 0%')}>
      <div style={css('position:relative;width:100%;padding-bottom:88%;transform:rotateX(32deg) scale(.95);transform-origin:50% 35%;transform-style:preserve-3d')}>
        <div style={css('position:absolute;inset:0;border-radius:18px;background-color:rgba(46,229,157,.05);background-image:linear-gradient(var(--fill) 1px,transparent 1px),linear-gradient(90deg,var(--fill) 1px,transparent 1px);background-size:10% 10%;box-shadow:0 40px 50px -24px rgba(0,0,0,.7),inset 0 0 0 1px var(--fill)')} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={css('position:absolute;inset:0;width:100%;height:100%;border-radius:18px')} aria-hidden="true">
          <path d={rm.net} fill="none" stroke="var(--fill2)" strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={rm.closed} fill="none" stroke="#FF6B5B" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
          <path d={rm.route} fill="none" stroke="#FF9A3D" strokeWidth="10" strokeOpacity=".25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={rm.route} fill="none" stroke="#FFC060" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {rm.wxDots.map(p => <div key={'w' + p.key} title={p.text} style={css(`position:absolute;left:${p.x}%;top:${p.y}%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:${p.color};box-shadow:0 0 0 2px #FFFFFF`)} />)}
        {rm.fuelDots.map(p => <div key={'f' + p.key} title={p.text} style={css(`position:absolute;left:${p.x}%;top:${p.y}%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#7B5BFF;box-shadow:0 0 0 1.5px #FFFFFF`)} />)}
        {rm.dots.map((p, i) => (
          <div key={i} style={css(`position:absolute;left:${p.x}%;top:${p.y}%;width:0;height:0;transform-style:preserve-3d`)}>
            <div style={css(`position:absolute;left:-7px;top:-7px;width:14px;height:14px;border-radius:50%;background:${p.color};box-shadow:0 0 0 5px ${p.ring},0 0 18px ${p.color}`)} />
            <div style={css(`position:absolute;left:0;bottom:0;transform:translate(-50%,${p.lift}) rotateX(-32deg);transform-origin:50% 100%;pointer-events:none`)}>
              <div style={css('padding:4px 8px;border-radius:9px;background:var(--sheet);border:1px solid var(--line2);font-size:10px;font-weight:800;white-space:nowrap;color:var(--ink)')}>{p.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <div style={css('display:flex;gap:14px;flex-wrap:wrap;margin:14px 6px 0;font-size:11px;font-weight:700;color:var(--mute)')}>
      <span style={css('display:flex;align-items:center;gap:6px')}><span style={css('width:16px;height:3px;border-radius:2px;background:#FFC060')} />{t('Your route')}</span>
      <span style={css('display:flex;align-items:center;gap:6px')}><span style={css('width:16px;height:2px;background:var(--fill2)')} />{t('Other roads')}</span>
      <span style={css('display:flex;align-items:center;gap:6px')}><span style={css('width:16px;height:0;border-top:2px dashed #FF6B5B')} />{t('Closed this month')}</span>
      {rm.fuelDots.length > 0 && <span style={css('display:flex;align-items:center;gap:6px')}><span style={css('width:8px;height:8px;border-radius:50%;background:#7B5BFF')} />{t('Fuel pumps')}</span>}
    </div>
    <WxLegend v={v} />
  </>;
}

/** On a laptop: the route map beside the plan, always in view. */
export function SideMap({ v, api }: { v: View; api: Api }) {
  return (
    <div className="sc-side" aria-label={t('Route map')}>
      {v.s.mapFail ? <div style={css('padding:16px;height:100%;box-sizing:border-box;overflow:auto;background:var(--sheet)')}><DrawnMap v={v} /></div> : <LiveMap v={v} fill onFail={() => api.set({ mapFail: true })} />}
      {v.routeLink && <a href={v.routeLink} target="_blank" rel="noopener" style={css('position:absolute;left:16px;bottom:16px;z-index:2;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:14px;background:var(--cta);color:var(--onCta);font-size:14px;font-weight:800;text-decoration:none;box-shadow:0 10px 24px -10px rgba(0,0,0,.5)')}><i className="ph-fill ph-navigation-arrow" />{t('Open the route in Google Maps')}</a>}
    </div>
  );
}

export function MapTab({ v, api }: { v: View; api: Api }) {
  const { s, c } = v, rm = v.routeMap;
  return (
    <div data-screen-label="Route map">
      <div style={css('height:250px;position:relative;pointer-events:none')}>
        <div className="sc-col" style={css('position:absolute;left:22px;right:22px;top:58px;text-shadow:var(--tsh)')}>
          <div style={css('font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--amb2)')}>{c.from} → {c.to}</div>
          <h1 style={css('margin:6px 0 0;font-family:var(--fontH);font-weight:600;font-size:26px;letter-spacing:-.02em')}>{t('Route map')}</h1>
          <div style={css('font-size:13px;font-weight:700;color:var(--ink2);margin-top:8px;line-height:1.45')}>{rm.stat}</div>
        </div>
      </div>
      <div className="sc-flow" style={css('padding:4px 16px 150px;display:flex;flex-direction:column;gap:14px;pointer-events:auto;background:var(--bg)')}>
        <div style={css('border-radius:30px;padding:16px 12px 22px;background:var(--sheet);border:1px solid var(--line);overflow:hidden')}>
          {s.mapFail ? <DrawnMap v={v} /> : <>
            <LiveMap v={v} onFail={() => api.set({ mapFail: true })} />
            <div style={css('display:flex;gap:8px 14px;flex-wrap:wrap;margin:12px 6px 0;font-size:11px;font-weight:700;color:var(--mute)')}><span style={css('display:flex;align-items:center;gap:6px')}><span style={css('width:16px;height:4px;border-radius:2px;background:var(--sky)')} />{v.mapRouteLabel}</span><span>{t('Drag to pan · two fingers or the compass to tilt')}</span></div>
            {v.fuelPins.length > 0 && <div style={css('display:flex;align-items:center;gap:6px;margin:8px 6px 0;font-size:11px;font-weight:700;color:var(--mute)')}><span style={css('width:10px;height:10px;border-radius:50%;background:#7B5BFF;box-shadow:0 0 0 1.5px #FFFFFF')} />{t('Fuel pumps on your road · zoom in and tap one')}</div>}
            <WxLegend v={v} />
          </>}
        </div>
        {v.routeLink && <a href={v.routeLink} target="_blank" rel="noopener" style={css('display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:16px;background:var(--cta);color:var(--onCta);font-size:15px;font-weight:800;text-decoration:none')}><i className="ph-fill ph-navigation-arrow" />{t('Open the route in Google Maps')}</a>}
        <section style={css('border-radius:30px;padding:18px;background:var(--card);border:1px solid var(--line)')}>
          <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>{t('Where you sleep')}</h2>
          <div style={css('display:flex;flex-direction:column;gap:12px;margin-top:14px')}>
            {rm.nights.map(n => (
              <div key={n.key} style={css('display:flex;align-items:center;gap:12px')}>
                <div style={css('flex:none;min-width:74px;padding:4px 8px;border-radius:9px;background:rgba(255,181,71,.14);color:var(--amb2);font-size:11px;font-weight:800;text-align:center;white-space:nowrap')}>{n.badge}</div>
                <div style={css('flex:1;min-width:0')}><div style={css('font-size:14px;font-weight:700')}>{n.name}</div><div style={css('font-size:12px;color:var(--mute);font-weight:500;margin-top:1px')}>{n.hotel}</div></div>
              </div>
            ))}
          </div>
        </section>
        {!rm.isAir && (
          <section style={css('border-radius:30px;padding:18px;background:var(--card);border:1px solid var(--line)')}>
            <h2 style={css('margin:0;font-size:14px;font-weight:700;color:var(--mute)')}>{t('Roads on this route')}</h2>
            <div style={css('display:flex;flex-direction:column;gap:10px;margin-top:14px')}>
              {rm.roads.map(r => (
                <div key={r.name} style={css('display:flex;align-items:center;gap:10px')}>
                  <i className="ph-fill ph-road-horizon" style={css('font-size:18px;color:var(--sky);flex:none')} />
                  <div style={css('flex:1;min-width:0;font-size:14px;font-weight:700')}>{r.name}{r.hasNote && <span style={css(`font-size:11px;font-weight:800;color:${r.noteC}`)}> · {r.note}</span>}</div>
                  <div style={css('flex:none;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums')}>{r.km}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
