"use client";

// ─────────────────────────────────────────────────────────────────
// ThemeToggle — three-state cycle: system → light → dark → system.
//
// next-themes is the underlying engine (configured in app/layout.tsx
// with attribute="data-theme" so the CSS theme flips in globals.css
// activate via `[data-theme="dark"]`). The user's preference syncs
// to localStorage; "system" mode reads prefers-color-scheme.
//
// Mounting gate: next-themes can't know the resolved theme on the
// server, so we render an empty placeholder of the same size on the
// initial pass to avoid a hydration mismatch and a layout shift.
//
// The button label uses Roboto Mono and the "computer is talking"
// voice — matches the Kicker/Dateline rest of the chrome.
// ─────────────────────────────────────────────────────────────────

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// Cycle order. Starting from "system" gives the user a visible
// path back to OS-default after they've manually overridden.
type ThemeChoice = "system" | "light" | "dark";
const CYCLE: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

// Glyph + text per state — the glyph reads as a quick affordance,
// the text confirms the choice for screen readers and clarity.
const LABEL: Record<ThemeChoice, { glyph: string; word: string }> = {
  system: { glyph: "◐", word: "auto" },
  light: { glyph: "☀", word: "light" },
  dark: { glyph: "☾", word: "dark" },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Render only after hydration completes — next-themes resolves
  // theme on the client, and rendering a different label on server
  // vs. client would trigger a hydration warning.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Reserve the same footprint to avoid layout shift on hydration.
    return (
      <div
        className="h-9 w-[7.5rem] rounded-md border"
        style={{ borderColor: "var(--border-default)" }}
        aria-hidden
      />
    );
  }

  // next-themes returns "system" / "light" / "dark" in `theme`, but
  // the value is loosely typed as `string | undefined` and a stale
  // localStorage entry (or a browser extension) can write something
  // outside the union (e.g. "auto", "sepia"). The earlier
  // `(theme as ThemeChoice) ?? "system"` cast would let those slip
  // through, then `CYCLE[<unknown>]` returned undefined and
  // setTheme(undefined) ran on click. Discriminate explicitly and
  // fall back to "system" for anything unrecognized — closes
  // h-theme-toggle-cast from the 2026-04-29 /full-review.
  const current: ThemeChoice =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";
  const next = CYCLE[current];
  const { glyph, word } = LABEL[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      // aria-label gives the full action context to screen readers
      // since the visible label is intentionally compact.
      aria-label={`Theme: ${word}. Click to switch to ${LABEL[next].word}.`}
      className={[
        "inline-flex h-9 items-center gap-2 px-3 rounded-md border",
        "transition-colors motion-reduce:transition-none",
        "hover:opacity-80",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
      ].join(" ")}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        borderColor: "var(--border-default)",
        color: "var(--text-body)",
        background: "var(--surface-page)",
        outlineColor: "var(--border-focus)",
      }}
    >
      <span aria-hidden>{glyph}</span>
      <span>{word}</span>
    </button>
  );
}
