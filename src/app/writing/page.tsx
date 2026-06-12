import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { getAll, readingMinutes } from "@/lib/content";

export const metadata: Metadata = {
  title: "Writing",
  description: "Essays on clustering, engineering, and teaching.",
};

export default function WritingPage() {
  const essays = getAll("writing");
  const [lead, ...rest] = essays;

  return (
    <main className="mx-auto max-w-6xl px-6 py-20 md:py-32">
      <PageHeader
        eyebrow="Ochudi / Writing"
        title="Writing."
        intro="Essays on clustering, engineering, and teaching. Long on specifics, short on opinion pieces."
      />

      {lead && (
        <article className="mt-14 border-t border-rule pt-10 lg:w-3/5">
          <Link href={`/writing/${lead.slug}`} className="group block">
            <p className="font-mono text-label uppercase text-muted">
              {lead.frontmatter.date} / {readingMinutes(lead.content)} min
            </p>
            <h2 className="mt-4 font-serif text-h1 underline-offset-4 group-hover:underline">
              {lead.frontmatter.title}
            </h2>
            <p className="mt-5 max-w-prose text-body text-muted">
              {lead.frontmatter.description}
            </p>
          </Link>
        </article>
      )}

      {rest.length > 0 && (
        <div className="mt-16 grid gap-x-16 sm:grid-cols-2">
          {rest.map((essay) => (
            <article key={essay.slug} className="border-t border-rule">
              <Link href={`/writing/${essay.slug}`} className="group block py-8">
                <p className="font-mono text-label uppercase text-muted">
                  {essay.frontmatter.date} / {readingMinutes(essay.content)} min
                </p>
                <h2 className="mt-3 font-serif text-h3 underline-offset-4 group-hover:underline">
                  {essay.frontmatter.title}
                </h2>
                <p className="mt-3 text-body text-muted">
                  {essay.frontmatter.description}
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}

      {essays.length === 0 && (
        <p className="mt-14 border-t border-rule pt-10 text-body text-muted">
          Nothing here yet.
        </p>
      )}
    </main>
  );
}
