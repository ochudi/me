// Drives the installed Chrome against a running build and checks the work
// section done-criteria: index filters, all case studies render, next-case
// cycling, unique metadata, mobile layout.
// Usage: node scripts/verify-work.mjs [baseUrl]

import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3105";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const rowCount = (page) => page.locator("[data-work-row]").count();

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  // Index: header, filters, alternation.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/work`, { waitUntil: "networkidle" });

    // The eyebrow uppercases via CSS text-transform, so match on source
    // text case-insensitively.
    const header = await page.textContent("header");
    check(
      "page header renders",
      /ochudi \/ work/i.test(header) && header.includes("Selected work."),
    );

    check("All shows three rows", (await rowCount(page)) === 3);

    const covers = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-cover]")).map(
        (el) => el.getBoundingClientRect().left,
      ),
    );
    check(
      "rows alternate cover side",
      covers.length >= 2 && covers[0] !== covers[1],
      `lefts: ${covers.map(Math.round).join(", ")}`,
    );

    await page.click('button:has-text("Internal")');
    const internalRows = await rowCount(page);
    const internalTitle = await page.textContent("[data-work-row] h2");
    check(
      "Internal filter shows NeoScribe only",
      internalRows === 1 && internalTitle.trim() === "NeoScribe",
      `${internalRows} rows`,
    );

    await page.click('button:has-text("Research")');
    const emptyState = await page.textContent("main");
    check(
      "empty filter shows empty state",
      (await rowCount(page)) === 0 &&
        emptyState.includes("Nothing in this category yet."),
    );

    await page.click('button:has-text("Client work")');
    check("Client work shows two rows", (await rowCount(page)) === 2);

    await page.click('button:has-text("All")');
    check("back to All shows three", (await rowCount(page)) === 3);

    // Case studies render end to end with unique metadata.
    const seen = [];
    for (const slug of ["ipheclan", "whitesands", "neoscribe"]) {
      await page.goto(`${BASE}/work/${slug}`, { waitUntil: "networkidle" });
      const title = await page.title();
      const body = await page.textContent("main");
      seen.push(title);
      check(
        `case study renders: ${slug}`,
        body.includes("Case study /") &&
          body.includes("Placeholder context") &&
          body.includes("Next case"),
        title,
      );
    }
    check(
      "metadata unique per page",
      new Set(seen).size === 3 && seen.every((t) => t.includes("/ ochudi")),
      seen.join(" | "),
    );

    // Live link present only where frontmatter has one.
    await page.goto(`${BASE}/work/ipheclan`, { waitUntil: "networkidle" });
    const liveOnIpheclan = await page.$('dl a[href="https://ipheclan.com"]');
    await page.goto(`${BASE}/work/neoscribe`, { waitUntil: "networkidle" });
    const liveOnNeoscribe = await page.$$eval("dl a", (els) => els.length);
    check(
      "live link only when present in frontmatter",
      Boolean(liveOnIpheclan) && liveOnNeoscribe === 0,
    );

    // Next-case cycles ipheclan -> whitesands -> neoscribe -> ipheclan.
    const hops = [];
    let current = "ipheclan";
    for (let i = 0; i < 3; i++) {
      await page.goto(`${BASE}/work/${current}`, { waitUntil: "networkidle" });
      const href = await page.$eval('a[href^="/work/"]:has-text("Next case")', (a) =>
        a.getAttribute("href"),
      );
      current = href.split("/").pop();
      hops.push(current);
    }
    check(
      "next case cycles through the index",
      hops.join(">") === "whitesands>neoscribe>ipheclan",
      hops.join(" > "),
    );

    await page.goto(`${BASE}/work`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/work-index.png", fullPage: true });
    await page.goto(`${BASE}/work/ipheclan`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/work-case.png", fullPage: true });
    await ctx.close();
  }

  // Mobile: no horizontal scroll on index and case page.
  {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 720 },
    });
    const page = await ctx.newPage();
    for (const url of ["/work", "/work/ipheclan"]) {
      await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      const fits = await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      );
      check(`no horizontal scroll at 375px on ${url}`, fits);
    }
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
