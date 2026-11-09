// Usage: node scripts/shot.mjs <url> <out.png> [view] [waitMs] [w] [h]
import { chromium } from '@playwright/test';
const [url, out, view = '', wait = '7000', w = '1440', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2500);
if (view) await page.evaluate((v) => window.__scene?.getState().goTo(v), view);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log(logs.slice(0, 15).join('\n') || 'no console errors');
await browser.close();
