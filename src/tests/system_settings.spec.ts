import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard, expectPageScreenshot } from './helpers';

test.describe('System Settings integration with ConfigManager IPC', () => {
  test('saves settings successfully', async ({ window, setIpcHandlers, electronApp }) => {
    await setIpcHandlers({});
    await dismissSetupWizard(window);
    // Register renderer-side listener to respond to main's request
    await window.evaluate(() => {
      const win = window as any;
      win.electronAPI.onRequestSaveSystemSettings((settings: any) => {
        // pretend save OK
        win.electronAPI.replySaveSystemSettings({ success: true, settings });
      });
    });

    await window.click('text=System Settings');
    await window.getByLabel('Python Interpreter Path').fill('/usr/bin/python3');
    await dismissSetupWizard(window);
    await window.click('text=Save Settings');
    await expect(window.locator('text=Settings saved')).toBeVisible();
    await expectPageScreenshot(window);
  });

  test('shows error when save fails', async ({ window, setIpcHandlers }) => {
    await setIpcHandlers({});
    await dismissSetupWizard(window);
    await window.evaluate(() => {
      const win = window as any;
      win.electronAPI.onRequestSaveSystemSettings(() => {
        // simulate failure
        win.electronAPI.replySaveSystemSettings({ success: false, error: 'disk full' });
      });
    });

    await window.click('text=System Settings');
    await window.getByLabel('Python Interpreter Path').fill('/usr/bin/python3');
    await window.click('text=Save Settings');
    // Note: The error message might be partial match "Failed to save settings: disk full"
    await expect(window.locator('text=Failed to save settings')).toBeVisible({ timeout: 5000 });
    await expectPageScreenshot(window);
  });

  test('handles defaults on fresh load gracefully', async ({ window, setIpcHandlers }) => {
    await setIpcHandlers({});
    await dismissSetupWizard(window);

    await window.click('text=System Settings');
    // fields should retain defaults (empty)
    const pyVal = await window.getByLabel('Python Interpreter Path').inputValue();
    expect(pyVal).toBe('');
  });

  test('reacts to external settings change event', async ({ window, setIpcHandlers, electronApp }) => {
    await setIpcHandlers({});
    await dismissSetupWizard(window);
    await window.evaluate(() => {
      const win = window as any;
      win.electronAPI.onRequestSaveSystemSettings((settings: any) => {
        win.electronAPI.replySaveSystemSettings({ success: true, settings });
      });
    });

    await window.click('text=System Settings');

    // Set initial value via UI
    await window.getByLabel('Python Interpreter Path').fill('/initial');
    await expect(window.locator('input[value="/initial"]')).toHaveCount(1);



    // simulate main process broadcasting an external change
    await electronApp.evaluate(async ({ BrowserWindow }, data) => {
      const wins = BrowserWindow.getAllWindows();
      if (wins && wins[0]) wins[0].webContents.send('system-settings-changed', data);
    }, { pythonPath: '/changed', venvPath: '', extraPath: '', envVars: [] });

    await expect(window.locator('input[value="/changed"]')).toBeVisible();
    await expectPageScreenshot(window);
  });
});
