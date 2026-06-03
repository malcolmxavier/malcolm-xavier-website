// ─────────────────────────────────────────────────────────────────
// ClusterRail — inline cluster sub-navigation (Overview / Reviews).
//
// Lives INSIDE the hero column on a cluster's hub pages (the editorial
// landing + the reviews corpus, and the stats dashboard once Phase 2
// ships) — directly beneath the lede + follow link — rather than as a
// separate full-width bar. Keeping it in the hero column means the
// editorial copy + the local nav form one block, and on the reviews
// page the left column's full height (copy + nav) is what the stats
// chart on the right stretches to match.
//
// Plain server component: the tabs are real <NextLink>s and the active
// tab is passed in by the page, so the links are crawlable in the
// server-rendered HTML and there's no client JS.
//
// Visual language is intentionally DISTINCT from AllOrWatchingToggle
// (the grid-scoped All/Watching control), which uses an underline
// treatment. This rail uses a filled-pill active state so that on
// /television/reviews — where both appear — they read as two clearly
// different levels of navigation rather than one confusing double row.
//
// Phase 1 tabs are Overview + Reviews. "The numbers" (stats) joins in
// Phase 2 — omitted here, NOT rendered disabled, per the project's
// no-placeholder rule.
//
// (Earlier this was a sticky frosted bar that measured the global nav
// height. It was moved into the hero column on 2026-06-03 — a short
// editorial hero next to the tall stats panel left a large void, and
// pulling the nav into the column fixed the height imbalance at the
// root. The sticky/measurement machinery is gone with it.)
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import NextLink from "next/link";

type SubBrand = "film" | "tv" | "music";

type ClusterTab = "overview" | "reviews";

export function ClusterRail({
  base,
  active,
  subbrand,
  label,
  className = "",
}: {
  /** Cluster root path, e.g. "/films" or "/television". Tab hrefs are
   *  built from this (Overview → base, Reviews → `${base}/reviews`). */
  base: string;
  /** Which tab is the current page. Drives the filled active state
   *  and aria-current. */
  active: ClusterTab;
  /** Sub-brand slug. Re-asserted as data-subbrand on the nav so the
   *  rail resolves the cluster's color tokens even if it were ever
   *  rendered outside the page's data-subbrand wrapper (harmless when
   *  nested — it just re-declares the same vars). */
  subbrand: SubBrand;
  /** Accessible name for the landmark, e.g. "Films sections". Keeps
   *  this <nav> distinguishable from the global "Primary" nav and the
   *  footer nav for assistive tech. */
  label: string;
  /** Optional utility classes merged onto the <nav> (e.g. top spacing
   *  to separate the nav from the editorial copy above it). */
  className?: string;
}) {
  const tabs: { key: ClusterTab; label: string; href: string }[] = [
    { key: "overview", label: "Overview", href: base },
    { key: "reviews", label: "Reviews", href: `${base}/reviews` },
  ];

  return (
    <nav aria-label={label} data-subbrand={subbrand} className={className}>
      <ul style={listStyle}>
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key} style={{ margin: 0, padding: 0 }}>
              <NextLink
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                style={isActive ? activeTabStyle : tabStyle}
                className="transition-colors motion-reduce:transition-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {tab.label}
              </NextLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

// Inline pill row, left-aligned. No padding/background/border on the
// row itself — it sits in the hero Stack and picks up that Stack's gap
// for separation from the follow link above it.
const listStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  listStyle: "none",
  margin: 0,
  padding: 0,
};

// Shared tab geometry. ~40px tall (10px block padding + ~20px line
// box) — comfortably clears the WCAG 2.5.8 AA target floor (24px) and
// approaches the 44px AAA target.
const tabBaseStyle: CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "10px 16px",
  borderRadius: "var(--border-radius-sm)",
  textDecoration: "none",
  whiteSpace: "nowrap",
  outlineColor: "var(--border-focus)",
};

// Inactive tab: outlined, body-text color. --border-interactive clears
// SC 1.4.11 (3:1) for the boundary; matches the filter chips' posture.
const tabStyle: CSSProperties = {
  ...tabBaseStyle,
  background: "transparent",
  color: "var(--text-body)",
  border: "1px solid var(--border-interactive)",
};

// Active tab: filled in the cluster's contrast-safe action color.
// --text-action resolves to the cluster's AA-safe orange-700 / blue-700
// (white-on-fill clears SC 1.4.3), the same token DismissableChip uses
// for its fill — NOT --primary-default, which would drop contrast and
// fork the cluster's accent in light mode.
const activeTabStyle: CSSProperties = {
  ...tabBaseStyle,
  background: "var(--text-action)",
  color: "var(--surface-page)",
  border: "1px solid var(--text-action)",
};
