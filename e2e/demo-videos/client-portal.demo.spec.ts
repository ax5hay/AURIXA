import { test, expect } from "@playwright/test";
import { hold, showTitleBanner, signInLocalDemo } from "./helpers";

const clientBase = process.env.E2E_CLIENT_URL ?? "http://127.0.0.1:3300";

test("client portal demo video", async ({ page }) => {
  test.setTimeout(90_000);

  await signInLocalDemo(page, clientBase);
  await showTitleBanner(
    page,
    "Client Portal",
    "Self-service showings, listings, and AI messages for buyers and renters",
  );

  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await hold(page, 2200);

  await page.goto(`${clientBase}/showings`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await hold(page, 2200);

  await page.goto(`${clientBase}/listings`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await hold(page, 2200);

  await page.goto(`${clientBase}/chat`);
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  await page.getByRole("button", { name: "When is my next showing?" }).click();
  await page.getByRole("button", { name: "Send" }).click();
  await hold(page, 8000);

  await page.goto(`${clientBase}/`);
  await hold(page, 1800);
});
