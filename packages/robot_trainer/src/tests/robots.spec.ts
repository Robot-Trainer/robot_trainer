import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robots CRUD', () => {
  test('create, edit, delete robot', async ({ window }) => {
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Robots' }).click();
    await expect(window.getByRole('heading', { name: 'Robots' })).toBeVisible();
    await expect(window.getByRole('button', { name: /add robot/i })).toBeVisible();

    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Add Robot' }).click();
    await expect(window.getByLabel('Robot Name')).toBeVisible();

    await window.getByLabel('Robot Name').fill('Test Robot');
    await window.getByLabel('Modality').click();
    await window.getByRole('option', { name: 'Simulated' }).click();
    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Save Robot' }).click();
    await expect(window.getByLabel('Robot Name')).toHaveValue('Test Robot');
    await expect(window.getByText('Saved successfully')).toBeVisible();

    await window.getByRole('button', { name: 'Cancel' }).click();
    await window.locator('.MuiDataGrid-row', { hasText: 'Test Robot' }).first().click();

    const nameInput = window.getByLabel('Robot Name');
    await nameInput.fill('');
    await nameInput.fill('Test Robot v2');
    await expect(nameInput).toHaveValue('Test Robot v2');
    await dismissSetupWizard(window);
    await window.getByRole('button', { name: 'Save Robot' }).click();
    await window.getByRole('button', { name: 'Cancel' }).click();

    const updatedRow = window.locator('.MuiDataGrid-row', { hasText: 'Test Robot v2' }).first();
    await expect(updatedRow).toBeVisible({ timeout: 15000 });
    await expect(window.getByText('Saved successfully')).toBeVisible();

    await updatedRow.hover();
    await updatedRow.locator('button[aria-label="Delete"]').click();
    await window.getByRole('dialog').getByRole('button', { name: /^Delete$/ }).click();
    await expect(window.locator('.MuiDataGrid-row', { hasText: 'Test Robot v2' })).toHaveCount(0);
  });
});
