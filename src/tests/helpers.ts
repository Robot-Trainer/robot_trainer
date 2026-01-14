import { Page } from '@playwright/test';

export async function dismissSetupWizard(window: Page) {
  try {
    // Wait for app to be idle (initial checks complete)
    await window.waitForFunction(() => (window as any).__appIdle === true, {}, { timeout: 10000 }).catch(() => {});

    // Check if the wizard modal is visible
    const wizard = window.locator('text=Welcome!');
    if (await wizard.isVisible({ timeout: 2000 })) {
      // Click the Close button
      await window.click('button:has-text("Close")');
      // Wait for it to disappear
      await wizard.waitFor({ state: 'hidden' });
    }
  } catch (e) {
    // Ignore errors if wizard wasn't there or couldn't be closed
    console.log('Wizard dismissal attempt finished:', e);
  }
}
