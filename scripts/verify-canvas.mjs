// Drives the installed Chrome against a running build and checks the
// clustering canvas done-criteria: ~60fps, retina-crisp backing store,
// live controls, reduced-motion static frame, mobile static variant.
// Usage: node scripts/verify-canvas.mjs [baseUrl]

import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3105";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function snapshot(page) {
  return page.evaluate(() => document.querySelector("canvas").toDataURL());
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  // Desktop, retina, animated path.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas");
    await page.waitForTimeout(600);

    const dims = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      return {
        w: c.width,
        h: c.height,
        cw: c.clientWidth,
        ch: c.clientHeight,
        dpr: devicePixelRatio,
      };
    });
    check(
      "retina backing store (width = cssW * dpr)",
      dims.w === Math.round(dims.cw * dims.dpr) &&
        dims.h === Math.round(dims.ch * dims.dpr),
      `${dims.w}x${dims.h} for ${dims.cw}x${dims.ch} css at dpr ${dims.dpr}`,
    );

    const perf = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let frames = 0;
          let delayed = 0;
          const t0 = performance.now();
          let last = t0;
          function loop(now) {
            frames++;
            if (now - last > 26) delayed++;
            last = now;
            if (now - t0 < 3000) requestAnimationFrame(loop);
            else resolve({ fps: frames / ((now - t0) / 1000), delayed });
          }
          requestAnimationFrame(loop);
        }),
    );
    check(
      "60fps at 500 points",
      perf.fps > 55 && perf.delayed <= 3,
      `${perf.fps.toFixed(1)}fps, ${perf.delayed} delayed frames in 3s`,
    );

    const before = await snapshot(page);
    await page.waitForTimeout(400);
    check("canvas animates", (await snapshot(page)) !== before);

    // k slider responds live.
    const preK = await snapshot(page);
    await page.focus('input[aria-label="Number of clusters"]');
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(700);
    check("k slider updates live", (await snapshot(page)) !== preK);

    // Toggle to DBSCAN, drag epsilon.
    await page.click('button[aria-pressed]');
    const epsInput = await page.waitForSelector(
      'input[aria-label="DBSCAN epsilon radius"]',
      { timeout: 2000 },
    );
    check("toggle switches to DBSCAN controls", Boolean(epsInput));
    await page.focus('input[aria-label="DBSCAN epsilon radius"]');
    for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(700);
    check("dbscan params apply without errors", errors.length === 0);

    // Info panel: open, escape closes, focus returns. The panel stays
    // mounted and toggles data-open, so assert state not detachment.
    const infoPanel = '[role="dialog"][aria-label="About this visualisation"]';
    await page.click('button[aria-label="About this visualisation"]');
    await page.waitForSelector(`${infoPanel}[data-open="true"]`);
    await page.keyboard.press("Escape");
    const dialogGone = await page
      .waitForSelector(`${infoPanel}[data-open="false"]`, {
        state: "attached", // the closed panel is intentionally invisible
        timeout: 3000,
      })
      .then(() => true)
      .catch(() => false);
    const focusBack = await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    );
    check("escape closes info panel", dialogGone);
    check(
      "focus returns to info button",
      focusBack === "About this visualisation",
    );

    check(
      "no page errors on desktop",
      errors.length === 0,
      errors.slice(0, 3).join("; "),
    );
    await ctx.close();
  }

  // Reduced motion: a single static frame.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas");
    await page.waitForTimeout(800);
    const a = await snapshot(page);
    await page.waitForTimeout(700);
    check("reduced motion renders a static frame", (await snapshot(page)) === a);
    await ctx.close();
  }

  // Mobile width: no canvas at all, the CSS dot field stands in. The
  // canvas chunk must not load, keeping phones light and the headline LCP.
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 700 },
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const mobile = await page.evaluate(() => ({
      canvas: Boolean(document.querySelector("canvas")),
      dotField: (() => {
        const el = document.querySelector(".dot-field");
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })(),
    }));
    check(
      "mobile mounts no canvas, dot field instead",
      !mobile.canvas && mobile.dotField,
      `canvas ${mobile.canvas}, field ${mobile.dotField}`,
    );
    await ctx.close();
  }

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
