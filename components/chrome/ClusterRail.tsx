// ─────────────────────────────────────────────────────────────────
// ClusterRail — sticky sub-navigation for a sub-brand cluster.
//
// Sits directly under the global nav on a cluster's hub pages (the
// editorial landing + the reviews corpus, and the stats dashboard
// once Phase 2 ships). Gives a sub-brand (Films, Television, and
// eventually Music) its own local wayfinding so the GLOBAL nav can
// stay flat — the "thin gate" model: /films points at the landing,
// and Reviews is always one click away via this rail rather than via
// a global dropdown.
//
// Client component (it measures the nav height — see the sticky note
// below), but the tabs are still real <NextLink>s and the active tab
// is passed in by the page, so there's no usePathname here and the
// links remain crawlable in the server-rendered HTML.
//
// Visual language is intentionally DISTINCT from AllOrWatchingToggle
// (the grid-scoped All/Watching control), which uses an underline
// treatment. This rail uses a filled-pill active state so that on
// /television/reviews — where both appear — they read as two clearly
// different levels of navigation rather than one confusing double row.
//
// Sticky positioning: the rail pins flush beneath the global nav. The
// nav's height varies by breakpoint (the mobile hamburger row is
// taller than the desktop row), so a single hardcoded `top` either
// clips the rail's tabs behind the nav (too small) or leaves a strip
// of page content showing through (too big). Instead we MEASURE the
// global nav via its `data-site-nav` hook — the same canonical
// measurement the case-study ScrollProgress uses — and set `top` to
// its exact height, re-measuring on resize. SSR/pre-hydration falls
// back to a sensible 3.5rem (sticky only engages on scroll, by which
// point the measured value is in place, so there's no visible shift).
//
// Phase 1 tabs are Overview + Reviews. "The numbers" (stats) joins in
// Phase 2 — omitted here, NOT rendered disabled, per the project's
// no-placeholder rule.
// ─────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import NextLink from "next/link";
import { Container } from "@/components/layout/Container";

type SubBrand = "film" | "tv" | "music";

type ClusterTab = "overview" | "reviews";

export function ClusterRail({
  base,
  active,
  subbrand,
  label,
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
}) {
  const tabs: { key: ClusterTab; label: string; href: string }[] = [
    { key: "overview", label: "Overview", href: base },
    { key: "reviews", label: "Reviews", href: `${base}/reviews` },
  ];

  // Measure the global nav height so the rail pins flush beneath it at
  // every breakpoint. null until measured → the CSS fallback top
  // applies (only matters once the user scrolls, by which point this
  // has run). Re-measures on viewport resize.
  const [navHeight, setNavHeight] = useState<number | null>(null);
  useEffect(() => {
    const nav = document.querySelector("[data-site-nav]");
    if (!nav) return;
    const measure = () =>
      setNavHeight((nav as HTMLElement).getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <nav
      aria-label={label}
      data-subbrand={subbrand}
      style={
        navHeight !== null ? { ...railStyle, top: `${navHeight}px` } : railStyle
      }
    >
      <Container size="lg">
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
      </Container>
    </nav>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const railStyle: CSSProperties = {
  position: "sticky",
  // SSR/pre-measurement fallback; the effect overrides `top` with the
  // measured nav height once mounted. z below the nav's z-40 so the
  // global nav always wins any overlap.
  top: "3.5rem",
  zIndex: 30,
  // Semi-opaque surface so the backdrop-blur has something to work
  // with, matching the global nav's treatment for visual continuity.
  background: "color-mix(in srgb, var(--surface-page) 85%, transparent)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderBottom: "1px solid var(--border-default)",
};

const listStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  listStyle: "none",
  margin: 0,
  // Vertical breathing room between the tabs and the rail's border /
  // the surrounding sections (the 8px here read as cramped).
  padding: "14px 0",
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
