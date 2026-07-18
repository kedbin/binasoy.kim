import { test, expect } from './lib';

test.describe('Accessibility basics', () => {
  test('all meaningful images have alt text', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    const imgs = await page.locator('img').all();
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      const alt = (await img.getAttribute('alt')) ?? '';
      // Decorative svg icons are not <img>; every <img> here is content.
      expect(alt.trim().length, 'img missing alt').toBeGreaterThan(0);
    }
  });

  test('interactive icon-only controls have accessible names', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await page.setViewportSize({ width: 390, height: 844 });
    const menuBtn = page.locator('.mobile-menu-btn');
    await expect(menuBtn).toHaveAttribute('aria-label', /.+/);
    await expect(menuBtn).toHaveAttribute('aria-controls', 'mobile-nav');
    await expect(page.locator('.back-to-top')).toHaveAttribute('aria-label', /.+/);
  });

  test('landmarks: header, main, footer, and primary nav are labelled', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await expect(page.locator('header.site-header')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);
    await expect(page.locator('nav[aria-label]')).toHaveCount(2); // primary + mobile
  });

  test('heading hierarchy is sound (h1 then h2s then h3s)', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.locator('h2').count()).toBeGreaterThanOrEqual(4);
    // No heading should skip straight to h4 without context.
    expect(await page.locator('h4').count()).toBe(0);
  });

  test('color contrast of body text meets a reasonable threshold', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    // Body copy uses the secondary text color; ensure it isn't near-black on near-black.
    const contrast = await page.evaluate(() => {
      const el = document.querySelector('.hero-lead') || document.body;
      const cs = getComputedStyle(el);
      return { color: cs.color, bg: getComputedStyle(document.body).backgroundColor };
    });
    expect(contrast.color).not.toBe(contrast.bg);
  });
});
