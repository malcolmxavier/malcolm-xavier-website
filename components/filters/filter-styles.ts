// ─────────────────────────────────────────────────────────────────
// Shared inline styles for the reviews-page filter primitives.
//
// These were duplicated verbatim in FilmsShell and TelevisionShell;
// extracted here so the two clusters can't drift. All values are
// cluster-scoped CSS custom properties (--text-action, --surface-page,
// --border-interactive, --border-focus), so a single definition renders
// correctly inside either cluster's `data-subbrand` wrapper.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

// chipBaseStyle uses --border-interactive (grey-700 on white = ~5:1
// light, grey-600 on black = ~4.35:1 dark). --border-default failed
// SC 1.4.11 (3:1 for non-text UI) — the border is the sole visual
// indicator distinguishing an inactive chip from the page background,
// so it has to clear AA. The transition lives on the per-cluster
// .film-filter-chip / .show-filter-chip class in components.css (paired
// with a prefers-reduced-motion override); an inline `transition` here
// would outrank the @media-wrapped Tailwind class and silently defeat
// the motion guard.
export const chipBaseStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.04em",
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid var(--border-interactive)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  outlineColor: "var(--border-focus)",
};

// Search box — same control vocabulary as the sort <select> (mono,
// --border-interactive boundary, page surface) with text-entry padding.
// Placeholder color is set via the .reviews-search-input rule in
// components.css (::placeholder can't be expressed inline).
export const searchInputStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  padding: "8px 12px",
  border: "1px solid var(--border-interactive)",
  borderRadius: "var(--border-radius-sm)",
  background: "var(--surface-page)",
  color: "var(--text-body)",
  width: "100%",
  outlineColor: "var(--border-focus)",
};
