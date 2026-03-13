import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard, expectPageScreenshot, waitForLoadingIndicator } from './helpers';

test.describe('Robot Configuration Wizard', () => {
  test('should verify robot and teleoperator models are populated', async ({ window }) => {
    // Guard against racing interactions while the environment check nav item is still shown.
    await waitForLoadingIndicator(window);
    await dismissSetupWizard(window);

    await window.getByRole("button", { name: "Scenes" }).click();
    await window.getByRole("button", { name: "Add Scene" }).click();
    await expect(
      window.getByRole("heading", { name: "Scene Setup" }),
    ).toBeVisible();
    await expectPageScreenshot(window);

    await window.getByLabel("Follower Robot").click();
    await window
      .getByRole("option", { name: "Create New Simulated Robot" })
      .click();
    await expect(
      window.locator('h4:has-text("Edit Simulated Robot")'),
    ).toBeVisible();
    await expectPageScreenshot(window);

    const followerModelLabel = window.getByLabel("Model");
    await expect(followerModelLabel).toBeVisible();
    await expectPageScreenshot(window);
    await followerModelLabel.click();
    const followerOptions = window.getByRole("option");
    await expect(followerOptions.first()).toBeVisible();
    await expectPageScreenshot(window);
    expect(await followerOptions.count()).toBeGreaterThan(1);
    await window.keyboard.press("Escape");

    await window.getByRole("button", { name: "Save Changes" }).click();
    await expect(window.locator('h4:has-text("Edit Simulated Robot")')).toBeHidden();
    await expect(window.getByLabel("Follower Robot")).toContainText('Simulated Robot');

    const leaderModelSelect = window.getByLabel("Teleoperator");
    await expect(leaderModelSelect).toBeVisible();
    await expect(leaderModelSelect).toContainText(/.+/);

    await leaderModelSelect.click();
    const teleoperatorOptions = window.getByRole("option");
    await expect(teleoperatorOptions.first()).toBeVisible();
    expect(await teleoperatorOptions.count()).toBeGreaterThan(1);
  });
});
