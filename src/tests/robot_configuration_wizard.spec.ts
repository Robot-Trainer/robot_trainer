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
    // Open the dropdown
    await window.getByLabel('Follower Robot').click();
    // Select the option
    await window.getByRole('option', { name: 'Create New Simulated Robot' }).click();

    // Verify Robot Editor appears and the Model dropdown is visible
    const followerEditor = window.locator('div').filter({ has: window.locator('h4', { hasText: 'Edit Simulated Robot' }) }).first();
    await expect(followerEditor).toBeVisible();

    const followerModelLabel = followerEditor.getByLabel('Model');
    await expect(followerModelLabel).toBeVisible();

    // Verify content (seeded data)
    // Open the Model dropdown to see options
    await followerModelLabel.click();
    
    // Check options in the listbox
    const listbox = window.getByRole('listbox');
    await expect(listbox).toBeVisible();
    const followerOptions = await listbox.innerText();
    expect(followerOptions).toContain('SO100 Follower');
    expect(followerOptions).toContain('Reachy 2');
    
    // Close the dropdown (press Escape or click backdrop)
    await window.keyboard.press('Escape');

    // 6. Select Real Robot Teleoperation for Leader to see Teleoperator Models
    // The "Type" select inside Leader Arm section
    const leaderSection = window.locator('section', { hasText: 'Leader Arm' });
    const leaderTypeSelect = leaderSection.getByLabel('Type');
    
    await leaderTypeSelect.click();
    await window.getByRole('option', { name: 'Real Robot Teleoperation' }).click();

    // Verify Teleoperator Model dropdown appears
    const leaderModelSelect = leaderSection.getByLabel('Teleoperator Model');
    await expect(leaderModelSelect).toBeVisible();

    // Verify content (seeded data)
    await leaderModelSelect.click();
    const leaderListbox = window.getByRole('listbox');
    await expect(leaderListbox).toBeVisible();
    
    const leaderOptions = await leaderListbox.innerText();
    expect(leaderOptions).toContain('Phone');
    expect(leaderOptions).toContain('Omx Leader');
    expect(leaderOptions).not.toContain('mock_teleop');
  });
});
