// Tiny local stand-in for the GitHub API, serving the two endpoints the Now
// dashboard uses: public events (thin payloads, like real fine-grained or
// unauthenticated responses) and per-repo commits. Lets the success path be
// exercised without a token or network:
//   node scripts/mock-github.mjs &
//   GITHUB_API_BASE=http://localhost:3210 npm run build
// Port: 3210.

import { createServer } from "node:http";

const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 3600000).toISOString();

const events = [
  {
    type: "PushEvent",
    created_at: hoursAgo(2),
    repo: { name: "ochudi/neoscribe" },
    payload: { push_id: 1, ref: "refs/heads/main", head: "f1" },
  },
  { type: "WatchEvent", created_at: hoursAgo(3), repo: { name: "x/y" }, payload: {} },
  {
    type: "PushEvent",
    created_at: hoursAgo(26),
    repo: { name: "ochudi/greyform.org" },
    payload: { push_id: 2, ref: "refs/heads/main", head: "f3" },
  },
  {
    type: "PushEvent",
    created_at: hoursAgo(70),
    repo: { name: "ochudi/ochudi.com" },
    payload: { push_id: 3, ref: "refs/heads/main", head: "f4" },
  },
];

const commitsByRepo = {
  "ochudi/neoscribe": [
    {
      sha: "f1",
      commit: {
        message:
          "Wire streaming summaries into the editor pane with retry and backoff\n\nLong body dropped.",
        author: { date: hoursAgo(2) },
      },
    },
    {
      sha: "f2",
      commit: { message: "Add transcript export", author: { date: hoursAgo(5) } },
    },
  ],
  "ochudi/greyform.org": [
    {
      sha: "f3",
      commit: { message: "Ship issue 14", author: { date: hoursAgo(26) } },
    },
    {
      sha: "f1",
      commit: { message: "duplicate sha, must not appear twice", author: { date: hoursAgo(2) } },
    },
  ],
  "ochudi/ochudi.com": [
    {
      sha: "f4",
      commit: { message: "Tune cluster morph timings", author: { date: hoursAgo(70) } },
    },
    {
      sha: "f5",
      commit: { message: "Command palette history recall", author: { date: hoursAgo(71) } },
    },
  ],
};

createServer((req, res) => {
  const url = req.url ?? "";
  if (url.startsWith("/users/") && url.includes("/events/public")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(events));
    return;
  }
  const repoMatch = url.match(/^\/repos\/([^/]+\/[^/]+)\/commits/);
  if (repoMatch) {
    const commits = commitsByRepo[decodeURIComponent(repoMatch[1])] ?? [];
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(commits));
    return;
  }
  res.writeHead(404).end();
}).listen(3210, () => console.log("mock github on :3210"));
