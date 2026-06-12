import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import Prose from "@/components/Prose";
import { getAll, getBySlug } from "@/lib/content";
import { mdxOptions } from "@/lib/mdx";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAll("work").map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getBySlug("work", slug);
  if (!entry) return {};
  return {
    title: entry.frontmatter.title,
    description: entry.frontmatter.summary,
  };
}

export default async function WorkCasePage({ params }: Props) {
  const { slug } = await params;
  const entry = getBySlug("work", slug);
  if (!entry) notFound();

  const fm = entry.frontmatter;
  const all = getAll("work");
  const index = all.findIndex((e) => e.slug === slug);
  const next = all[(index + 1) % all.length];
  const coverExists = fs.existsSync(
    path.join(process.cwd(), "public", fm.cover),
  );

  return (
    <main>
      <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-32">
        <p className="font-mono text-label uppercase text-muted">
          Case study / {fm.client} / {fm.year}
        </p>
        <h1 className="mt-3 max-w-3xl font-serif text-h1">{fm.title}</h1>
        <p className="mt-6 max-w-2xl text-body text-muted">{fm.summary}</p>
      </div>

      {/* Full-bleed cover, placeholder block until real artwork lands. */}
      <div className="mt-12 md:mt-16">
        {coverExists ? (
          <div className="relative aspect-[16/10] w-full md:aspect-[2/1]">
            <Image
              src={fm.cover}
              alt={`${fm.title} cover`}
              fill
              priority
              className="object-cover"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="aspect-[16/10] w-full border-y border-rule bg-rule/40 md:aspect-[2/1]"
          />
        )}
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <dl className="flex flex-wrap gap-x-12 gap-y-4 border-b border-rule py-6 font-mono text-label uppercase">
          <div className="flex gap-3">
            <dt className="text-muted">Role</dt>
            <dd>{fm.role}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-muted">Year</dt>
            <dd>{fm.year}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-muted">Stack</dt>
            <dd>{fm.stack.join(" / ")}</dd>
          </div>
          {fm.live_url && (
            <div className="flex gap-3">
              <dt className="text-muted">Live</dt>
              <dd>
                <a
                  href={fm.live_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {fm.live_url.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <article className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <Prose>
          <MDXRemote source={entry.content} options={mdxOptions} />
        </Prose>
      </article>

      <div className="border-t border-rule">
        <Link
          href={`/work/${next.slug}`}
          className="group mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
        >
          <span className="font-mono text-label uppercase text-muted">
            Next case
          </span>
          <span className="font-serif text-h2 underline-offset-4 group-hover:underline">
            {next.frontmatter.title}
          </span>
        </Link>
      </div>
    </main>
  );
}
