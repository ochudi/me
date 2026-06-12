// Pure helpers for the Now dashboard's GitHub column. The fetches live in
// the server component; everything here is testable without a network.
//
// Why two endpoints: the events API returns PushEvent payloads without the
// commits array unless the request is authenticated with a classic token
// (fine-grained tokens and unauthenticated callers get the thin shape). So
// events only identify which repos were pushed recently, and the commits
// themselves come from the per-repo commits endpoint, which works with any
// auth including none.

export type GitHubEvent = {
  type?: string;
  created_at?: string;
  repo?: { name?: string };
};

export type RepoCommit = {
  sha?: string;
  commit?: {
    message?: string;
    author?: { date?: string };
    committer?: { date?: string };
  };
};

export type CommitRow = {
  sha: string;
  repo: string;
  message: string;
  createdAt: string;
};

const MESSAGE_LIMIT = 60;

/** Distinct "owner/repo" names from the newest PushEvents, newest first. */
export function extractPushRepos(events: unknown, maxRepos = 3): string[] {
  if (!Array.isArray(events)) return [];
  const repos: string[] = [];
  for (const event of events as GitHubEvent[]) {
    if (repos.length >= maxRepos) break;
    if (event?.type !== "PushEvent") continue;
    const name = event.repo?.name;
    if (typeof name !== "string" || !name.includes("/")) continue;
    if (!repos.includes(name)) repos.push(name);
  }
  return repos;
}

/**
 * Merges per-repo commit lists into display rows: dedupes by sha, sorts by
 * commit date newest first, strips the owner from the repo name, keeps the
 * first message line truncated to 60 characters.
 */
export function mergeCommits(
  perRepo: Array<{ repo: string; commits: unknown }>,
  limit = 5,
): CommitRow[] {
  const seen = new Set<string>();
  const rows: CommitRow[] = [];

  for (const { repo: fullRepo, commits } of perRepo) {
    if (!Array.isArray(commits)) continue;
    const repo = fullRepo.includes("/")
      ? fullRepo.slice(fullRepo.indexOf("/") + 1)
      : fullRepo;

    for (const item of commits as RepoCommit[]) {
      const sha = item?.sha;
      if (!sha || seen.has(sha)) continue;
      const createdAt =
        item.commit?.author?.date ?? item.commit?.committer?.date;
      if (!createdAt) continue;
      seen.add(sha);

      const firstLine = (item.commit?.message ?? "").split("\n")[0];
      const message =
        firstLine.length > MESSAGE_LIMIT
          ? `${firstLine.slice(0, MESSAGE_LIMIT)}…`
          : firstLine;

      rows.push({ sha, repo: repo || "unknown", message, createdAt });
    }
  }

  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return rows.slice(0, limit);
}

export type DayCount = { date: string; count: number };

/**
 * Commits per UTC day over the trailing `days` window ending at `today`,
 * inclusive and zero-filled, oldest first. Drives the activity strip.
 */
export function groupByDay(
  rows: CommitRow[],
  days: number,
  today: Date,
): DayCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const day = row.createdAt.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(todayUtc - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

/** Coarse relative time for server-side rendering: 5m, 3h, 2d, 4w ago. */
export function relativeTime(iso: string, now: Date): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, (now.getTime() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 14) return `${Math.floor(days)}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
