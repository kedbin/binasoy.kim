// node scripts/_probe.mjs <url> <js-expression-module-path> ; evaluates a probe in the dev page
import { chromium } from '@playwright/test';
const [url, code] = process.argv.slice(2);
const b = await chromium.launch();
const pg = await b.newPage();
pg.on('pageerror', (e) => console.log('ERR', e.message));
await pg.goto(url + '?reader');
const r = await pg.evaluate(`(async () => { ${code} })()`);
console.log(JSON.stringify(r, null, 1));
await b.close();
