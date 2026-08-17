import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { signInLocalDemo } from "../demo-videos/helpers";

const clientBase = process.env.E2E_CLIENT_URL ?? "http://127.0.0.1:3300";
const workspaceBase = process.env.E2E_WORKSPACE_URL ?? "http://127.0.0.1:3400";
const operatorBase = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

const outRoot = path.resolve(
  process.env.SCREENSHOT_OUT ?? path.join(__dirname, "../../docs/screenshots"),
);

type ScreenCapture = {
  file: string;
  path: string;
  heading?: string | RegExp;
  waitMs?: number;
};

async function captureScreen(page: Page, baseUrl: string, destDir: string, screen: ScreenCapture) {
  const url = `${baseUrl}${screen.path}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (screen.heading) {
    await expect(page.getByRole("heading", { name: screen.heading, level: 1 })).toBeVisible({
      timeout: 20000,
    });
  } else {
    await page.waitForTimeout(screen.waitMs ?? 1800);
  }
  fs.mkdirSync(destDir, { recursive: true });
  await page.screenshot({
    path: path.join(destDir, screen.file),
    fullPage: true,
  });
}

const clientScreens: ScreenCapture[] = [
  { file: "01-auth-signin.png", path: "/auth/signin", heading: "Your property journey" },
  { file: "02-home.png", path: "/", waitMs: 2200 },
  { file: "03-showings.png", path: "/showings", waitMs: 2000 },
  { file: "04-showing-detail.png", path: "/showings/1", waitMs: 2000 },
  { file: "05-listings.png", path: "/listings", waitMs: 2000 },
  { file: "06-listings-compare.png", path: "/listings/compare?ids=1,2", waitMs: 2000 },
  { file: "07-messages-chat.png", path: "/chat", heading: "Messages" },
  { file: "08-voice.png", path: "/voice", waitMs: 2000 },
  { file: "09-documents.png", path: "/documents", waitMs: 2000 },
  { file: "10-applications.png", path: "/applications", waitMs: 2000 },
  { file: "11-financing.png", path: "/financing", waitMs: 2000 },
  { file: "12-maintenance.png", path: "/maintenance", waitMs: 2000 },
  { file: "13-notifications.png", path: "/notifications", waitMs: 2000 },
  { file: "14-help.png", path: "/help", waitMs: 2000 },
  { file: "15-account.png", path: "/account", waitMs: 2000 },
  { file: "16-account-privacy.png", path: "/account/privacy", waitMs: 2000 },
  { file: "17-account-accessibility.png", path: "/account/accessibility", waitMs: 2000 },
  { file: "18-records.png", path: "/records", waitMs: 2000 },
  { file: "19-results.png", path: "/results", waitMs: 2000 },
  { file: "20-billing.png", path: "/billing", waitMs: 2000 },
];

const agentScreens: ScreenCapture[] = [
  { file: "01-auth-signin.png", path: "/auth/signin", heading: "Authorized staff only" },
  { file: "02-today.png", path: "/", waitMs: 2200 },
  { file: "03-clients.png", path: "/clients", waitMs: 2000 },
  { file: "04-client-detail.png", path: "/clients/1", waitMs: 2500 },
  { file: "05-showings.png", path: "/showings", waitMs: 2000 },
  { file: "06-leads.png", path: "/leads", waitMs: 2000 },
  { file: "07-schedule.png", path: "/schedule?clientId=1", waitMs: 2000 },
  { file: "08-assistant-chat.png", path: "/chat?clientId=1", waitMs: 2000 },
  { file: "09-knowledge.png", path: "/knowledge", waitMs: 2000 },
  { file: "10-status.png", path: "/status", waitMs: 2000 },
];

const operatorScreens: ScreenCapture[] = [
  { file: "01-overview.png", path: "/", waitMs: 2500 },
  { file: "02-dashboard.png", path: "/dashboard", waitMs: 2000 },
  { file: "03-analytics.png", path: "/analytics", waitMs: 2500 },
  { file: "04-organizations.png", path: "/tenants", heading: "Organizations" },
  { file: "05-knowledge.png", path: "/knowledge", waitMs: 2000 },
  { file: "06-playground.png", path: "/playground", heading: "Playground" },
  { file: "07-playground-foundations.png", path: "/playground/foundations", heading: "Shared foundations" },
  { file: "08-services.png", path: "/services", waitMs: 2000 },
  { file: "09-audit.png", path: "/audit", waitMs: 2000 },
  { file: "10-configuration.png", path: "/configuration", waitMs: 2000 },
  { file: "11-settings.png", path: "/settings", waitMs: 2000 },
  { file: "12-guide.png", path: "/guide", waitMs: 2000 },
  { file: "13-deployments.png", path: "/deployments", waitMs: 1500 },
];

test.describe.configure({ mode: "serial" });

test("capture client portal screens", async ({ page }) => {
  test.setTimeout(180_000);
  const dir = path.join(outRoot, "client-portal");
  await captureScreen(page, clientBase, dir, clientScreens[0]);
  await signInLocalDemo(page, clientBase);
  for (const screen of clientScreens.slice(1)) {
    await captureScreen(page, clientBase, dir, screen);
  }
});

test("capture agent workspace screens", async ({ page }) => {
  test.setTimeout(180_000);
  const dir = path.join(outRoot, "agent-workspace");
  await captureScreen(page, workspaceBase, dir, agentScreens[0]);
  await signInLocalDemo(page, workspaceBase);
  for (const screen of agentScreens.slice(1)) {
    await captureScreen(page, workspaceBase, dir, screen);
  }
});

test("capture operator dashboard screens", async ({ page }) => {
  test.setTimeout(240_000);
  const dir = path.join(outRoot, "operator-dashboard");
  for (const screen of operatorScreens) {
    await captureScreen(page, operatorBase, dir, screen);
  }
  // Sign-in uses async server props; capture separately with a generous load wait.
  await page.goto(`${operatorBase}/auth/signin`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(dir, "14-auth-signin.png"),
    fullPage: true,
  });
});
