// Drives the installed Chrome against a running build and checks the
// writing and teaching done-criteria: indexes, lead story, reading time,
// dual-theme code highlighting in Python and Rust, related essays, unique
// metadata, mobile layout.
// Usage: node scripts/verify-content.mjs [baseUrl]

import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3105";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

// First highlighted token color inside a fenced block for the language.
const tokenColor = (page, lang) =>
  page.evaluate((language) => {
    const pre = document.querySelector(`pre[data-language="${language}"]`);
    const span = pre?.querySelector("code span[style]");
    return span ? getComputedStyle(span).color : null;
  }, lang);

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // Writing index: lead story plus two-column list, reading times.
  await page.goto(`${BASE}/writing`, { waitUntil: "networkidle" });
  const index = await page.evaluate(() => {
    const main = document.querySelector("main");
    const lead = main.querySelector("article");
    const leadTitle = lead?.querySelector("h2")?.textContent ?? "";
    const ratio =
      lead.getBoundingClientRect().width /
      main.getBoundingClientRect().width;
    const rest = Array.from(
      main.querySelectorAll("div.grid article"),
    );
    const lefts = rest.map((el) => Math.round(el.getBoundingClientRect().left));
    return {
      leadTitle,
      ratio,
      restCount: rest.length,
      twoColumns: new Set(lefts).size === 2,
      readingTimes: (main.innerText.match(/\/ \d+ MIN/gi) ?? []).length,
    };
  });
  check(
    "lead story is the most recent essay",
    index.leadTitle === "How I built the clustering canvas",
    index.leadTitle,
  );
  check(
    "lead takes ~60% width",
    index.ratio > 0.55 && index.ratio < 0.65,
    `ratio ${index.ratio.toFixed(2)}`,
  );
  check(
    "remaining essays in two columns",
    index.restCount === 3 && index.twoColumns,
    `${index.restCount} rest essays`,
  );
  check(
    "reading times computed",
    index.readingTimes >= 4,
    `${index.readingTimes} found`,
  );

  // Essay page: typography pieces, highlighting, related, JSON-LD.
  await page.goto(`${BASE}/writing/teaching-python-to-students-who-know-rust`, {
    waitUntil: "networkidle",
  });
  const essayBits = await page.evaluate(() => ({
    title: document.title,
    hasItalicSummary: Boolean(
      document.querySelector("main > p.italic, main p.font-serif.italic"),
    ),
    proseWidth: (() => {
      const p = document.querySelector("main h1");
      return p ? Math.round(p.getBoundingClientRect().width) : 0;
    })(),
    jsonLd: (() => {
      const s = document.querySelector('script[type="application/ld+json"]');
      return s ? s.textContent.includes("BlogPosting") : false;
    })(),
  }));
  check("essay metadata", essayBits.title.includes("Teaching Python"), essayBits.title);
  check("italic serif summary", essayBits.hasItalicSummary);
  check(
    "measure near 65ch (max-w-2xl)",
    essayBits.proseWidth > 600 && essayBits.proseWidth <= 680,
    `${essayBits.proseWidth}px`,
  );
  check("BlogPosting JSON-LD present", essayBits.jsonLd);

  const pyLight = await tokenColor(page, "python");
  const rsLight = await tokenColor(page, "rust");
  check(
    "python and rust both highlight",
    Boolean(pyLight) && Boolean(rsLight),
    `py ${pyLight}, rs ${rsLight}`,
  );

  await page.emulateMedia({ colorScheme: "dark" });
  const pyDark = await tokenColor(page, "python");
  await page.emulateMedia({ colorScheme: "light" });
  check(
    "dual theme switches with color scheme",
    Boolean(pyDark) && pyDark !== pyLight,
    `light ${pyLight} vs dark ${pyDark}`,
  );

  // Related essays by shared tag.
  await page.goto(`${BASE}/writing/what-dbscan-sees`, {
    waitUntil: "networkidle",
  });
  const related = await page.evaluate(() => {
    const aside = document.querySelector('aside[aria-label="Related essays"]');
    return aside ? aside.innerText : "";
  });
  check(
    "related essays appear by shared tag",
    related.includes("How I built the clustering canvas"),
  );
  const noRelated = await page
    .goto(`${BASE}/writing/teaching-python-to-students-who-know-rust`, {
      waitUntil: "networkidle",
    })
    .then(() =>
      page.$('aside[aria-label="Related essays"]').then((el) => el === null),
    );
  check("no related section without shared tags", noRelated);

  // Teaching index.
  await page.goto(`${BASE}/teaching`, { waitUntil: "networkidle" });
  const teaching = await page.evaluate(() => document.body.innerText);
  check(
    "teaching intro present",
    /COS 102 \(Problem Solving\) at Pan-Atlantic University/.test(teaching) &&
      teaching.includes("published openly"),
  );
  check(
    "lesson row renders",
    /WEEK 04/i.test(teaching) &&
      teaching.includes("Object-oriented programming") &&
      /READ/i.test(teaching),
  );

  // Lesson page: both languages highlight, unique metadata.
  await page.goto(`${BASE}/teaching/week-04-object-oriented-programming`, {
    waitUntil: "networkidle",
  });
  const lessonTitle = await page.title();
  const pyLesson = await tokenColor(page, "python");
  const rsLesson = await tokenColor(page, "rust");
  check(
    "lesson python and rust highlight",
    Boolean(pyLesson) && Boolean(rsLesson),
    `py ${pyLesson}, rs ${rsLesson}`,
  );
  check(
    "lesson metadata unique",
    lessonTitle.includes("Week 4: Object-oriented programming"),
    lessonTitle,
  );

  check("no page errors", errors.length === 0, errors.slice(0, 2).join("; "));

  await page.goto(`${BASE}/writing`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/writing-index.png", fullPage: true });
  await page.goto(`${BASE}/writing/teaching-python-to-students-who-know-rust`, {
    waitUntil: "networkidle",
  });
  await page.screenshot({ path: "/tmp/essay.png", fullPage: true });
  await page.goto(`${BASE}/teaching/week-04-object-oriented-programming`, {
    waitUntil: "networkidle",
  });
  await page.screenshot({ path: "/tmp/lesson.png", fullPage: true });
  await ctx.close();

  // Mobile: no horizontal scroll anywhere new.
  {
    const mctx = await browser.newContext({
      viewport: { width: 375, height: 720 },
    });
    const mpage = await mctx.newPage();
    for (const url of [
      "/writing",
      "/writing/teaching-python-to-students-who-know-rust",
      "/teaching",
      "/teaching/week-04-object-oriented-programming",
    ]) {
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
