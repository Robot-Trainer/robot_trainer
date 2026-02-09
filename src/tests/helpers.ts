import { Page } from '@playwright/test';

export async function dismissSetupWizard(window: Page) {
  // Wait for app to be idle. Catch timeout to proceed even if flag is flaky.
  await window.waitForFunction(() => (window as any).__appIdle === true, {}, { timeout: 15000 }).catch(() => { /* ignore */ });

  const wizard = window.locator('text=Welcome!');
  const closeButton = window.locator('button:has-text("Close")');

  // Retry loop to handle potential race conditions (e.g. React StrictMode double-mount)
  // or transient click failures.
  for (let attempt = 0; attempt < 3; attempt++) {
    // Check for visibility. First attempt waits longer for initial render.
    if (await wizard.isVisible({ timeout: attempt === 0 ? 5000 : 2000 })) {
      // Ensure button is ready and click
      await closeButton.waitFor();
      await closeButton.click();
      // Wait for hidden, ignore error to allow retry in loop
      await wizard.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { /* ignore */ });
    }

    // Short wait to ensure it doesn't reappear (race condition mitigation)
    await window.waitForTimeout(500);
    
    // If truly gone, we are done. Short timeout for this check.
    if (!await wizard.isVisible({ timeout: 500 })) {
      return;
    }
  }
}
