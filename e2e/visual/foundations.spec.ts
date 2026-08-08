import { test, expect } from "@playwright/test";

/**
 * Visual baselines for the shared foundations workbench.
 * Requires the operator dashboard on E2E_BASE_URL (default http://127.0.0.1:3100).
 */
test.describe("shared foundations workbench", () => {
  test("operator theme snapshot", async ({ page }) => {
    await page.goto("/playground/foundations");
    await expect(page.getByRole("heading", { name: "Shared foundations" })).toBeVisible();
    await expect(page.locator("[data-theme]").first()).toHaveScreenshot(
      "foundations-operator.png",
      {
        fullPage: true,
      },
    );
  });
});
