"use client";

import { useEffect, useRef, useState } from "react";

// Scroll reveal per the motion spec: fade plus 12px rise over 0.6s on the
// (0.16, 1, 0.3, 1) curve, fires once. Stagger siblings via `delay`.
// The styles live in globals.css keyed on [data-reveal] and html.js, so
// content is only ever hidden when JavaScript is actually running; without
// it (crawlers, full-page captures) everything renders visible.
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={shown ? "shown" : "pending"}
      className={className || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
