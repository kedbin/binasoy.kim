// Shared Playwright test helpers.
import { test as base } from '@playwright/test';

// Hosts we deliberately block in tests to keep runs fast, offline-capable,
// and deterministic (analytics + web fonts). The site degrades gracefully.
const BLOCKED_HOSTS = ['us.i.posthog.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// A fixture that blocks external traffic and collects console errors
// + failed (local) requests so any spec can assert a clean page.
export const test = base.extend({
  cleanPage: async ({ page }, use) => {
    const errors = [];
    const failedLocal = [];

    await page.route('**/*', (route) => {
      const url = route.request().url();
      try {
        const host = new URL(url).hostname;
        if (BLOCKED_HOSTS.includes(host)) {
          // Fulfill (not abort) so the browser doesn't log "failed resource"
          // console errors; analytics/fonts simply degrade to no-ops.
          return route.fulfill({ status: 204, contentType: 'text/plain', body: '' });
        }
      } catch { /* non-URL request */ }
      return route.continue();
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('requestfailed', (req) => {
      const url = req.url();
      // Ignore the deliberately-blocked external hosts.
      if (BLOCKED_HOSTS.some((h) => url.includes(h))) return;
      failedLocal.push(`${req.method()} ${url} — ${req.failure()?.errorText}`);
    });

    await use({ page, errors, failedLocal });
  },
});

export { expect } from '@playwright/test';
