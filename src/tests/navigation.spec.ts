import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard, expectPageScreenshot } from './helpers';

test.describe('Navigation resets ResourceManager form', () => {
  test('opening form then navigating away clears showForm state', async ({ window, setIpcHandlers }) => {
    const store: Record<string, any> = {};
    await setIpcHandlers({
      'get-config': async (key: string) => store[key] || [],
      'set-config': async (key: string, value: any) => { store[key] = value; return { ok: true }; }
    });

    await dismissSetupWizard(window);

    // Open Robots view
    await window.getByRole('button', { name: 'Robots' }).click();
    await expect(window.getByRole('heading', { name: 'Robots' })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Add Robot' })).toBeVisible();

    await window.getByRole('button', { name: 'Cameras' }).click();
    await expect(window.getByRole('heading', { name: 'Cameras' })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Add Camera' })).toBeVisible();
    // Navigate to Monitoring
    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Datasets' }).click();
    await expect(window.getByRole('heading', { name: 'Datasets' })).toBeVisible();
    await expect(window.getByRole('button', { name: 'Add Dataset' })).toBeVisible();

    // Navigate back to Robots - the ResourceManager should show list (not form)
    await window.getByRole('button', { name: 'Robots' }).click();
    await expect(window.getByRole('heading', { name: 'Robots' })).toBeVisible();

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

    const loadingButton = window.getByRole('button', { name: 'Loading env...' });
    await expect(loadingButton).toBeVisible();

    // Should NOT see wizard (because config is present AND check passed)
    await expect(window.getByRole('heading', { name: "Environment Setup", exact: true })).toHaveCount(0);
    await expect(window.getByRole('button', { name: 'Scenes' })).toBeVisible();

    // 3. Test Failure Case
    await setIpcHandlers({
      'check-anaconda': async () => {
        return { found: false };
      },
      'check-lerobot': async () => ({ installed: false })
    });

    await window.reload();

    // Open the wizard from the loading indicator while checks are running.
    await expect(loadingButton).toBeVisible();
    await loadingButton.click();
    await expect(window.getByRole('heading', { name: "Environment Setup", exact: true })).toBeVisible();
    await expectPageScreenshot(window);
  });
});
