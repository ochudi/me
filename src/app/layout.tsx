import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-serif",
  display: "swap",
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
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Chukwudi Ofoma",
  url: "https://ochudi.com",
  jobTitle: "AI engineer, lecturer, researcher",
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Pan-Atlantic University",
  },
  worksFor: {
    "@type": "Organization",
    name: "Plural Health",
  },
  sameAs: [
    "https://github.com/ochudi",
    "https://www.linkedin.com/in/ochudi",
    "https://x.com/ochudi",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
