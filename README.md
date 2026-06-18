# ochudi.com

Personal site for Chukwudi Ofoma, live at [ochudi.com](https://ochudi.com). One
codebase serves three things: a portfolio, a set of open teaching notes, and a
few interactive pieces tied to clustering research.

Content is authored in Markdown, stored in Supabase, and editable through an
authenticated `/admin` CMS. The bundled MDX files are both the seed source and a
fallback, so the site renders even with no database configured.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3, tokens in `tailwind.config.ts` |
| Content | Markdown via `next-mdx-remote/rsc`, frontmatter validated with Zod |
| Data | Supabase (Postgres, Storage, Auth) |
| Auth | Supabase magic link, gated by an email allowlist |
| Media | Cloudinary delivery CDN |
| Tests | Vitest, plus axe-core and Lighthouse verification scripts |
| Hosting | Vercel |

Node 20 is the supported runtime (matches CI).

---

## Architecture

A few decisions explain most of the codebase.

**Database first, files as fallback.** Every content read goes through
`src/lib/content.ts`. It queries Supabase first and falls back to the MDX/JSON
files in `src/content` when Supabase is unconfigured or unreachable. The site
never goes blank, and it runs locally and in CI with no secrets.
`supabaseConfigured` in `src/lib/supabase/env.ts` is the single switch.

**Reads are cookieless, so pages stay static.** Public reads use
`createSupabasePublicClient` (`src/lib/supabase/public.ts`), which never touches
request cookies. That keeps pages statically rendered or ISR rather than forced
dynamic. The cookie-bound client (`server.ts`) is used only under `/admin` and
`/auth`.

**Frontmatter is the schema.** `content.ts` defines a Zod schema per
collection. A row or file that fails validation is dropped, not rendered broken.

**The admin is config-driven.** `src/lib/admin/fields.ts` is the single source
for each collection's fields. Forms, save parsing, and list columns derive from
it. Adding a field is a one-line change there (plus the matching Zod field and
a column in the table).

**Shared database.** Tables are prefixed `ochudi_` so this Supabase project can
be shared across unrelated projects without collisions. Row-level security
limits public reads to published rows; writes require a row in `ochudi_admins`.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in values; see Environment below
npm run dev                  # http://localhost:3000
```

The dev server runs without Supabase: content comes from `src/content`. To
enable the live CMS and database-backed content, follow
[docs/admin-setup.md](docs/admin-setup.md).

---

## Environment

Copy `.env.example` to `.env.local` (gitignored) and fill in:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | for CMS | Project URL. Public. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for CMS | Publishable / anon key. Safe in the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | seed only | Secret. Used by the seed script. Never prefix with `NEXT_PUBLIC_`. |
| `ADMIN_EMAILS` | for CMS | Comma-separated allowlist for `/admin`. |
| `GITHUB_USERNAME` | optional | Drives GitHub activity on the Now dashboard. |
| `GITHUB_TOKEN` | optional | Token for the GitHub API. |
| `GITHUB_API_BASE` | optional | Defaults to `https://api.github.com`. |

The service-role key is needed only to run `npm run seed`. Production does not
need it unless you add server-side admin writes.

---

## Scripts

Package scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` | Production build, then `next-sitemap`. |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Vitest unit tests. |
| `npm run seed` | One-time load of `src/content` into Supabase (needs the service-role key). |
| `npm run admin:password` | Set an admin password as an alternative to magic link. |

Standalone tooling in `scripts/` (run with `node` against a running production
build unless noted): `verify-*.mjs` drive a headless Chrome over the built site
(`verify-quality.mjs`, `verify-lighthouse.mjs`, `verify-canvas.mjs`,
`verify-pages.mjs`, `verify-palette.mjs`, `verify-home.mjs`, `verify-work.mjs`,
`verify-content.mjs`). `generate-icons.mjs` regenerates the favicon set;
`mock-github.mjs` serves fake GitHub data for offline dashboard work.

---

## Project structure

```
src/
  app/                 Routes (App Router), one folder per page.
    admin/             CMS: dashboard, per-collection forms, login, auth callback.
    work/ writing/ teaching/   Index + [slug] detail routes.
    opengraph-image.tsx        Generated share images (also per [slug]).
    layout.tsx globals.css middleware is at src/middleware.ts
  components/
    signatures/        Interactive pieces: clustering canvas, command palette, Now dashboard.
    admin/             CMS form and controls.
    MobileMenu.tsx Reveal.tsx Prose.tsx Logo.tsx ...
  content/             Seed source and fallback.
    work/ writing/ teaching/   One MDX file per entry.
    now.md testimonials.json teaching-calendar.ts
  lib/
    content.ts         All content reads + Zod schemas (the data layer).
    supabase/          env; public (cookieless) and server (cookie-bound) clients.
    admin/             fields.ts (field config), actions.ts (save), data.ts.
    clustering/        k-means and DBSCAN, pure and dependency-free, unit-tested.
    cover.ts seo.ts jsonld.ts mdx.ts og.tsx code-theme.ts site.ts
supabase/migrations/   SQL applied by hand in the Supabase SQL editor.
scripts/               seed.mjs, admin tooling, and verify-*.mjs checks.
public/brand/          Logo kit and usage rules.
docs/admin-setup.md    Step-by-step CMS enablement.
```

---

## Content model

Collections with MDX bodies: `work`, `writing`, `teaching`. Without bodies:
`now`, `testimonials`, `settings`. Each has a Zod schema in `content.ts` and a
table in `TABLE` (`src/lib/supabase/env.ts`).

Authoring options:

- **`/admin` CMS** for live edits once Supabase is configured. Forms come from
  `src/lib/admin/fields.ts`.
- **MDX/JSON files** in `src/content` as the seed source and offline fallback.
  `npm run seed` pushes them into Supabase.

Field notes:

- `draft: true` hides an entry in production; it still renders in development.
- `live_url` is validated as a URL; a blank value is treated as absent.
- Cover images may be a Cloudinary URL or a path under `public/`. Cloudinary
  URLs are rewritten with `f_auto,q_auto,w_1600` and served `unoptimized`
  (`src/lib/cover.ts`), which avoids the Vercel image-optimizer quota and a
  native image dependency.

---

## Database and migrations

Schema lives in `supabase/migrations`, applied by pasting each file into the
Supabase SQL editor, in order:

- `0001_init.sql` creates the `ochudi_*` tables, RLS policies, the
  `ochudi-media` storage bucket, and the `ochudi_admins` allowlist. Idempotent.
- `0002_featured_and_testimonials.sql` adds `featured` / `featured_order` to
  work and creates `ochudi_testimonials`.

Apply migrations, then run `npm run seed` to populate from `src/content`. Full
walkthrough in [docs/admin-setup.md](docs/admin-setup.md).

Auth is a magic link gated by `ADMIN_EMAILS`, enforced in `src/middleware.ts`
and again in the admin layout. RLS restricts public reads to `published = true`
rows and restricts writes to admins.

---

## Design system

The visual rules are narrow by design. Treat them as constraints.

- **Colour.** Greyscale only, no accent colour. Tokens: ink `#0A0A0A`, page
  `#FAFAFA`, page-dark `#1F1F1F`, muted `#6B6B6B`, rule `#E5E5E5`, rule-dark
  `#2A2A2A`. Syntax highlighting is monochrome (`src/lib/code-theme.ts`).
- **Type.** Newsreader (serif headings), Geist Sans (body), Geist Mono (labels),
  all via `next/font`. Fixed type scale; no ad-hoc sizes.
- **Shape.** Radius 0 everywhere except `/opus-dei`. Borders 1px.
- **Motion.** Fade-and-rise reveals, 0.6s, 60ms stagger, fire once. Hovers
  200ms. Everything respects `prefers-reduced-motion`. The homepage uses Lenis
  smooth scroll.
- **Copy.** Plain language, sentence case, specific over clever. No em dashes in
  code, UI, or content.

Server components are the default. `"use client"` only where interaction needs
it, and client-only components are imported dynamically inside client wrappers,
never inside server components. Dynamic routes await `params`.

---

## Testing and quality

```bash
npm run lint && npm run typecheck && npm test
```

CI (`.github/workflows/ci.yml`) runs install, lint, typecheck, test, and build
on every push and pull request with no Supabase env, which proves the file
fallback keeps the build green. The `verify-*.mjs` scripts run a headless Chrome
over a production build for accessibility (axe-core, target zero WCAG 2.1 AA
violations), Lighthouse, and behaviour. They need a built, served site:

```bash
npm run build && npm start &        # serve on the configured port
node scripts/verify-quality.mjs     # axe, contrast, OG, bundle checks
```

---

## Deployment

Hosted on Vercel; pushing to `main` deploys. Build is `next build` followed by
`next-sitemap` (postbuild), which writes `robots.txt` and the sitemaps into
`public/` at build time. Those files are generated, not committed.

Set the environment variables above in the Vercel project. Content pages use
incremental static regeneration (about an hour), so CMS edits appear within that
window or on the next deploy.

### Operational notes

- **Re-seed, then rebuild.** Next caches data fetches between builds, so after
  `npm run seed` a warm local build can serve stale content. Run
  `rm -rf .next && npm run build`, or trigger a fresh deploy. Vercel builds are
  clean, so this mainly affects local verification.
- **Fonts at build time.** `next/font` downloads the font files during the
  build. Where that times out, prefix the build with
  `NODE_OPTIONS=--dns-result-order=ipv4first`.
- **Content Security Policy.** Set in `src/middleware.ts`. `'unsafe-eval'` is
  added only in development (HMR), and `upgrade-insecure-requests` only in
  production, because it breaks plain-HTTP `localhost` on Safari.
- **Secrets.** `.env.local` is gitignored. Never commit keys, and never give the
  service-role key a `NEXT_PUBLIC_` prefix.

---

## License

All rights reserved unless stated otherwise.
