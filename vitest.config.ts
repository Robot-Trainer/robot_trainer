import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
        exclude: [
          "**/src/python/**",
          "**/src/tests/**",
          "**/node_modules/**",
        ],
        include: [
          "**/src/**/*.test.ts"
      ]
  },
});
