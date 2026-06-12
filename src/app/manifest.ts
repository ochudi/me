import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ochudi",
    short_name: "ochudi",
    description:
      "Chudi Ofoma. AI engineer, lecturer, researcher. Lagos-based, working globally.",
    start_url: "/",
    display: "browser",
    background_color: "#FAFAFA",
    theme_color: "#0A0A0A",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
