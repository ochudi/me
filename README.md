# ochudi.com

My corner of the internet. Live at [ochudi.com](https://ochudi.com).

I build AI products at Plural Health, teach computer science at
Pan-Atlantic University, and research unsupervised clustering for
industrial quality control. The site is one part portfolio, one part
classroom, one part lab bench.

## House rules

Greyscale only: ink, page, and four greys between them. Newsreader for
headlines, Geist Sans for body, Geist Mono for labels. Radius 0, borders
1px, no accent colour ever. If a colour shows up in a diff, reject the
diff. The full constitution lives in [CLAUDE.md](CLAUDE.md), and the code
actually follows it.

## The toys

**The canvas.** The homepage clusters 500 points live, k-means every
frame and DBSCAN every tenth, both written from scratch over typed
arrays in [src/lib/clustering](src/lib/clustering). My research groups
grain structures in steel micrographs without labelled data; the hero is
the same mathematics wearing greys. Wave your cursor through it. Every
so often the field stops being data, morphs into a phyllotaxis spiral or
three rings or a Lissajous curve, then gets clustered anyway. The
algorithms are unit-tested and dependency-free, because part of the
point is that I did not need a library for this.

**The palette.** Press Cmd K. Everything on the site is reachable from
there, plus a few things that are not listed anywhere. Try typing
"vim". There are three more like it; you can read
[the source](src/components/signatures/CommandPalette.tsx) like an
honest person.

**The dashboard.** [/now](https://ochudi.com/now) assembles itself from
one markdown file, the GitHub API, and a semester calendar. Keeping my
"what I am doing" page current means editing
[src/content/now.md](src/content/now.md) once a week. The commits and
the teaching week look after themselves.

## Stack, boring on purpose

Next.js 15 App Router, TypeScript strict, Tailwind. Content is MDX files
read with fs and gray-matter. No CMS, no database, no contentlayer, no
Three.js. A post is a file and publishing is a commit.

The OG images are rendered with next/og in real Newsreader italic, one
per essay, case study, and lesson. Fonts load with display optional and
without the optical size axis, because that axis weighed 273kB and was
quietly ruining LCP on throttled 4G. Phones never download the canvas at
all; below 640px the hero is a CSS gradient dot field that costs
nothing.

The logo is the canvas at a different zoom level: a scatter of points
around a ringed centroid, drawn the way the homepage draws its
centroids. The kit and its rules are in
[public/brand](public/brand/README.txt).

## Running it

```bash
npm install
npm run dev
```

The /now dashboard wants a `.env.local`:

```bash
GITHUB_USERNAME=ochudi
GITHUB_TOKEN=        # fine-grained token, public repos read-only
```

Without a token the dashboard says "GitHub is quiet right now." and the
rest of the site carries on. One thing the GitHub docs will not tell
you: the events API strips commit payloads for fine-grained tokens, so
the commits actually come from the per-repo endpoint. That one took a
while to find. You get it for free.

## Tests

More than a personal site strictly needs, honestly.

```bash
npm test                            # 33 unit tests, clustering and dashboard math
npm run build && npx next start -p 3105
node scripts/verify-quality.mjs     # bundle budgets, axe, contrast math, OG sizes
node scripts/verify-lighthouse.mjs  # throttled Moto G profile, gate at 95
```

Seven suites in [scripts/](scripts) drive a real Chrome against the
production build: canvas physics, palette keyboard paths, scroll
reveals, the work filters, code highlighting in Python and Rust, all of
it. 114 checks, and the Lighthouse run currently lands 99s and 100s with
LCP around 1.5s. They exist because I refactor at midnight and trust
nothing.

## Colophon

Type is Newsreader and Geist. Built in Lagos under Greyform, my
one-person studio. The footer stamps each deploy with its build date.
The favicon flips with your colour scheme; the ICO format cannot, so it
got a solid tile instead. Details like that are most of this repo.
