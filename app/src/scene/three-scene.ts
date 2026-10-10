// three.js hero scene. Loaded on demand so the first screen renders without it.
import * as T from 'three';
import type { RefObject } from 'react';
import { DST } from '../engine/places';
import { buildTerrain, colorAt } from './terrain';

interface DragState { az: number; dragAz: number }

export function createScene(el: HTMLElement, th: [number, number, number], S0: DragState, labels: { dest: RefObject<HTMLDivElement | null>; hub: RefObject<HTMLDivElement | null> }, showLabels: () => boolean) {
  let dead = false, raf = 0, warned = false;
  let W = el.clientWidth || 380, H = el.clientHeight || 440;
  const r = new T.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setSize(W, H);
  r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.08;
  r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:1';
  el.insertBefore(r.domElement, el.children[1] || null);

  const scene = new T.Scene();
  scene.fog = new T.Fog(th[0], 24, 56);
  const cam = new T.PerspectiveCamera(38, W / H, .1, 200);
  const ro = new ResizeObserver(() => {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h || (w === W && h === H)) return;
    W = w; H = h; r.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix();
  });
  ro.observe(el);
  scene.add(new T.HemisphereLight(th[2], 0x2C4A3A, th[0] === 0xEBA27F ? 1 : 1.35));
  const sun = new T.DirectionalLight(th[1], 2.8); sun.position.set(-14, 11, -18); scene.add(sun);
  const fill = new T.DirectionalLight(0x9DBEFF, .7); fill.position.set(12, 9, 14); scene.add(fill);

  const geo = new T.PlaneGeometry(46, 46, 150, 150); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as T.BufferAttribute, cols = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new T.BufferAttribute(cols, 3));
  scene.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .9, metalness: 0 })));
  const water = new T.Mesh(new T.PlaneGeometry(46, 46), new T.MeshStandardMaterial({ color: 0x22D3C5, roughness: .1, metalness: .25, transparent: true, opacity: .85, emissive: 0x0E6B66, emissiveIntensity: .45 }));
  water.rotation.x = -Math.PI / 2; water.position.y = .62; scene.add(water);
  const routeMat = new T.MeshBasicMaterial({ color: 0xFFC060 });
  const glowMat = new T.MeshBasicMaterial({ color: 0xFF9A3D, transparent: true, opacity: .28, depthWrite: false, blending: T.AdditiveBlending });
  const pin = (color: number) => {
    const g = new T.Group();
    const stick = new T.Mesh(new T.CylinderGeometry(.05, .05, 2, 8), new T.MeshBasicMaterial({ color: 0xffffff })); stick.position.set(0, 1, 0); g.add(stick);
    const head = new T.Mesh(new T.SphereGeometry(.42, 24, 16), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .9, roughness: .3 })); head.position.y = 2.1; g.add(head);
    const ring = new T.Mesh(new T.RingGeometry(.4, .75, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: .55, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .06; g.add(ring);
    scene.add(g); return g;
  };
  const startPin = pin(0x2EE59D), destPin = pin(0xFF5A72), hubPin = pin(0xFFB547);
  const traveler = new T.Mesh(new T.SphereGeometry(.22, 16, 12), new T.MeshBasicMaterial({ color: 0xffffff }));
  const halo = new T.Mesh(new T.SphereGeometry(.55, 16, 12), new T.MeshBasicMaterial({ color: 0xFFD08A, transparent: true, opacity: .35, depthWrite: false, blending: T.AdditiveBlending }));
  scene.add(traveler); scene.add(halo);

  const S = { ...S0, first: false, morph: 1, draw: 0, from: new Float32Array(0), to: new Float32Array(0), tgt: null as T.Vector3 | null, goalT: new T.Vector3(), hub: undefined as number | undefined };
  let tube: T.Mesh | null = null, glow: T.Mesh | null = null, curve: T.CatmullRomCurve3 | null = null, cnt = 0;
  const colorize = () => { for (let i = 0; i < pos.count; i++) colorAt(pos.getY(i), cols, i * 3); geo.attributes.color.needsUpdate = true; };

  const setCorridor = (key: string) => {
    const c = DST(key), built = buildTerrain(c.terrain, pos), e = built.pts[built.pts.length - 1];
    S.goalT = new T.Vector3(e[0] * .6, e[1] + 1.8, e[2]); if (!S.tgt) S.tgt = S.goalT.clone();
    S.from = Float32Array.from({ length: pos.count }, (_, i) => pos.getY(i)); S.to = built.heights; S.morph = S.first ? 0 : 1;
    if (!S.first) { for (let i = 0; i < pos.count; i++) pos.setY(i, built.heights[i]); pos.needsUpdate = true; colorize(); S.first = true; }
    curve = new T.CatmullRomCurve3(built.pts.map(p => new T.Vector3(p[0], p[1], p[2])));
    if (tube && glow) { scene.remove(tube); scene.remove(glow); tube.geometry.dispose(); glow.geometry.dispose(); }
    tube = new T.Mesh(new T.TubeGeometry(curve, 260, .13, 8), routeMat); glow = new T.Mesh(new T.TubeGeometry(curve, 260, .36, 8), glowMat);
    scene.add(tube); scene.add(glow); cnt = tube.geometry.index!.count; S.draw = 0;
    startPin.position.copy(curve.getPointAt(0)).y -= .3; destPin.position.copy(curve.getPointAt(1)).y -= .3;
    hubPin.visible = c.hub !== undefined; if (hubPin.visible) hubPin.position.copy(curve.getPointAt(.72)).y -= .3;
    S.hub = c.hub;
  };

  const v = new T.Vector3();
  const place = (ref: RefObject<HTMLDivElement | null>, obj: T.Object3D, show: boolean, lift: number) => {
    const n = ref.current; if (!n) return; if (!show) { n.style.opacity = '0'; return; }
    v.copy(obj.position); v.y += lift; v.project(cam);
    const px = Math.max(90, Math.min(W - 90, (v.x + 1) / 2 * W)), py = Math.max(60, Math.min(H - 40, (1 - v.y) / 2 * H));
    n.style.transform = `translate(${px}px,${py}px) translate(-50%,-100%)`; n.style.opacity = '1';
  };
  const tick = () => {
    if (dead) return; raf = requestAnimationFrame(tick);
    try {
      if (!curve || !tube || !glow || !S.tgt) return;
      const now = performance.now();
      if (S.morph < 1) {
        S.morph = Math.min(1, S.morph + .022); const e = 1 - Math.pow(1 - S.morph, 3);
        for (let i = 0; i < pos.count; i++) pos.setY(i, S.from[i] + (S.to[i] - S.from[i]) * e); pos.needsUpdate = true; colorize();
      }
      if (S.draw < 1) { S.draw = Math.min(1, S.draw + .014); const n = Math.floor(cnt * S.draw / 6) * 6; tube.geometry.setDrawRange(0, n); glow.geometry.setDrawRange(0, n); }
      const tt = ((now / 8000) % 1) * S.draw; traveler.position.copy(curve.getPointAt(tt)); halo.position.copy(traveler.position);
      halo.scale.setScalar(1 + .25 * Math.sin(now / 220));
      const goal = S0.dragAz + Math.sin(now / 6500) * .32; S.az += (goal - S.az) * .05;
      S.tgt.lerp(S.goalT, .04); cam.position.set(S.tgt.x + Math.sin(S.az) * 28, S.tgt.y + 7.4, S.tgt.z + Math.cos(S.az) * 28); cam.lookAt(S.tgt);
      r.render(scene, cam);
      const lbl = showLabels();
      place(labels.dest, destPin, lbl && S.draw > .95, 2.9);
      place(labels.hub, hubPin, lbl && S.hub !== undefined && S.draw > .7, 2.6);
    } catch (e) { if (!warned) { warned = true; console.warn('SafarCo scene tick: ' + (e as Error).message); } }
  };
  tick();

  return {
    setCorridor,
    dispose() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse(o => { const m = o as T.Mesh; if (m.geometry) m.geometry.dispose(); const mat = m.material as T.Material | T.Material[] | undefined; if (Array.isArray(mat)) mat.forEach(x => x.dispose()); else mat?.dispose(); });
      r.dispose(); r.domElement.remove();
    }
  };
}
