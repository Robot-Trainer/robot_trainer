import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robot Configuration Validation', () => {
  test('should validate configuration before saving', async ({ window }) => {
    // 1. Dismiss Setup Wizard
    await dismissSetupWizard(window);

    // 2. Navigate to Robot Configurations
    const navItem = window.locator('button:has-text("Robot Configurations")');
    await navItem.waitFor();
    await navItem.click();

    // 3. Click Add
    await window.click('text=Add Robot Configuration');

    // 4. Fill form - Select a robot that requires a port (Real + SO100)
    await window.fill('input[placeholder="My Robot Configuration"]', 'Test Config Invalid');

    // Select "Select or create follower"
    await window.click('text=Select or create follower');
    // Select "Create New Real Robot"
    await window.click('text=Create New Real Robot');

    // Select Model: SO100 Follower
    const followerEditor = window.locator('div').filter({ has: window.locator('h4', { hasText: 'Edit Real Robot' }) }).first();
    await expect(followerEditor).toBeVisible();

    const followerModelSelect = followerEditor.locator('label:has-text("Model") >> .. >> select');
    await followerModelSelect.selectOption({ label: 'SO100 Follower' });
    
    // Serial Port: Leave empty (Select a serial port)
    
    // Save and expect Validation Failure
    const dialogPromise = window.waitForEvent('dialog');
    await window.click('button:has-text("Save Configuration")');
    const dialog = await dialogPromise;
    console.log(`Dialog says: ${dialog.message()}`);
    expect(dialog.message()).toContain('Validation Failed');
    await dialog.accept();
  });
});
