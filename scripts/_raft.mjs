// node scripts/_raft.mjs <url> <out.png> <localCamX,Y,Z> [fov] [night] — camera in raft-local frame, looking at the raft
import { chromium } from '@playwright/test';
const [url, out, p, fov = '28', night = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
pg.on('pageerror', (e) => console.log('ERR', e.message));
await pg.goto(url + '?q=high'); await pg.waitForTimeout(3000);
await pg.evaluate(([p, fov, night]) => {
  const r = window.__raft; const [lx, ly, lz] = p.split(',').map(Number);
  const c = Math.cos(r.rotation.y), s = Math.sin(r.rotation.y);
  const wx = r.position.x + lx * c + lz * s, wz = r.position.z - lx * s + lz * c;
  window.__CAMERA.outside = { pos: [wx, r.position.y + ly, wz], target: [r.position.x, r.position.y + 0.55, r.position.z], fov: Number(fov) };
  const st = window.__scene.getState(); st.goTo('outside'); if (night) st.setTimeOfDay('night');
}, [p, fov, night]);
await pg.waitForTimeout(5500); await pg.screenshot({ path: out }); await b.close();
