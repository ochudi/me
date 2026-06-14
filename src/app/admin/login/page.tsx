"use client";

import { useEffect, useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";

type Note = { kind: "error" | "info"; text: string } | null;

function nextPath(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("next") ?? "/admin";
}

const fieldClass =
  "w-full border border-rule bg-page px-4 py-3 text-body text-ink outline-none focus-visible:border-ink";
const primaryBtn =
  "w-full border border-ink bg-ink px-5 py-3 font-mono text-label uppercase text-page transition-colors duration-200 hover:bg-page hover:text-ink disabled:opacity-50";
const ghostBtn =
  "w-full border border-rule px-5 py-3 font-mono text-label uppercase text-ink transition-colors duration-200 hover:border-ink disabled:opacity-50";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "link") {
      setNote({
        kind: "error",
        text: "That sign-in link expired or was already used. Try another method.",
      });
    }
  }, []);

  function guard(): ReturnType<typeof createSupabaseBrowserClient> | null {
    if (!supabaseConfigured) {
      setNote({ kind: "error", text: "Supabase is not configured yet." });
      return null;
    }
    return createSupabaseBrowserClient();
  }

  async function oauth(provider: Provider) {
    const supabase = guard();
    if (!supabase) return;
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          nextPath(),
        )}`,
      },
    });
    // On success the browser is redirected to the provider, so we only get
    // here on error.
    if (error) {
      setBusy(null);
      setNote({ kind: "error", text: error.message });
    }
  }

  async function passwordSignIn(e: React.FormEvent) {
    e.preventDefault();
    const supabase = guard();
    if (!supabase) return;
    setBusy("password");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(null);
      setNote({ kind: "error", text: error.message });
      return;
    }
    window.location.assign(nextPath());
  }

  async function magicLink() {
    const supabase = guard();
    if (!supabase) return;
    if (!email.trim()) {
      setNote({ kind: "error", text: "Enter your email first." });
      return;
    }
    setBusy("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          nextPath(),
        )}`,
      },
    });
    setBusy(null);
    setNote(
      error
        ? { kind: "error", text: error.message }
        : { kind: "info", text: `Link sent to ${email.trim()}. Check your inbox.` },
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="font-mono text-label uppercase text-muted">Admin</p>
        <h1 className="mt-3 font-serif text-h2">Sign in.</h1>
        <p className="mt-4 text-body text-muted">
          Access is limited to approved addresses. Pick whichever is easiest.
        </p>

        {/* OAuth */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => oauth("google")}
            disabled={busy !== null}
            className={ghostBtn}
          >
            {busy === "google" ? "Redirecting…" : "Continue with Google"}
          </button>
          <button
            type="button"
            onClick={() => oauth("apple")}
            disabled={busy !== null}
            className={ghostBtn}
          >
            {busy === "apple" ? "Redirecting…" : "Continue with Apple"}
          </button>
        </div>

        <div className="my-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-rule" />
          <span className="font-mono text-label uppercase text-muted">or</span>
          <span className="h-px flex-1 bg-rule" />
        </div>

        {/* Email + password */}
        <form onSubmit={passwordSignIn} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-label uppercase text-muted">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-label uppercase text-muted">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
              placeholder="••••••••"
            />
          </label>
          <button type="submit" disabled={busy !== null} className={primaryBtn}>
            {busy === "password" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Magic link fallback */}
        <button
          type="button"
          onClick={magicLink}
          disabled={busy !== null}
          className="mt-4 font-mono text-label uppercase text-muted underline decoration-rule underline-offset-4 transition-colors duration-200 hover:text-ink disabled:opacity-50"
        >
          {busy === "magic" ? "Sending…" : "Email me a one-time link instead"}
        </button>

        {note && (
          <p
            role="status"
            aria-live="polite"
            className={`mt-6 text-body ${
              note.kind === "error" ? "text-ink" : "text-muted"
            }`}
          >
            {note.text}
          </p>
        )}
      </div>
    </main>
  );
}
