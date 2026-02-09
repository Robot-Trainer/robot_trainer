import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Navigation resets ResourceManager form', () => {
  test('opening form then navigating away clears showForm state', async ({ window, setIpcHandlers }) => {
    const store: Record<string, any> = {};
    await setIpcHandlers({
      'get-config': async (key: string) => store[key] || [],
      'set-config': async (key: string, value: any) => { store[key] = value; return { ok: true }; }
    });

    await dismissSetupWizard(window);

    // Open Robots view
    await window.click('text=Robots');
    await window.waitForSelector('text=Robots');

    await window.click('text=Cameras');
    await window.waitForSelector('text=Cameras');
    // Navigate to Monitoring
    await window.click('text=Monitoring');
    await window.waitForSelector('text=Monitoring');

    // Navigate back to Robots - the ResourceManager should show list (not form)
    await window.click('text=Robots');
    await window.waitForSelector('text=Robots');

    // Ensure Wizard is not present and Add Robot button visible
    await expect(window.locator('text=Confirm Selection')).toHaveCount(0);
    await expect(window.locator('text=Add Robot')).toHaveCount(1);
  });
});

test.describe('Environment Check Navigation', () => {
  test('shows loading indicator and handles check results', async ({ window, electronApp, setIpcHandlers }) => {
    // 1. Seed configuration so "missing config" doesn't trigger wizard
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.webContents.send('request-save-system-settings', {
        condaRoot: '/mock/conda',
        pythonPath: '/mock/python'
      });
    });
    // Give it a moment to persist
    await window.waitForTimeout(500);

    // 2. Test "Loading env..." and Success Case
    await setIpcHandlers({
      'check-anaconda': async () => {
        await new Promise(r => setTimeout(r, 1500));
        return { found: true, envs: [{ name: 'robot_trainer', pythonPath: '/mock/python' }] };
      },
      'check-lerobot': async () => ({ installed: true })
    });

    await window.reload();

    // Should see loading
    await expect(window.locator('text=Loading env...')).toBeVisible();

    // Wait for finish
    await expect(window.locator('text=Loading env...')).not.toBeVisible({ timeout: 10000 });

    // Should NOT see wizard (because config is present AND check passed)
    await expect(window.locator('text=Welcome!')).not.toBeVisible();

    // 3. Test Failure Case
    await setIpcHandlers({
      'check-anaconda': async () => {
        return { found: false };
      },
      'check-lerobot': async () => ({ installed: false })
    });

    await window.reload();

    // Wizard should appear
    await expect(window.locator('text=Welcome!')).toBeVisible();

    // "Loading env..." should be gone
    await expect(window.locator('text=Loading env...')).not.toBeVisible();
  });
});

