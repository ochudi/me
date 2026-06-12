// Regenerates the icon formats that cannot adapt to the browser's color
// scheme (ICO, PWA manifest PNGs) as solid ink tiles with the page-colored
// mark, so they read on light and dark surfaces alike. The SVG favicon
// handles theming itself via an embedded media query.
// Usage: node scripts/generate-icons.mjs

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const pngToIco = require("png-to-ico").default ?? require("png-to-ico");

const ROOT = process.cwd();
const markFor = (file) =>
  readFileSync(resolve(ROOT, file), "utf8").replace(
    /currentColor/g,
    "#FAFAFA",
  );

// Heaviest weights at tiny sizes, display mark when there is room.
const faviconMark = readFileSync(resolve(ROOT, "src/app/icon.svg"), "utf8")
  .replace(/<style>.*?<\/style>/, "")
  .replace(/currentColor/g, "#FAFAFA");
const displayMark = markFor("public/brand/logo-mark.svg");

function tileHtml(size, mark, markRatio) {
  const inner = Math.round(size * markRatio);
  return `<!doctype html><html><head><style>
    * { margin: 0; padding: 0; }
    body { width: ${size}px; height: ${size}px; background: #0A0A0A;
           display: grid; place-items: center; }
    svg { width: ${inner}px; height: ${inner}px; }
  </style></head><body>${mark}</body></html>`;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function renderTile(size, mark, markRatio, outPath) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(tileHtml(size, mark, markRatio));
  const buf = await page.screenshot();
  await page.close();
  if (outPath) writeFileSync(outPath, buf);
  return buf;
}

const png32 = await renderTile(32, faviconMark, 0.8, null);
writeFileSync("src/app/favicon.ico", await pngToIco([png32]));
await renderTile(192, displayMark, 0.78, "public/brand/icon-192.png");
await renderTile(512, displayMark, 0.78, "public/brand/icon-512.png");

await browser.close();
console.log("wrote favicon.ico, brand/icon-192.png, brand/icon-512.png");
