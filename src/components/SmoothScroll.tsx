"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Homepage-only smooth scrolling. Skipped entirely under reduced motion;
// the data attribute exists so tests can assert which mode is active.
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis();
    let rafId = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(loop);
    });
    document.documentElement.dataset.lenis = "on";

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete document.documentElement.dataset.lenis;
    };
  }, []);

  return null;
}
