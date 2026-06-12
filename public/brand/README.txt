OCHUDI LOGO KIT / the open field centroid
==========================================

THE IDEA
Your unsupervised clustering research as a mark: a free scatter of
points and one centroid, drawn exactly the way the homepage canvas
draws its centroids (a filled dot with a hairline ring). The mark and
the canvas are the same object at different zoom levels.

FILES
svg/logo-mark.svg          Display mark. Use at 48px and above.
                           7 satellites, hairline ring, 2 faint points.
svg/logo-mark-dark.svg     Same, pre-filled #FAFAFA for dark surfaces.
svg/logo-mark-compact.svg  Small-size mark for 20 to 48px. 5 solid
                           satellites, thicker ring.
svg/logo-lockup.svg        Mark + "ochudi" in Newsreader italic,
                           converted to outlines (renders identically
                           everywhere, no font needed). Navbar use.
svg/logo-lockup-dark.svg   Same, pre-filled #FAFAFA.
svg/favicon.svg            4 satellites, heaviest weights. Below 20px.
svg/avatar.svg             Display mark, page-on-ink, 1024 square.
png/favicon-32.png         Browser tab fallback.
png/apple-icon-180.png     iOS home screen (solid #FAFAFA background).
png/icon-192.png           PWA manifest.
png/icon-512.png           PWA manifest.
png/avatar-1024.png        GitHub, X, LinkedIn profile.
react/Logo.tsx             Drop-in component. variant: mark, compact,
                           lockup. animate adds a slow satellite drift,
                           guarded by prefers-reduced-motion.

NEXT.JS WIRING (ochudi repo)
1. Copy svg/favicon.svg        to src/app/icon.svg
2. Copy png/apple-icon-180.png to src/app/apple-icon.png
   Next serves both automatically. Nothing else to configure.
3. Copy react/Logo.tsx to src/components/Logo.tsx. Navbar:
   <Logo variant="lockup" size={28} /> inside a link to /.
   Hero or footer flourish: <Logo variant="mark" size={64} animate />

COLOR RULES
Ink #0A0A0A on light. Page #FAFAFA on dark. Nothing else, ever. The
SVGs use currentColor, so in the app the mark inherits text color and
the section rhythm handles light/dark for free. Never set the mark in
a mid grey on a grey surface; it reads as disabled.

CLEAR SPACE AND SIZING
Keep clear space around the mark equal to the centroid ring diameter
(the ring is the unit). Minimum sizes: lockup 24px tall, compact mark
20px, favicon variant below that. Do not use the display mark under
48px; the faint satellites disappear and the ring goes sub-pixel.

DO NOT
Add color. Add satellites. Rotate the mark. Recompose the scatter
(the asymmetry is balanced so the centroid is the optical center of
mass). Use the lockup as a paragraph glyph; it is a logo, not type.

PROVENANCE
Wordmark: Newsreader Italic, optical size 60, weight 400, tracking
-0.02em, shaped with HarfBuzz and outlined. Licensed under the SIL
Open Font License; outlines in a logo are fine under the OFL.
