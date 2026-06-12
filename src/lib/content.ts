import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

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

function collectionDir(collection: Collection): string {
  return path.join(CONTENT_DIR, collection);
}

function parseEntry<C extends Collection>(
  collection: C,
  dir: string,
  file: string,
): Entry<C> {
  const raw = fs.readFileSync(path.join(dir, file), "utf8");
  const { data, content } = matter(raw);
  const parsed = schemas[collection].safeParse(data);
  if (!parsed.success) {
    // Fail the build with the file and fields named, not a raw Zod dump.
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "frontmatter"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid frontmatter in ${collection}/${file}: ${issues}`);
  }
  return {
    slug: file.replace(/\.mdx?$/, ""),
    frontmatter: parsed.data as Frontmatter<C>,
    content,
  };
}

/** All entries in a collection, newest first, drafts hidden in production. */
export function getAll<C extends Collection>(collection: C): Entry<C>[] {
  const dir = collectionDir(collection);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => parseEntry(collection, dir, file))
    .filter(
      (entry) =>
        process.env.NODE_ENV !== "production" || !entry.frontmatter.draft,
    )
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? 1 : -1));
}

/** A single entry by slug, or null if no matching .md/.mdx file exists. */
export function getBySlug<C extends Collection>(
  collection: C,
  slug: string,
): Entry<C> | null {
  const dir = collectionDir(collection);
  for (const ext of [".md", ".mdx"]) {
    const file = `${slug}${ext}`;
    if (fs.existsSync(path.join(dir, file))) {
      return parseEntry(collection, dir, file);
    }
  }
  return null;
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

/** The single /now page, or null if src/content/now.md is absent. */
export function getNow(): Now | null {
  const file = path.join(CONTENT_DIR, "now.md");
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return { frontmatter: nowSchema.parse(data), content };
}
