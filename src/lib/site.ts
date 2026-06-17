// Single source for contact + social links, so they are defined once instead
// of copied across the footer, command palette, and structured data.
export const site = {
  name: "Chukwudi Ofoma",
  alternateName: "Chudi Ofoma",
  url: "https://ochudi.com",
  siteName: "ochudi",
  email: "ofoma.chudi@gmail.com",
  studio: { name: "Greyform", url: "https://www.greyform.org" },
  // Public source repo for this site, and the clustering research paper the
  // canvas is built on. Centralised so the "View source" and "Read the paper"
  // links live in one place.
  repo: "https://github.com/ochudi/me",
  paper:
    "https://drive.google.com/file/d/1oSR3C2GcvoWdfduBhGSswJwskHp5ly7_/view?usp=sharing",
  socials: {
    github: "https://github.com/ochudi",
    linkedin: "https://www.linkedin.com/in/ochudi",
    x: "https://x.com/mrofoma",
  },
} as const;

// For schema.org sameAs and similar "all my profiles" lists.
export const socialLinks = [
  site.socials.github,
  site.socials.linkedin,
  site.socials.x,
];
