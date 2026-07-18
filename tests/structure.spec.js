import { test, expect } from './lib';

const SECTION_IDS = ['about', 'certifications', 'skills', 'experience', 'projects', 'contact'];

test.describe('Page structure', () => {
  test('has exactly one h1 and all main sections', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    for (const id of SECTION_IDS) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('every nav anchor points to an existing section id', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    const anchors = await page.locator('.main-nav a[href^="#"], .mobile-nav a[href^="#"]').all();
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      const href = await a.getAttribute('href');
      const id = href.slice(1);
      await expect(page.locator(`#${id}`).first()).toBeAttached();
    }
  });

  test('html lang and viewport meta are set', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
  });
});
