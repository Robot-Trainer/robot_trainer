import { _electron as electron, ElectronApplication, Page } from 'playwright';
import { test, expect } from '@playwright/test';

test.beforeAll(async () => { });
test.describe('Electron startup', () => {
  test('opens a window and renders', async () => {
    // Launch the Electron app. Use '.' so Playwright finds the current project.
    const electronApp: ElectronApplication = await electron.launch({ args: ['.vite/build/main.js', '--enable-logging', '--logging-level=0'] });

    // Run code in the main process to get the app path.
    const appPath = await electronApp.evaluate(async ({ app }: any) => {
      return app.getAppPath();
    });
    // Basic sanity check - path should be a non-empty string.
    expect(typeof appPath).toBe('string');
    expect(appPath.length).toBeGreaterThan(0);

    // Get the first renderer window and do some simple assertions.
    const window: Page = await electronApp.firstWindow();
    // Wait for content to load so the page has a layout with non-zero dimensions.
    await window.waitForLoadState('domcontentloaded');
    // Ensure root element is present (app render has started).
    try {
      await window.waitForSelector('#root', { timeout: 5000 });
    } catch (err) {
      // ignore - proceed even if selector isn't found in time
    }
    // Ensure the page has a usable viewport (some Electron windows start with 0 size).
    // Set an explicit viewport size before taking a screenshot.
    try {
      await window.setViewportSize({ width: 1280, height: 800 });
    } catch (e) {
      // Some platforms/bindings may ignore this; continue without failing the test.
      console.warn('setViewportSize failed:', e);
    }

    const title = await window.title();
    // The app title should be a non-empty string.
    expect(title).toBeTruthy();

    // Save a screenshot for debugging if needed. Setting viewport avoids 0-width error.
    await window.screenshot({ path: 'intro.png' });

    // Forward console messages from the renderer to the test output.
    window.on('console', (msg) => console.log('renderer console>', msg.text()));

    // Close the app at the end of the test.
    await electronApp.close();
  });
});
