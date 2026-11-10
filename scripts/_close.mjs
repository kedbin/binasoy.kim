// node .tmp/close.mjs <url> <out.png> <px,py,pz> <tx,ty,tz> [fov] [waitMs] [night]
import { chromium } from '@playwright/test';
const [url, out, p, t, fov = '35', wait = '5000', night = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
pg.on('pageerror', (e) => console.log('ERR', e.message));
pg.on('console', (m) => { if (m.type() === 'error') console.log('CERR', m.text().slice(0, 200)); });
await pg.goto(url + (url.includes('?') ? '&' : '?') + 'q=high');
await pg.waitForTimeout(2500);
await pg.evaluate(([p, t, fov, night]) => {
  window.__CAMERA.outside = { pos: p.split(',').map(Number), target: t.split(',').map(Number), fov: Number(fov) };
  const s = window.__scene.getState(); s.goTo('outside'); if (night) s.setTimeOfDay('night');
}, [p, t, fov, night]);
await pg.waitForTimeout(Number(wait));
await pg.screenshot({ path: out });
await b.close();
