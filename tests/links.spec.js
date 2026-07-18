import { test, expect } from './lib';

test.describe('Links', () => {
  test('contact + social links point to the right destinations', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');

    const mailto = page.locator('a[href^="mailto:"]');
    expect(await mailto.count()).toBeGreaterThanOrEqual(1);
    await expect(mailto.first()).toHaveAttribute('href', 'mailto:hello@binasoy.kim');

    await expect(page.locator('a[href="https://github.com/kedbin"]')).toHaveCount(2);
    await expect(page.locator('a[href="https://linkedin.com/in/kedbin"]')).toHaveCount(2);
    // relearn.ing is linked from the flagship project card AND the footer social row.
    expect(await page.locator('a[href="https://relearn.ing"]').count()).toBeGreaterThanOrEqual(1);
  });

  test('résumé download link targets the deployed PDF', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    // Use the always-visible hero CTA (the nav "Resume" link is hidden on mobile).
    const resume = page.locator('.hero-actions a[href="/Kim_Binasoy_Resume.pdf"]');
    await expect(resume).toBeVisible();
    // The file is copied into dist by the build and served by the test server.
    const status = await page.request.get('/Kim_Binasoy_Resume.pdf');
    expect(status.status()).toBe(200);
  });

  test('external links open safely (target=_blank + rel=noopener)', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');
    const externals = await page.locator('a[target="_blank"]').all();
    expect(externals.length).toBeGreaterThan(0);
    for (const a of externals) {
      const rel = (await a.getAttribute('rel')) || '';
      expect(rel).toContain('noopener');
    }
  });
});
