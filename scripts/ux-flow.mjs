// Usage: node scripts/ux-flow.mjs <baseUrl> <outPrefix> [desktop|mobile|both=both]
// Walks the real UX (loader → auto-enter → markers → dock → panels → lightbox → Esc) and screenshots each step.
// Builds a contact sheet <outPrefix>-<device>-sheet.jpg with python PIL if available.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const [base, prefix, which = 'both'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const url = base + (base.includes('?') ? '&' : '?') + 'q=mid';

async function run(device) {
  const mobile = device === 'mobile';
  const ctx = await b.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const files = [];
  const shot = async (name) => { const f = `${prefix}-${device}-${String(files.length).padStart(2, '0')}-${name}.png`; await p.screenshot({ path: f }); files.push(f); };
  const t0 = Date.now();
  await p.goto(url);
  await p.waitForTimeout(250); await shot('boot');
  await p.waitForSelector('.loader', { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(600); await shot('loader');
  await p.waitForSelector('.hud.is-revealed', { timeout: 60000 });
  console.log(device, 'revealed after', Date.now() - t0, 'ms');
  await p.waitForTimeout(500); await shot('reveal');
  await p.waitForSelector('.hud[data-view=seat]', { timeout: 10000 });
  await p.waitForSelector('.marker.is-on', { timeout: 10000 });
  await p.waitForTimeout(500); await shot('seat-coach');
  // drag to look
  const { width, height } = p.viewportSize();
  await p.mouse.move(width / 2, height / 2); await p.mouse.down(); await p.mouse.move(width / 2 - 200, height / 2 + 40, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(900); await shot('seat-dragged');
  // marker click → photos
  const m = p.locator('.marker.is-on', { hasText: 'Photos' });
  if (await m.count()) await m.first().click({ force: true }); else await p.keyboard.press('2');
  await p.waitForTimeout(400); await shot('wall-moving');
  await p.waitForSelector('.sheet', { timeout: 10000 }); await p.waitForTimeout(600); await shot('wall');
  await p.locator('.thumb').nth(2).click(); await p.waitForTimeout(800); await shot('lightbox');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.keyboard.press('Escape'); await p.waitForTimeout(1800);
  for (const [k, v] of [['3', 'stickers'], ['4', 'clipboard'], ['5', 'outside'], ['1', 'laptop']]) {
    await p.locator('.dock__btn').nth(Number(k) - 1).click({ force: true }).catch(async () => { await p.keyboard.press(k); });
    await p.waitForTimeout(2600); await shot(v);
    if (v === 'laptop') break;
    await p.keyboard.press('Escape'); await p.waitForTimeout(1600);
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(1800);
  await p.locator('.settings__toggle').click(); await p.waitForTimeout(300); await shot('settings');
  if (errs.length) console.log(device, 'ERR', errs.slice(0, 5).join(' | '));
  await ctx.close();
  try {
    execFileSync('python', ['-P', '-c', `
import sys
from PIL import Image, ImageDraw
fs=sys.argv[1:-2]; out=sys.argv[-2]; mob=sys.argv[-1]=='1'
W,H=(300,650) if mob else (720,450); cols=6 if mob else 3; rows=(len(fs)+cols-1)//cols
s=Image.new('RGB',(W*cols,H*rows),'black'); d=ImageDraw.Draw(s)
for i,f in enumerate(fs):
  im=Image.open(f).convert('RGB').resize((W,H)); x,y=(i%cols)*W,(i//cols)*H; s.paste(im,(x,y)); n=f.rsplit('-',1)[-1]; d.rectangle([x,y,x+8+7*len(n),y+18],fill='black'); d.text((x+4,y+3),n,fill='yellow')
s.save(out,quality=82)`, ...files, `${prefix}-${device}-sheet.jpg`, mobile ? '1' : '0']);
    console.log('sheet:', `${prefix}-${device}-sheet.jpg`);
  } catch (e) { console.log('sheet failed', e.message); }
}
if (which !== 'mobile') await run('desktop');
if (which !== 'desktop') await run('mobile');
await b.close();
