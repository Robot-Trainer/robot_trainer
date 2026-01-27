import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robot Configuration Wizard', () => {
  test('should verify robot and teleoperator models are populated', async ({ window }) => {
    // 1. Dismiss Setup Wizard
    await dismissSetupWizard(window);

    // 2. Navigate to Robot Configurations
    const navItem = window.locator('button:has-text("Robot Configurations")');
    await navItem.waitFor();
    await navItem.click();

    // 3. Click Add
    // The button should say "Add Robot Configuration" based on ResourceManager title
    await window.click('text=Add Robot Configuration');

    // 4. Verify Wizard appears
    await expect(window.locator('text=Robot Setup')).toBeVisible(); 

    // 5. Select Simulation Type for Follower to see Robot Models
    await window.click('text=Select or create follower');
    await window.click('text=Create New Simulated Robot');

    // Verify Robot Editor appears and the Model dropdown is visible
    const followerEditor = window.locator('div').filter({ has: window.locator('h4', { hasText: 'Edit Simulated Robot' }) }).first();
    await expect(followerEditor).toBeVisible();

    const followerModelSelect = followerEditor.locator('label:has-text("Model") >> .. >> select');
    await expect(followerModelSelect).toBeVisible();

    // Verify content (seeded data)
    const followerOptions = await followerModelSelect.innerText();
    expect(followerOptions).toContain('SO100 Follower');
    expect(followerOptions).toContain('Reachy 2');

    // 6. Select Real Robot Teleoperation for Leader to see Teleoperator Models
    const leaderTypeSelect = window.locator('section:has-text("Leader Arm") >> label:has-text("Type") >> .. >> select');
    await leaderTypeSelect.selectOption({ label: 'Real Robot Teleoperation' });

    // Verify Teleoperator Model dropdown appears
    const leaderModelSelect = window.locator('section:has-text("Leader Arm") >> label:has-text("Teleoperator Model") >> .. >> select');
    await expect(leaderModelSelect).toBeVisible();

    // Verify content (seeded data)
    const leaderOptions = await leaderModelSelect.innerText();
    expect(leaderOptions).toContain('Phone');
    expect(leaderOptions).toContain('Omx Leader');
    expect(leaderOptions).not.toContain('mock_teleop');
  });
});
