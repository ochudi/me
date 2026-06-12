// Drives the installed Chrome against a running build and checks the
// homepage done-criteria: section order and rhythm, LCP element, mobile
// stacking without horizontal scroll, reveal behavior, reduced motion.
// Usage: node scripts/verify-home.mjs [baseUrl]

import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3105";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  // Desktop pass.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Section order and dark/light rhythm.
    const order = await page.evaluate(() => {
      const texts = [
        "Right now",
        "What I'm building.",
        "What I'm thinking about.",
        "Currently teaching",
        "Other things to know.",
        "Built by Greyform",
      ];
      const body = document.body.innerText;
      const positions = texts.map((t) => body.indexOf(t));
      return {
        positions,
        ordered: positions.every(
          (p, i) => p >= 0 && (i === 0 || p > positions[i - 1]),
        ),
      };
    });
    check("sections appear in spec order", order.ordered, order.positions.join(","));

    // LCP element is headline text, not the canvas.
    const lcp = await page.evaluate(
      () =>
        new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            resolve({
              tag: last?.element?.tagName ?? "none",
              text: (last?.element?.textContent ?? "").slice(0, 60),
            });
          }).observe({ type: "largest-contentful-paint", buffered: true });
          setTimeout(() => resolve({ tag: "timeout", text: "" }), 3000);
        }),
    );
    check(
      "LCP is headline text, not canvas",
      lcp.tag !== "CANVAS" && /Chudi|Ofoma|Plural/.test(lcp.text),
      `${lcp.tag}: "${lcp.text.trim()}"`,
    );

    // Lenis active (data attribute set by SmoothScroll).
    const lenisOn = await page.evaluate(
      () => document.documentElement.dataset.lenis === "on",
    );
    check("lenis active on homepage", lenisOn);

    // Reveals: below-fold content starts hidden, reveals on scroll, stays.
    const before = await page.$eval(
      '[data-reveal]',
      () => {
        const els = Array.from(document.querySelectorAll("[data-reveal]"));
        const belowFold = els.filter(
          (el) => el.getBoundingClientRect().top > window.innerHeight,
        );
        return belowFold.length
          ? getComputedStyle(belowFold[0]).opacity
          : "none";
      },
    );
    check("below-fold reveals start hidden", before === "0", `opacity ${before}`);

    // Wheel events rather than scrollTo: lenis virtualises wheel input and
    // would animate back to its own target if the position were set directly.
    for (let i = 0; i < 14; i++) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(900);
    const allShown = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-reveal]")).every(
        (el) => el.dataset.reveal === "shown" && getComputedStyle(el).opacity === "1",
      ),
    );
    check("reveals fire once and persist", allShown);

    check("no page errors (desktop)", errors.length === 0, errors.slice(0, 2).join("; "));
    await page.screenshot({ path: "/tmp/home-desktop.png", fullPage: true });
    await ctx.close();
  }

  // Mobile pass: 375px, stacked, no horizontal scroll.
  {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 720 },
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const layout = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      fieldBelowText: (() => {
        const h1 = document.querySelector("h1");
        const field = document.querySelector(".dot-field");
        if (!h1 || !field) return false;
        return (
          field.getBoundingClientRect().top >
          h1.getBoundingClientRect().bottom
        );
      })(),
    }));
    check(
      "no horizontal scroll at 375px",
      layout.scrollW <= layout.clientW + 1,
      `scrollWidth ${layout.scrollW} vs ${layout.clientW}`,
    );
    check("mobile stacks dot field below text", layout.fieldBelowText);

    // Scroll the whole page so every reveal fires, then capture. Without
    // this a full-page screenshot shows pending reveals as blank space.
    for (let i = 0; i < 18; i++) {
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(900);
    const mobileRevealed = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-reveal]")).every(
        (el) => el.dataset.reveal === "shown",
      ),
    );
    check("mobile reveals fire while scrolling", mobileRevealed);
    await page.screenshot({ path: "/tmp/home-mobile.png", fullPage: true });
    await ctx.close();
  }

  // No JavaScript: everything stays visible because the hidden state is
  // gated on the html.js class that only an executed script can add.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      javaScriptEnabled: false,
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "load" });
    const noJs = await page.evaluate(() => ({
      jsClass: document.documentElement.classList.contains("js"),
      allVisible: Array.from(document.querySelectorAll("[data-reveal]")).every(
        (el) => getComputedStyle(el).opacity === "1",
      ),
      hasFooter: document.body.innerText.includes("Built by Greyform"),
    }));
    check(
      "no-JS renders all content visible",
      !noJs.jsClass && noJs.allVisible && noJs.hasFooter,
    );
    await ctx.close();
  }

  // Reduced motion: content visible without scrolling, lenis skipped.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => ({
      lenis: document.documentElement.dataset.lenis ?? "off",
      allVisible: Array.from(document.querySelectorAll("[data-reveal]")).every(
        (el) => getComputedStyle(el).opacity === "1",
      ),
    }));
    check("reduced motion skips lenis", state.lenis !== "on");
    check("reduced motion shows all content without scroll", state.allVisible);
    await ctx.close();
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
