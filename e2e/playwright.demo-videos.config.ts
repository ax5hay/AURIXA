import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./demo-videos",
  testMatch: "*.demo.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: "list",
  outputDir: "./test-results/demo-videos",
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 720 },
    video: { mode: "on", size: { width: 1280, height: 720 } },
    launchOptions: {
      slowMo: 180,
    },
    trace: "off",
    screenshot: "off",
  },
});
