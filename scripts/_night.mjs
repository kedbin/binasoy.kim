// Usage: node scripts/_night.mjs <url> -> longest main-thread block + programs linked for: night toggle, each view change
import { chromium } from '@playwright/test';
const [url] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => {
  window.__links = 0; const G = WebGL2RenderingContext.prototype; const lp = G.linkProgram; G.linkProgram = function (x) { window.__links++; return lp.call(this, x); };
  window.__long = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask' });
});
await p.goto(url);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await p.waitForTimeout(12000);
const step = async (name, fn, arg) => {
  await p.evaluate(() => { window.__long = []; window.__l0 = window.__links; });
  await p.evaluate(fn, arg);
  await p.waitForTimeout(4500);
  console.log(name, JSON.stringify(await p.evaluate(() => ({ links: window.__links - window.__l0, maxLong: Math.max(0, ...window.__long), sumLong: window.__long.reduce((a, x) => a + x, 0) }))));
};
await step('idle(seat)', () => {});
for (const v of ['outside', 'seat', 'wall', 'seat', 'laptop', 'seat', 'stickers', 'seat', 'clipboard', 'seat']) await step('goTo ' + v, (v) => window.__scene.getState().goTo(v), v);
await step('night', () => window.__scene.getState().setTimeOfDay('night'));
await step('golden', () => window.__scene.getState().setTimeOfDay('golden'));
await step('night again', () => window.__scene.getState().setTimeOfDay('night'));
await b.close();
