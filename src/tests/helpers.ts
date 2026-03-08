import { expect, Page } from '@playwright/test';

export async function expectPageScreenshot(window: Page) {
  await expect(window).toHaveScreenshot({
    caret: 'hide',
    maxDiffPixelRatio: 0.02,
    mask: [
      // window.getByText(/^Created:/),
      // window.getByText(/^Updated:/),
      // window.locator('[role="presentation"]'),
      // window.locator('[role="alert"]'),
    ],
  });
}

export async function dismissSetupWizard(window: Page) {
  if (window.isClosed()) return;

  await window
    .waitForFunction(() => (window as any).__appIdle === true, {}, { timeout: 8000 })
    .catch(() => { /* ignore idle timeout and continue best effort */ });

  const wizard = window.getByRole('heading', { name: 'Environment Setup', exact: true });
  const closeButton = window.getByRole('button', { name: /^Close$/ });
  const skipButton = window.getByRole('button', { name: /^Skip \/ Close$/ });

  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (window.isClosed()) return;

    const isVisible = await wizard.isVisible({ timeout: 150 }).catch(() => false);
    if (!isVisible) {
      if (attempt === 0) {
        await window.waitForTimeout(120).catch(() => { /* ignore */ });
        continue;
      }
      break;
    }

    if (await skipButton.isVisible({ timeout: 100 }).catch(() => false)) {
      await skipButton.click({ force: true }).catch(() => { /* ignore */ });
    }
    if (await closeButton.isVisible({ timeout: 100 }).catch(() => false)) {
      await closeButton.click({ force: true }).catch(() => { /* ignore */ });
    }

    await wizard.waitFor({ state: 'hidden', timeout: 1200 }).catch(() => { /* ignore */ });
    await window.waitForTimeout(120).catch(() => { /* ignore */ });
  }
}
