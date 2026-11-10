import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Content } from '../src/content/types';

const c: Content = JSON.parse(readFileSync(new URL('../src/content/content.json', import.meta.url), 'utf8'));

test.describe('reader', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/?reader'); });

  test('enters reader mode, no canvas', async ({ page }) => {
    await expect(page.locator('html')).toHaveClass(/mode-reader/);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('#reader')).toBeVisible();
  });

  test('renders all content', async ({ page }) => {
    const main = page.locator('#reader');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(c.profile.name);
    for (const x of c.certs) await expect(main.getByText(x.name, { exact: true }).first()).toBeVisible();
    for (const j of c.experience) await expect(main.getByRole('heading', { level: 3, name: new RegExp(j.role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeVisible();
    for (const p of c.projects) await expect(main.getByRole('heading', { level: 3, name: p.name })).toBeVisible();
    for (const s of c.skills) await expect(main.getByRole('heading', { level: 3, name: s.title })).toBeVisible();
  });

  test('résumé link resolves 200', async ({ page, request }) => {
    const href = await page.locator('#reader a[href$=".pdf"]').first().getAttribute('href');
    expect(href).toBe(c.profile.resumePdf);
    const res = await request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
  });

  test('van photos load', async ({ page }) => {
    const figs = page.locator('#reader figure img');
    await expect(figs).toHaveCount(c.photos.length);
    for (let i = 0; i < c.photos.length; i++) {
      await figs.nth(i).scrollIntoViewIfNeeded();
      await expect.poll(() => figs.nth(i).evaluate((e: HTMLImageElement) => e.naturalWidth)).toBeGreaterThan(0);
    }
  });

  test('heading order is sane', async ({ page }) => {
    const levels = await page.locator('#reader').locator('h1,h2,h3,h4').evaluateAll((els) => els.map((e) => +e.tagName[1]));
    expect(levels[0]).toBe(1);
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  });

  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(o).toBeLessThanOrEqual(0);
  });

  test('JSON-LD Person is present and valid', async ({ page }) => {
    const txt = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(txt!)['@type']).toBe('Person');
  });
});

test.describe('fallbacks', () => {
  test.describe('no JS', () => {
    test.use({ javaScriptEnabled: false });
    test('reader visible and styled content present', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: c.profile.name })).toBeVisible();
      await expect(page.getByText(c.certs[0].name, { exact: true }).first()).toBeVisible();
      await expect(page.locator('.r-enter')).toBeHidden();
    });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('falls back to reader, no canvas', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveClass(/mode-reader/);
      await expect(page.locator('canvas')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: c.profile.name })).toBeVisible();
    });
  });

  test('no WebGL falls back to reader', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...a: unknown[]) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return (orig as (...x: unknown[]) => unknown).call(this, type, ...a);
      } as typeof orig;
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/mode-reader/);
    await expect(page.getByRole('heading', { level: 1, name: c.profile.name })).toBeVisible();
  });
});
