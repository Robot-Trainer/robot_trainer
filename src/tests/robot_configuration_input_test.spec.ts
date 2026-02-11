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

    // 6. Type a name in the configuration name field
    const nameInput = window.getByLabel('Configuration Name');
    await expect(nameInput).toBeVisible();

    const testName = 'Test Configuration';
    await nameInput.fill(testName);

    // 7. Verify the value is set
    await expect(nameInput).toHaveValue(testName);
  });

  test('should not crash when selecting an existing robot', async ({ window }) => {
    await dismissSetupWizard(window);

    // Navigate to Robot Configurations
    const navItem = window.locator('button:has-text("Robot Configurations")');
    await navItem.click();

    // Click "Add Robot Configuration"
    await window.click('text=Add Robot Configuration');

    // Create first simulated robot
    await window.getByLabel('Follower Robot').click();
    await window.getByRole('option', { name: 'Create New Simulated Robot' }).click();

    // The robot creation enters specific edit mode - we need to save/exit it to verify dropdown behavior
    await expect(window.locator('text=Edit Simulated Robot')).toBeVisible();
    await window.click('button:has-text("Save Changes")');

    // Create second simulated robot
    await window.getByLabel('Follower Robot').click();
    await window.getByRole('option', { name: 'Create New Simulated Robot' }).click();

    // Save/exit again
    await expect(window.locator('text=Edit Simulated Robot')).toBeVisible();
    await window.click('button:has-text("Save Changes")');

    // Select the first robot again (which has a numeric value)
    await window.getByLabel('Follower Robot').click();

    // Find all 'Simulated Robot' options and pick the first one
    const options = window.getByRole('option', { name: /Simulated Robot/ });
    await options.first().click();

    // Verify the app is still alive (no crash)
    await expect(window.locator('text=Robot Setup')).toBeVisible();
  });
});
