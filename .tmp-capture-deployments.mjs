import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const outDir = "/Users/ghost/AURIXA/.tmp-ui-captures";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://127.0.0.1:3100/auth/signin?callbackUrl=/deployments", {
  waitUntil: "networkidle",
});
await page.screenshot({ path: `${outDir}/01-signin.png`, fullPage: true });

await page.getByRole("button", { name: "Use local development access" }).click();
await page.waitForURL("**/deployments**", { timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${outDir}/02-command-center.png`, fullPage: true });

await page.getByRole("button", { name: "New deployment" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/03-composer.png`, fullPage: true });

await browser.close();
console.log(`Saved screenshots to ${outDir}`);
