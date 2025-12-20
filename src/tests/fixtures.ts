import { _electron as electron, ElectronApplication, Page } from "playwright";
import base from "@playwright/test";

export type Fixtures = {
  electronApp: ElectronApplication;
  window: Page;
  setIpcHandlers: (
    handlers: Record<string, (...args: any[]) => any>
  ) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: [".vite/build/main.js", "--enable-logging", "--logging-level=0"],
    });
    await use(app);
    await app.close();
  },

  setIpcHandlers: async ({ electronApp }, use) => {
    await use(async (handlers: Record<string, (...args: any[]) => any>) => {
      const serialized: Record<string, string> = {};
      for (const [channel, fn] of Object.entries(handlers))
        serialized[channel] = fn.toString();
      await electronApp.evaluate(
        async ({ ipcMain }, handlerMap: Record<string, string>) => {
          for (const channel of Object.keys(handlerMap)) {
            try {
              ipcMain.removeHandler(channel);
            } catch (e) {}
            const fn = eval(`(${handlerMap[channel]})`);
            ipcMain.handle(channel, fn);
          }
        },
        serialized
      );
    });
  },

  window: async ({ electronApp }, use) => {
    const win = await electronApp.firstWindow();
    await win.waitForLoadState("domcontentloaded");
    try {
      await win.setViewportSize({ width: 1200, height: 800 });
    } catch {}
    await use(win);
  },
});
