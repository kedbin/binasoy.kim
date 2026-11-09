import { test, expect } from '@playwright/test';

test.describe('3D smoke', () => {
  test('climb in, laptop, Esc, quick view', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/?q=low');
    await expect(page.locator('html')).toHaveClass(/mode-3d/);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 45_000 });

    const climb = page.getByRole('button', { name: /Climb in/ });
    await expect(climb).toBeVisible({ timeout: 45_000 });
    await climb.click();

    const nav = page.getByRole('navigation', { name: 'Look around the van' });
    await expect(nav).toBeVisible();
    await expect(page.locator('.hud')).toHaveAttribute('data-view', 'seat');

    await nav.getByRole('button', { name: 'Laptop' }).click();
    await expect(page.locator('.hud')).toHaveAttribute('data-view', 'laptop');
    await expect(page.locator('button.kos-icon').first()).toBeAttached({ timeout: 15_000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('.hud')).toHaveAttribute('data-view', 'seat');

    await page.getByRole('button', { name: 'Quick view' }).click();
    await expect(page.locator('html')).toHaveClass(/mode-reader/);
    expect(await page.evaluate(() => localStorage.getItem('kb:mode'))).toBe('reader');
    await expect(page.locator('canvas')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('"Enter the van" clears reader preference', async ({ page }) => {
    await page.goto('/?reader');
    await page.evaluate(() => localStorage.setItem('kb:mode', 'reader'));
    await page.locator('.r-enter__link').click();
    await expect(page.locator('html')).toHaveClass(/mode-3d/);
    expect(await page.evaluate(() => localStorage.getItem('kb:mode'))).toBeNull();
  });
});
