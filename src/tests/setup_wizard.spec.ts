import { _electron as electron, ElectronApplication, Page } from 'playwright';
import base, { expect } from '@playwright/test';

type Fixtures = {
  electronApp: ElectronApplication;
  window: Page;
};

const test = base.extend<Fixtures>({
  electronApp: async ({}, use) => {
    // Launch the Electron app. Use the built main entry used by package task.
    const app = await electron.launch({ args: ['.vite/build/main.js', '--enable-logging', '--logging-level=0'] });
    // Provide the app to tests.
    await use(app);
    // Teardown: close the app after tests complete (acts like afterAll).
    await app.close();
  },

  window: async ({ electronApp }, use) => {
    const win = await electronApp.firstWindow();
    // Wait for renderer to begin rendering and ensure layout is available.
    await win.waitForLoadState('domcontentloaded');
    try {
      await win.waitForSelector('#root', { timeout: 5000 });
    } catch (err) {
      // ignore
    }
    try {
      await win.setViewportSize({ width: 1280, height: 800 });
    } catch (e) {
      // ignore
    }
    await use(win);
  },
});

test.describe('Electron startup', () => {
  test('opens a window and renders', async ({ window }) => {
    // Keep the test minimal: only the highlighted assertions and actions.
    const title = await window.title();
    // The app title should be a non-empty string.
    expect(title).toBeTruthy();

    // Save a screenshot for debugging if needed. Setting viewport avoids 0-width error.
      await expect(window).toHaveScreenshot();

    // Forward console messages from the renderer to the test output.
    window.on('console', (msg) => console.log('renderer console>', msg.text()));
  });
});

export { test, expect };
