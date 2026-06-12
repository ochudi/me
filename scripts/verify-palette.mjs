// Drives the installed Chrome against a running build and checks the
// command palette done-criteria: open latency, navigation, nested search,
// easter eggs, history across reloads, and axe on the open palette.
// Usage: node scripts/verify-palette.mjs [baseUrl]

import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const BASE = process.argv[2] ?? "http://localhost:3105";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function openPalette(page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  });
  await page.waitForSelector('[aria-label="Command palette"][role="dialog"]', { state: "visible" });
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: "networkidle" });

  // Open latency, measured in-page from keydown dispatch to the next paint
  // with the dialog present.
  const latency = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const t0 = performance.now();
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          }),
        );
        requestAnimationFrame(() => {
          resolve({
            ms: performance.now() - t0,
            visible: Boolean(document.querySelector('[aria-label="Command palette"][role="dialog"]')),
          });
        });
      }),
  );
  check(
    "opens in under 100ms",
    latency.visible && latency.ms < 100,
    `${latency.ms.toFixed(1)}ms`,
  );

  // Axe on the open palette.
  await page.addScriptTag({ path: AXE_PATH });
  const axe = await page.evaluate(async () => {
    const r = await window.axe.run(document, {
      rules: { "color-contrast": { enabled: true } },
    });
    return r.violations.map((v) => `${v.id}: ${v.nodes.length}`);
  });
  check("axe reports no violations", axe.length === 0, axe.join("; "));

  // Escape closes, focus returns to body (nothing was focused before).
  await page.keyboard.press("Escape");
  await page.waitForSelector('[aria-label="Command palette"][role="dialog"]', { state: "detached" });
  check("escape closes", true);

  // Nested page: Writing, search inside it, Enter routes to the slug.
  await openPalette(page);
  await page.keyboard.type("writing");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await page.keyboard.type("dbscan");
  await page.waitForTimeout(150);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/writing/what-dbscan-sees", { timeout: 5000 });
  check("nested page search routes to slug", true, page.url());

  // Direct navigation items.
  await openPalette(page);
  await page.keyboard.type("about");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/about", { timeout: 5000 });
  check("navigate routes work", true, page.url());

  // History recall across reloads: previous selections were recorded.
  await page.goto(BASE, { waitUntil: "networkidle" });
  await openPalette(page);
  await page.keyboard.press("ArrowUp");
  const recalled = await page.$eval('input[aria-label="Command input"]', (el) => el.value);
  check("history recalls across reloads", recalled === "About", `got "${recalled}"`);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[aria-label="Command palette"][role="dialog"]', { state: "detached" });

  // Backspace on empty input pops the sub-page.
  await openPalette(page);
  await page.keyboard.type("work");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const onSubPage = await page
    .locator('input[aria-label="Command input"]')
    .getAttribute("placeholder");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(150);
  const backAtRoot = await page
    .locator('input[aria-label="Command input"]')
    .getAttribute("placeholder");
  check(
    "backspace pops sub-page",
    onSubPage === "Search work" && backAtRoot !== "Search work",
    `${onSubPage} then ${backAtRoot}`,
  );

  // whoami inline block.
  await page.keyboard.type("whoami");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const whoami = await page.textContent('[aria-label="Command palette"][role="dialog"]');
  check("whoami renders inline", whoami.includes("Chukwudi Ofoma"));
  await page.keyboard.press("Escape");
  await page.waitForSelector('[aria-label="Command palette"][role="dialog"]', { state: "detached" });

  // All four easter eggs.
  const eggs = [
    ["sudo make me a sandwich", "Okay."],
    ["vim", "Escape works here. :wq"],
    ["rust vs python", "Rust for the hot path, Python for everything else."],
    ["opus dei", "Wrong Opus. The one around here writes code."],
  ];
  for (const [input, expected] of eggs) {
    await openPalette(page);
    await page.fill('input[aria-label="Command input"]', input);
    await page.waitForTimeout(120);
    const body = await page.textContent('[aria-label="Command palette"][role="dialog"]');
    check(`egg fires: ${input}`, body.includes(expected));
    await page.keyboard.press("Escape");
    await page.waitForSelector('[aria-label="Command palette"][role="dialog"]', { state: "detached" });
  }

  // Outside click closes.
  await openPalette(page);
  await page.mouse.click(20, 20);
  await page.waitForSelector('[aria-label="Command palette"][role="dialog"]', { state: "detached" });
  check("outside click closes", true);

  // Hint pill present on desktop, hidden on mobile width.
  const hintVisible = await page.isVisible("text=Cmd K");
  await page.setViewportSize({ width: 390, height: 700 });
  await page.waitForTimeout(200);
  const hintHiddenMobile = !(await page.isVisible("text=Cmd K"));
  check("hint pill desktop only", hintVisible && hintHiddenMobile);

  check(
    "no page errors",
    errors.length === 0,
    errors.slice(0, 3).join("; "),
  );

  await page.setViewportSize({ width: 1280, height: 800 });
  await openPalette(page);
  await page.screenshot({ path: "/tmp/palette-open.png" });

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed`,
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
