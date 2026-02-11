import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robot Configuration Validation', () => {
  test('should validate configuration before saving', async ({ window }) => {
    // 1. Dismiss Setup Wizard
    await dismissSetupWizard(window);

    // 2. Navigate to Robot Configurations
    const navItem = window.locator('button:has-text("Robot Configurations")');
    await navItem.waitFor();
    await navItem.click();

    // 3. Click Add
    await window.click('text=Add Robot Configuration');

    // 4. Test Missing Name
    window.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Please enter a configuration name');
      await dialog.dismiss();
    });
    await window.click('button:has-text("Save Configuration")');

    // 5. Fill Name
    await window.getByLabel('Configuration Name').fill('Test Config Validated');

    // 6. Test Missing Robot
    window.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Please select a follower robot');
      await dialog.dismiss();
    });
    await window.click('button:has-text("Save Configuration")');

    // 7. Success case (Create a robot)
    await window.getByLabel('Follower Robot').click();
    await window.getByRole('option', { name: 'Create New Simulated Robot' }).click();

    // Save the new robot details to exit editor
    await window.click('button:has-text("Save Changes")');
    await expect(window.locator('text=Edit Simulated Robot')).not.toBeVisible();

    // Now save configuration - should succeed (no dialog, or redirect)
    // We expect navigation away or success message.
    await window.click('button:has-text("Save Configuration")');

    // Expect form to close
    await expect(window.locator('h2:has-text("Robot Setup")')).not.toBeVisible();
  });
});
