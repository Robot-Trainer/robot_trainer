import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test('ResourceManager edit opens custom form populated with record data', async ({ window }) => {
  await dismissSetupWizard(window);

  // Navigate to Robot Configurations
  const navItem = window.locator('button:has-text("Robot Configurations")');
  await navItem.waitFor();
  await navItem.click();

  // Click Add
  await window.click('text=Add Robot Configuration');

  // Verify Wizard appears
  await expect(window.locator('text=Robot Setup')).toBeVisible();

  // Create a simulated follower so the wizard can save
  await window.click('text=Select or create follower...');
  await window.click('text=Create New Simulated Robot');

  // Fill configuration name
  const nameInput = window.getByLabel('Configuration Name');
  await expect(nameInput).toBeVisible();
  const testName = 'Edit Test Configuration';
  await nameInput.fill(testName);

  // Save the configuration
  await window.click('button:has-text("Save Configuration")');

  // Wait for the new item to appear in the list
  const item = window.locator(`div:has-text("${testName}")`).first();
  await expect(item).toBeVisible();

  // Click Edit on that record
  const editBtn = item.locator('button:has-text("Edit")');
  await editBtn.click();

  // Verify the custom form is shown and populated with the record's name
  await expect(window.locator('text=Robot Setup')).toBeVisible();
  await expect(window.getByLabel('Configuration Name')).toHaveValue(testName);
});
