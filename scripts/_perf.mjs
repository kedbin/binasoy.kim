// Usage: node scripts/_perf.mjs <url> [runs=3] [headed=0] [cpuThrottle=1] [profileOut]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const [url, runs = '3', headed = '0', throttle = '1', profOut = ''] = process.argv.slice(2);
const init = () => {
  const P = (window.__perf = { long: [], stages: {}, marks: {}, links: 0, linkBlock: 0, linkAt: [] });
  const G = WebGL2RenderingContext.prototype;
  const lp = G.linkProgram; G.linkProgram = function (p) { P.links++; P.linkAt.push(Math.round(performance.now())); return lp.call(this, p); };
  P.names = []; const srcs = new WeakMap(), att = new WeakMap();
  const ss = G.shaderSource; G.shaderSource = function (sh, src) { srcs.set(sh, src); return ss.call(this, sh, src); };
  const as = G.attachShader; G.attachShader = function (p, sh) { const a = att.get(p) || []; a.push(sh); att.set(p, a); return as.call(this, p, sh); };
  const lp2 = G.linkProgram; G.linkProgram = function (p) { const a = att.get(p) || []; const src = a.map((x) => srcs.get(x) || '').join('\n'); const n = (src.match(/#define SHADER_NAME (\S+)/) || [])[1] || (src.match(/#define SHADER_TYPE (\S+)/) || [])[1] || 'raw'; const fl = ['USE_SHADOWMAP', 'USE_ENVMAP', 'USE_FOG', 'USE_INSTANCING', 'TONE_MAPPING', 'USE_MAP', 'DOUBLE_SIDED']; const ld0 = window.__load?.getState(); const stage = ld0 ? ld0.phase + (ld0.phase === 'mount' ? ld0.step : '') : window.__scene?.getState().loadStage; let tm = /AgXToneMapping\( vec3 color \) \{[^}]*\}\s*vec3 toneMapping/.test(src) ? '' : ''; const nl = (src.match(/#define NUM_(DIR|POINT|SPOT)_LIGHTS? (\d+)/g) || []).slice(0, 3).map((x) => x.replace('#define NUM_', '').replace('_LIGHTS', '')).join(','); const sh = (src.match(/#define NUM_(DIR|SPOT|POINT)_LIGHT_SHADOWS (\d+)/g) || []).slice(0, 3).map((x) => x.split(' ').pop()).join(''); P.names.push(stage + ' ' + n + ' [' + fl.filter((f) => src.includes('#define ' + f)).map((f) => f.replace('USE_', '')).join(',') + '] L:' + nl + ' S:' + sh + ' len' + src.length); return lp2.call(this, p); };
  const gp = G.getProgramParameter; G.getProgramParameter = function (p, n) { const t = performance.now(); const r = gp.call(this, p, n); const d = performance.now() - t; if (d > 1) P.linkBlock += d; return r; };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.marks[e.name] = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true }); } catch {}
  let last = performance.now(), maxGap = 0, gapAt = 0;
  const tick = () => { const n = performance.now(); if (n - last > maxGap) { maxGap = n - last; gapAt = last; } last = n; P.maxRafGap = Math.round(maxGap); P.gapAt = Math.round(gapAt); if (!window.__ready) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const iv = setInterval(() => {
    const s = window.__scene?.getState();
    const ld = window.__load?.getState(); const key = ld ? ld.phase + (ld.phase === 'mount' ? ld.step : '') : s && 's' + s.loadStage;
    if (s) { if (!(key in P.stages)) P.stages[key] = Math.round(performance.now()); if (s.sceneReady && !P.marks.sceneReady) P.marks.sceneReady = Math.round(performance.now()); }
    if (document.querySelector('canvas') && !P.marks.canvas) P.marks.canvas = Math.round(performance.now());
    if (document.querySelector('.loader') && !P.marks.reactLoader) P.marks.reactLoader = Math.round(performance.now());
    if (window.__ready) { P.marks.reveal = Math.round(performance.now()); clearInterval(iv); }
  }, 4);
};
const out = [];
for (let i = 0; i < +runs; i++) {
  const b = await chromium.launch({ headless: headed !== '1', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let bytes = 0, reqs = 0; p.on('response', async (r) => { reqs++; });
  await p.addInitScript(init);
  const cdp = await ctx.newCDPSession(p);
  if (+throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +throttle });
  if (profOut && i === 0) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
  const t0 = Date.now();
  await p.goto(url, { waitUntil: 'commit' });
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 }).catch(() => errs.push('never ready'));
  const wall = Date.now() - t0;
  await p.waitForTimeout(1500);
  if (profOut && i === 0) { const { profile } = await cdp.send('Profiler.stop'); fs.writeFileSync(profOut, JSON.stringify(profile)); }
  const r = await p.evaluate(() => {
    const P = window.__perf; const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info');
    const res = performance.getEntriesByType('resource');
    const hist = {}; for (const t of P.linkAt) { const k = Math.floor(t / 1000); hist[k] = (hist[k] || 0) + 1; } delete P.linkAt; return { ...P, linkHist: hist, programs: window.__gl?.info?.programs?.length, renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?', nRes: res.length, xfer: Math.round(res.reduce((a, e) => a + (e.transferSize || 0), 0) / 1024), lastRes: Math.round(Math.max(...res.map((e) => e.responseEnd))), sceneReadyFinal: window.__scene?.getState().sceneReady };
  });
  const long = r.long.sort((a, b) => b[1] - a[1]);
  out.push({ run: i, wall, fcp: r.marks['first-contentful-paint'], reactLoader: r.marks.reactLoader, canvas: r.marks.canvas, stages: r.stages, sceneReady: r.marks.sceneReady, reveal: r.marks.reveal, maxLong: long[0]?.[1], sumLong: long.reduce((a, e) => a + e[1], 0), top: long.slice(0, 6).map((e) => e.join('@').split('@').reverse().join('ms@')), names: process.env.NAMES ? r.names : undefined, links: r.links, linkBlock: Math.round(r.linkBlock), linkHist: r.linkHist, maxRafGap: r.maxRafGap, gapAt: r.gapAt, nRes: r.nRes, xferKB: r.xfer, lastRes: r.lastRes, renderer: r.renderer, errs });
  await ctx.close();
  await b.close();
}
for (const o of out) console.log(JSON.stringify(o));
