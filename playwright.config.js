// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.PORT || 4173;
const baseURL = `http://localhost:${PORT}`;

/**
 * Playwright config for the binasoy.kim portfolio.
 * Tests run against the production webpack build in `dist/`, served over HTTP
 * by `tests/server.mjs` so they exercise the real built assets.
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'node tests/server.mjs',
    url: baseURL,
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
