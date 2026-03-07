import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: "src/tests",
  globalSetup: "./src/tests/global-setup.ts",
  workers: process.env.CI ? 1 : undefined, // Run tests sequentially in CI to avoid potential issues with shared state
  fullyParallel: true,
  testMatch: "src/tests/*.spec.ts",
  timeout: 30000,
  use: {
    video: "on",
  },
});
