"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Mirrors WORK_TYPES in lib/content.ts; not imported because that module
// reads the filesystem and cannot enter a client bundle.
type WorkType = "client" | "research" | "internal" | "side";

export type WorkIndexEntry = {
  slug: string;
  title: string;
  year: number;
  summary: string;
  stack: string[];
  type: WorkType;
  cover?: string;
};

const FILTERS: Array<{ key: WorkType | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "client", label: "Client work" },
  { key: "research", label: "Research" },
  { key: "internal", label: "Internal" },
  { key: "side", label: "Side projects" },
];

export default function WorkIndex({ entries }: { entries: WorkIndexEntry[] }) {
  const [filter, setFilter] = useState<WorkType | "all">("all");
  const visible =
    filter === "all" ? entries : entries.filter((e) => e.type === filter);

  return (
    <div className="mt-12">
      <div
        role="group"
        aria-label="Filter work"
        className="flex flex-wrap gap-3"
      >
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`border px-4 py-2 font-mono text-label uppercase transition-colors duration-200 ${
              filter === key
                ? "border-ink bg-ink text-page"
                : "border-rule text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-14">
        {visible.map((entry, i) => (
          <article
            key={entry.slug}
            data-work-row
            className="grid gap-8 border-t border-rule py-12 md:py-16 lg:grid-cols-2 lg:items-center lg:gap-16"
          >
            <div
              aria-hidden={!entry.cover}
              data-cover
              className={`relative aspect-[16/10] w-full overflow-hidden border border-rule bg-rule/40 ${
                i % 2 === 1 ? "lg:order-2" : ""
              }`}
            >
              {entry.cover && (
                <Image
                  src={entry.cover}
                  alt={`${entry.title} cover`}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <p className="font-mono text-label uppercase text-muted">
                {String(i + 1).padStart(2, "0")} / {entry.year}
              </p>
              <h2 className="font-serif text-h2">{entry.title}</h2>
              <p className="max-w-prose text-body text-muted">
                {entry.summary}
              </p>
              <p className="font-mono text-label uppercase text-muted">
                {entry.stack.join(" / ")}
              </p>
              <div className="mt-2">
                <Link
                  href={`/work/${entry.slug}`}
                  className="font-mono text-label uppercase text-ink underline decoration-rule underline-offset-4 transition-colors duration-200 hover:decoration-ink"
                >
                  Read
                </Link>
              </div>
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="border-t border-rule py-12 text-body text-muted">
            Nothing in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
