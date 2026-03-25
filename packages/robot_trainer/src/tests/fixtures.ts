import { _electron as electron, ElectronApplication, Page } from "playwright";
import base from "@playwright/test";
import fs from 'fs';
import path from 'path';
import os from 'os';

export type Fixtures = {
  electronApp: ElectronApplication;
  window: Page;
  setIpcHandlers: (

    handlers: Record<string, (...args: unknown[]) => unknown>
  ) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({ }, use) => {
    // Need separate tmp directories for each playwright test so that running multiple
    // playwright workers doesn't cause IndexedDB migration conflicts.
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'robot-trainer-test-'));
    const launchEnv = { ...process.env };
    delete launchEnv.ELECTRON_RUN_AS_NODE;
    launchEnv.HOME = tempDir;
    launchEnv.XDG_CONFIG_HOME = tempDir;
    launchEnv.XDG_DATA_HOME = tempDir;
    const app = await electron.launch({
      args: [".vite/build/main.js", "--no-sandbox", "--enable-logging", "--logging-level=0", `--user-data-dir=${tempDir}`],
      env: launchEnv,
    });
    await use(app);
    await app.close();
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error(error);
    }
  },

  setIpcHandlers: async ({ electronApp }, use) => {
    await use(async (handlers: Record<string, (...args: unknown[]) => unknown>) => {
      const serialized: Record<string, string> = {};
      for (const [channel, fn] of Object.entries(handlers))
        serialized[channel] = fn.toString();
      await electronApp.evaluate(
        async ({ ipcMain, BrowserWindow, app }, handlerMap: Record<string, string>) => {
          // Expose electron modules to global scope so mocked handlers can use them
          Object.assign(globalThis, { ipcMain, BrowserWindow, app });

          for (const channel of Object.keys(handlerMap)) {
            try {
              ipcMain.removeHandler(channel);
            } catch { /* ignore */ }
            const fn = eval(`(${handlerMap[channel]})`);
            ipcMain.handle(channel, fn);
          }
        },
        serialized
      );
    });
  },



  window: async ({ electronApp }, use) => {
    const isAppWindow = (w: Page) => {
      const url = w.url();
      return !url.startsWith('devtools://') && !url.startsWith('chrome-devtools://');
    };

    // Wait for the application window (not DevTools)
    let win: Page | undefined = electronApp.windows().find((w) => isAppWindow(w));
    if (!win) {
      win = await electronApp.waitForEvent('window', (w) => isAppWindow(w));
    }
    await win.waitForLoadState("domcontentloaded");
    await win.waitForSelector('#root', { timeout: 15000 }).catch(() => { /* ignore */ });
    try {
      await win.setViewportSize({ width: 1200, height: 800 });
    } catch { /* ignore */ }
    await use(win);
  },
});
