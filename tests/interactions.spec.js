import { test, expect } from './lib';

test.describe('Interactive layer', () => {
  test('CI/CD pipeline renders 4 stages + 3 connectors', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await expect(page.locator('#in-action')).toBeVisible();
    await expect(page.locator('.pipeline-node')).toHaveCount(4);
    await expect(page.locator('.pipeline-connector')).toHaveCount(3);
    const labels = (await page.locator('.pipeline-node span').allTextContents()).join('|');
    expect(labels).toBe('Source|Build|Test|Deploy');
  });

  test('terminal types a real automation command', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await page.locator('#terminal-output').scrollIntoViewIfNeeded();
    await expect(page.locator('#terminal-output')).toContainText(/terraform|playwright|gh run/, { timeout: 8000 });
  });

  test('hero stat counters display their final target values', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await page.waitForTimeout(1600);
    const vals = await page.locator('.hero-stats [data-count]').evaluateAll((els) => els.map((e) => e.textContent));
    expect(vals).toEqual(['5×', '90%', '70%']);
  });

  test('scroll-progress indicator responds to scrolling', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    const bar = page.locator('.scroll-progress > span');
    await expect(bar).toBeAttached();
    const before = await bar.evaluate((el) => el.style.transform);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(250);
    const after = await bar.evaluate((el) => el.style.transform);
    expect(after).not.toBe(before);
  });

  test('hero particle canvas is initialized (non-zero backing size)', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await page.waitForTimeout(400);
    const w = await page.locator('.hero-canvas').evaluate((el) => el.width);
    expect(w).toBeGreaterThan(0);
  });

  test('reduced motion: no animation dependency — final values + static terminal', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(300);
    const vals = await page.locator('.hero-stats [data-count]').evaluateAll((els) => els.map((e) => e.textContent));
    expect(vals).toEqual(['5×', '90%', '70%']);
    await expect(page.locator('#terminal-output')).toContainText(/terraform|playwright|gh run/);
    // Canvas is left uninitialized (no rAF loop) under reduced motion — its
    // backing store stays at the HTML default of 300x150 (JS never resized it).
    const cw = await page.locator('.hero-canvas').evaluate((el) => el.width);
    expect(cw).toBe(300);
  });
});
