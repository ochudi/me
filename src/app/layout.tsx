import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import CommandPaletteLazy from "@/components/signatures/CommandPaletteLazy";
import { getAll } from "@/lib/content";
import "./globals.css";

// display optional everywhere: text paints once in metric-matched
// fallbacks on slow first visits instead of repainting when the webfont
// lands, which would otherwise push LCP out by seconds on 4G.
// No opsz axis: the optical-size variable files weigh 130kB+ each and
// saturate a 4G connection past FCP. The default instances are a quarter
// of that and indistinguishable at our sizes.
const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "optional",
});

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "optional",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "optional",
});

const description =
  "AI engineer, lecturer, researcher. Lagos-based, working globally.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ochudi.com"),
  title: {
    default: "Chukwudi Ofoma",
    template: "%s / ochudi",
  },
  description,
  openGraph: {
    type: "website",
    url: "https://ochudi.com",
    siteName: "ochudi",
    title: "Chukwudi Ofoma",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Chukwudi Ofoma",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
  // Relative canonical resolves against metadataBase per route, so every
  // page declares its own URL as canonical.
  alternates: {
    canonical: "./",
  },
};

// Browser chrome tint follows the user's scheme, matching the icon set.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const toEntry = (e: { frontmatter: { title: string }; slug: string }) => ({
    title: e.frontmatter.title,
    slug: e.slug,
  });
  const [work, writing, teaching] = await Promise.all([
    getAll("work"),
    getAll("writing"),
    getAll("teaching"),
  ]);
  const paletteItems = {
    work: work.map(toEntry),
    writing: writing.map(toEntry),
    teaching: teaching.map(toEntry),
  };

  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
      // The inline script below adds the js class before hydration, so the
      // server and client className intentionally differ on this element.
      suppressHydrationWarning
    >
      <body className="font-sans">
        {/* Runs before first paint: scroll-reveal content is only hidden
            when JavaScript is actually available. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        <a
          href="#content"
          className="sr-only z-[100] border border-rule-dark bg-ink px-4 py-2 font-mono text-label uppercase text-page focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>
        <div id="content">{children}</div>
        <CommandPaletteLazy items={paletteItems} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
