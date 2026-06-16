import type { Metadata } from "next";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import { personJsonLd } from "@/lib/jsonld";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Chudi Ofoma builds AI products, teaches computer science, and researches unsupervised clustering from Lagos.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20 md:py-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <PageHeader eyebrow="Ochudi / About" title="About." />

      <p className="mt-10 max-w-3xl font-serif text-h2">
        I&apos;m Chudi. I build AI products, teach computer science, and
        research unsupervised clustering. I&apos;m based in Lagos.
      </p>

      <div
        data-photo-slot
        className="relative mt-12 aspect-[4/5] w-full max-w-sm overflow-hidden border border-rule bg-rule/40"
      >
        <Image
          src="/images/chudi.jpg"
          alt="Chudi Ofoma smiling at the camera"
          fill
          sizes="(min-width: 640px) 384px, 100vw"
          className="object-cover object-top"
          priority
        />
      </div>

      <div className="mt-16 max-w-2xl space-y-12">
        <section>
          <h2 className="font-serif text-h2">Day job</h2>
          <p className="mt-5 text-body">
            I&apos;m an AI engineer at Plural Health. Most of my time goes
            into NeoScribe, an internal tool that turns clinical
            conversations into structured notes a clinician approves rather
            than writes. The hard problems are reliability and trust, not
            demos.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-h2">Teaching</h2>
          <p className="mt-5 text-body">
            I lecture COS 102, Problem Solving, at Pan-Atlantic University.
            That is 160+ students a semester, most of them writing their
            first programs. The lesson notes are public on this site; start
            at week 1 and you can follow the whole course without being
            enrolled.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-h2">Research</h2>
          <p className="mt-5 text-body">
            My research applies unsupervised clustering to industrial
            quality control. The current work groups grain structures in
            steel micrographs without labelled data, weighing k-means
            against density methods like DBSCAN. The canvas on the homepage
            is the same mathematics running live.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-h2">Greyform</h2>
          <p className="mt-5 text-body">
            <a
              href="https://www.greyform.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Greyform
            </a>{" "}
            is my studio. It built this site, ipheclan.com, and the
            Whitesands School reset. It exists because some projects deserve
            more care than a side project gets and less ceremony than an
            agency brings.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-h2">Other</h2>
          <p className="mt-5 text-body">
            Outside work I help run formation programmes for university
            students. I read slowly and reread often. Music stays on while I
            code; the now page says what is playing this week.
          </p>
        </section>
      </div>

      <p className="mt-16 max-w-2xl text-body">
        Best way to reach me is email.{" "}
        <a
          href={`mailto:${site.email}`}
          className="underline underline-offset-4"
        >
          {site.email}
        </a>
        .
      </p>
    </main>
  );
}
