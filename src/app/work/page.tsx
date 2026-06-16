import fs from "node:fs";
import path from "node:path";
import PageHeader from "@/components/PageHeader";
import WorkIndex, { type WorkIndexEntry } from "@/components/WorkIndex";
import { getAll } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Work",
  description: "Selected work: client sites, research, and internal tools.",
  path: "/work",
});

// Only hand the index a cover it can actually render: a remote Supabase URL,
// or a local file that exists. Otherwise the grey placeholder stands in.
function renderableCover(cover: string): string | undefined {
  if (!cover || cover === "placeholder") return undefined;
  if (/^https?:\/\//.test(cover)) return cover;
  return fs.existsSync(path.join(process.cwd(), "public", cover))
    ? cover
    : undefined;
}

export default async function WorkPage() {
  const entries: WorkIndexEntry[] = (await getAll("work")).map((entry) => ({
    slug: entry.slug,
    title: entry.frontmatter.title,
    year: entry.frontmatter.year,
    summary: entry.frontmatter.summary,
    stack: entry.frontmatter.stack,
    type: entry.frontmatter.type,
    cover: renderableCover(entry.frontmatter.cover),
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-20 md:py-32">
      <PageHeader
        eyebrow="Ochudi / Work"
        title="Selected work."
        intro="Client sites, research, and internal tools. Three case studies so far; more as they ship."
      />
      <WorkIndex entries={entries} />
    </main>
  );
}
