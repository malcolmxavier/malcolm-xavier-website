"use client";

// ─────────────────────────────────────────────────────────────────
// StatsTrackingRegion — one delegated click listener for the whole
// stats dashboard, so the chart primitives can stay server components.
//
// Each deep-linking Tile stamps its facet onto its <section> via
// data-sd (dimension) and data-sdest (destination — "reviews" by
// default, "collection-page" for the films Collections tile). The
// chart inside renders an ordinary <Link>; we don't touch it. When a
// click bubbles up here we walk from the clicked anchor to its
// enclosing Tile and, if that Tile carries a data-sd, fire the
// STATS_TILE_CLICK event. Tiles without data-sd (Bigs-only readouts,
// non-linking charts) carry nothing, so their clicks no-op.
//
// Delegation beats wrapping every generated anchor: the anchors are
// produced deep inside Bars / Versus / ColumnChart / Diverging /
// Donut / Heatmap / StackedBars, and wrapping each would force those
// primitives into client components. One listener on a display:contents
// span keeps the layout identical and the primitives pure.
//
// `track()` is fire-and-forget over sendBeacon, so it survives the
// navigation the click triggers. Keyboard activation (Enter / Space on
// a focused link) dispatches a bubbling click too, so SR / keyboard
// users are counted the same as mouse users.
// ─────────────────────────────────────────────────────────────────

import { track } from "@vercel/analytics";
import type { MouseEvent, ReactNode } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function StatsTrackingRegion({
  /** Which dashboard this is — "films" | "television". (Connected
   *  doesn't deep-link its tiles, so it doesn't use this region.) */
  cluster,
  /** Active filter dimensions on the page at render time — reported as
   *  `carriedFilters` so the dashboard can separate cold-corpus clicks
   *  from clicks that carry a narrowed selection through. */
  activeFilterCount,
  children,
}: {
  cluster: "films" | "television";
  activeFilterCount: number;
  children: ReactNode;
}) {
  function handleClick(e: MouseEvent<HTMLSpanElement>) {
    // The click can land on any descendant span of the row link; climb
    // to the anchor, then to the Tile that stamped the facet.
    const anchor = (e.target as HTMLElement).closest("a[href]");
    if (!anchor) return;
    const tile = anchor.closest<HTMLElement>(".stats-tile[data-sd]");
    if (!tile) return;
    track(ANALYTICS_EVENTS.STATS_TILE_CLICK, {
      cluster,
      dimension: tile.dataset.sd ?? "unknown",
      destination: tile.dataset.sdest ?? "reviews",
      carriedFilters: activeFilterCount,
    });
  }

  return (
    <span onClick={handleClick} style={{ display: "contents" }}>
      {children}
    </span>
  );
}
