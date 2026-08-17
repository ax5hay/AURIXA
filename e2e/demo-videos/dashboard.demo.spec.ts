import { test, expect } from "@playwright/test";
import { hold, showTitleBanner } from "./helpers";

const operatorBase = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

test("operator dashboard demo video", async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto(`${operatorBase}/playground`);
  await showTitleBanner(
    page,
    "Operator Dashboard",
    "Health checks, analytics, and multi-tenant control for platform teams",
  );

  await expect(page.getByRole("heading", { name: "Playground" })).toBeVisible();
  await hold(page, 1800);

  await page.getByRole("button", { name: "Run service suite" }).click();
  await hold(page, 6000);

  await page.goto(`${operatorBase}/analytics`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await hold(page, 2500);

  await page.goto(`${operatorBase}/tenants`);
  await expect(page.getByRole("heading", { name: "Organizations" })).toBeVisible();
  await hold(page, 2500);

  await page.goto(operatorBase);
  await hold(page, 1800);
});
