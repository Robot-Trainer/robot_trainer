import { expect } from '@playwright/test';
import { test } from './fixtures';
import { expectPageScreenshot } from './helpers';

// Tests for setup wizard appearance on first app load under various system config states.
// These tests use screenshots for validation as requested.

test.describe('Setup Wizard - first load scenarios (screenshots)', () => {
  // Increase timeout for these UI screenshot tests which may take longer
  test.setTimeout(20000);
  test.beforeEach(async ({ window }) => {
    // Provide basic renderer reply handlers used in other tests
    await window.evaluate(() => {
      const win = window as any;
      if (win.electronAPI && win.electronAPI.onRequestSaveSystemSettings) {
        win.electronAPI.onRequestSaveSystemSettings((settings: any) => {
          win.electronAPI.replySaveSystemSettings({ success: true, settings });
        });
      }
    });
  });

  test('1 - all present: setup wizard does NOT show', async ({ window, setIpcHandlers }) => {
    await setIpcHandlers({
      'check-anaconda': async () => ({
        found: true,
        path: '/home/testuser/miniconda3',
        envs: [{ name: 'robot_trainer', pythonPath: '/home/testuser/miniconda3/envs/robot_trainer/bin/python' }],
        platform: 'linux'
      }),
      'check-lerobot': async () => ({ installed: true }),
    });

    await window.waitForLoadState('domcontentloaded');
    await expect(window.getByRole('heading', { name: 'Environment Setup', exact: true })).not.toBeVisible();
    await expectPageScreenshot(window);
  });

  test('2 - missing conda/python paths in DB: setup wizard shows', async ({ window, electronApp, setIpcHandlers }) => {
    await setIpcHandlers({
      'check-anaconda': async () => ({ found: false, path: null, envs: [], platform: 'linux' }),
      'check-lerobot': async () => ({ installed: false }),
    });

    await window.waitForLoadState('domcontentloaded');
    await electronApp.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const fileMenu = menu?.items.find((i: any) => i.label === 'File');
      const setupItem = fileMenu?.submenu?.items.find((si: any) => si.label === 'Setup Wizard');
      setupItem?.click();
    });

    await expect(window.getByRole('heading', { name: 'Environment Setup', exact: true })).toBeVisible({ timeout: 10000 });
    await expectPageScreenshot(window);
    await expect(window.getByRole('button', { name: 'Miniconda Installation' })).toBeVisible();
    await expectPageScreenshot(window);
    await expect(window.getByRole('button', { name: 'Start Setup' })).toBeVisible();
    await expectPageScreenshot(window);
  });

  test('3 - conda/python present but env missing: setup wizard shows', async ({ window, electronApp, setIpcHandlers }) => {
    await setIpcHandlers({
      'check-anaconda': async () => ({
        found: true,
        path: '/home/testuser/miniconda3',
        envs: [{ name: 'other_env', pythonPath: '/home/testuser/miniconda3/envs/other_env/bin/python' }],
        platform: 'linux'
      }),
      'check-lerobot': async () => ({ installed: false }),
    });

    await window.waitForLoadState('domcontentloaded');
    await electronApp.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const fileMenu = menu?.items.find((i: any) => i.label === 'File');
      const setupItem = fileMenu?.submenu?.items.find((si: any) => si.label === 'Setup Wizard');
      setupItem?.click();
    });

    await expect(window.getByRole('heading', { name: 'Environment Setup', exact: true })).toBeVisible({ timeout: 10000 });
    await expectPageScreenshot(window);
    await expect(window.getByRole('button', { name: 'Python Environment Setup' })).toBeVisible();
    await expectPageScreenshot(window);
  });

  test('4 - env present but lerobot missing: setup wizard shows', async ({ window, electronApp, setIpcHandlers }) => {
    await setIpcHandlers({
      'check-anaconda': async () => ({
        found: true,
        path: '/home/testuser/miniconda3',
        envs: [{ name: 'robot_trainer', pythonPath: '/home/testuser/miniconda3/envs/robot_trainer/bin/python' }],
        platform: 'linux'
      }),
      'check-lerobot': async () => ({ installed: false }),
    });

    await window.waitForLoadState('domcontentloaded');
    await electronApp.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const fileMenu = menu?.items.find((i: any) => i.label === 'File');
      const setupItem = fileMenu?.submenu?.items.find((si: any) => si.label === 'Setup Wizard');
      setupItem?.click();
    });

    await expect(window.getByRole('heading', { name: 'Environment Setup', exact: true })).toBeVisible({ timeout: 10000 });
    await expectPageScreenshot(window);
    await expect(window.getByRole('button', { name: 'LeRobot Library Installation' })).toBeVisible();
    await expectPageScreenshot(window);
  });
});

export { test };
