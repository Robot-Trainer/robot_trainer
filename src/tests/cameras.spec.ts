import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard, expectPageScreenshot } from './helpers';

test.describe('Cameras CRUD', () => {
  test('create, edit, delete camera', async ({ window }) => {
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Cameras' }).click();
    await expect(window.getByRole('heading', { name: 'Cameras' })).toBeVisible();
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Add Camera' }).click();

    await window.getByLabel('Serial Number').fill('CAM-1');
    await window.getByLabel('Name').fill('Front Cam');
    await window.getByLabel('Resolution').fill('1920x1080');
    await window.getByLabel('Fps').fill('30');
    await window.getByLabel('Data').fill('{}');

    await window.getByRole('button', { name: 'Create' }).click();
    await expect(window.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 15000 });
    await expectPageScreenshot(window);
    await expect(window.getByLabel('Name')).toHaveValue('Front Cam');
    await window.getByLabel('Name').fill('Front Camera v2');
    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Save' }).click();
    await expect(window.getByLabel('Name')).toHaveValue('Front Camera v2');

    await window.getByRole('button', { name: 'Cancel' }).click();
    const updatedRow = window.locator('.MuiDataGrid-row', { hasText: 'Front Camera v2' }).first();
    await expect(updatedRow).toBeVisible();
    await expectPageScreenshot(window);

    await updatedRow.locator('button[aria-label="Delete"]').click();
    await window.getByRole('dialog').getByRole('button', { name: /^Delete$/ }).click();
    await expect(window.locator('.MuiDataGrid-row', { hasText: 'Front Camera v2' })).toHaveCount(0);
  });

  test('validation: numeric field should reject non-numbers', async ({ window }) => {
    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Cameras' }).click({ force: true });
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Add Camera' }).click({ force: true });

    await window.getByLabel('Serial Number').fill('CAM-VAL-1');
    await window.getByLabel('Name').fill('Validation Cam');
    await window.getByLabel('Data').fill('{}');

    const fpsInput = window.getByLabel('Fps');
    await fpsInput.fill('abc').catch(() => { /* input[type=number] rejects non-number strings */ });
    await expect(fpsInput).toHaveValue('0');

    await window.getByLabel('Fps').fill('60');
    await window.getByRole('button', { name: 'Create' }).click();
    await expect(window.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 15000 });
  });
});
