import { describe, it, expect } from "vitest";
import {
  extractPushRepos,
  groupByDay,
  mergeCommits,
  relativeTime,
  type CommitRow,
} from "./github";
import { teachingWeekFor, weekCount } from "../content/teaching-calendar";

describe("extractPushRepos", () => {
  // Thin event shape, exactly what fine-grained tokens and unauthenticated
  // callers receive: no payload.commits.
  const events = [
    {
      type: "PushEvent",
      created_at: "2026-06-09T10:00:00Z",
      repo: { name: "ochudi/neoscribe" },
      payload: { push_id: 1, ref: "refs/heads/main", head: "abc" },
    },
    { type: "WatchEvent", repo: { name: "ochudi/starred" } },
    {
      type: "PushEvent",
      created_at: "2026-06-09T08:00:00Z",
      repo: { name: "ochudi/neoscribe" },
      payload: { push_id: 2 },
    },
    {
      type: "PushEvent",
      created_at: "2026-06-08T10:00:00Z",
      repo: { name: "ochudi/greyform.org" },
      payload: { push_id: 3 },
    },
    {
      type: "PushEvent",
      created_at: "2026-06-07T10:00:00Z",
      repo: { name: "ochudi/ochudi.com" },
      payload: { push_id: 4 },
    },
  ];

  it("returns distinct repos newest first, pushes only", () => {
    expect(extractPushRepos(events, 3)).toEqual([
      "ochudi/neoscribe",
      "ochudi/greyform.org",
      "ochudi/ochudi.com",
    ]);
  });

  it("caps at maxRepos", () => {
    expect(extractPushRepos(events, 1)).toEqual(["ochudi/neoscribe"]);
  });

  it("survives garbage input", () => {
    expect(extractPushRepos(null)).toEqual([]);
    expect(extractPushRepos([{ type: "PushEvent" }])).toEqual([]);
  });
});

describe("mergeCommits", () => {
  const perRepo = [
    {
      repo: "ochudi/neoscribe",
      commits: [
        {
          sha: "n1",
          commit: {
            message: "Wire streaming summaries into the editor pane with retry and backoff\n\nbody",
            author: { date: "2026-06-09T10:00:00Z" },
          },
        },
        {
          sha: "n2",
          commit: {
            message: "Add transcript export",
            author: { date: "2026-06-08T09:00:00Z" },
          },
        },
      ],
    },
    {
      repo: "ochudi/greyform.org",
      commits: [
        {
          sha: "g1",
          commit: {
            message: "Ship issue 14",
            author: { date: "2026-06-09T11:00:00Z" },
          },
        },
        // duplicate sha from a mirrored repo must not appear twice
        {
          sha: "n1",
          commit: {
            message: "duplicate",
            author: { date: "2026-06-09T10:00:00Z" },
          },
        },
        // missing date is dropped
        { sha: "g2", commit: { message: "no date" } },
      ],
    },
  ];

  it("merges, dedupes by sha, sorts newest first, strips owner", () => {
    const rows = mergeCommits(perRepo, 5);
    expect(rows.map((r) => r.sha)).toEqual(["g1", "n1", "n2"]);
    expect(rows[0].repo).toBe("greyform.org");
    expect(rows[1].repo).toBe("neoscribe");
  });

  it("keeps the first line and truncates at 60 chars", () => {
    const rows = mergeCommits(perRepo, 5);
    const long = rows.find((r) => r.sha === "n1");
    expect(long?.message.endsWith("…")).toBe(true);
    expect(long?.message.length).toBe(61);
    expect(rows.find((r) => r.sha === "n2")?.message).toBe(
      "Add transcript export",
    );
  });

  it("respects the limit", () => {
    expect(mergeCommits(perRepo, 2)).toHaveLength(2);
  });

  it("survives garbage input", () => {
    expect(mergeCommits([{ repo: "x/y", commits: null }])).toEqual([]);
    expect(mergeCommits([])).toEqual([]);
  });
});

describe("groupByDay", () => {
  const today = new Date("2026-06-11T15:00:00Z");
  const row = (iso: string): CommitRow => ({
    sha: iso,
    repo: "x",
    message: "m",
    createdAt: iso,
  });
  const rows = [
    row("2026-06-11T05:00:00Z"),
    row("2026-06-11T09:00:00Z"),
    row("2026-06-10T22:00:00Z"),
    row("2026-05-01T10:00:00Z"), // outside the 30-day window
  ];

  it("zero-fills the window, oldest first", () => {
    const days = groupByDay(rows, 30, today);
    expect(days).toHaveLength(30);
    expect(days[0].date).toBe("2026-05-13");
    expect(days[29].date).toBe("2026-06-11");
  });

  it("counts commits per day and excludes out-of-window rows", () => {
    const days = groupByDay(rows, 30, today);
    expect(days[29].count).toBe(2);
    expect(days[28].count).toBe(1);
    expect(days.reduce((s, d) => s + d.count, 0)).toBe(3);
  });

  it("handles empty input", () => {
    const days = groupByDay([], 30, today);
    expect(days).toHaveLength(30);
    expect(days.every((d) => d.count === 0)).toBe(true);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-06-10T12:00:00Z");

  it("scales units", () => {
    expect(relativeTime("2026-06-10T11:59:40Z", now)).toBe("just now");
    expect(relativeTime("2026-06-10T11:30:00Z", now)).toBe("30m ago");
    expect(relativeTime("2026-06-10T05:00:00Z", now)).toBe("7h ago");
    expect(relativeTime("2026-06-09T06:00:00Z", now)).toBe("1d ago");
    expect(relativeTime("2026-06-07T12:00:00Z", now)).toBe("3d ago");
    expect(relativeTime("2026-05-01T12:00:00Z", now)).toBe("5w ago");
  });

  it("handles bad input", () => {
    expect(relativeTime("nonsense", now)).toBe("");
  });
});

describe("teachingWeekFor", () => {
  it("is null before the semester", () => {
    expect(teachingWeekFor(new Date("2026-03-08T12:00:00Z"))).toBeNull();
  });

  it("starts at week 1", () => {
    expect(teachingWeekFor(new Date("2026-03-09T00:00:00Z"))?.week).toBe(1);
  });

  it("puts 2026-06-10 in week 14", () => {
    const result = teachingWeekFor(new Date("2026-06-10T09:00:00Z"));
    expect(result?.week).toBe(14);
    expect(result?.topic).toBe("Revision");
  });

  it("ends after the final week", () => {
    expect(teachingWeekFor(new Date("2026-06-21T12:00:00Z"))?.week).toBe(
      weekCount,
    );
    expect(teachingWeekFor(new Date("2026-06-22T00:00:00Z"))).toBeNull();
  });
});
