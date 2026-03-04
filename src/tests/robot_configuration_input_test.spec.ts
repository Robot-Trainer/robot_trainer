import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard, expectPageScreenshot } from './helpers';

test.describe('Robot Configuration Wizard Input', () => {
  test('should allow entering a configuration name', async ({ window }) => {
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Scenes' }).click();
    await window.getByRole('button', { name: 'Add Scene' }).click();
    await expect(window.getByRole('heading', { name: 'Scene Setup' })).toBeVisible();
    await expectPageScreenshot(window);

    const nameInput = window.getByLabel('Scene Name');
    await expect(nameInput).toBeVisible();
    await expectPageScreenshot(window);

    const testName = 'Test Scene Configuration';
    await nameInput.fill(testName);
    await expect(nameInput).toHaveValue(testName);
  });

  test('should not crash when selecting an existing robot', async ({ window }) => {
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Scenes' }).click();
    await window.getByRole('button', { name: 'Add Scene' }).click();
    await expect(window.getByRole('heading', { name: 'Scene Setup' })).toBeVisible();
    await expectPageScreenshot(window);

    await window.getByLabel('Follower Robot').click();
    await window.getByRole('option', { name: 'Create New Simulated Robot' }).click();
    await expect(window.locator('h4:has-text("Edit Simulated Robot")')).toBeVisible();
    await expectPageScreenshot(window);
    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Save Changes' }).click({ force: true });

    await window.getByLabel('Follower Robot').click();
    await window.getByRole('option', { name: 'Create New Simulated Robot' }).click();
    await expect(window.locator('h4:has-text("Edit Simulated Robot")')).toBeVisible();
    await expectPageScreenshot(window);
    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Save Changes' }).click({ force: true });

    await window.getByLabel('Follower Robot').click();
    const options = window.getByRole('option', { name: /Simulated Robot/ });
    await options.first().click();

    await expect(window.getByRole('heading', { name: 'Scene Setup' })).toBeVisible();
    await expectPageScreenshot(window);
  });
});
