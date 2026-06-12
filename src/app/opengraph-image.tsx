import { ogImage, OG_SIZE } from "@/lib/og";

export const alt =
  "Chudi Ofoma. AI engineer, lecturer, researcher. A scatter of points converging on a ringed centroid.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    title: "Chudi Ofoma.",
    eyebrow: "AI engineer / Lecturer / Researcher",
    markSize: 280,
    titleSize: 150,
  });
}
