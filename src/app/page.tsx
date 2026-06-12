import { Suspense } from "react";
import Link from "next/link";
import CanvasGate from "@/components/signatures/CanvasGate";
import NowDashboard, {
  NowDashboardSkeleton,
} from "@/components/signatures/NowDashboard";
import { Logo } from "@/components/Logo";
import Reveal from "@/components/Reveal";
import SmoothScroll from "@/components/SmoothScroll";
import { getAll, readingMinutes } from "@/lib/content";
import { personJsonLd } from "@/lib/jsonld";
import { courseCode } from "@/content/teaching-calendar";

const EMAIL = "ofoma.chudi@gmail.com";

const HEADLINE_WORDS = ["Chudi", "Ofoma."];

const FEATURED_WORK = [
  {
    client: "Iphe Clan",
    title: "ipheclan.com",
    summary:
      "Personal brand site for a TikTok creator with 4 million followers. One page, one voice, built to hold up under traffic spikes from viral posts.",
    href: "/work/ipheclan",
  },
  {
    client: "Whitesands School",
    title: "Whitesands School",
    summary:
      "Digital reset for a 25-year-old Lagos school. New site, new admissions flow, and a design system the staff can run without a developer.",
    href: "/work/whitesands",
  },
  {
    client: "Plural Health",
    title: "NeoScribe",
    summary:
      "Internal AI documentation tool at Plural Health. Turns clinical conversations into structured notes that clinicians approve rather than write.",
    href: null,
  },
] as const;

const ghostLinkDark =
  "border border-rule-dark px-5 py-3 font-mono text-label uppercase text-page transition-colors duration-200 hover:border-page/70";

const inlineLink =
  "font-mono text-label uppercase text-ink underline decoration-rule underline-offset-4 transition-colors duration-200 hover:decoration-ink";

const eyebrowLight = "font-mono text-label uppercase text-muted";

export default function Home() {
  const essays = getAll("writing").slice(0, 2);
  const deployed = process.env.NEXT_PUBLIC_BUILD_DATE ?? "unreleased";

  return (
    <>
      <SmoothScroll />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <main>
      {/* 1. Hero */}
      <section className="relative grid min-h-dvh bg-ink text-page lg:grid-cols-5">
        <div className="flex flex-col justify-center gap-8 px-6 pb-6 pt-28 sm:px-10 lg:col-span-3 lg:py-0 lg:pl-16 lg:pr-10">
          <p
            className="hero-rise font-mono text-label uppercase text-page/60"
            style={{ animationDelay: "0ms" }}
          >
            AI engineer / Lecturer / Researcher
          </p>
          <h1 className="font-serif text-display italic">
            {HEADLINE_WORDS.map((word, i) => (
              <span
                key={word}
                className="hero-word inline-block"
                style={{ animationDelay: `${60 + i * 60}ms` }}
              >
                {word}
                {i < HEADLINE_WORDS.length - 1 ? " " : ""}
              </span>
            ))}
          </h1>
          {/* hero-word, not hero-rise: the subline is the largest text on
              small screens, so it must never first-paint at opacity 0 or
              LCP slips to wherever the fade ends. */}
          <p
            className="hero-word max-w-prose font-serif text-h3 text-page/80"
            style={{ animationDelay: "240ms" }}
          >
            Building AI products at Plural Health. Teaching computer science
            at Pan-Atlantic University. Researching clustering for industrial
            quality control.
          </p>
          <div
            className="hero-rise flex flex-wrap gap-4"
            style={{ animationDelay: "320ms" }}
          >
            <Link href="/work" className={ghostLinkDark}>
              View work
            </Link>
            <Link href="/writing" className={ghostLinkDark}>
              Read writing
            </Link>
          </div>
        </div>
        <div className="relative h-[420px] lg:col-span-2 lg:h-auto">
          <div aria-hidden className="dot-field absolute inset-0 sm:hidden" />
          <div className="absolute inset-0 hidden sm:block">
            <CanvasGate algorithm="kmeans" pointCount={500} theme="dark" />
          </div>
        </div>
        <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-label uppercase text-page/60">
          Scroll
        </p>
      </section>

      {/* 2. Now */}
      <section className="bg-page-dark py-20 text-page md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <h2 className="font-serif text-h2 italic">Right now</h2>
          </Reveal>
          <Reveal delay={60} className="mt-10">
            <Suspense fallback={<NowDashboardSkeleton />}>
              <NowDashboard />
            </Suspense>
          </Reveal>
        </div>
      </section>

      {/* 3. Selected work */}
      <section className="bg-page py-20 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <p className={eyebrowLight}>01 / Work</p>
            <h2 className="mt-3 font-serif text-h2">What I&apos;m building.</h2>
          </Reveal>

          <div className="mt-14">
            {FEATURED_WORK.map((work, i) => (
              <Reveal key={work.title} delay={i * 60}>
                <article className="grid gap-8 border-t border-rule py-12 md:py-16 lg:grid-cols-2 lg:items-center lg:gap-16">
                  <div
                    aria-hidden
                    className={`aspect-[16/10] w-full border border-rule bg-rule/40 ${
                      i % 2 === 1 ? "lg:order-2" : ""
                    }`}
                  />
                  <div className="flex flex-col gap-4">
                    <p className={eyebrowLight}>{work.client}</p>
                    <h3 className="font-serif text-h2">{work.title}</h3>
                    <p className="max-w-prose text-body text-muted">
                      {work.summary}
                    </p>
                    <div className="mt-2">
                      {work.href ? (
                        <Link href={work.href} className={inlineLink}>
                          Read the case study
                        </Link>
                      ) : (
                        <span className="font-mono text-label uppercase text-muted">
                          Case study on request
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="border-t border-rule pt-10">
            <Link href="/work" className={inlineLink}>
              View all work
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 4. Selected writing */}
      <section className="bg-page py-20 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <p className={eyebrowLight}>02 / Writing</p>
            <h2 className="mt-3 font-serif text-h2">
              What I&apos;m thinking about.
            </h2>
          </Reveal>

          <div className="mt-14">
            {essays.map((essay, i) => (
              <Reveal key={essay.slug} delay={i * 60}>
                <Link
                  href={`/writing/${essay.slug}`}
                  className="group flex flex-col gap-3 border-t border-rule py-8 last:border-b sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                >
                  <span className="flex max-w-prose flex-col gap-2">
                    <span className="font-serif text-h3 underline-offset-4 group-hover:underline">
                      {essay.frontmatter.title}
                    </span>
                    <span className="text-body text-muted">
                      {essay.frontmatter.description}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-label uppercase text-muted">
                    {essay.frontmatter.date} / {readingMinutes(essay.content)} min
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal className="border-t border-rule pt-10">
            <Link href="/writing" className={inlineLink}>
              View all writing
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 5. Teaching teaser */}
      <section className="bg-page py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <p className={eyebrowLight}>03 / Teaching</p>
            <h2 className="mt-3 font-serif text-h2">
              Currently teaching {courseCode} at PAU.
            </h2>
            <p className="mt-6 max-w-prose text-body text-muted">
              The lecture notes, lab exercises, and week-by-week plan are
              public. Students use them to catch up; everyone else is welcome
              to read along.
            </p>
            <div className="mt-8">
              <Link href="/teaching" className={inlineLink}>
                Browse lessons
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. About teaser */}
      <section className="bg-ink py-20 text-page md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <h2 className="font-serif text-h2 italic">Other things to know.</h2>
            <p className="mt-6 max-w-prose text-body text-page/70">
              I build AI products at Plural Health and teach computer science
              at Pan-Atlantic University. My research applies clustering to
              industrial quality control, starting with steel micrographs.
              Lagos is home; the work is global.
            </p>
            <div className="mt-8">
              <Link
                href="/about"
                className="font-mono text-label uppercase text-page underline decoration-rule-dark underline-offset-4 transition-colors duration-200 hover:decoration-page"
              >
                Read the longer story
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
      </main>

      {/* 7. Footer */}
      <footer className="border-t border-rule-dark bg-ink py-16 text-page">
        <div className="mx-auto max-w-6xl px-6 pb-12">
          <Logo variant="lockup" size={28} animate />
        </div>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 font-mono text-sm sm:grid-cols-3">
          <div>
            <p className="text-label uppercase text-page/50">Contact</p>
            <ul className="mt-4 flex flex-col gap-2 text-page/70">
              <li>
                <a href={`mailto:${EMAIL}`} className="hover:text-page">
                  {EMAIL}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ochudi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-page"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/ochudi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-page"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/ochudi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-page"
                >
                  X
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-label uppercase text-page/50">Pages</p>
            <ul className="mt-4 flex flex-col gap-2 text-page/70">
              <li>
                <Link href="/about" className="hover:text-page">
                  About
                </Link>
              </li>
              <li>
                <Link href="/work" className="hover:text-page">
                  Work
                </Link>
              </li>
              <li>
                <Link href="/writing" className="hover:text-page">
                  Writing
                </Link>
              </li>
              <li>
                <Link href="/teaching" className="hover:text-page">
                  Teaching
                </Link>
              </li>
              <li>
                <Link href="/now" className="hover:text-page">
                  Now
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-label uppercase text-page/50">Meta</p>
            <ul className="mt-4 flex flex-col gap-2 text-page/70">
              <li>
                <a
                  href="https://greyform.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-page"
                >
                  Built by Greyform
                </a>
              </li>
              <li>Lagos, Nigeria</li>
              <li>Deployed {deployed}</li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
