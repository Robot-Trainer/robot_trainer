import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robots CRUD', () => {
  test('create, edit, delete robot', async ({ window, setIpcHandlers }) => {
    // simple in-memory config store
    const store: Record<string, any> = {};
    await setIpcHandlers({
      'get-config': async (key: string) => {
        return store[key] || [];
      },
      'set-config': async (key: string, value: any) => {
        store[key] = value;
        return { ok: true };
      }
    });

    await dismissSetupWizard(window);

    // open Robots view from app nav
    await window.click('text=Robots');
    await window.waitForSelector('text=Robots');

    // Create a new robot
    await window.click('text=Add Robot');

    await window.getByLabel('Robot Name').fill('Test Robot');

    // Select a robot model (index 1 to skip the placeholder)
    // MUI Select uses a hidden input but opens with a button/combobox role
    await window.getByLabel('Robot Model').click();
    await window.getByRole('option').nth(1).click();

    // We can't really select ports in CI environment easily unless mocked, 
    // but we can assume saving with no device works.
    await window.click('text=Save Robot');
    await window.getByRole('button', { name: 'Cancel' }).click();

    await window.waitForSelector('text=Test Robot');

    await window.click('text=Test Robot');

    // Fill Robot Name
    await window.getByLabel('Robot Name').fill('Test Robot v2');

    await window.click('text=Save Robot');
    await window.getByRole('button', { name: 'Cancel' }).click();
    await window.waitForSelector('text=Test Robot v2');

    const row = window.locator('.MuiDataGrid-row', { hasText: 'Test Robot v2' }).first();
    await row.locator('button').first().click();
    await window.getByRole('button', { name: /^Delete$/ }).click();

    // ensure gone
    await expect(window.locator('.MuiDataGrid-row', { hasText: 'Test Robot v2' })).toHaveCount(0);
  });
});
