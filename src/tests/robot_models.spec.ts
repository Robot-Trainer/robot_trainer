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

    await window.click('text=Robot Models');
    await window.waitForSelector('text=Robot Models');

    await window.click('text=Add Robot Model');

    await window.getByLabel('Name').fill('Model Alpha');
    await window.getByLabel('Dir Name').fill('model_alpha');
    await window.getByLabel('Class Name').fill('ModelAlphaClass');
    await window.getByLabel('Config Class Name').fill('ModelAlphaConfig');
    await window.getByLabel('Properties').fill('{"family":"alpha"}');
    await window.getByLabel('Model XML').fill('<mujoco model="alpha"/>');
    await window.getByLabel('Model Path').fill('/tmp/model_alpha.xml');
    await window.getByLabel('Model Format').fill('xml');

    await window.click('button:has-text("Create")');
    await window.waitForSelector('text=Model Alpha');

    await window.click('text=Model Alpha');
    await window.getByLabel('Name').fill('Model Alpha v2');
    await window.click('button:has-text("Save")');
    await window.waitForSelector('text=Model Alpha v2');

    await window.getByTestId('DeleteIcon').first().click();
    const dialog = window.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^Delete$/i }).click();

    await expect(window.locator('text=Model Alpha v2')).toHaveCount(0);
  });
});
