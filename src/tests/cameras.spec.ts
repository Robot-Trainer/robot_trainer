import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Cameras CRUD', () => {
  test('create, edit, delete camera', async ({ window, setIpcHandlers }) => {
    const store: Record<string, any> = {};
    await setIpcHandlers({
      'get-config': async (key: string) => store[key] || [],
      'set-config': async (key: string, value: any) => { store[key] = value; return { ok: true }; }
    });

    await dismissSetupWizard(window);

    await window.click("text=Cameras");
    await window.waitForSelector('text=Cameras');

    await window.click('text=Add Camera');
    const inputs = await window.locator('input').all();
    await inputs[0].fill('CAM-1');
    await inputs[1].fill('Front Cam');
    await inputs[2].fill('1920x1080');
    await inputs[3].fill('30');
    await window.click('button:is(:text("Create"))');
    await window.waitForSelector('text=Front Cam');

    // edit
    await window.click('text=Edit');
    await window.locator('input').nth(1).fill('Front Camera v2');
    await window.click('text=Save');
    await window.waitForSelector('text=Front Camera v2');

    // delete
    await window.click('text=Delete');
    await expect(window.locator('text=Front Camera v2')).toHaveCount(0);
  });

  test('validation: numeric field should reject non-numbers', async ({ window }) => {
    await dismissSetupWizard(window);
    await window.click("text=Cameras");
    await window.waitForSelector('text=Cameras');

    await window.click('text=Add Camera');
    
    const inputs = await window.locator('input').all();
    // FPS is usually the last input based on schema order: id, serialNumber, name, resolution, fps, data
    // inferFields filters 'id'. So: serialNumber, name, resolution, fps.
    // Index 3 is FPS.
    await inputs[3].fill('abc');
    
    await window.click('button:is(:text("Create"))');
    
    await expect(window.locator('text=Must be a number')).toBeVisible();
    
    // Correct it
    await inputs[3].fill('60');
    // Ensure error goes away after save (implied by successful save closing form)
    await window.click('button:is(:text("Create"))');
    await expect(window.locator('text=Must be a number')).toHaveCount(0);
  });
});
