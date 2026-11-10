import { test, expect, type Page } from '@playwright/test';

// SwiftShader compiles every shader on the CPU before the loader can reveal.
test.describe.configure({ timeout: 180_000 });

type W = Window & {
  __scene: { getState: () => { view: string; arrived: string | null; transitioning: boolean; goTo: (v: string) => void } };
  __three: { scene: { getObjectByName: (n: string) => { getWorldPosition: (v: unknown) => { project: (c: unknown) => { x: number; y: number } }; position: { constructor: new () => unknown } } }; camera: unknown; gl: { domElement: HTMLCanvasElement } };
};

async function enter(page: Page) {
  await page.goto('/?q=low&debug');
  await expect(page.locator('html')).toHaveAttribute('data-ready', '1', { timeout: 150_000 });
  await page.waitForFunction(() => { const s = (window as unknown as W).__scene.getState(); return s.arrived === 'seat' && !s.transitioning; }, null, { timeout: 20_000 });
}

/** Viewport px of the laptop screen centre. */
const screenCentre = (page: Page) => page.evaluate(() => {
  const { scene, camera, gl } = (window as unknown as W).__three;
  const s = scene.getObjectByName('laptop-screen');
  const v = s.getWorldPosition(new s.position.constructor()).project(camera);
  const r = gl.domElement.getBoundingClientRect();
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
});
const view = (page: Page) => page.evaluate(() => (window as unknown as W).__scene.getState().view);

test('clicking the centre of the laptop screen opens it once; Escape returns to the seat', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => {
    const w = window as unknown as W & { __views: string[] };
    w.__views = [];
    (w.__scene as unknown as { subscribe: (f: (s: { view: string }, p: { view: string }) => void) => void })
      .subscribe((s, p) => { if (s.view !== p.view) w.__views.push(s.view); });
  });
  const pt = await screenCentre(page);
  await page.mouse.click(pt.x, pt.y);
  await expect.poll(() => view(page)).toBe('laptop');
  // hammering the screen mid-flight must not restart / double the open
  await page.mouse.click(pt.x, pt.y);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForFunction(() => (window as unknown as W).__scene.getState().arrived === 'laptop', null, { timeout: 15_000 });
  await expect(page.locator('.kimos-3d.is-active')).toBeAttached({ timeout: 15_000 });
  await page.keyboard.press('Escape');
  await expect.poll(() => view(page)).toBe('seat');
  expect(await page.evaluate(() => (window as unknown as { __views: string[] }).__views)).toEqual(['laptop', 'seat']);
});

test('van view: reachable from outside and by key 6, Escape returns to the seat', async ({ page }) => {
  await enter(page);
  await page.keyboard.press('5');
  await expect(page.locator('.hud')).toHaveAttribute('data-view', 'outside');
  await page.locator('.hud__turn').click();
  await expect(page.locator('.hud')).toHaveAttribute('data-view', 'van');
  await expect(page.locator('.hud__turn')).toContainText(/lake/i);
  await page.keyboard.press('Escape');
  await expect(page.locator('.hud')).toHaveAttribute('data-view', 'seat');
  await page.keyboard.press('6');
  await expect(page.locator('.hud')).toHaveAttribute('data-view', 'van');
});
