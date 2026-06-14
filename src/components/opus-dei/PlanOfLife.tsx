"use client";

import { useEffect, useMemo, useState } from "react";
import { glassClass } from "./GlassCard";

// A daily "plan of life" tracker. The norms below are the ordinary practices
// Opus Dei suggests for finding God through the day; checking them off is a
// small, private way to stay prayed up. State is kept per-day in
// localStorage and resets on its own each morning, so it is a fresh start
// every day rather than a streak to defend.
type Norm = {
  id: string;
  name: string;
  when: string;
  note: string;
};

const NORMS: Norm[] = [
  {
    id: "morning-offering",
    name: "Morning offering",
    when: "On waking",
    note: "Offer the whole day to God before anything else begins.",
  },
  {
    id: "mental-prayer",
    name: "Mental prayer",
    when: "Morning",
    note: "A fixed time, alone, talking with God as a child talks to a father.",
  },
  {
    id: "mass",
    name: "Holy Mass and Communion",
    when: "Daily",
    note: "The centre and root of the day, where everything else is gathered up.",
  },
  {
    id: "angelus",
    name: "The Angelus",
    when: "Noon",
    note: "A pause at midday to remember the Word made flesh.",
  },
  {
    id: "rosary",
    name: "Holy Rosary",
    when: "Evening",
    note: "Walk through the life of Christ at the side of his Mother.",
  },
  {
    id: "reading",
    name: "Spiritual reading",
    when: "Daily",
    note: "A few minutes of the Gospel and a book that lifts the soul.",
  },
  {
    id: "examination",
    name: "Examination of conscience",
    when: "Night",
    note: "Look back over the day with God before sleep, in peace, not in fear.",
  },
  {
    id: "hail-marys",
    name: "Three Hail Marys",
    when: "Last thing",
    note: "For a clean heart, the very last thing before rest.",
  },
];

const KEY_PREFIX = "ochudi.plan.";

// Local calendar date as YYYY-MM-DD, so the plan rolls over at the user's
// own midnight rather than UTC.
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${KEY_PREFIX}${d.getFullYear()}-${m}-${day}`;
}

function readDone(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export default function PlanOfLife() {
  // Empty on first render so server and client markup match; the saved state
  // loads after mount.
  const [done, setDone] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDone(readDone(todayKey()));
    setReady(true);
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(todayKey(), JSON.stringify([...next]));
      } catch {
        // Private mode or full quota: the tracker just will not persist.
      }
      return next;
    });
  };

  const count = done.size;
  const total = NORMS.length;
  const complete = ready && count === total;

  const status = useMemo(() => {
    if (!ready) return " ";
    if (complete) return "The day is His. Rest well.";
    if (count === 0) return "Begin where you are.";
    return `${count} of ${total} today`;
  }, [ready, complete, count, total]);

  return (
    <div className={`${glassClass} p-6 sm:p-8`}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-h3">A plan of life</h3>
        <p
          aria-live="polite"
          className="font-mono text-label uppercase text-page/50"
        >
          {status}
        </p>
      </div>

      {/* Hairline progress bar, greyscale only. */}
      <div className="mt-5 h-px w-full bg-page/10" aria-hidden>
        <div
          className="h-px bg-page/60 transition-[width] duration-500 ease-out"
          style={{ width: ready ? `${(count / total) * 100}%` : "0%" }}
        />
      </div>

      <ul className="mt-6 flex flex-col">
        {NORMS.map((norm) => {
          const isDone = done.has(norm.id);
          return (
            <li key={norm.id} className="border-t border-page/10 first:border-t-0">
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                onClick={() => toggle(norm.id)}
                className="group flex w-full items-start gap-4 py-4 text-left transition-opacity duration-200 focus-visible:outline-page"
              >
                {/* Check box: square hairline that fills when done. */}
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border transition-colors duration-200 ${
                    isDone
                      ? "border-page bg-page text-ink"
                      : "border-page/30 text-transparent group-hover:border-page/60"
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6.5l2.5 2.5 4.5-5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span
                      className={`font-serif text-h3 transition-colors duration-200 ${
                        isDone ? "text-page/40 line-through decoration-page/30" : "text-page"
                      }`}
                    >
                      {norm.name}
                    </span>
                    <span className="font-mono text-label uppercase text-page/40">
                      {norm.when}
                    </span>
                  </span>
                  <span className="text-body text-page/60">{norm.note}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
