import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import Reveal from "@/components/Reveal";
import GlassCard from "@/components/opus-dei/GlassCard";
import PlanOfLife from "@/components/opus-dei/PlanOfLife";
import { site } from "@/lib/site";

// A quiet, unlisted page. noindex keeps it the easter egg it is: you reach it
// from the command palette or a shared link, not a search engine.
export const metadata: Metadata = {
  title: "Opus Dei",
  description: "A quiet corner. A way to pray, and to find your vocation.",
  robots: { index: false, follow: true },
};

const QUOTES = [
  {
    text: "Prayer is the foundation of the spiritual edifice. Prayer is all-powerful.",
    source: "The Way, 83",
  },
  {
    text: "You say you don't know how to pray? Put yourself in the presence of God, and as soon as you have said, “Lord, I don't know how to pray!”, you may be sure you have already begun.",
    source: "The Way, 90",
  },
  {
    text: "Prayer is not the prerogative of monks; it is a Christian undertaking of men and women of the world who know themselves to be children of God.",
    source: "Furrow, 451",
  },
  {
    text: "There is something holy, something divine, hidden in the most ordinary situations, and it is up to each one of you to discover it.",
    source: "Conversations, 114",
  },
  {
    text: "And what is the secret of perseverance? Love. Fall in Love, and you will not leave Him.",
    source: "The Way, 999",
  },
];

const VOCATION_PROMPTS = [
  {
    q: "Where is God already?",
    a: "Look at the work you would do anyway, the people beside you, the small duties of the day. The message of Opus Dei is that holiness is hidden there, not somewhere else.",
  },
  {
    q: "What are you for?",
    a: "Your human vocation, your profession, your family, your country, is a real part of your calling, not a distraction from it. You are meant to become a saint exactly where you are.",
  },
  {
    q: "Who is next to you?",
    a: "A vocation is rarely found alone. Bring it to prayer, talk it over with someone you trust, and let it grow quietly, like a seed.",
  },
];

const eyebrow = "font-mono text-label uppercase text-page/50";
const ghostLink =
  "inline-flex items-center gap-2 rounded-full border border-page/15 px-5 py-3 font-mono text-label uppercase text-page transition-colors duration-200 hover:border-page/40 focus-visible:outline-page";

export default function OpusDeiPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-page">
      {/* Ambient background: faint dot field plus soft greyscale glows. */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="dot-field absolute inset-0 opacity-[0.12]" />
        <div className="absolute left-1/2 top-[-10%] h-[55vh] w-[85vw] -translate-x-1/2 rounded-full bg-page/[0.06] blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-5%] h-[45vh] w-[55vw] rounded-full bg-page/[0.04] blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 pb-32 pt-10">
        {/* Top bar: mark home, discreet. */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Back to home"
            className="rounded-full text-page/80 transition-colors duration-200 hover:text-page focus-visible:outline-page"
          >
            <Logo variant="mark" size={28} animate />
          </Link>
          <Link
            href="/"
            className={`${eyebrow} transition-colors duration-200 hover:text-page focus-visible:outline-page`}
          >
            Back home
          </Link>
        </div>

        {/* Hero */}
        <header className="pt-20 md:pt-28">
          <p className="hero-rise font-mono text-label uppercase text-page/50">
            Opus Dei / A quiet corner
          </p>
          <h1
            className="hero-word mt-5 font-serif text-h1 italic leading-[1.05]"
            style={{ animationDelay: "60ms" }}
          >
            Finding God in ordinary work.
          </h1>
          <p
            className="hero-rise mt-8 max-w-prose text-body text-page/70"
            style={{ animationDelay: "200ms" }}
          >
            I am an Associate of Opus Dei. This is the part of my life that
            holds the rest together, so it gets a corner of the site. If you
            found your way here, it is yours to use: a simple way to stay
            close to God in the middle of a working day, and a few words to
            help you find what you are called to.
          </p>
        </header>

        {/* The message, in one line. */}
        <Reveal className="mt-20">
          <GlassCard className="p-8 sm:p-10">
            <p className={eyebrow}>The whole idea</p>
            <p className="mt-5 font-serif text-h2 italic">
              Sanctify your work. Sanctify yourself in your work. Sanctify
              others through your work.
            </p>
            <p className="mt-6 max-w-prose text-body text-page/70">
              You do not have to leave your job, your studies, or your home to
              find God. The ordinary day, done well and offered up, is the raw
              material of a holy life. That is the message St. Josemar&iacute;a
              Escriv&aacute; spent his life teaching.
            </p>
          </GlassCard>
        </Reveal>

        {/* Plan of life tracker */}
        <section className="mt-20">
          <Reveal>
            <p className={eyebrow}>Stay prayed up</p>
            <h2 className="mt-3 font-serif text-h2">A day with God in it.</h2>
            <p className="mt-5 max-w-prose text-body text-page/70">
              These are the ordinary practices that keep the line to God open
              through the day. Start small, keep it honest, and let it grow.
              The list resets every morning, so each day is a fresh beginning,
              not a streak to protect. It is saved only on this device.
            </p>
          </Reveal>
          <Reveal delay={80} className="mt-8">
            <PlanOfLife />
          </Reveal>
        </section>

        {/* Words to carry */}
        <section className="mt-20">
          <Reveal>
            <p className={eyebrow}>Words to carry</p>
            <h2 className="mt-3 font-serif text-h2">From St. Josemar&iacute;a.</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {QUOTES.map((quote, i) => (
              <Reveal key={quote.source} delay={(i % 2) * 60}>
                <GlassCard className="flex h-full flex-col justify-between gap-6 p-7">
                  <p className="font-serif text-h3 italic leading-snug text-page/90">
                    &ldquo;{quote.text}&rdquo;
                  </p>
                  <p className={eyebrow}>{quote.source}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Vocation */}
        <section className="mt-20">
          <Reveal>
            <p className={eyebrow}>Your vocation</p>
            <h2 className="mt-3 font-serif text-h2">
              What if holiness was just this life, lived well?
            </h2>
            <p className="mt-5 max-w-prose text-body text-page/70">
              A vocation is not only for priests and nuns. Everyone is called
              to holiness, and for most people the path runs straight through
              an ordinary life. Three questions to sit with, slowly.
            </p>
          </Reveal>
          <div className="mt-8 flex flex-col gap-5">
            {VOCATION_PROMPTS.map((prompt, i) => (
              <Reveal key={prompt.q} delay={i * 60}>
                <GlassCard className="p-7 sm:p-8">
                  <h3 className="font-serif text-h3 italic">{prompt.q}</h3>
                  <p className="mt-4 max-w-prose text-body text-page/70">
                    {prompt.a}
                  </p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Go deeper */}
        <section className="mt-20">
          <Reveal>
            <GlassCard className="p-8 sm:p-10">
              <p className={eyebrow}>Go deeper</p>
              <h2 className="mt-3 font-serif text-h2">Read on.</h2>
              <p className="mt-5 max-w-prose text-body text-page/70">
                Opus Dei is a part of the Catholic Church that helps ordinary
                people find God in daily life. If something here stirred you,
                these are the places I would send you next. You can also just
                reach out to me.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="https://opusdei.org/en-us/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ghostLink}
                >
                  opusdei.org
                </a>
                <a
                  href="https://escriva.org/en/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ghostLink}
                >
                  escriva.org
                </a>
                <a href={`mailto:${site.email}`} className={ghostLink}>
                  Email me
                </a>
              </div>
            </GlassCard>
          </Reveal>
        </section>

        <Reveal className="mt-20">
          <p className="text-center font-serif text-h3 italic text-page/50">
            Omnia in bonum.
          </p>
        </Reveal>
      </div>
    </main>
  );
}
