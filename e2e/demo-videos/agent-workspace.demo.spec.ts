import { test, expect } from "@playwright/test";
import { hold, showTitleBanner, signInLocalDemo } from "./helpers";

const workspaceBase = process.env.E2E_WORKSPACE_URL ?? "http://127.0.0.1:3400";

test("agent workspace demo video", async ({ page }) => {
  test.setTimeout(90_000);

  await signInLocalDemo(page, workspaceBase);
  await showTitleBanner(
    page,
    "Agent Workspace",
    "Today’s queue, client briefs, showings, and leads for your team",
  );

  await page.goto(`${workspaceBase}/`);
  await hold(page, 2200);

  await page.goto(`${workspaceBase}/clients/1`);
  await expect(page.getByText("60-second client brief")).toBeVisible({ timeout: 15000 });
  await hold(page, 3000);

  await page.goto(`${workspaceBase}/showings`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await hold(page, 2200);

  await page.goto(`${workspaceBase}/leads`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await hold(page, 2200);

  await page.goto(`${workspaceBase}/`);
  await hold(page, 1800);
});
