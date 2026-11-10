import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('reader has no serious/critical axe violations', async ({ page }) => {
  await page.goto('/?reader');
  await page.locator('#reader figure img').last().scrollIntoViewIfNeeded();
  const res = await new AxeBuilder({ page }).include('#reader').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ') + ' ' + (n.any[0]?.message ?? '')).join(' | '))).toEqual([]);
});
