// Usage: node scripts/_tris.mjs <url> -> triangles and meshes per named scene group (one pass; the lake mirror draws most of it a second time)
import { chromium } from '@playwright/test';
const [url] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
await p.waitForTimeout(3000);
const rows = await p.evaluate(() => {
  const { scene } = window.__three; const out = [];
  const count = (root) => { let tris = 0, meshes = 0, shadow = 0; root.traverse((o) => { if (!o.isMesh || !o.geometry) return; const g = o.geometry; const n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); tris += n; meshes++; if (o.castShadow) shadow += n; }); return { tris: Math.round(tris), meshes, shadowTris: Math.round(shadow) }; };
  const walk = (o, depth, path) => { for (const c of o.children) { const name = c.name || c.type; const r = count(c); if (r.tris > 20000 && depth < 2 && c.children.length) { out.push({ path: path + name, ...r, group: true }); walk(c, depth + 1, path + name + '/'); } else if (r.tris > 3000) out.push({ path: path + name, ...r }); } };
  walk(scene, 0, '');
  return { rows: out, total: count(scene) };
});
console.log('TOTAL', JSON.stringify(rows.total));
for (const r of rows.rows) console.log(String(r.tris).padStart(9), String(r.meshes).padStart(4) + ' meshes', 'shadow ' + String(r.shadowTris).padStart(8), r.group ? '[group] ' : '        ', r.path);
await b.close();
