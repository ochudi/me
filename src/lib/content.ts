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

const teachingSchema = base.extend({
  institution: z.string().optional(),
  term: z.string().optional(),
});

const workSchema = base.extend({
  role: z.string().optional(),
  year: z.number().int().optional(),
  url: z.url().optional(),
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
  const frontmatter = schemas[collection].parse(data) as Frontmatter<C>;
  return {
    slug: file.replace(/\.mdx?$/, ""),
    frontmatter,
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

const nowSchema = z.object({
  title: z.string().min(1),
  updated: z.string().min(1),
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
