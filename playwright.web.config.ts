/**
 * Playwright configuration for testing the web (non-Electron) variant.
 *
 * Usage:
 *   npm run test:playwright:web
 *
 * The web server must already be running (or will be started by webServer below).
 * Tests use PLAYWRIGHT_TEST_MODE=web, which switches src/tests/fixtures.ts to
 * use HTTP-based fixtures instead of Electron-specific ones.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'src/tests',
  testMatch: 'src/tests/*.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  use: {
    video: 'on',
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'web-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start the web server automatically before running tests.
  // Remove this block if you prefer to start the server manually.
  webServer: {
    command: 'npm run start:web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
