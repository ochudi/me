"use client";

import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { site } from "@/lib/site";
import type { ClusterTheme } from "./ClusterCanvas";

const PAPER_URL = site.paper;
const SOURCE_URL = site.repo;

const PANEL_TRANSITION =
  "transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none data-[open=false]:invisible data-[open=false]:translate-x-6 data-[open=false]:opacity-0 data-[open=true]:translate-x-0 data-[open=true]:opacity-100";

export default function ClusterInfo({ theme }: { theme: ClusterTheme }) {
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

  const dark = theme === "dark";
  const tone = dark ? "text-page" : "text-ink";
  const surface = dark
    ? "bg-ink/90 border-rule-dark text-page"
    : "bg-page/90 border-rule text-ink";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="About this visualisation"
        className={`pointer-events-auto absolute right-6 top-6 flex h-8 w-8 items-center justify-center border ${dark ? "border-rule-dark" : "border-rule"} ${tone}`}
      >
        <Info size={16} strokeWidth={1.5} aria-hidden />
      </button>

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="About this visualisation"
        aria-hidden={!open}
        tabIndex={-1}
        data-open={open ? "true" : "false"}
        onKeyDown={trapTab}
        className={`pointer-events-auto absolute right-6 top-16 z-10 w-80 max-w-[calc(100%-3rem)] border p-6 backdrop-blur-sm outline-none ${surface} ${PANEL_TRANSITION}`}
      >
        <div className="flex items-start justify-between">
          <p className="font-mono text-label uppercase opacity-60">
            Clustering
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

        <div className="mt-4 flex flex-col gap-4 text-[15px] leading-relaxed">
          <p>
            Unsupervised clustering groups points by similarity without
            labels or training. The algorithm only sees positions and
            decides where the boundaries fall.
          </p>
          <p>
            k-means splits the points into k groups, each built around a
            moving centroid. It reassigns every point to its nearest
            centroid until the centroids settle.
          </p>
          <p>
            DBSCAN grows clusters out of dense neighbourhoods and leaves
            sparse points unlabelled as noise. It finds the number of
            clusters on its own and handles arbitrary shapes.
          </p>
          <p className="opacity-70">
            Built from work on clustering grain structures in steel
            microscopy.{" "}
            <a
              href={PAPER_URL}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={open ? 0 : -1}
              className="underline underline-offset-2"
            >
              Read the paper
            </a>
            .
          </p>
        </div>

        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={open ? 0 : -1}
          className="mt-6 inline-block font-mono text-label uppercase underline underline-offset-2"
        >
          View source
        </a>
      </div>
    </>
  );
}
