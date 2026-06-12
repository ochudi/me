import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// Module-scope cache: the .ttf files load once per server instance, then
// every OG render reuses them. next/og needs raw TTF data; it cannot read
// woff2 or anything that came through next/font.
let fontsPromise: Promise<{ serif: Buffer; mono: Buffer }> | null = null;
function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(path.join(process.cwd(), "src/og/newsreader-italic.ttf")),
    readFile(path.join(process.cwd(), "src/og/geist-mono.ttf")),
  ]).then(([serif, mono]) => ({ serif, mono }));
  return fontsPromise;
}

function titleSizeFor(title: string): number {
  if (title.length <= 16) return 150;
  if (title.length <= 34) return 96;
  if (title.length <= 60) return 76;
  return 60;
}

const MONO_LINE = {
  fontFamily: "Geist Mono",
  fontSize: 22,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "rgba(250,250,250,0.65)",
};

/** The site OG card: ink ground, hairline frame, serif title, mono meta. */
export async function ogImage({
  title,
  eyebrow,
  markSize = 140,
  titleSize,
}: {
  title: string;
  eyebrow: string;
  markSize?: number;
  titleSize?: number;
}) {
  const { serif, mono } = await loadFonts();
  const size = titleSize ?? titleSizeFor(title);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0A0A0A",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: "1px solid #2A2A2A",
            display: "flex",
          }}
        />
        <svg
          style={{ position: "absolute", top: 88, right: 96 }}
          width={markSize}
          height={markSize}
          viewBox="0 0 100 100"
        >
          <circle cx="46" cy="52" r="5" fill="#FAFAFA" />
          <circle cx="46" cy="52" r="11" fill="none" stroke="#FAFAFA" strokeWidth="1.6" />
          <circle cx="24" cy="30" r="3" fill="#FAFAFA" />
          <circle cx="58" cy="20" r="2.6" fill="#FAFAFA" />
          <circle cx="78" cy="38" r="3.2" fill="#FAFAFA" />
          <circle cx="72" cy="70" r="2.8" fill="#FAFAFA" />
          <circle cx="34" cy="76" r="3" fill="#FAFAFA" />
          <circle cx="16" cy="56" r="2.3" fill="#FAFAFA" opacity="0.5" />
          <circle cx="62" cy="84" r="2.2" fill="#FAFAFA" opacity="0.5" />
        </svg>
        <div
          style={{
            position: "absolute",
            top: 88,
            left: 96,
            right: 96,
            bottom: 88,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ ...MONO_LINE, display: "flex" }}>{eyebrow}</div>
          <div
            style={{
              fontFamily: "Newsreader",
              fontStyle: "italic",
              fontSize: size,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#FAFAFA",
              maxWidth: 860,
              display: "flex",
            }}
          >
            {title}
          </div>
          <div style={{ ...MONO_LINE, display: "flex" }}>ochudi.com</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Newsreader", data: serif, style: "italic", weight: 400 },
        { name: "Geist Mono", data: mono, style: "normal", weight: 400 },
      ],
    },
  );
}
