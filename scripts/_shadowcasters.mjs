// Usage: node scripts/_shadowcasters.mjs <url> -> shadow-casting meshes whose world bounds touch the key light's shadow frustum
import { chromium } from '@playwright/test';
const [url] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await p.waitForTimeout(2000);
const rows = await p.evaluate(() => {
  const { scene } = window.__three; const T = scene.constructor; // THREE not global; use object methods
  let key = null; scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) key = o; });
  const cam = key.shadow.camera; cam.updateMatrixWorld();
  const m = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse);
  const Fr = cam.constructor; // hack: build frustum via any camera's frustum class is unavailable; do manual clip test
  const out = [];
  const box = new (scene.position.constructor)();
  scene.traverse((o) => {
    if (!o.isMesh || !o.castShadow || !o.visible) return;
    const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    let path = ''; let q = o; while (q && q !== scene) { path = (q.name || q.type) + '/' + path; q = q.parent; }
    const pts = [];
    if (o.isInstancedMesh) { const mm = o.matrixWorld.clone(); const im = mm.clone(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, im); pts.push(g.boundingSphere.center.clone().applyMatrix4(im.premultiply(o.matrixWorld))); } }
    else pts.push(g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld));
    let inside = 0;
    for (const c of pts) { const v = c.clone().applyMatrix4(m); if (Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15 && v.z > -1 && v.z < 1) inside++; }
    if (inside) out.push(`${inside}/${pts.length} ${path}`);
  });
  return out;
});
console.log(rows.join('\n'));
await b.close();
