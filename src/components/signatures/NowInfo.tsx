"use client";

import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { site } from "@/lib/site";

const NOW_MD_URL = `${site.repo}/blob/main/src/content/now.md`;

const PANEL_TRANSITION =
  "transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none data-[open=false]:invisible data-[open=false]:translate-x-6 data-[open=false]:opacity-0 data-[open=true]:translate-x-0 data-[open=true]:opacity-100";

export default function NowInfo() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Escape and outside-click close the panel.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  // Move focus into the panel on open; return it to the button on close.
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    } else if (wasOpen.current) {
      buttonRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  // Keep Tab cycling inside the panel while it is open.
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>("a[href], button"),
    );
    if (focusables.length === 0) return;
    e.preventDefault();
    const index = focusables.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey
      ? focusables[index <= 0 ? focusables.length - 1 : index - 1]
      : focusables[index === focusables.length - 1 ? 0 : index + 1];
    next.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="How this dashboard works"
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border border-rule-dark text-page"
      >
        <Info size={16} strokeWidth={1.5} aria-hidden />
      </button>

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="How this dashboard works"
        aria-hidden={!open}
        tabIndex={-1}
        data-open={open ? "true" : "false"}
        onKeyDown={trapTab}
        className={`absolute right-4 top-14 z-10 w-80 max-w-[calc(100%-2rem)] border border-rule-dark bg-ink/95 p-6 text-page outline-none backdrop-blur-sm ${PANEL_TRANSITION}`}
      >
        <div className="flex items-start justify-between">
          <p className="font-mono text-label uppercase text-page/50">
            Sources
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            tabIndex={open ? 0 : -1}
            className="flex h-6 w-6 items-center justify-center"
          >
            <X size={14} strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 font-mono text-sm leading-relaxed text-page/70">
          <p>
            Commits come from the GitHub public events API, revalidated
            hourly.
          </p>
          <p>
            The teaching week is computed from a semester calendar file
            checked into the repo.
          </p>
          <p>
            Focus, reading, and listening live in now.md frontmatter and
            change by editing the file.
          </p>
        </div>

        <a
          href={NOW_MD_URL}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={open ? 0 : -1}
          className="mt-5 inline-block font-mono text-label uppercase text-page underline underline-offset-2"
        >
          View now.md
        </a>
      </div>
    </>
  );
}
