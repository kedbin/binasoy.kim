import { test, expect } from './lib';

// Runs under a project with `javaScriptEnabled: false`.
// Verifies progressive enhancement: with no JS the <html> never gets the
// `.js` class, so reveal elements default to fully visible content.
test.describe('No-JavaScript (progressive enhancement)', () => {
  test('all content renders fully without JS', async ({ cleanPage }) => {
    const { page } = cleanPage;
    await page.goto('/');

    const htmlClass = (await page.locator('html').getAttribute('class')) || '';
    expect(htmlClass).not.toContain('js');

    // Every major section's first card is visible (no opacity:0 ghosting).
    for (const sel of ['.cert-card', '.skill-group', '.timeline-item', '.project-card']) {
      await expect(page.locator(sel).first()).toBeVisible();
    }

    // Content is complete and correct without JS.
    await expect(page.locator('.skill-group')).toHaveCount(6);
    await expect(page.locator('h1')).toContainText('Kim Edrian Binasoy');
    await expect(page.locator('.hero-contact a[href="mailto:hello@binasoy.kim"]')).toHaveCount(1);
  });
});
