// Usage: node scripts/views.mjs <baseUrl> <outPrefix> [views=intro,seat,outside,night]
// Renders a labelled 2x2 contact sheet <outPrefix>-sheet.jpg (via sharp-less canvas: uses page screenshots + python PIL if present).
import { chromium } from '@playwright/test';
// local copy (O1): fixes night toggle
import { execFileSync } from 'node:child_process';
const [base, prefix, list = 'intro,seat,outside,night'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const files = [];
for (const v of list.split(',')) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(base + (base.includes('?') ? '&' : '?') + 'q=high');
  await p.waitForTimeout(2500);
  await p.evaluate((v) => { const s = window.__scene.getState(); if (v === 'night') { s.goTo('seat'); if (s.setTimeOfDay) s.setTimeOfDay('night'); else s.toggleTime(); } else s.goTo(v); }, v);
  await p.waitForTimeout(6000);
  const f = `${prefix}-${v}.png`; await p.screenshot({ path: f }); files.push(f);
  if (errs.length) console.log(v, 'ERR', errs.slice(0, 3).join(' | '));
  await p.close();
}
await b.close();
try {
  execFileSync('python', ['-P', '-c', `
import sys
from PIL import Image, ImageDraw
fs=sys.argv[1:-1]; out=sys.argv[-1]
W,H=960,600; cols=2; rows=(len(fs)+1)//2
s=Image.new('RGB',(W*cols,H*rows),'black'); d=ImageDraw.Draw(s)
for i,f in enumerate(fs):
  im=Image.open(f).convert('RGB').resize((W,H)); x,y=(i%cols)*W,(i//cols)*H; s.paste(im,(x,y)); d.rectangle([x,y,x+150,y+26],fill='black'); d.text((x+8,y+6),f.split('-')[-1],fill='yellow')
s.save(out,quality=84)`, ...files, `${prefix}-sheet.jpg`]);
  console.log('sheet:', `${prefix}-sheet.jpg`);
} catch (e) { console.log('sheet failed', e.message); }
