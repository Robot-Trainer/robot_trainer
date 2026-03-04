import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard, expectPageScreenshot } from './helpers';

test.describe('Robots CRUD', () => {
  test('create, edit, delete robot', async ({ window }) => {
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Robots' }).click();
    await expect(window.getByRole('heading', { name: 'Robots' })).toBeVisible();
    await expectPageScreenshot(window);

    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Add Robot' }).click();

    await window.getByLabel('Robot Model').click();
    await window.getByRole('option').nth(1).click();
    await window.keyboard.press('Escape');
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Save Robot' }).click();
    await expect(window.getByLabel('Robot Name')).toBeVisible();
    await expectPageScreenshot(window);
    await window.getByLabel('Robot Name').fill('Test Robot v2');
    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Save Robot' }).click();

    await window.getByRole('button', { name: 'Cancel' }).click();
    await expect(window.locator('.MuiDataGrid-row').first()).toBeVisible();
    await expectPageScreenshot(window);

    await window.locator('.MuiDataGrid-row button').first().click();
    await window.getByRole('button', { name: /^Delete$/ }).click();
    await window.waitForTimeout(300);
  });
});
