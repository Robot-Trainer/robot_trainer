import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: "src/tests",
  globalSetup: "./src/tests/global-setup.ts",
  workers: process.env.CI ? 2 : undefined,
  fullyParallel: true,
  testMatch: "src/tests/*.spec.ts",
  timeout: 30000,
  use: {
    video: "on",
  },
});