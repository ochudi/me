// Drives the installed Chrome against a running build and checks the /now
// and /about done-criteria: frontmatter-driven blocks, the activity strip,
// the about voice sections, visual continuity basics.
// Usage: node scripts/verify-pages.mjs [baseUrl]

import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3105";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // /now
  await page.goto(`${BASE}/now`, { waitUntil: "networkidle" });
  const now = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      credit: text.includes("Derek Sivers"),
      dashboard: /RIGHT NOW/i.test(text) && /RECENT COMMITS/i.test(text),
      cells: document.querySelectorAll("[data-day]").length,
      totalLine: /\d+ COMMITS IN 30 DAYS/i.test(text),
      notDoing: text.includes(
        "No consulting, no new commitments, no side launches until NeoScribe ships.",
      ),
      bullets: Array.from(
        document.querySelectorAll("section li"),
      ).filter((li) => li.textContent.includes("DBSCAN") || li.textContent.length > 0).length,
      thinkingBlock:
        text.includes("Things I'm thinking about") &&
        text.includes("How to grade problem solving without grading syntax"),
    };
  });
  check("now: Sivers credit line", now.credit);
  check("now: dashboard renders", now.dashboard);
  check("now: activity strip has 30 day cells", now.cells === 30, `${now.cells}`);
  check("now: strip total caption", now.totalLine);
  check("now: not-doing block from frontmatter", now.notDoing);
  check("now: thinking bullets from frontmatter", now.thinkingBlock);

  // /about
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  const about = await page.evaluate(() => {
    const text = document.body.innerText;
    const headings = Array.from(document.querySelectorAll("main h2")).map(
      (h) => h.textContent.trim(),
    );
    const prose = document.querySelector("main section p");
    return {
      hero: text.includes(
        "I'm Chudi. I build AI products, teach computer science, and research unsupervised clustering. I'm based in Lagos.",
      ),
      headings,
      photoSlot: Boolean(
        document.querySelector("[data-photo-slot] img[alt*='Chudi']"),
      ),
      email: Boolean(
        document.querySelector('a[href="mailto:ofoma.chudi@gmail.com"]'),
      ),
      proseWidth: prose ? Math.round(prose.getBoundingClientRect().width) : 0,
      students: text.includes("160+ students"),
      title: document.title,
    };
  });
  check("about: hero line verbatim", about.hero);
  check(
    "about: five serif sub-headings",
    ["Day job", "Teaching", "Research", "Greyform", "Other"].every((h) =>
      about.headings.includes(h),
    ),
    about.headings.join(", "),
  );
  check("about: portrait photo renders", about.photoSlot);
  check("about: email close with mailto", about.email);
  check(
    "about: prose at 65ch measure",
    about.proseWidth > 600 && about.proseWidth <= 680,
    `${about.proseWidth}px`,
  );
  check("about: specifics present (160+ students)", about.students);
  check("about: unique metadata", about.title.startsWith("About"), about.title);

  check("no page errors", errors.length === 0, errors.slice(0, 2).join("; "));

  await page.goto(`${BASE}/now`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/now-page.png", fullPage: true });
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/about-page.png", fullPage: true });
  await ctx.close();

  // Mobile.
  {
    const mctx = await browser.newContext({
      viewport: { width: 375, height: 720 },
    });
    const mpage = await mctx.newPage();
    for (const url of ["/now", "/about"]) {
      await mpage.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      const fits = await mpage.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      );
      check(`no horizontal scroll at 375px on ${url}`, fits);
    }
    await mctx.close();
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
