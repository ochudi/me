/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://ochudi.com",
  generateRobotsTxt: true,
  outDir: "public",
  // Keep the sitemap to real, indexable pages: drop the admin, the noindex
  // Opus Dei page, auth routes, and the file-route assets Next emits.
  exclude: [
    "/admin",
    "/admin/*",
    "/opus-dei",
    "/auth/*",
    "/icon.svg",
    "/apple-icon.png",
    "/opengraph-image",
    "/manifest.webmanifest",
    "/*/opengraph-image",
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/auth"],
      },
    ],
  },
};
