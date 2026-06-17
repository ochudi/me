"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { site } from "@/lib/site";

// Mobile navigation. The command palette is the desktop nav, but it is
// keyboard-first and hidden under md, which left phones with no way to move
// around the site except the footer. This is a plain, tappable menu: a fixed
// trigger under md, opening a full-screen overlay of large links.
const LINKS = [
  { href: "/work", label: "Work" },
  { href: "/writing", label: "Writing" },
  { href: "/teaching", label: "Teaching" },
  { href: "/about", label: "About" },
  { href: "/now", label: "Now" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll, close on Escape, and trap focus while open.
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const f = Array.from(
        panel.querySelectorAll<HTMLElement>("a[href], button"),
      );
      if (f.length === 0) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      const next = e.shiftKey
        ? f[i <= 0 ? f.length - 1 : i - 1]
        : f[i === f.length - 1 ? 0 : i + 1];
      next.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open menu"
        className="fixed right-4 top-4 z-40 flex items-center gap-2 border border-rule-dark bg-page-dark px-3 py-2 font-mono text-label uppercase text-page outline-2 outline-offset-2 outline-page focus-visible:outline"
      >
        <Menu size={14} strokeWidth={1.5} aria-hidden />
        Menu
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex flex-col bg-ink text-page outline-none"
        >
          <div className="flex items-center justify-between border-b border-rule-dark px-6 py-4">
            <span className="font-mono text-label uppercase text-page/60">
              {site.siteName}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center outline-2 outline-offset-2 outline-page focus-visible:outline"
            >
              <X size={20} strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <nav className="flex flex-1 flex-col justify-center gap-2 px-6">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="font-serif text-h1 italic outline-2 outline-offset-2 outline-page focus-visible:outline"
            >
              Home
            </Link>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-serif text-h1 outline-2 outline-offset-2 outline-page focus-visible:outline"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-rule-dark px-6 py-6 font-mono text-label uppercase text-page/70">
            <a
              href={`mailto:${site.email}`}
              className="block outline-2 outline-offset-2 outline-page focus-visible:outline"
            >
              Email me
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
