// Takes screenshots of the homepage canvas for visual review.
// Usage: node scripts/shoot-canvas.mjs [baseUrl] [outPrefix]

import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3105";
const PREFIX = process.argv[3] ?? "/tmp/canvas";

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${PREFIX}-kmeans.png` });

  await page.click("button[aria-pressed]");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${PREFIX}-dbscan.png` });

  await browser.close();
  console.log(`saved ${PREFIX}-kmeans.png and ${PREFIX}-dbscan.png`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
