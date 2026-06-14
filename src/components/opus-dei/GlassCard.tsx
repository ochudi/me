// Greyscale "liquid glass": a frosted translucent panel with a hairline
// border, a soft drop shadow, and a thin top glint. Deliberately uses a
// radius here (an exception to the site's radius-0 rule) for the Apple-style
// glass treatment on the Opus Dei page. Colours stay strictly greyscale:
// translucency and blur do the work, never a hue.
export const glassClass =
  "relative overflow-hidden rounded-2xl border border-page/10 bg-page/[0.04] " +
  "backdrop-blur-xl shadow-[0_8px_40px_-16px_rgba(0,0,0,0.8)] " +
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 " +
  "before:h-px before:bg-gradient-to-r before:from-transparent " +
  "before:via-page/30 before:to-transparent";

export default function GlassCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${glassClass} ${className}`.trim()}>{children}</div>
  );
}
