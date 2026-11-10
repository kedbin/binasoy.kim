import { test, expect } from './lib';

test.describe('Smoke', () => {
  test('loads with correct title and no console/request errors', async ({ cleanPage }) => {
    const { page, errors, failedLocal } = cleanPage;
    const resp = await page.goto('/');
    expect(resp?.status()).toBe(200);
    await expect(page).toHaveTitle(/Kim Edrian Binasoy/);

    // Give async scripts (PostHog is blocked) a moment to settle.
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    expect(errors, `console errors: ${JSON.stringify(errors)}`).toEqual([]);
    expect(failedLocal, `failed local requests: ${JSON.stringify(failedLocal)}`).toEqual([]);
  });

  test('main assets are served (css, js, orbit canvas)', async ({ cleanPage }) => {
    const { page, failedLocal } = cleanPage;
    await page.goto('/');
    // Local CSS + JS injected (Google Fonts is an additional <link>)
    await expect(page.locator('link[rel="stylesheet"][href$="main.css"]')).toHaveCount(1);
    await expect(page.locator('script[src$="main.js"]')).toHaveCount(1);
    // Hero orbit canvas initialized
    const orbit = page.locator('.orbit-canvas');
    await expect(orbit).toBeAttached();
    expect(await orbit.evaluate((el) => el.width)).toBeGreaterThan(0);
    expect(failedLocal).toEqual([]);
  });
});
