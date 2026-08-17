import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./screenshots",
  testMatch: "capture-all.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 720 },
    video: "off",
    trace: "off",
    screenshot: "off",
  },
});
