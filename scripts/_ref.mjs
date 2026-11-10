// Usage: node scripts/_ref.mjs <url> <out.json> [shot.png]  -> records every response (type, sizes, timing) of a page load
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const [url, out, shot, clickText] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const rows = []; const t0 = Date.now();
p.on('response', async (r) => {
  const h = r.headers(); let size = 0;
  try { size = (await r.body()).length; } catch {}
  rows.push({ t: Date.now() - t0, status: r.status(), url: r.url().slice(0, 160), type: h['content-type'] || '', enc: h['content-encoding'] || '', wire: +(h['content-length'] || 0), size, cache: h['cache-control'] || '', server: h['server'] || '' });
});
await p.addInitScript(() => {
  window.__links = 0; window.__gpu = [];
  for (const G of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!G) continue; const lp = G.prototype.linkProgram; G.prototype.linkProgram = function (x) { window.__links++; return lp.call(this, x); }; }
  window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch {}
});
await p.goto(url, { waitUntil: 'load', timeout: 60000 }).catch((e) => console.log('goto', e.message));
const marks = [];
if (clickText) { await p.waitForTimeout(2500); const tc = Date.now() - t0; await p.getByText(clickText).first().click({ timeout: 8000 }).catch((e) => console.log('click', e.message)); marks.push({ clickedAt: tc }); }
for (let i = 0; i < 12; i++) { await p.waitForTimeout(1500); marks.push(await p.evaluate(() => ({ t: Math.round(performance.now()), links: window.__links, canv: document.querySelectorAll('canvas').length, dom: document.querySelectorAll('*').length, svg: document.querySelectorAll('svg').length, img: document.querySelectorAll('img').length, anim: document.getAnimations().length, pre: document.querySelectorAll('pre').length, text: document.body.innerText.slice(0, 120).replace(/\s+/g, ' ') })).catch(() => null)); if (i === 2 && shot) await p.screenshot({ path: shot.replace('.png', '-early.png') }); }
if (shot) await p.screenshot({ path: shot });
const info = await p.evaluate(() => ({ long: window.__long.sort((a, b) => b[1] - a[1]).slice(0, 8), fcp: performance.getEntriesByType('paint').map((e) => [e.name, Math.round(e.startTime)]), gen: document.querySelector('meta[name=generator]')?.content, scripts: [...document.scripts].map((s) => s.src || 'inline:' + s.textContent.length).slice(0, 30), sw: !!navigator.serviceWorker?.controller, html: document.documentElement.outerHTML.length, preload: [...document.querySelectorAll('link[rel=preload],link[rel=modulepreload],link[rel=prefetch]')].map((l) => l.rel + ' ' + l.href.slice(-60)) })).catch((e) => ({ err: e.message }));
fs.writeFileSync(out, JSON.stringify({ rows, marks, info }, null, 1));
await b.close();
