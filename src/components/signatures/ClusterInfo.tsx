"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, X } from "lucide-react";
import type { ClusterTheme } from "./ClusterCanvas";

type ClusterInfoProps = {
  theme: ClusterTheme;
};

// Placeholders until the real links exist.
const PAPER_URL = "#";
const SOURCE_URL = "https://github.com/ochudi/ochudi.com";

export default function ClusterInfo({ theme }: ClusterInfoProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const reduceMotion = useReducedMotion();

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

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label="About this visualisation"
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
            transition={{
              duration: reduceMotion ? 0.15 : 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`pointer-events-auto absolute right-6 top-16 z-10 w-80 max-w-[calc(100%-3rem)] border p-6 backdrop-blur-sm outline-none ${surface}`}
          >
            <div className="flex items-start justify-between">
              <p className="font-mono text-label uppercase opacity-60">
                Clustering
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
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
              className="mt-6 inline-block font-mono text-label uppercase underline underline-offset-2"
            >
              View source
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
