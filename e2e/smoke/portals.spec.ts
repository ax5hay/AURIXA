import { test, expect } from "@playwright/test";

const clientBase = process.env.E2E_CLIENT_URL ?? process.env.E2E_PATIENT_URL ?? "http://127.0.0.1:3300";
const workspaceBase =
  process.env.E2E_WORKSPACE_URL ?? process.env.E2E_HOSPITAL_URL ?? "http://127.0.0.1:3400";
const operatorBase = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

test.describe("portal smoke", () => {
  test("client sign-in surface is reachable", async ({ page }) => {
    await page.goto(`${clientBase}/auth/signin`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("agent workspace sign-in surface is reachable", async ({ page }) => {
    await page.goto(`${workspaceBase}/auth/signin`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("operator dashboard responds", async ({ page }) => {
    const response = await page.goto(operatorBase);
    expect(response?.ok() || response?.status() === 307 || response?.status() === 200).toBeTruthy();
  });
});
