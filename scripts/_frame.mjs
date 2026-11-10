// Usage: node scripts/_frame.mjs <devUrl> -> per view: draw calls + triangles for one full frame (dev-only [o4] probe) and rAF frame time
import { chromium } from '@playwright/test';
const [url] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('console', (m) => { if (m.text().startsWith('[o4]')) console.log(m.text()); });
await p.goto(url);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
for (const v of ['seat', 'outside']) {
  await p.evaluate((v) => window.__scene.getState().goTo(v), v);
  await p.waitForTimeout(9000);
  const ms = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { if (++n === 120) res((performance.now() - t0) / 120); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
  console.log(v, 'frame ms (uncapped):', ms.toFixed(1));
}
await b.close();
