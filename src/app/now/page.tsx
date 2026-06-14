import { Suspense } from "react";
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ActivityStrip, {
  ActivityStripSkeleton,
} from "@/components/signatures/ActivityStrip";
import NowDashboard, {
  NowDashboardSkeleton,
} from "@/components/signatures/NowDashboard";
import { getNow } from "@/lib/content";

export const metadata: Metadata = {
  title: "Now",
  description: "What I am focused on right now.",
};

export default async function NowPage() {
  const now = await getNow();
  const thinking = now?.frontmatter.thinking ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-20 md:py-32">
      <PageHeader eyebrow="Ochudi / Now" title="Now." />
      <p className="mt-4 font-serif italic text-muted">
        Inspired by{" "}
        <a
          href="https://sivers.org/now"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          Derek Sivers&apos; /now movement
        </a>
        .
      </p>

      <div className="mt-12">
        <Suspense fallback={<NowDashboardSkeleton />}>
          <NowDashboard />
        </Suspense>
      </div>

      <div className="mt-16">
        <Suspense fallback={<ActivityStripSkeleton />}>
          <ActivityStrip />
        </Suspense>
      </div>

      {now?.frontmatter.not_doing && (
        <section className="mt-16 max-w-2xl">
          <h2 className="font-serif text-h2">
            What I&apos;m consciously not doing
          </h2>
          <p className="mt-5 text-body text-muted">
            {now.frontmatter.not_doing}
          </p>
        </section>
      )}

      {thinking.length > 0 && (
        <section className="mt-16 max-w-2xl">
          <h2 className="font-serif text-h2">
            Things I&apos;m thinking about
          </h2>
          <ul className="mt-5">
            {thinking.map((thought) => (
              <li
                key={thought}
                className="border-b border-rule py-4 text-body last:border-b-0"
              >
                {thought}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
