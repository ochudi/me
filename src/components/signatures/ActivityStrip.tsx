import { groupByDay } from "@/lib/github";
import { fetchRecentCommits } from "@/lib/github-fetch";

// 30 days of commit activity, one cell per day. Shares the cached GitHub
// fetch with NowDashboard, so it costs no extra requests.
export default async function ActivityStrip() {
  const commits = await fetchRecentCommits();
  const days = groupByDay(commits, 30, new Date());
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <section
      aria-label={`Commit activity, last 30 days, ${total} commits`}
      className="max-w-2xl"
    >
      <p className="font-mono text-label uppercase text-muted">
        Activity / last 30 days
      </p>
      <div aria-hidden className="mt-4 flex gap-1">
        {days.map((day) => (
          <div
            key={day.date}
            data-day={day.date}
            title={`${day.date}: ${day.count} ${day.count === 1 ? "commit" : "commits"}`}
            className={`h-8 flex-1 ${
              day.count === 0
                ? "bg-rule"
                : day.count < 3
                  ? "bg-muted"
                  : "bg-ink"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 font-mono text-label uppercase text-muted">
        {total} commits in 30 days
      </p>
    </section>
  );
}

/** Same silhouette while the strip streams in. */
export function ActivityStripSkeleton() {
  return (
    <section aria-hidden className="max-w-2xl">
      <div className="h-3 w-40 bg-rule motion-safe:animate-pulse" />
      <div className="mt-4 h-8 w-full bg-rule motion-safe:animate-pulse" />
      <div className="mt-3 h-3 w-32 bg-rule motion-safe:animate-pulse" />
    </section>
  );
}
