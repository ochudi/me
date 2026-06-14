// One-time (and re-runnable) seed: copies the MDX files in src/content into
// Supabase so the live site has its current content, and registers the admin
// emails. Idempotent — upserts on a unique column, so running it twice is
// safe.
//
//   1. Put your keys in .env.local (incl. SUPABASE_SERVICE_ROLE_KEY).
//   2. Run supabase/migrations/0001_init.sql in the Supabase SQL editor.
//   3. node --env-file=.env.local scripts/seed.mjs
//
// Talks to PostgREST directly with the service-role/secret key (bypasses RLS)
// rather than supabase-js, to avoid pulling in the realtime WebSocket client
// that Node < 22 cannot construct. Never run this in a browser or commit the
// key.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local.",
  );
  process.exit(1);
}

async function upsert(table, rows, onConflict) {
  if (rows.length === 0) {
    console.log(`- ${table}: nothing to seed`);
    return;
  }
  const res = await fetch(
    `${URL}/rest/v1/${table}?on_conflict=${onConflict}`,
    {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) {
    console.error(`! ${table}: ${res.status} ${await res.text()}`);
    process.exitCode = 1;
  } else {
    console.log(`- ${table}: seeded ${rows.length}`);
  }
}

const CONTENT = path.join(process.cwd(), "src", "content");
const asDate = (v) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "");

function readCollection(name) {
  const dir = path.join(CONTENT, name);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => {
      const { data, content } = matter(
        fs.readFileSync(path.join(dir, f), "utf8"),
      );
      return { slug: f.replace(/\.mdx?$/, ""), fm: data, body: content };
    });
}

const MAP = {
  work: ({ slug, fm, body }) => ({
    slug,
    title: fm.title,
    client: fm.client,
    year: fm.year,
    role: fm.role,
    stack: fm.stack ?? [],
    type: fm.type,
    summary: fm.summary,
    cover: fm.cover ?? "",
    live_url: fm.live_url ?? null,
    status: fm.status,
    date: asDate(fm.date),
    body,
    published: fm.draft !== true,
  }),
  writing: ({ slug, fm, body }) => ({
    slug,
    title: fm.title,
    description: fm.description,
    date: asDate(fm.date),
    tags: fm.tags ?? [],
    body,
    published: fm.draft !== true,
  }),
  teaching: ({ slug, fm, body }) => ({
    slug,
    title: fm.title,
    week: fm.week,
    summary: fm.summary,
    subjects: fm.subjects ?? [],
    prerequisites: fm.prerequisites ?? [],
    date: asDate(fm.date),
    body,
    published: fm.draft !== true,
  }),
};

function nowRow() {
  const file = path.join(CONTENT, "now.md");
  if (!fs.existsSync(file)) return [];
  const { data: fm, content } = matter(fs.readFileSync(file, "utf8"));
  return [
    {
      id: 1,
      title: fm.title ?? "Now",
      updated: asDate(fm.updated),
      focus: fm.focus,
      reading: fm.reading,
      listening: fm.listening ?? null,
      not_doing: fm.not_doing ?? null,
      thinking: fm.thinking ?? [],
      body: content,
      published: true,
    },
  ];
}

function adminRows() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .map((email) => ({ email }));
}

console.log("Seeding ochudi content into Supabase…");
await upsert("ochudi_work", readCollection("work").map(MAP.work), "slug");
await upsert("ochudi_writing", readCollection("writing").map(MAP.writing), "slug");
await upsert("ochudi_teaching", readCollection("teaching").map(MAP.teaching), "slug");
await upsert("ochudi_now", nowRow(), "id");
await upsert("ochudi_admins", adminRows(), "email");
console.log("Done.");
