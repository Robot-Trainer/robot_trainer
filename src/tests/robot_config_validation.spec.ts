import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard, expectPageScreenshot } from './helpers';

test.describe('Robot Configuration Validation', () => {
  test('should validate configuration before saving', async ({ window }) => {
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Scenes' }).click();
    await window.getByRole('button', { name: 'Add Scene' }).click();
    await expect(window.getByRole('heading', { name: 'Scene Setup' })).toBeVisible();
    await expectPageScreenshot(window);

    window.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Please enter a scene name');
      await dialog.dismiss();
    });
    await window.getByRole('button', { name: 'Save Configuration' }).click();

    await window.getByLabel('Scene Name').fill('Test Scene Validated');

    window.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Please select a follower robot');
      await dialog.dismiss();
    });
    await window.getByRole('button', { name: 'Save Configuration' }).click();

    await dismissSetupWizard(window);
    await window.getByLabel('Follower Robot').click();
    await window.getByRole('option', { name: 'Create New Simulated Robot' }).click();
    await expect(window.locator('h4:has-text("Edit Simulated Robot")')).toBeVisible();
    await expectPageScreenshot(window);
    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Save Changes' }).click({ force: true });

    await window.getByRole('button', { name: 'Save Configuration' }).click();
    await expect(window.getByLabel('Scene Name')).toHaveValue('Test Scene Validated');
  });
});
