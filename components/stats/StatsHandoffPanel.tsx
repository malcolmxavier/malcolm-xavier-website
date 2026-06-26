// ─────────────────────────────────────────────────────────────────
// StatsHandoffPanel — the page-level reviews handoff
// (STATS-FILTERS §6 altitude 3).
//
// When the load-bearing Taste band collapses, the selection is too thin to
// support a dashboard. Rather than render a wall of readouts, the page hands
// off to the reviews funnel for the SAME selection: a single panel that
// states how many titles matched and links into the matching reviews query
// (the deep-link carries the active filter through, §11).
//
// The empty case (zero matches) has no reviews to point at, so it offers a
// reset back to the full dashboard instead of a dead "see 0 reviews" link.
// Copy is generic — Malcolm refines the voice later.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import NextLink from "next/link";

import { TrackOnClick } from "@/components/analytics/TrackOnClick";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

export function StatsHandoffPanel({
  /** Titles matching the active selection (the narrowed corpus count). */
  n,
  /** Deep-link into the reviews funnel carrying the active filter. */
  href,
  /** Singular/plural noun for the cluster ("film"/"films"). */
  noun,
  /** Where the reset link points when the selection is empty. */
  resetHref,
  /** Which dashboard handed off — "films" | "television" — for the
   *  STATS_HANDOFF_CLICK conversion event. */
  cluster,
}: {
  n: number;
  href: string;
  noun: { singular: string; plural: string };
  resetHref: string;
  cluster: "films" | "television";
}) {
  const word = n === 1 ? noun.singular : noun.plural;

  // Empty selection: nothing to chart and nothing to link to — offer a reset.
  // The lead is instructional (verb-first) like the readout/footnote copy.
  if (n === 0) {
    return (
      <div style={panelStyle} role="status">
        <p style={leadStyle}>
          Widen the filters to find matches—no {noun.plural} fit this selection.
        </p>
        <NextLink href={resetHref} style={linkStyle}>
          Clear the filters →
        </NextLink>
      </div>
    );
  }

  return (
    <div style={panelStyle} role="status">
      <p style={leadStyle}>
        Widen the filters for the full breakdown—or read the {n.toLocaleString()}{" "}
        {word} in this selection below.
      </p>
      {/* The handoff conversion: this is the page giving up on a too-thin
          dashboard and pushing the SAME selection into the reviews funnel. */}
      <TrackOnClick
        event={ANALYTICS_EVENTS.STATS_HANDOFF_CLICK}
        eventData={{ cluster, n }}
      >
        <NextLink href={href} style={linkStyle}>
          See the {n.toLocaleString()} {n === 1 ? "review" : "reviews"} →
        </NextLink>
      </TrackOnClick>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

// A single bordered panel that replaces the dashboard grid — same surface +
// border tokens as a Tile so it reads as part of the dashboard frame.
const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "flex-start",
  background: "var(--surface-default)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--border-radius-md)",
  padding: "28px 24px",
};

const leadStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 18,
  lineHeight: 1.5,
  color: "var(--text-heading)",
  margin: 0,
  maxWidth: "42ch",
};

// Mono action link carrying the internal-destination arrow per the CTA
// convention. Colour + underline are deliberately left to the global
// body-link cascade: inside [data-subbrand] the --text-action alias is
// unreliable and an inline colour loses to the cascade's !important link
// rule anyway, so the brand hue + underline come from the cascade.
const linkStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.02em",
};
