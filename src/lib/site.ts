// Single source for contact + social links, so they are defined once instead
// of copied across the footer, command palette, and structured data.
export const site = {
  email: "ofoma.chudi@gmail.com",
  studio: { name: "Greyform", url: "https://www.greyform.org" },
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
