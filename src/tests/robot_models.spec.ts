import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robot Models CRUD', () => {
  test('create, edit, delete robot model', async ({ window, setIpcHandlers }) => {
    const store: Record<string, any> = {};
    await setIpcHandlers({
      'get-config': async (key: string) => store[key] || [],
      'set-config': async (key: string, value: any) => { store[key] = value; return { ok: true }; }
    });

    await dismissSetupWizard(window);

    await window.getByRole('button', { name: 'Robot Models' }).click();
    await expect(window.getByRole('heading', { name: 'Robot Models' })).toBeVisible();

    await window.getByRole('button', { name: 'Add Robot Model' }).click();

    await window.getByRole('textbox', { name: 'Name *', exact: true }).fill('Model Alpha');
    await window.getByRole('textbox', { name: 'Dir Name *' }).fill('model_alpha');
    await window.getByRole('textbox', { name: 'Class Name *', exact: true }).fill('ModelAlphaClass');
    await window.getByRole('textbox', { name: 'Config Class Name *' }).fill('ModelAlphaConfig');
    await window.getByLabel('Properties').fill('{"family":"alpha"}');
    await window.getByLabel('Model XML').fill('<mujoco model="alpha"/>');
    await window.getByLabel('Model Path').fill('/tmp/model_alpha.xml');
    await window.getByLabel('Model Format').fill('xml');

    await window.getByRole('button', { name: 'Create' }).click();
    await expect(window.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 15000 });
    await expect(window.getByRole('textbox', { name: 'Name *', exact: true })).toHaveValue('Model Alpha');

    await window.getByRole('textbox', { name: 'Name *', exact: true }).fill('Model Alpha v2');
    await window.getByRole('button', { name: 'Save' }).click();
    await window.getByRole('button', { name: 'Cancel' }).click();

    const updatedRow = window.locator('.MuiDataGrid-row', { hasText: 'Model Alpha v2' }).first();
    await expect(updatedRow).toBeVisible();

    await updatedRow.hover();
    await updatedRow.locator('button[aria-label="Delete"]').click();
    const dialog = window.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^Delete$/i }).click();

    await expect(window.locator('text=Model Alpha v2')).toHaveCount(0);
  });
});
