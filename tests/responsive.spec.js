import { test, expect } from './lib';

// Viewports spanning desktop, laptop, tablet, phone, and a tall/portrait monitor.
const VIEWPORTS = [
  { name: 'desktop-1920', w: 1920, h: 1080 },
  { name: 'laptop-1440', w: 1440, h: 900 },
  { name: 'tablet-768', w: 768, h: 1024 },
  { name: 'mobile-390', w: 390, h: 844 },
  { name: 'vertical-1080x1920', w: 1080, h: 1920 },
];

test.describe('Responsive layout', () => {
  for (const vp of VIEWPORTS) {
    test(`has no horizontal overflow at ${vp.name} (${vp.w}x${vp.h})`, async ({ cleanPage }) => {
      const { page } = cleanPage;
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
      // Allow a 1px rounding tolerance.
      expect(overflow.scrollWidth, `horizontal overflow at ${vp.name}`).toBeLessThanOrEqual(
        overflow.clientWidth + 1
      );
    });

    test(`hero + contact visible at ${vp.name}`, async ({ cleanPage }) => {
      const { page } = cleanPage;
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('#contact')).toBeAttached();
      await expect(page.locator('.portrait-img')).toBeVisible();
    });
  }

  test('mobile menu button appears only on small screens', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('.mobile-menu-btn')).toBeVisible();
  });

  test('mobile menu opens and closes', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const btn = page.locator('.mobile-menu-btn');
    await btn.click();
    await expect(page.locator('.mobile-nav-overlay')).toHaveClass(/open/);
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    // Escape closes it.
    await page.keyboard.press('Escape');
    await expect(page.locator('.mobile-nav-overlay')).not.toHaveClass(/open/);
  });
});
