// Lighthouse against the production server: mobile profile (Moto G class
// device) with devtools throttling, which applies the 4G network and 4x
// CPU slowdown for real and reports observed paint timings rather than
// Lantern's simulated estimates. Asserts 95+ on performance,
// accessibility, best practices, and SEO, LCP under 2s, CLS under 0.1.
// Usage: node scripts/verify-lighthouse.mjs [baseUrl]

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3105";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROUTES = [
  "/",
  "/work",
  "/writing/what-dbscan-sees",
  "/teaching/week-04-object-oriented-programming",
];

let failed = 0;

for (const route of ROUTES) {
  const out = `/tmp/lh${route.replace(/\//g, "_") || "_home"}.json`;
  execFileSync(
    "npx",
    [
      "lighthouse",
      `${BASE}${route}`,
      "--quiet",
      "--chrome-flags=--headless=new",
      "--throttling-method=devtools",
      "--only-categories=performance,accessibility,best-practices,seo",
      "--output=json",
      `--output-path=${out}`,
    ],
    { env: { ...process.env, CHROME_PATH: CHROME }, stdio: "pipe" },
  );
  const report = JSON.parse(readFileSync(out, "utf8"));
  const cat = (k) => Math.round(report.categories[k].score * 100);
  const scores = {
    perf: cat("performance"),
    a11y: cat("accessibility"),
    bp: cat("best-practices"),
    seo: cat("seo"),
  };
  const lcp = report.audits["largest-contentful-paint"].numericValue;
  const cls = report.audits["cumulative-layout-shift"].numericValue;
  const ok =
    Object.values(scores).every((s) => s >= 95) && lcp < 2000 && cls < 0.1;
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${route}  perf ${scores.perf} a11y ${scores.a11y} bp ${scores.bp} seo ${scores.seo} | LCP ${(lcp / 1000).toFixed(2)}s CLS ${cls.toFixed(3)}`,
  );
}

process.exit(failed ? 1 : 0);
