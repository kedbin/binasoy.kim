// Usage: node scripts/_ablate.mjs <devUrl> [view=seat] -> uncapped frame ms with parts of the scene toggled off (perf triage)
import { chromium } from '@playwright/test';
const [url, view = 'seat'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await p.evaluate((v) => window.__scene.getState().goTo(v), view);
await p.waitForTimeout(8000);
const measure = () => p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { if (++n === 150) res((performance.now() - t0) / 150); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
const cases = {
  base: '',
  noShadowUpdate: 'gl.shadowMap.autoUpdate=false',
  hideTrees: 'scene.getObjectByName("lake-trees").visible=false',
  hideFar: 'scene.getObjectByName("far-forest").visible=false',
  hideShore: 'scene.getObjectByName("lake-shore").visible=false',
  hideWater: 'scene.getObjectByName("water").visible=false',
  hideVan: 'scene.getObjectByName("van").visible=false',
  hideChars: 'scene.getObjectByName("characters").visible=false',
  allGeo: 'for (const n of ["lake-trees","far-forest","lake-shore","characters"]) scene.getObjectByName(n).visible=false',
};
for (const [k, code] of Object.entries(cases)) {
  await p.evaluate((code) => { const { gl, scene } = window.__three; window.__undo = []; scene.traverse((o) => window.__undo.push([o, o.visible])); window.__sa = gl.shadowMap.autoUpdate; new Function('gl', 'scene', code)(gl, scene); }, code);
  await p.waitForTimeout(300);
  const a = await measure(); const c = await measure();
  console.log(k.padEnd(16), Math.min(a, c).toFixed(1), 'ms');
  await p.evaluate(() => { const { gl } = window.__three; for (const [o, v] of window.__undo) o.visible = v; gl.shadowMap.autoUpdate = window.__sa; });
}
await b.close();
