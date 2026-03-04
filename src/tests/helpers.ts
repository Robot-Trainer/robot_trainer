import { expect, Page } from '@playwright/test';

export async function expectPageScreenshot(window: Page) {
  await expect(window).toHaveScreenshot({
    caret: 'hide',
    maxDiffPixelRatio: 0.02,
    mask: [
      window.getByText(/^Created:/),
      window.getByText(/^Updated:/),
      window.locator('div.fixed.inset-0.z-50'),
      window.locator('[role="presentation"]'),
      window.locator('[role="alert"]'),
    ],
  });
}

export async function dismissSetupWizard(window: Page) {
  // Wait for app to be idle. Catch timeout to proceed even if flag is flaky.
  await window.waitForFunction(() => (window as any).__appIdle === true, {}, { timeout: 15000 }).catch(() => { /* ignore */ });

  const wizard = window.getByRole('heading', { name: 'Environment Setup', exact: true });
  const closeButton = window.locator('button', { hasText: /^Close$/ });
  const skipButton = window.locator('button', { hasText: /^Skip \/ Close$/ });

  // The main process may re-request settings shortly after startup, which can re-open the wizard.
  const until = Date.now() + 7000;
  while (Date.now() < until) {
    if (await wizard.isVisible({ timeout: 500 }).catch(() => false)) {
      if (await skipButton.isVisible().catch(() => false)) {
        await skipButton.click().catch(() => { /* ignore */ });
      }
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click().catch(() => { /* ignore */ });
      }
      await wizard.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => { /* ignore */ });
    }
    await window.waitForTimeout(350);
  }
}
