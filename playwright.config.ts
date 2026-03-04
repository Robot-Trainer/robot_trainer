import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Look for test files in the "tests" directory, relative to this configuration file.
  testDir: "src/tests",
  globalSetup: "./src/tests/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  testMatch: "src/tests/*.spec.ts",
  timeout: 60000,
  use: {
    video: "on",
  },
});
