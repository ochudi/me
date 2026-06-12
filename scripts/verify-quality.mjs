// Performance, SEO, and accessibility checks that do not need Lighthouse:
// chunk separation, first-load budgets, OG image validity, canonical and
// JSON-LD placement, contrast mathematics, axe-critical across routes,
// robustness pages.
// Usage: node scripts/verify-quality.mjs [baseUrl] [buildLogPath]

import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const BASE = process.argv[2] ?? "http://localhost:3105";
const BUILD_LOG = process.argv[3] ?? "/tmp/build.log";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

// WCAG relative luminance contrast.
function contrast(hex1, hex2) {
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [a, b] = [lum(hex1), lum(hex2)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

async function main() {
  // 1. Bundle: first-load JS per route from the build log.
  const log = readFileSync(BUILD_LOG, "utf8");
  const sizes = [...log.matchAll(/[├└┌]\s+[○●ƒ]\s+(\S+)\s+[\d.]+\s*k?B\s+([\d.]+)\s*(B|kB|MB)/g)].map(
    (m) => ({
      route: m[1],
      kb: m[3] === "MB" ? Number(m[2]) * 1024 : m[3] === "B" ? Number(m[2]) / 1024 : Number(m[2]),
    }),
  );
  const overBudget = sizes.filter((s) => s.kb > 200);
  const maxRoute = sizes.reduce((a, b) => (a.kb > b.kb ? a : b), { kb: 0 });
  check(
    "no route over 200kB first-load JS",
    sizes.length > 0 && overBudget.length === 0,
    `${sizes.length} routes, max ${maxRoute.kb}kB (${maxRoute.route})`,
  );

  // 2. Chunk separation: canvas and palette code live outside main chunks.
  const chunkDir = ".next/static/chunks";
  const canvasChunks = execSync(
    `grep -ls "DBSCAN" ${chunkDir}/*.js ${chunkDir}/app/*.js 2>/dev/null || true`,
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  const paletteChunks = execSync(
    `grep -ls "cmdk-group-heading\\|ochudi.cmd.history" ${chunkDir}/*.js 2>/dev/null || true`,
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  const mainChunks = readdirSync(chunkDir).filter((f) => f.startsWith("main-"));
  const mainHasFeature = mainChunks.some((f) => {
    const content = readFileSync(`${chunkDir}/${f}`, "utf8");
    return content.includes("DBSCAN") || content.includes("ochudi.cmd.history");
  });
  check(
    "canvas and palette are separate lazy chunks",
    canvasChunks.length > 0 && paletteChunks.length > 0 && !mainHasFeature,
    `canvas in ${canvasChunks.length} chunk(s), palette in ${paletteChunks.length}, main clean`,
  );

  // 3. Contrast math for muted on both surfaces.
  const onLight = contrast("#6B6B6B", "#FAFAFA");
  const onDark = contrast("#6B6B6B", "#1F1F1F");
  check(
    "muted passes AA on light (4.5 needed)",
    onLight >= 4.5,
    `${onLight.toFixed(2)}:1`,
  );
  check(
    "muted on dark is large-text only (3.0 needed)",
    onDark >= 3.0,
    `${onDark.toFixed(2)}:1, so body-size muted must not appear on dark`,
  );

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // 4. No body-size muted text on dark surfaces, checked in the rendered DOM.
  const mutedMisuse = [];
  for (const url of ["/", "/now"]) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
    const bad = await page.evaluate(() => {
      const offenders = [];
      for (const el of document.querySelectorAll("*")) {
        const style = getComputedStyle(el);
        if (style.color !== "rgb(107, 107, 107)") continue;
        if (parseFloat(style.fontSize) >= 24) continue; // large text exempt
        let node = el;
        while (node) {
          const bg = getComputedStyle(node).backgroundColor;
          if (bg && bg !== "rgba(0, 0, 0, 0)") {
            if (bg === "rgb(31, 31, 31)" || bg === "rgb(10, 10, 10)") {
              offenders.push(el.tagName + ": " + (el.textContent || "").slice(0, 30));
            }
            break;
          }
          node = node.parentElement;
        }
      }
      return offenders.slice(0, 3);
    });
    mutedMisuse.push(...bad);
  }
  check("no body-size muted text on dark surfaces", mutedMisuse.length === 0, mutedMisuse.join("; "));

  // 5. SEO surface: canonical, JSON-LD placement, unique titles, og:image per slug.
  // [url, expected title, top-level Person expected, og image path]
  // Routes without their own opengraph-image file inherit the root one.
  const seoPages = [
    ["/", "Chukwudi Ofoma", true, "https://ochudi.com/opengraph-image"],
    ["/about", "About / ochudi", true, "https://ochudi.com/opengraph-image"],
    ["/work", "Work / ochudi", false, "https://ochudi.com/opengraph-image"],
    [
      "/writing/what-dbscan-sees",
      "What DBSCAN sees that k-means cannot / ochudi",
      false,
      "https://ochudi.com/writing/what-dbscan-sees/opengraph-image",
    ],
    [
      "/teaching/week-04-object-oriented-programming",
      "Week 4: Object-oriented programming / ochudi",
      false,
      "https://ochudi.com/teaching/week-04-object-oriented-programming/opengraph-image",
    ],
  ];
  const titles = [];
  for (const [url, expectedTitle, wantsPerson, ogPath] of seoPages) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
    const meta = await page.evaluate(() => {
      const jsonLd = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
      ).map((s) => {
        try {
          return JSON.parse(s.textContent);
        } catch {
          return {};
        }
      });
      return {
        title: document.title,
        canonical: document.querySelector('link[rel="canonical"]')?.href ?? "",
        ogImage: document.querySelector('meta[property="og:image"]')?.content ?? "",
        twitterImage:
          document.querySelector('meta[name="twitter:image"]')?.content ?? "",
        person: jsonLd.some((d) => d["@type"] === "Person"),
        blogPosting: jsonLd.some((d) => d["@type"] === "BlogPosting"),
      };
    });
    titles.push(meta.title);
    check(
      `seo on ${url}`,
      meta.title === expectedTitle &&
        meta.canonical === `https://ochudi.com${url === "/" ? "/" : url}` &&
        meta.ogImage.startsWith(ogPath) &&
        meta.twitterImage.startsWith(ogPath) &&
        meta.person === wantsPerson &&
        (url.startsWith("/writing/") ? meta.blogPosting : true),
      `${meta.title} | canonical ${meta.canonical}`,
    );
  }
  check("titles unique across routes", new Set(titles).size === titles.length);

  // 6. OG images: 200, PNG, exactly 1200x630.
  for (const ogUrl of [
    "/opengraph-image",
    "/writing/what-dbscan-sees/opengraph-image",
    "/work/ipheclan/opengraph-image",
    "/teaching/week-04-object-oriented-programming/opengraph-image",
  ]) {
    const res = await page.request.get(`${BASE}${ogUrl}`);
    const buf = Buffer.from(await res.body());
    const isPng = buf.slice(1, 4).toString() === "PNG";
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    check(
      `og image ${ogUrl}`,
      res.status() === 200 && isPng && width === 1200 && height === 630,
      `${res.status()} ${width}x${height} ${Math.round(buf.length / 1024)}kB`,
    );
  }

  // 7. Fonts only via next/font: no external font stylesheets.
  await page.goto(BASE, { waitUntil: "networkidle" });
  const externalFonts = await page.evaluate(() =>
    Array.from(document.querySelectorAll("link[href]")).filter((l) =>
      l.href.includes("fonts.googleapis"),
    ).length,
  );
  check("fonts exclusively via next/font", externalFonts === 0);

  // 8. Skip link first and functional.
  const skip = await page.evaluate(() => {
    const first = document.body.querySelector("a");
    return {
      text: first?.textContent ?? "",
      href: first?.getAttribute("href") ?? "",
      targetExists: Boolean(document.querySelector("#content")),
    };
  });
  check(
    "skip-to-content link first in DOM",
    skip.text === "Skip to content" && skip.href === "#content" && skip.targetExists,
  );

  // 9. Robustness: styled 404, graceful dashboard fallback text path.
  const notFound = await page.goto(`${BASE}/definitely-not-a-page`, {
    waitUntil: "networkidle",
  });
  const nfBody = await page.textContent("body");
  check(
    "styled 404 page",
    notFound.status() === 404 && nfBody.includes("No such page.") && nfBody.includes("Back home"),
  );

  // 10. axe: zero critical issues across key routes.
  for (const url of ["/", "/work", "/writing/what-dbscan-sees", "/teaching/week-04-object-oriented-programming", "/now", "/about"]) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
    await page.addScriptTag({ path: AXE_PATH });
    const axe = await page.evaluate(async () => {
      const r = await window.axe.run(document);
      return r.violations
        .filter((v) => v.impact === "critical")
        .map((v) => `${v.id}:${v.nodes.length}`);
    });
    check(`axe zero critical on ${url}`, axe.length === 0, axe.join("; "));
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
