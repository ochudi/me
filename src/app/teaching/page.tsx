import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { getAll } from "@/lib/content";
import { courseCode } from "@/content/teaching-calendar";

export const metadata: Metadata = {
  title: "Teaching",
  description: "Open lesson notes for Problem Solving at Pan-Atlantic University.",
};

export default async function TeachingPage() {
  const lessons = (await getAll("teaching")).sort(
    (a, b) => a.frontmatter.week - b.frontmatter.week,
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-20 md:py-32">
      <PageHeader
        eyebrow="Ochudi / Teaching"
        title="Teaching."
        intro={`I lecture ${courseCode} (Problem Solving) at Pan-Atlantic University. These are my lesson notes, published openly. Use them however helps you.`}
      />

      <div className="mt-10 max-w-2xl space-y-5 text-body text-muted">
        <p>
          Most programming courses start with syntax. I start with problems:
          describe the solution in plain language first, then let the code
          follow. Syntax is the easy part once the thinking is right.
        </p>
        <p>
          The notes are public because lectures evaporate. A student who
          missed a week, or a stranger on the internet, should be able to sit
          with the same material and catch up.
        </p>
      </div>

      <ul className="mt-14">
        {lessons.map((lesson) => (
          <li key={lesson.slug} className="border-t border-rule last:border-b">
            <Link
              href={`/teaching/${lesson.slug}`}
              className="group grid gap-2 py-8 sm:grid-cols-[7rem_1fr_auto] sm:items-baseline sm:gap-6"
            >
              <span className="font-mono text-label uppercase text-muted">
                Week {String(lesson.frontmatter.week).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="font-serif text-h3 underline-offset-4 group-hover:underline">
                  {lesson.frontmatter.title}
                </span>
                <span className="mt-2 block text-body text-muted">
                  {lesson.frontmatter.summary}
                </span>
              </span>
              <span className="font-mono text-label uppercase text-ink">
                Read
              </span>
            </Link>
          </li>
        ))}
        {lessons.length === 0 && (
          <li className="border-t border-rule py-8 text-body text-muted">
            Notes land here as the semester runs.
          </li>
        )}
      </ul>
    </main>
  );
}
