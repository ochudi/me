import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import WorkIndex, { type WorkIndexEntry } from "@/components/WorkIndex";
import { getAll } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work",
  description: "Selected work: client sites, research, and internal tools.",
};

export default function WorkPage() {
  const entries: WorkIndexEntry[] = getAll("work").map((entry) => ({
    slug: entry.slug,
    title: entry.frontmatter.title,
    year: entry.frontmatter.year,
    summary: entry.frontmatter.summary,
    stack: entry.frontmatter.stack,
    type: entry.frontmatter.type,
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
