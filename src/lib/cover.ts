import fs from "node:fs";
import path from "node:path";

// Returns a cover only when it can actually render: a remote URL (Supabase
// Storage or Cloudinary), or a local file in /public that exists. Otherwise
// undefined, so the UI falls back to its placeholder. Server-only (uses fs).
export function renderableCover(cover: string | undefined): string | undefined {
  if (!cover || cover === "placeholder") return undefined;
  if (/^https?:\/\//.test(cover)) return coverSrc(cover);
  return fs.existsSync(path.join(process.cwd(), "public", cover))
    ? cover
    : undefined;
}

// Cloudinary covers are delivered straight from their CDN with auto format,
// auto quality, and a capped width, so we serve them `unoptimized` and skip
// Next's image optimizer (no quota cost, and no native sharp dependency).
function coverSrc(cover: string): string {
  if (cover.includes("res.cloudinary.com") && cover.includes("/upload/")) {
    return cover.replace("/upload/", "/upload/f_auto,q_auto,w_1600/");
  }
  return cover;
}
