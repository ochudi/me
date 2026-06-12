import {
  extractPushRepos,
  mergeCommits,
  type CommitRow,
} from "./github";

/**
 * Recent commits across the repos the user pushed to lately. Two stages
 * because the events API omits commit payloads for fine-grained tokens and
 * unauthenticated callers: events name the recently pushed repos, the
 * per-repo commits endpoint provides the commits. Every fetch revalidates
 * hourly and the URLs are identical wherever this is called, so the
 * dashboard and the activity strip share one set of cached requests. Any
 * failure degrades to an empty list.
 */
export async function fetchRecentCommits(): Promise<CommitRow[]> {
  const username = process.env.GITHUB_USERNAME;
  if (!username) return [];
  const token = process.env.GITHUB_TOKEN;
  const base = process.env.GITHUB_API_BASE ?? "https://api.github.com";
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const eventsRes = await fetch(
      `${base}/users/${username}/events/public?per_page=100`,
      { headers, next: { revalidate: 3600 } },
    );
    if (!eventsRes.ok) return [];
    const repos = extractPushRepos(await eventsRes.json(), 3);
    if (repos.length === 0) return [];

    const perRepo = await Promise.all(
      repos.map(async (fullRepo) => {
        try {
          const res = await fetch(
            `${base}/repos/${fullRepo}/commits?author=${username}&per_page=100`,
            { headers, next: { revalidate: 3600 } },
          );
          if (!res.ok) return { repo: fullRepo, commits: [] };
          return { repo: fullRepo, commits: await res.json() };
        } catch {
          return { repo: fullRepo, commits: [] };
        }
      }),
    );
    return mergeCommits(perRepo, 300);
  } catch {
    return [];
  }
}
