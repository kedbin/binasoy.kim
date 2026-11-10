import { test, expect, type Page } from '@playwright/test';

async function enterVan(page: Page) {
  await page.goto('/?q=low');
  await expect(page.locator('html')).toHaveClass(/mode-3d/);
  // stage (a) static loader → stage (b) React loader → reveal
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('.hud.is-revealed')).toBeAttached({ timeout: 45_000 });
  await expect(page.locator('#boot-loader')).toHaveCount(0);
  // intro auto-advances into the van (no dead-end button)
  await expect(page.locator('.hud')).toHaveAttribute('data-view', 'seat', { timeout: 15_000 });
}

test.describe('3D smoke', () => {
  test('loader → auto climb-in → dock → laptop → Esc → quick view', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await enterVan(page);

    const dock = page.getByRole('navigation', { name: 'Places in the van' });
    await expect(dock).toBeVisible();
    await expect(dock.getByRole('button')).toHaveCount(5);

    await dock.getByRole('button', { name: /Work/ }).click();
    await expect(page.locator('.hud')).toHaveAttribute('data-view', 'laptop');
    await expect(dock.getByRole('button', { name: /Work/ })).toHaveAttribute('aria-current', 'location');
    await expect(page.locator('button.kos-icon').first()).toBeAttached({ timeout: 15_000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('.hud')).toHaveAttribute('data-view', 'seat');

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('menuitem', { name: /Quick view/ }).click();
    await expect(page.locator('html')).toHaveClass(/mode-reader/);
    expect(await page.evaluate(() => localStorage.getItem('kb:mode'))).toBe('reader');
    await expect(page.locator('canvas')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('keyboard places, panels after arrival, back button, lightbox', async ({ page }) => {
    await enterVan(page);
    const hud = page.locator('.hud');

    // 4 → résumé sheet slides in once the camera arrives; focus moves into it
    await page.keyboard.press('4');
    await expect(hud).toHaveAttribute('data-view', 'clipboard');
    const sheet = page.getByRole('dialog', { name: 'Experience summary' });
    await expect(sheet).toBeVisible({ timeout: 10_000 });
    await expect(sheet.getByRole('link', { name: /Download résumé/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Close Experience summary/ })).toBeFocused();
    // view change is announced
    await expect(page.locator('.hud [aria-live=polite]').last()).toContainText(/résumé/i);

    await page.getByRole('button', { name: /Back to the van/ }).click();
    await expect(hud).toHaveAttribute('data-view', 'seat');
    await expect(sheet).toHaveCount(0);

    // 2 → photos; open a photo, arrows step through, Esc closes only the lightbox
    await page.keyboard.press('2');
    await expect(hud).toHaveAttribute('data-view', 'wall');
    await page.locator('.thumb').first().click({ timeout: 10_000 });
    const box = page.getByRole('dialog', { name: /Photo 1 of/ });
    await expect(box).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('dialog', { name: /Photo 2 of/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.lightbox')).toHaveCount(0);
    await expect(hud).toHaveAttribute('data-view', 'wall');
    await page.keyboard.press('Escape');
    await expect(hud).toHaveAttribute('data-view', 'seat');
  });

  test('"Enter the van" clears reader preference', async ({ page }) => {
    await page.goto('/?reader');
    await page.evaluate(() => localStorage.setItem('kb:mode', 'reader'));
    await page.locator('.r-enter__link').click();
    await expect(page.locator('html')).toHaveClass(/mode-3d/);
    expect(await page.evaluate(() => localStorage.getItem('kb:mode'))).toBeNull();
  });

  test('reader mode never shows the loader', async ({ page }) => {
    await page.goto('/?reader');
    await expect(page.locator('html')).toHaveClass(/mode-reader/);
    await expect(page.locator('#boot-loader')).toBeHidden();
    await expect(page.locator('.loader')).toHaveCount(0);
    await expect(page.locator('#reader h1')).toBeVisible();
  });
});
