import type { Page } from "@playwright/test";

/** Brief pause so viewers can read the screen in recorded demos. */
export async function hold(page: Page, ms = 1800): Promise<void> {
  await page.waitForTimeout(ms);
}

/** Short title banner at the start of each recording. */
export async function showTitleBanner(page: Page, title: string, subtitle?: string): Promise<void> {
  await page.evaluate(
    ({ titleText, subtitleText }) => {
      const banner = document.createElement("div");
      banner.setAttribute("data-demo-banner", "true");
      banner.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:99999",
        "display:flex",
        "flex-direction:column",
        "align-items:center",
        "justify-content:center",
        "background:rgba(15,23,42,0.92)",
        "color:#f8fafc",
        "font-family:system-ui,-apple-system,sans-serif",
        "text-align:center",
        "padding:24px",
      ].join(";");
      banner.innerHTML = `
        <p style="margin:0 0 8px;font-size:14px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.8">AURIXA</p>
        <h1 style="margin:0 0 12px;font-size:clamp(28px,4vw,42px);font-weight:600">${titleText}</h1>
        ${subtitleText ? `<p style="margin:0;font-size:18px;opacity:0.85;max-width:640px;line-height:1.5">${subtitleText}</p>` : ""}
      `;
      document.body.appendChild(banner);
      window.setTimeout(() => banner.remove(), 2800);
    },
    { titleText: title, subtitleText: subtitle ?? "" },
  );
  await hold(page, 3000);
}

export async function signInLocalDemo(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/auth/signin`);
  await page.getByRole("button", { name: "Open enabled local demo" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/signin"), { timeout: 15000 });
}
