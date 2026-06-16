"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { site } from "@/lib/site";
import styles from "./palette.module.css";

export type PaletteEntry = { title: string; slug: string };
export type PaletteItems = {
  work: PaletteEntry[];
  writing: PaletteEntry[];
  teaching: PaletteEntry[];
};

type SubPage = "work" | "writing" | "teaching" | "whoami" | "contact";
type CollectionPage = "work" | "writing" | "teaching";

const HISTORY_KEY = "ochudi.cmd.history";
const HISTORY_MAX = 20;
const EMAIL = site.email;
const SOURCE_URL = "https://github.com/ochudi/ochudi.com";
const GITHUB_URL = site.socials.github;
const LINKEDIN_URL = site.socials.linkedin;
const X_URL = site.socials.x;
const GREYFORM_URL = site.studio.url;

// Exact-match easter eggs on the raw input. They never appear as items, so
// they surface through the empty state, which they reach naturally because
// none of them fuzzy-match a real command.
const EGGS: Record<string, string> = {
  "sudo make me a sandwich": "Okay.",
  vim: "Escape works here. :wq",
  "rust vs python": "Rust for the hot path, Python for everything else.",
};

// Typing any of these reveals a single secret command that opens the Opus Dei
// page. Exact match on the trimmed input, matching the spirit of the eggs
// above, so it stays hidden until someone goes looking for it.
const OPUS_TRIGGERS = new Set([
  "opus dei",
  "opusdei",
  "vocation",
  "pray",
  "prayer",
  "prayed up",
  "stay prayed up",
]);

function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

function writeHistory(history: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(0, HISTORY_MAX)),
    );
  } catch {
    // Private mode or full quota: history just does not persist.
  }
}

const ITEM_CLASS =
  "flex cursor-pointer items-center justify-between gap-4 px-4 py-2.5 font-mono text-sm text-page/60 data-[selected=true]:bg-rule-dark data-[selected=true]:text-page";

const HEADING_CLASS =
  "[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pt-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-label [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-page/50";

const SECTION_TITLES: Record<CollectionPage, string> = {
  work: "Work",
  writing: "Writing",
  teaching: "Teaching",
};

export default function CommandPalette({ items }: { items: PaletteItems }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState<SubPage[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState<number | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const flashTimer = useRef<number | null>(null);

  const page = pages[pages.length - 1];
  const normalized = search.trim().toLowerCase();
  const egg = page === undefined ? EGGS[normalized] : undefined;
  const showOpusEgg = page === undefined && OPUS_TRIGGERS.has(normalized);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    };
  }, []);

  // Cmd+K / Ctrl+K toggles from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Per open: reset state, lock scroll, remember and later restore focus,
  // and warm the routes the palette can reach.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    setSearch("");
    setPages([]);
    setHistIndex(null);
    setFlash(null);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    for (const path of ["/", "/about", "/work", "/writing", "/teaching", "/now"]) {
      router.prefetch(path);
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, router]);

  const record = useCallback((label: string) => {
    setHistory((prev) => {
      const next = [label, ...prev.filter((h) => h !== label)].slice(
        0,
        HISTORY_MAX,
      );
      writeHistory(next);
      return next;
    });
  }, []);

  const go = useCallback(
    (label: string, path: string) => {
      record(label);
      setOpen(false);
      router.push(path);
    },
    [record, router],
  );

  const openSubPage = useCallback(
    (label: string, sub: SubPage) => {
      record(label);
      setPages((p) => [...p, sub]);
      setSearch("");
      setHistIndex(null);
    },
    [record],
  );

  const copyEmail = useCallback(async () => {
    record("Copy email");
    let ok = false;
    try {
      await navigator.clipboard.writeText(EMAIL);
      ok = true;
    } catch {
      // Clipboard API can be unavailable; fall through to showing the email.
    }
    setFlash(ok ? `Copied ${EMAIL}` : EMAIL);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 2000);
  }, [record]);

  const openExternal = useCallback(
    (label: string, url: string) => {
      record(label);
      setOpen(false);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [record],
  );

  // Escape closes, Backspace on empty input pops the sub-page, ArrowUp on
  // empty input recalls history. Capture phase so cmdk's own list
  // navigation does not swallow the keys first.
  const onPanelKeyDownCapture = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "Backspace" && search === "" && pages.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        setPages((p) => p.slice(0, -1));
        return;
      }
      if (
        e.key === "ArrowUp" &&
        (search === "" || histIndex !== null) &&
        history.length > 0
      ) {
        e.preventDefault();
        e.stopPropagation();
        const next =
          histIndex === null ? 0 : Math.min(histIndex + 1, history.length - 1);
        setHistIndex(next);
        setSearch(history[next]);
        return;
      }
      if (e.key === "ArrowDown" && histIndex !== null) {
        e.preventDefault();
        e.stopPropagation();
        if (histIndex === 0) {
          setHistIndex(null);
          setSearch("");
        } else {
          const next = histIndex - 1;
          setHistIndex(next);
          setSearch(history[next]);
        }
        return;
      }
      if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(
            "input, a[href], button:not([disabled])",
          ),
        );
        if (focusables.length === 0) return;
        e.preventDefault();
        const idx = focusables.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey
          ? focusables[(idx - 1 + focusables.length) % focusables.length]
          : focusables[(idx + 1) % focusables.length];
        next.focus();
      }
    },
    [search, pages.length, histIndex, history],
  );

  const onSearch = useCallback(
    (v: string) => {
      setSearch(v);
      // Typing over a recalled entry leaves recall mode.
      setHistIndex((prev) =>
        prev !== null && history[prev] !== v ? null : prev,
      );
    },
    [history],
  );

  const collectionPage =
    page === "work" || page === "writing" || page === "teaching"
      ? (page as CollectionPage)
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group fixed bottom-6 right-6 z-40 hidden border border-rule-dark bg-page-dark px-3 py-2 font-mono text-label uppercase text-page md:block"
      >
        <span className="group-hover:hidden">Cmd K</span>
        <span className="hidden group-hover:inline">Try it.</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              onKeyDownCapture={onPanelKeyDownCapture}
              className="mx-auto mt-[18vh] w-[calc(100%-2rem)] max-w-xl border border-rule-dark bg-page-dark text-page"
            >
              <Command label="Command palette" loop className="outline-none">
                <div className="relative border-b border-rule-dark">
                  <Command.Input
                    autoFocus
                    value={search}
                    onValueChange={onSearch}
                    placeholder={
                      collectionPage
                        ? `Search ${collectionPage}`
                        : "Type a command or search"
                    }
                    aria-label="Command input"
                    className="w-full bg-transparent px-4 py-3 font-mono text-sm text-page caret-transparent outline-none placeholder:text-page/50"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-4 font-mono text-sm"
                  >
                    <span className="invisible whitespace-pre">{search}</span>
                    <span className={styles.blockCursor} />
                  </div>
                </div>

                {flash && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="border-b border-rule-dark px-4 py-2 font-mono text-label uppercase text-page/50"
                  >
                    {flash}
                  </p>
                )}

                {page === "whoami" && (
                  <div
                    role="status"
                    className="border-b border-rule-dark px-4 py-5 font-mono text-sm leading-relaxed"
                  >
                    <p>Chukwudi Ofoma</p>
                    <p className="text-page/60">
                      AI engineer, lecturer, researcher.
                    </p>
                    <p className="text-page/60">Lagos, working globally.</p>
                  </div>
                )}

                <Command.List
                  className={`max-h-[min(60vh,420px)] overflow-y-auto pb-2 ${HEADING_CLASS}`}
                >
                  {page !== "whoami" && (
                    <Command.Empty className="px-4 py-6 font-mono text-sm text-page">
                      {egg ?? <span className="text-page/60">No results.</span>}
                    </Command.Empty>
                  )}

                  {showOpusEgg && (
                    <Command.Group heading="✦">
                      <Command.Item
                        className={ITEM_CLASS}
                        value="egg-opus-dei"
                        keywords={[...OPUS_TRIGGERS, "faith", "god", "opus"]}
                        onSelect={() => go("Opus Dei", "/opus-dei")}
                      >
                        A quiet corner
                        <span className="text-page/60">Pray</span>
                      </Command.Item>
                    </Command.Group>
                  )}

                  {page === undefined && (
                    <>
                      <Command.Group heading="Navigate">
                        <Command.Item
                          className={ITEM_CLASS}
                          value="nav-about"
                          keywords={["about"]}
                          onSelect={() => go("About", "/about")}
                        >
                          About
                        </Command.Item>
                        <Command.Item
                          className={ITEM_CLASS}
                          value="nav-work"
                          keywords={["work", "projects"]}
                          onSelect={() => openSubPage("Work", "work")}
                        >
                          Work
                          <span className="text-page/60">
                            {items.work.length}
                          </span>
                        </Command.Item>
                        <Command.Item
                          className={ITEM_CLASS}
                          value="nav-writing"
                          keywords={["writing", "essays", "blog"]}
                          onSelect={() => openSubPage("Writing", "writing")}
                        >
                          Writing
                          <span className="text-page/60">
                            {items.writing.length}
                          </span>
                        </Command.Item>
                        <Command.Item
                          className={ITEM_CLASS}
                          value="nav-teaching"
                          keywords={["teaching", "courses"]}
                          onSelect={() => openSubPage("Teaching", "teaching")}
                        >
                          Teaching
                          <span className="text-page/60">
                            {items.teaching.length}
                          </span>
                        </Command.Item>
                        <Command.Item
                          className={ITEM_CLASS}
                          value="nav-now"
                          keywords={["now"]}
                          onSelect={() => go("Now", "/now")}
                        >
                          Now
                        </Command.Item>
                        <Command.Item
                          className={ITEM_CLASS}
                          value="nav-home"
                          keywords={["home", "index"]}
                          onSelect={() => go("Home", "/")}
                        >
                          Home
                        </Command.Item>
                      </Command.Group>

                      <Command.Group heading="Actions">
                        <Command.Item
                          className={ITEM_CLASS}
                          value="action-whoami"
                          keywords={["whoami", "who am i", "bio"]}
                          onSelect={() => openSubPage("whoami", "whoami")}
                        >
                          whoami
                        </Command.Item>
                        <Command.Item
                          className={ITEM_CLASS}
                          value="action-contact"
                          keywords={["contact", "email", "reach"]}
                          onSelect={() => openSubPage("Contact", "contact")}
                        >
                          Contact
                        </Command.Item>
                        <Command.Item
                          className={ITEM_CLASS}
                          value="action-copy-email"
                          keywords={["copy", "email", "clipboard"]}
                          onSelect={copyEmail}
                        >
                          Copy email
                        </Command.Item>
                        <Command.Item
                          className={ITEM_CLASS}
                          value="action-view-source"
                          keywords={["source", "github", "code"]}
                          onSelect={() => openExternal("View source", SOURCE_URL)}
                        >
                          View source
                        </Command.Item>
                      </Command.Group>
                    </>
                  )}

                  {collectionPage && (
                    <Command.Group heading={SECTION_TITLES[collectionPage]}>
                      <Command.Item
                        className={ITEM_CLASS}
                        value={`${collectionPage}-index`}
                        keywords={[collectionPage, "all"]}
                        onSelect={() =>
                          go(
                            SECTION_TITLES[collectionPage],
                            `/${collectionPage}`,
                          )
                        }
                      >
                        Go to {collectionPage}
                      </Command.Item>
                      {items[collectionPage].map((entry) => (
                        <Command.Item
                          key={entry.slug}
                          className={ITEM_CLASS}
                          value={`${collectionPage}-${entry.slug}`}
                          keywords={[entry.title]}
                          onSelect={() =>
                            go(entry.title, `/${collectionPage}/${entry.slug}`)
                          }
                        >
                          {entry.title}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}

                  {page === "contact" && (
                    <Command.Group heading="Contact">
                      <Command.Item
                        className={ITEM_CLASS}
                        value="contact-email"
                        keywords={["email", "mail"]}
                        onSelect={() => {
                          record("Email");
                          setOpen(false);
                          window.location.href = `mailto:${EMAIL}`;
                        }}
                      >
                        Email
                        <span className="text-page/60">{EMAIL}</span>
                      </Command.Item>
                      <Command.Item
                        className={ITEM_CLASS}
                        value="contact-github"
                        keywords={["github"]}
                        onSelect={() => openExternal("GitHub", GITHUB_URL)}
                      >
                        GitHub
                      </Command.Item>
                      <Command.Item
                        className={ITEM_CLASS}
                        value="contact-linkedin"
                        keywords={["linkedin"]}
                        onSelect={() => openExternal("LinkedIn", LINKEDIN_URL)}
                      >
                        LinkedIn
                      </Command.Item>
                      <Command.Item
                        className={ITEM_CLASS}
                        value="contact-x"
                        keywords={["x", "twitter"]}
                        onSelect={() => openExternal("X", X_URL)}
                      >
                        X
                      </Command.Item>
                      <Command.Item
                        className={ITEM_CLASS}
                        value="contact-greyform"
                        keywords={["greyform", "studio", "agency", "hire"]}
                        onSelect={() => openExternal("Greyform", GREYFORM_URL)}
                      >
                        Greyform
                        <span className="text-page/60">Studio</span>
                      </Command.Item>
                    </Command.Group>
                  )}
                </Command.List>
              </Command>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
