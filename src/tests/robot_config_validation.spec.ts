import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Scene Configuration Validation', () => {
  test('should validate scene configuration before saving', async ({ window }) => {
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Robots' }).click();
    await window.getByRole('button', { name: 'Add Robot' }).click();
    await window.getByLabel('Robot Name').fill('Validation Robot');
    await window.getByRole('button', { name: 'Save Robot' }).click();
    await window.getByRole('button', { name: 'Cancel' }).click();

    await window.getByRole('button', { name: 'Scenes' }).click();
    await window.getByRole('button', { name: 'Add Scene' }).click();
    await expect(window.getByRole('heading', { name: 'Scene Setup' })).toBeVisible();

    window.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Please enter a scene name');
      await dialog.dismiss();
    });
    await window.getByRole('button', { name: 'Save Scene' }).click();

    await window.getByLabel('Scene Name').fill('Test Scene Validated');

    window.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Please select a follower robot');
      await dialog.dismiss();
    });
    await window.getByRole('button', { name: 'Save Scene' }).click();

    await dismissSetupWizard(window);
    await window.getByLabel('Follower Robot').click();
    await window.getByRole('option', { name: 'Validation Robot' }).click();

    await window.getByRole('button', { name: 'Save Scene' }).click();
    await expect(window.getByLabel('Scene Name')).toHaveValue('Test Scene Validated');

    await window.getByRole('button', { name: 'Cancel' }).click();

    const sceneRow = window.locator('.MuiDataGrid-row', { hasText: 'Test Scene Validated' }).first();
    await expect(sceneRow).toBeVisible({ timeout: 15000 });
    await expect(sceneRow).toContainText('Validation Robot');

  });
});
