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

    // Click Add to open form
    await window.click('text=Add Robot');
    // SetupWizard (RobotDevicesWizard) should be visible
    await window.waitForSelector('text=Confirm Selection');

    // Navigate to Home
    await window.click('text=Home');
    await window.waitForSelector('text=Home');

    // Navigate back to Robots - the ResourceManager should show list (not form)
    await window.click('text=Robots');
    await window.waitForSelector('text=Robots');

    // Ensure Wizard is not present and Add Robot button visible
    await expect(window.locator('text=Confirm Selection')).toHaveCount(0);
    await expect(window.locator('text=Add Robot')).toHaveCount(1);
  });
});
