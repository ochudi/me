import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { supabaseConfigured, TABLE } from "@/lib/supabase/env";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

/** Fields shared by every collection. Dates are ISO strings (YYYY-MM-DD). */
const base = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().min(1),
  draft: z.boolean().optional().default(false),
});

const writingSchema = base.extend({
  tags: z.array(z.string()).optional().default([]),
});

// Teaching entries are lesson notes keyed by semester week.
const teachingSchema = z.object({
  title: z.string().min(1),
  week: z.number().int().min(1),
  summary: z.string().min(1),
  subjects: z.array(z.string().min(1)).min(1),
  prerequisites: z.array(z.string().min(1)).optional(),
  date: z.string().min(1),
  draft: z.boolean().optional().default(false),
});

export const WORK_TYPES = ["client", "research", "internal", "side"] as const;
export type WorkType = (typeof WORK_TYPES)[number];

// Work is its own shape rather than a base extension: case studies carry a
// full frontmatter contract and the index filters on `type`. `date` stays
// for collection ordering.
const workSchema = z.object({
  title: z.string().min(1),
  client: z.string().min(1),
  year: z.number().int(),
  role: z.string().min(1),
  stack: z.array(z.string().min(1)).min(1),
  type: z.enum(WORK_TYPES),
  summary: z.string().min(1),
  cover: z.string().min(1),
  live_url: z.url().optional(),
  status: z.enum(["live", "internal", "archived"]),
  date: z.string().min(1),
  draft: z.boolean().optional().default(false),
});

const schemas = {
  writing: writingSchema,
  teaching: teachingSchema,
  work: workSchema,
} as const;

export type Collection = keyof typeof schemas;
export type Frontmatter<C extends Collection> = z.infer<(typeof schemas)[C]>;

export type Entry<C extends Collection> = {
  slug: string;
  frontmatter: Frontmatter<C>;
  content: string;
};

// ---------------------------------------------------------------------------
// File-based source (fallback + seed origin)
//
// The original MDX files stay in the repo. They are the seed source and the
// safety net: if Supabase is not configured, or a query fails, the site reads
// these exactly as before, so it can never go blank from a database problem.
// ---------------------------------------------------------------------------
function parseFile<C extends Collection>(
  collection: C,
  dir: string,
  file: string,
): Entry<C> {
  const raw = fs.readFileSync(path.join(dir, file), "utf8");
  const { data, content } = matter(raw);
  const parsed = schemas[collection].safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "frontmatter"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid frontmatter in ${collection}/${file}: ${issues}`);
  }
  return {
    slug: file.replace(/\.mdx?$/, ""),
    frontmatter: parsed.data as Frontmatter<C>,
    content,
  };
}

function getAllFromFiles<C extends Collection>(collection: C): Entry<C>[] {
  const dir = path.join(CONTENT_DIR, collection);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => parseFile(collection, dir, file))
    .filter(
      (entry) =>
        process.env.NODE_ENV !== "production" || !entry.frontmatter.draft,
    )
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1));
}

function getBySlugFromFiles<C extends Collection>(
  collection: C,
  slug: string,
): Entry<C> | null {
  const dir = path.join(CONTENT_DIR, collection);
  for (const ext of [".md", ".mdx"]) {
    const file = `${slug}${ext}`;
    if (fs.existsSync(path.join(dir, file))) {
      return parseFile(collection, dir, file);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Supabase source (primary when configured)
// ---------------------------------------------------------------------------

/** Turn a DB row into the same {slug, frontmatter, content} shape as a file. */
function rowToEntry<C extends Collection>(
  collection: C,
  row: Record<string, unknown>,
): Entry<C> | null {
  const date =
    typeof row.date === "string" ? row.date.slice(0, 10) : String(row.date ?? "");
  const draft = row.published === false;

  let candidate: Record<string, unknown>;
  if (collection === "work") {
    candidate = {
      title: row.title,
      client: row.client,
      year: row.year,
      role: row.role,
      stack: row.stack ?? [],
      type: row.type,
      summary: row.summary,
      cover: row.cover || "placeholder",
      live_url: row.live_url ?? undefined,
      status: row.status,
      date,
      draft,
    };
  } else if (collection === "teaching") {
    candidate = {
      title: row.title,
      week: row.week,
      summary: row.summary,
      subjects: row.subjects ?? [],
      prerequisites: row.prerequisites ?? undefined,
      date,
      draft,
    };
  } else {
    candidate = {
      title: row.title,
      description: row.description,
      date,
      tags: row.tags ?? [],
      draft,
    };
  }

  const parsed = schemas[collection].safeParse(candidate);
  if (!parsed.success) return null; // skip malformed rows rather than crash
  return {
    slug: String(row.slug),
    frontmatter: parsed.data as Frontmatter<C>,
    content: typeof row.body === "string" ? row.body : "",
  };
}

// ---------------------------------------------------------------------------
// Public API (async): Supabase first, files as fallback
// ---------------------------------------------------------------------------

/** All published entries in a collection, newest first. */
export async function getAll<C extends Collection>(
  collection: C,
): Promise<Entry<C>[]> {
  if (!supabaseConfigured) return getAllFromFiles(collection);
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from(TABLE[collection])
      .select("*")
      .eq("published", true)
      .order("date", { ascending: false });
    if (error || !data) return getAllFromFiles(collection);
    return data
      .map((row) => rowToEntry(collection, row as Record<string, unknown>))
      .filter((e): e is Entry<C> => e !== null);
  } catch {
    return getAllFromFiles(collection);
  }
}

/** A single published entry by slug, or null. */
export async function getBySlug<C extends Collection>(
  collection: C,
  slug: string,
): Promise<Entry<C> | null> {
  if (!supabaseConfigured) return getBySlugFromFiles(collection, slug);
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from(TABLE[collection])
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error) return getBySlugFromFiles(collection, slug);
    if (!data) return null;
    return rowToEntry(collection, data as Record<string, unknown>);
  } catch {
    return getBySlugFromFiles(collection, slug);
  }
}

/** Reading time at 200 words per minute, floored at one minute. */
export function readingMinutes(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}

const nowSchema = z.object({
  title: z.string().min(1).default("Now"),
  updated: z.string().min(1),
  focus: z.string().min(1),
  reading: z.string().min(1),
  listening: z.string().min(1).optional(),
  not_doing: z.string().min(1).optional(),
  thinking: z.array(z.string().min(1)).optional(),
});

export type Now = {
  frontmatter: z.infer<typeof nowSchema>;
  content: string;
};

function getNowFromFile(): Now | null {
  const file = path.join(CONTENT_DIR, "now.md");
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const parsed = nowSchema.safeParse(data);
  if (!parsed.success) return null;
  return { frontmatter: parsed.data, content };
}

/** The single /now page, from Supabase or the now.md fallback. */
export async function getNow(): Promise<Now | null> {
  if (!supabaseConfigured) return getNowFromFile();
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from(TABLE.now)
      .select("*")
      .eq("published", true)
      .maybeSingle();
    if (error || !data) return getNowFromFile();
    const row = data as Record<string, unknown>;
    const parsed = nowSchema.safeParse({
      title: row.title,
      updated:
        typeof row.updated === "string"
          ? row.updated.slice(0, 10)
          : String(row.updated ?? ""),
      focus: row.focus,
      reading: row.reading,
      listening: row.listening ?? undefined,
      not_doing: row.not_doing ?? undefined,
      thinking: row.thinking ?? undefined,
    });
    if (!parsed.success) return getNowFromFile();
    return {
      frontmatter: parsed.data,
      content: typeof row.body === "string" ? row.body : "",
    };
  } catch {
    return getNowFromFile();
  }
}
