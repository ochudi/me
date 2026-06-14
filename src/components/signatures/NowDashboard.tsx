import { getNow } from "@/lib/content";
import { relativeTime } from "@/lib/github";
import { fetchRecentCommits } from "@/lib/github-fetch";
import {
  courseCode,
  teachingWeekFor,
  weekCount,
} from "@/content/teaching-calendar";
import NowInfo from "./NowInfo";

const QUIET_LINE = "GitHub is quiet right now.";

const eyebrowClass = "font-mono text-label uppercase text-page/50";

export default async function NowDashboard() {
  const commits = (await fetchRecentCommits()).slice(0, 5);
  const now = await getNow();
  const week = teachingWeekFor(new Date());
  const renderedAt = new Date();

  const weekLine = week
    ? `Week ${week.week} of ${weekCount}, ${courseCode}: ${week.topic}.`
    : "Semester break.";

  return (
    <section className="relative w-full border border-rule-dark bg-page-dark p-6 font-mono text-page md:p-10">
      <NowInfo />

      {/* min-w-0 on both columns: grid items otherwise refuse to shrink
          below the nowrap commit lines and blow out narrow viewports. */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0">
          <p className={eyebrowClass}>Right now</p>
          {now ? (
            <>
              <p className="mt-5 max-w-prose font-serif text-h3 text-page">
                {now.frontmatter.focus}
              </p>
              <div className="mt-6 flex flex-col gap-2 text-sm text-page/70">
                <p>
                  <span className="text-page/50">Reading </span>
                  {now.frontmatter.reading}
                </p>
                {now.frontmatter.listening && (
                  <p>
                    <span className="text-page/50">Listening </span>
                    {now.frontmatter.listening}
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-5 text-sm text-page/70">
              now.md is missing. Add it to bring this column back.
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <p className={eyebrowClass}>Recent commits</p>
          {commits.length > 0 ? (
            <ul className="mt-4">
              {commits.map((commit) => (
                <li
                  key={commit.sha}
                  className="flex items-baseline gap-3 border-b border-rule-dark py-2.5 text-sm last:border-b-0"
                >
                  <span className="shrink-0 font-bold">{commit.repo}</span>
                  <span className="min-w-0 flex-1 truncate text-page/70">
                    {commit.message}
                  </span>
                  <span className="shrink-0 text-page/50">
                    {relativeTime(commit.createdAt, renderedAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-page/70">{QUIET_LINE}</p>
          )}
          <p className="mt-6 text-sm text-page/70">{weekLine}</p>
        </div>
      </div>

      {now && (
        <p className="mt-10 text-right font-mono text-label uppercase text-page/50">
          Last updated / {now.frontmatter.updated}
        </p>
      )}
    </section>
  );
}

/** Same card silhouette while the dashboard streams in. */
export function NowDashboardSkeleton() {
  const bar = "bg-rule-dark motion-safe:animate-pulse";
  return (
    <section
      aria-hidden
      className="w-full border border-rule-dark bg-page-dark p-6 md:p-10"
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className={`h-3 w-20 ${bar}`} />
          <div className={`mt-6 h-7 w-3/4 ${bar}`} />
          <div className={`mt-7 h-3 w-1/2 ${bar}`} />
          <div className={`mt-3 h-3 w-2/5 ${bar}`} />
        </div>
        <div>
          <div className={`h-3 w-28 ${bar}`} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`mt-4 h-3 w-full ${bar}`} />
          ))}
          <div className={`mt-6 h-3 w-1/3 ${bar}`} />
        </div>
      </div>
      <div className={`ml-auto mt-10 h-3 w-44 ${bar}`} />
    </section>
  );
}
