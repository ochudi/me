import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import Prose from "@/components/Prose";
import { getAll, getBySlug } from "@/lib/content";
import { mdxOptions } from "@/lib/mdx";
import { buildMetadata } from "@/lib/seo";
import { courseCode } from "@/content/teaching-calendar";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getAll("teaching")).map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getBySlug("teaching", slug);
  if (!entry) return {};
  return buildMetadata({
    title: `Week ${entry.frontmatter.week}: ${entry.frontmatter.title}`,
    description: entry.frontmatter.summary,
    path: `/teaching/${entry.slug}`,
    type: "article",
  });
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getBySlug("teaching", slug);
  if (!entry) notFound();

  const fm = entry.frontmatter;

  return (
    <main className="mx-auto max-w-2xl px-6 py-20 md:py-32">
      <p className="font-mono text-label uppercase text-muted">
        {courseCode} / Week {String(fm.week).padStart(2, "0")}
      </p>
      <h1 className="mt-3 font-serif text-h1">{fm.title}</h1>
      <p className="mt-5 font-serif text-h3 italic text-muted">{fm.summary}</p>

      <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-3 border-y border-rule py-5 font-mono text-label uppercase">
        <div className="flex gap-3">
          <dt className="text-muted">Subjects</dt>
          <dd>{fm.subjects.join(" / ")}</dd>
        </div>
        {fm.prerequisites && fm.prerequisites.length > 0 && (
          <div className="flex gap-3">
            <dt className="text-muted">Builds on</dt>
            <dd>{fm.prerequisites.join(" / ")}</dd>
          </div>
        )}
      </dl>

      <div className="mt-10">
        <Prose>
          <MDXRemote source={entry.content} options={mdxOptions} />
        </Prose>
      </div>

      <p className="mt-16">
        <Link
          href="/teaching"
          className="font-mono text-label uppercase text-ink underline decoration-rule underline-offset-4 transition-colors duration-200 hover:decoration-ink"
        >
          All lessons
        </Link>
      </p>
    </main>
  );
}
