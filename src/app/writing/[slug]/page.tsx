import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import Prose from "@/components/Prose";
import { getAll, getBySlug, readingMinutes, type Entry } from "@/lib/content";
import { mdxOptions } from "@/lib/mdx";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getAll("writing")).map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getBySlug("writing", slug);
  if (!entry) return {};
  return buildMetadata({
    title: entry.frontmatter.title,
    description: entry.frontmatter.description,
    path: `/writing/${entry.slug}`,
    type: "article",
    publishedTime: entry.frontmatter.date,
  });
}

/** Up to three essays sharing a tag, most overlap first, then newest. */
async function relatedEssays(current: Entry<"writing">): Promise<Entry<"writing">[]> {
  const tags = new Set(current.frontmatter.tags);
  return (await getAll("writing"))
    .filter((essay) => essay.slug !== current.slug)
    .map((essay) => ({
      essay,
      shared: essay.frontmatter.tags.filter((t) => tags.has(t)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        (a.essay.frontmatter.date < b.essay.frontmatter.date ? 1 : -1),
    )
    .slice(0, 3)
    .map(({ essay }) => essay);
}

export default async function EssayPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getBySlug("writing", slug);
  if (!entry) notFound();

  const fm = entry.frontmatter;
  const related = await relatedEssays(entry);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: fm.title,
    description: fm.description,
    datePublished: fm.date,
    url: `https://ochudi.com/writing/${entry.slug}`,
    author: {
      "@type": "Person",
      name: "Chukwudi Ofoma",
      url: "https://ochudi.com",
    },
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-20 md:py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="font-mono text-label uppercase text-muted">
        {fm.date} / {readingMinutes(entry.content)} min
      </p>
      <h1 className="mt-3 font-serif text-h1">{fm.title}</h1>
      <p className="mt-5 font-serif text-h3 italic text-muted">
        {fm.description}
      </p>

      <div className="mt-12">
        <Prose>
          <MDXRemote source={entry.content} options={mdxOptions} />
        </Prose>
      </div>

      {related.length > 0 && (
        <aside aria-label="Related essays" className="mt-20 border-t border-rule pt-8">
          <p className="font-mono text-label uppercase text-muted">Related</p>
          <ul className="mt-2">
            {related.map((essay) => (
              <li key={essay.slug} className="border-b border-rule last:border-b-0">
                <Link
                  href={`/writing/${essay.slug}`}
                  className="group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <span className="font-serif text-h3 underline-offset-4 group-hover:underline">
                    {essay.frontmatter.title}
                  </span>
                  <span className="shrink-0 font-mono text-label uppercase text-muted">
                    {essay.frontmatter.date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <p className="mt-16">
        <Link
          href="/writing"
          className="font-mono text-label uppercase text-ink underline decoration-rule underline-offset-4 transition-colors duration-200 hover:decoration-ink"
        >
          All writing
        </Link>
      </p>
    </main>
  );
}
