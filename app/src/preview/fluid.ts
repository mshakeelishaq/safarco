// The hero's "touch brings the colour" effect: a small WebGL2 fluid simulation (stable fluids: advect, curl and
// vorticity, divergence, pressure, gradient) whose dye is used as a mask. The photo shows in soft black and white,
// and in full colour wherever the fluid has flowed, with a faint glow in the season's colour at the edges.
// Returns null where it can't run well (no WebGL2 or no float render targets); the page then uses a CSS fallback.

const VERT = `#version 300 es
precision highp float;
in vec2 aPos; uniform vec2 uTexel;
out vec2 vUv, vL, vR, vT, vB;
void main() { vUv = aPos * .5 + .5; vL = vUv - vec2(uTexel.x, 0.); vR = vUv + vec2(uTexel.x, 0.); vT = vUv + vec2(0., uTexel.y); vB = vUv - vec2(0., uTexel.y); gl_Position = vec4(aPos, 0., 1.); }`;

const H = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv, vL, vR, vT, vB; out vec4 o;
`;
const SPLAT = H + `uniform sampler2D uTarget; uniform float uAspect, uRadius; uniform vec3 uColor; uniform vec2 uPoint;
void main() { vec2 p = vUv - uPoint; p.x *= uAspect; o = vec4(texture(uTarget, vUv).xyz + exp(-dot(p, p) / uRadius) * uColor, 1.); }`;
const ADVECT = H + `uniform sampler2D uVelocity, uSource; uniform vec2 uSimTexel; uniform float uDt, uDissipation;
void main() { vec2 c = vUv - uDt * texture(uVelocity, vUv).xy * uSimTexel; o = texture(uSource, c) / (1. + uDissipation * uDt); }`;
const DIVERGENCE = H + `uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x, T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y; vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.) L = -C.x; if (vR.x > 1.) R = -C.x; if (vT.y > 1.) T = -C.y; if (vB.y < 0.) B = -C.y;
  o = vec4(.5 * (R - L + T - B), 0., 0., 1.); }`;
const CURL = H + `uniform sampler2D uVelocity;
void main() { o = vec4(.5 * (texture(uVelocity, vR).y - texture(uVelocity, vL).y - texture(uVelocity, vT).x + texture(uVelocity, vB).x), 0., 0., 1.); }`;
const VORTICITY = H + `uniform sampler2D uVelocity, uCurl; uniform float uCurlK, uDt;
void main() {
  float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x, T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
  vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + .0001; f *= uCurlK * C; f.y *= -1.;
  o = vec4(clamp(texture(uVelocity, vUv).xy + f * uDt, -1000., 1000.), 0., 1.); }`;
const PRESSURE = H + `uniform sampler2D uPressure, uDivergence;
void main() { o = vec4((texture(uPressure, vL).x + texture(uPressure, vR).x + texture(uPressure, vB).x + texture(uPressure, vT).x - texture(uDivergence, vUv).x) * .25, 0., 0., 1.); }`;
const GRADIENT = H + `uniform sampler2D uPressure, uVelocity;
void main() { vec2 v = texture(uVelocity, vUv).xy - vec2(texture(uPressure, vR).x - texture(uPressure, vL).x, texture(uPressure, vT).x - texture(uPressure, vB).x); o = vec4(v, 0., 1.); }`;
const SCALE = H + `uniform sampler2D uTex; uniform float uK; void main() { o = uK * texture(uTex, vUv); }`;
const DISPLAY = H + `uniform sampler2D uPhoto, uDye; uniform vec2 uCover, uRes; uniform vec3 uAccent; uniform float uTime, uFade;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 puv = (vUv - .5) * uCover + .5;
  vec3 c = texture(uPhoto, puv).rgb;
  float g = dot(c, vec3(.299, .587, .114));
  vec3 bw = vec3(g) * vec3(1.03, 1., .95); bw = smoothstep(.0, 1., bw) * .9 + .04;
  float d = texture(uDye, vUv).r, m = smoothstep(.05, .55, d);
  vec3 col = mix(bw, c * 1.05, m);
  float edge = smoothstep(.015, .14, d) * (1. - smoothstep(.14, .55, d));
  col += uAccent * edge * .32;
  vec2 q = vUv - .5; col *= 1. - dot(q, q) * .35;
  col += (hash(vUv * uRes + fract(uTime) * 91.) - .5) * .03;
  o = vec4(mix(vec3(.957, .945, .918), col, uFade), 1.); }`;

type FBO = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };
type Double = { read: FBO; write: FBO; swap: () => void };

export interface Fluid {
  /** Push the fluid at x, y (0..1 from the top left) with a movement of dx, dy (in the same units), adding dye. */
  splat: (x: number, y: number, dx: number, dy: number, dye?: number) => void;
  /** The mist parting: dye and movement from the middle out. */
  burst: () => void;
  setPhoto: (img: HTMLImageElement) => void;
  setAccent: (rgb: [number, number, number]) => void;
  /** 0 = the paper colour, 1 = the photo (for the opening). */
  setFade: (f: number) => void;
  setRunning: (on: boolean) => void;
  destroy: () => void;
}

export function startFluid(canvas: HTMLCanvasElement, opts: { small?: boolean } = {}): Fluid | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
  gl.getExtension('OES_texture_float_linear');

  const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const program = (src: string) => {
    const p = gl.createProgram()!; gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src)); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    const u: Record<string, WebGLUniformLocation | null> = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i)!.name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  };
  let P: Record<string, ReturnType<typeof program>>;
  try { P = { splat: program(SPLAT), advect: program(ADVECT), div: program(DIVERGENCE), curl: program(CURL), vort: program(VORTICITY), pres: program(PRESSURE), grad: program(GRADIENT), scale: program(SCALE), show: program(DISPLAY) }; }
  catch { return null; }

  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);

  const fbo = (w: number, h: number): FBO => {
    const tex = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h };
  };
  const double = (w: number, h: number): Double => { const d = { read: fbo(w, h), write: fbo(w, h), swap: () => { const t = d.read; d.read = d.write; d.write = t; } }; return d; };
  const drop = (f: FBO) => { gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); };

  const SIM = opts.small ? 96 : 128, DYE = opts.small ? 320 : 640;
  let vel: Double, dye: Double, pres: Double, div: FBO, curl: FBO, simW = 0, simH = 0;
  const size = (base: number) => { const a = canvas.width / Math.max(1, canvas.height); return a >= 1 ? [Math.round(base * a), base] : [base, Math.round(base / a)]; };
  const resize = () => {
    const dpr = Math.min(opts.small ? 1.25 : 1.6, devicePixelRatio || 1), w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (w === canvas.width && h === canvas.height && vel) return;
    canvas.width = w; canvas.height = h;
    [vel, dye, pres].forEach(d => { if (d) { drop(d.read); drop(d.write); } }); [div, curl].forEach(f => f && drop(f));
    [simW, simH] = size(SIM); const [dw, dh] = size(DYE);
    vel = double(simW, simH); pres = double(simW, simH); div = fbo(simW, simH); curl = fbo(simW, simH); dye = double(dw, dh);
  };
  resize();

  const draw = (target: FBO | null) => {
    if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); }
    else { gl.viewport(0, 0, canvas.width, canvas.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  let unit = 0;
  const use = (k: string, texel: [number, number]) => { const s = P[k]; gl.useProgram(s.p); unit = 0; gl.uniform2f(s.u.uTexel, texel[0], texel[1]); return s; };
  const tex = (s: ReturnType<typeof program>, name: string, t: WebGLTexture) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(s.u[name], unit++); };

  // The photo, uploaded once (a 1×1 paper pixel until it loads).
  const photo = gl.createTexture()!; let photoW = 1, photoH = 1;
  gl.bindTexture(gl.TEXTURE_2D, photo);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([244, 241, 234, 255]));

  let accent: [number, number, number] = [0.96, 0.72, 0.24], fade = 1, running = true, raf = 0, last = performance.now(), t0 = last;
  const splats: [number, number, number, number, number][] = [];

  const step = (dt: number) => {
    const st: [number, number] = [1 / simW, 1 / simH];
    let s = use('curl', st); tex(s, 'uVelocity', vel.read.tex); draw(curl);
    s = use('vort', st); tex(s, 'uVelocity', vel.read.tex); tex(s, 'uCurl', curl.tex); gl.uniform1f(s.u.uCurlK, 22); gl.uniform1f(s.u.uDt, dt); draw(vel.write); vel.swap();
    s = use('div', st); tex(s, 'uVelocity', vel.read.tex); draw(div);
    s = use('scale', st); tex(s, 'uTex', pres.read.tex); gl.uniform1f(s.u.uK, 0.8); draw(pres.write); pres.swap();
    for (let i = 0; i < 18; i++) { s = use('pres', st); tex(s, 'uPressure', pres.read.tex); tex(s, 'uDivergence', div.tex); draw(pres.write); pres.swap(); }
    s = use('grad', st); tex(s, 'uPressure', pres.read.tex); tex(s, 'uVelocity', vel.read.tex); draw(vel.write); vel.swap();
    s = use('advect', st); tex(s, 'uVelocity', vel.read.tex); tex(s, 'uSource', vel.read.tex); gl.uniform2f(s.u.uSimTexel, st[0], st[1]); gl.uniform1f(s.u.uDt, dt); gl.uniform1f(s.u.uDissipation, 0.25); draw(vel.write); vel.swap();
    s = use('advect', [1 / dye.read.w, 1 / dye.read.h]); tex(s, 'uVelocity', vel.read.tex); tex(s, 'uSource', dye.read.tex); gl.uniform2f(s.u.uSimTexel, st[0], st[1]); gl.uniform1f(s.u.uDt, dt); gl.uniform1f(s.u.uDissipation, 0.95); draw(dye.write); dye.swap();
  };
  const doSplat = (x: number, y: number, dx: number, dy: number, amt: number) => {
    const aspect = canvas.width / canvas.height, r = (opts.small ? 0.0042 : 0.0028) * Math.max(1, aspect);
    let s = use('splat', [1 / simW, 1 / simH]); tex(s, 'uTarget', vel.read.tex); gl.uniform1f(s.u.uAspect, aspect); gl.uniform1f(s.u.uRadius, r);
    gl.uniform2f(s.u.uPoint, x, 1 - y); gl.uniform3f(s.u.uColor, dx * 5200, -dy * 5200, 0); draw(vel.write); vel.swap();
    s = use('splat', [1 / dye.read.w, 1 / dye.read.h]); tex(s, 'uTarget', dye.read.tex); gl.uniform1f(s.u.uAspect, aspect); gl.uniform1f(s.u.uRadius, r * 1.6);
    gl.uniform2f(s.u.uPoint, x, 1 - y); gl.uniform3f(s.u.uColor, amt, amt, amt); draw(dye.write); dye.swap();
  };
  const render = (now: number) => {
    const s = use('show', [1 / canvas.width, 1 / canvas.height]);
    tex(s, 'uPhoto', photo); tex(s, 'uDye', dye.read.tex);
    // Cover: the photo fills the canvas, cropped evenly.
    const ca = canvas.width / canvas.height, pa = photoW / photoH;
    gl.uniform2f(s.u.uCover, ca > pa ? 1 : ca / pa, ca > pa ? pa / ca : 1);
    gl.uniform2f(s.u.uRes, canvas.width, canvas.height); gl.uniform3f(s.u.uAccent, ...accent);
    gl.uniform1f(s.u.uTime, (now - t0) / 1000); gl.uniform1f(s.u.uFade, fade); draw(null);
  };
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    resize();
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    while (splats.length) doSplat(...splats.shift()!);
    step(dt); render(now);
  };
  raf = requestAnimationFrame(frame);

  return {
    splat: (x, y, dx, dy, amt = 0.9) => { if (splats.length < 40) splats.push([x, y, dx, dy, amt]); },
    burst: () => { for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 0.05 + Math.random() * 0.06; splats.push([0.5 + Math.cos(a) * r * 0.6, 0.52 + Math.sin(a) * r, Math.cos(a) * 0.012, Math.sin(a) * 0.012, 1.4]); } },
    setPhoto: img => { gl.bindTexture(gl.TEXTURE_2D, photo); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); photoW = img.naturalWidth; photoH = img.naturalHeight; },
    setAccent: rgb => { accent = rgb; },
    setFade: f => { fade = f; },
    setRunning: on => { if (on === running) return; running = on; if (on) { last = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf); },
    destroy: () => { cancelAnimationFrame(raf); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  };
}
