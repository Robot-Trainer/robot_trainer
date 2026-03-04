import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard, expectPageScreenshot } from './helpers';

test.describe('Robot Configuration Wizard', () => {
  test('should verify robot and teleoperator models are populated', async ({ window }) => {
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

    const followerModelLabel = window.getByLabel('Model');
    await expect(followerModelLabel).toBeVisible();
    await expectPageScreenshot(window);
    await followerModelLabel.click();
    const followerOptions = window.getByRole('option');
    await expect(followerOptions.first()).toBeVisible();
    await expectPageScreenshot(window);
    expect(await followerOptions.count()).toBeGreaterThan(1);
    await window.keyboard.press('Escape');

    await window.getByRole('button', { name: 'Save Changes' }).click();
    await window.getByLabel('Type').click();
    await window.getByRole('option', { name: 'Real Robot Teleoperation' }).click();

    const leaderModelSelect = window.getByLabel('Teleoperator Model');
    await expect(leaderModelSelect).toBeVisible();
    await expectPageScreenshot(window);

    await leaderModelSelect.click();
    const teleoperatorOptions = window.getByRole('option');
    await expect(teleoperatorOptions.first()).toBeVisible();
    await expectPageScreenshot(window);
    expect(await teleoperatorOptions.count()).toBeGreaterThan(1);
  });
});
