import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robots CRUD', () => {
  test('create, edit, delete robot', async ({ window, setIpcHandlers }) => {
    // simple in-memory config store
    const store: Record<string, any> = {};
    await setIpcHandlers({
      'get-config': async (key: string) => {
        return store[key] || [];
      },
      'set-config': async (key: string, value: any) => {
        store[key] = value;
        return { ok: true };
      }
    });

    await dismissSetupWizard(window);

    // open Robots view from app nav
    await window.click('text=Robots');
    await window.waitForSelector('text=Robots');

    // Create a new robot
    await window.click('text=Add Robot');
    await window.waitForSelector('text=Python Plugins'); // Confirm wizard loaded
    // We can't really select ports in CI environment easily unless mocked, 
    // but we can assume confirming empty selection works or creates a robot with no devices.
    await window.click('text=Confirm Selection');

    // ensure the robot appears (might be unnamed)
    // The default name is usually empty string, displayed as "(unnamed)"
    await window.waitForSelector('text=(unnamed)');

    // edit the robot (editing uses the built-in form)
    await window.locator('text=(unnamed)').locator('..').locator('text=Edit').click();
    const nameInput = await window.locator('input').nth(1);
    await nameInput.fill('Test Robot v2');
    await window.click('text=Save');
    await window.waitForSelector('text=Test Robot v2');

    // delete
    await window.locator('text=Test Robot v2').locator('..').locator('text=Delete').click();
    // ensure gone
    await expect(window.locator('text=Test Robot v2')).toHaveCount(0);
  });
});
