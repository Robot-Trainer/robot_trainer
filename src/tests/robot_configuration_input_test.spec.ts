import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robot Configuration Wizard Input', () => {
  test('should allow entering a configuration name', async ({ window }) => {
    // 1. Dismiss Setup Wizard if present
    await dismissSetupWizard(window);

    // 2. Navigate to Scenes
    const navItem = window.locator('button:has-text("Scenes")');
    await navItem.click();

    // 3. Click "Add Scene"
    await window.click('text=Add Scene');

    // 4. Verify Wizard appears
    await expect(window.locator('text=Scene Setup')).toBeVisible();

    // 6. Type a name in the scene name field
    const nameInput = window.getByLabel('Scene Name');
    await expect(nameInput).toBeVisible();

    const testName = 'Test Configuration';
    await nameInput.fill(testName);

    // 7. Verify the value is set
    await expect(nameInput).toHaveValue(testName);
  });

  test('should not crash when selecting an existing robot', async ({ window }) => {
    await dismissSetupWizard(window);

    // Navigate to Scenes
    const navItem = window.locator('button:has-text("Scenes")');
    await navItem.click();

    // Click "Add Scene"
    await window.click('text=Add Scene');

    // Create first simulated robot
    await window.getByLabel('Follower Robot').click();
    await window.getByRole('option', { name: 'Create New Simulated Robot' }).click();
    await window.waitForTimeout(500);
    await window.click('button:has-text("Save Changes")');

    // Select the first robot again (which has a numeric value)
    await window.getByLabel('Follower Robot').click();
    await window.keyboard.press('ArrowDown');
    await window.keyboard.press('ArrowDown');
    await window.keyboard.press('Enter');

    // Verify the app is still alive (no crash)
    await expect(window.locator('text=Scene Setup')).toBeVisible();
  });
});
