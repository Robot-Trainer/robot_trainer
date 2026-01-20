import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robot Configuration Wizard Input', () => {
  test('should allow entering a configuration name', async ({ window }) => {
    // 1. Dismiss Setup Wizard if present
    await dismissSetupWizard(window);

    // 2. Navigate to Robot Configurations
    // It might be default, but let's click to be sure.
    const navItem = window.locator('button:has-text("Robot Configurations")');
    await navItem.click();

    // 3. Click "Add Robot Configuration"
    await window.click('text=Add Robot Configuration');

    // 4. Verify Wizard appears
    await expect(window.locator('text=Robot Setup')).toBeVisible();

    // 5. Select "Create New Simulated Robot" from the dropdown
    // The dropdown trigger shows "Select or create follower..." initially
    await window.click('text=Select or create follower...');

    // Click the option
    await window.click('text=Create New Simulated Robot');

    // 6. Type a name in the configuration name field
    const nameInput = window.getByLabel('Configuration Name');
    await expect(nameInput).toBeVisible();

    const testName = 'Test Configuration';
    await nameInput.fill(testName);

    // 7. Verify the value is set
    await expect(nameInput).toHaveValue(testName);
  });
});
