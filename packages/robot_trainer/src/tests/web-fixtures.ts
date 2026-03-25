/**
 * Playwright fixtures for the web (non-Electron) variant of Robot Trainer.
 *
 * These fixtures mirror the shape of src/tests/fixtures.ts so that test
 * files can be written once and toggled between modes.  The key differences:
 *
 *  • `window` — navigates a real browser page to the running web server
 *    instead of grabbing the Electron renderer window.
 *  • `setIpcHandlers` — intercepts HTTP POST /api/:channel requests with
 *    page.route() instead of wiring Electron ipcMain handlers.
 *  • `electronApp` — a no-op stub (web tests do not have an Electron process).
 *
 * Tests that call `electronApp.evaluate()` with Electron-specific APIs
 * (Menu, BrowserWindow, …) are inherently Electron-only and will not work
 * in web mode.  Those tests should be skipped or conditioned with:
 *   test.skip(process.env.PLAYWRIGHT_TEST_MODE === 'web', 'Electron only');
 */

import { test as base, Page } from '@playwright/test';

 
type HandlerMap = Record<string, (...args: unknown[]) => unknown>;

export type WebFixtures = {
  /** No-op stub — web tests have no Electron process. */
   
  electronApp: unknown;
  /** The browser page under test, navigated to the web server's root. */
  window: Page;
  /**
   * Registers per-test HTTP route overrides so individual test cases can mock
   * API responses without modifying the running server.
   *
   * Each key is an IPC channel name (e.g. 'check-anaconda'); the value is a
   * function that receives the deserialized `args` array and returns the mock
   * result (or a Promise thereof).
   */
  setIpcHandlers: (handlers: HandlerMap) => Promise<void>;
};

export const test = base.extend<WebFixtures>({
  electronApp: async (_, use) => {
    // Provide a stub so tests that reference electronApp compile without errors.
    // Electron-specific methods (evaluate, etc.) are no-ops in web mode.
    await use({
      evaluate: async () => undefined,
      evaluateHandle: async () => undefined,
      windows: () => [],
      waitForEvent: async () => {
        throw new Error(
          'electronApp.waitForEvent is not supported in web mode. ' +
          'Add `test.skip(process.env.PLAYWRIGHT_TEST_MODE === "web", "Electron only")` to skip this test.',
        );
      },
      close: async () => {},
    });
  },

  window: async ({ page }, use) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    try {
      await page.setViewportSize({ width: 1200, height: 800 });
    } catch { /* ignore */ }
    await use(page);
  },

  setIpcHandlers: async ({ window }, use) => {
    await use(async (handlers: HandlerMap) => {
      for (const [channel, fn] of Object.entries(handlers)) {
        await window.route(
          `/api/${encodeURIComponent(channel)}`,
          async (route) => {
            const postData = route.request().postData();
             
            let args: unknown[] = [];
            try {
              const body = JSON.parse(postData ?? '{}');
              if (Array.isArray(body.args)) args = body.args;
            } catch { /* ignore malformed body */ }

            try {
              const result = await fn(...args);
              await route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({ result }),
              });
            } catch (err) {
              await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: String(err) }),
              });
            }
          },
        );
      }
    });
  },
});
