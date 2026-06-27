// ─────────────────────────────────────────────────────────────────
// SectionIndex — a quiet "On this page" jump strip for the editorial
// landings (/films, /television, and any future sub-brand landing).
//
// The cluster landings stack up to six modules below the hero (Featured,
// By the numbers, Now, Collections, Favorites, Lists). Nothing above the
// fold tells a visitor they exist. This strip does two jobs at once:
//   • SCROLL CUE — it names sections whose content isn't on screen, so a
//     non-scroller learns there's depth here.
//   • ORIENTATION — each name is an in-page anchor, so a visitor can skip
//     straight to a section.
//
// Deliberately a DIFFERENT register from the ClusterRail directly above
// it: the rail is page-level navigation (Overview / Reviews / The Stats)
// rendered as filled/outlined icon pills — "leave this page". This strip
// is intra-page wayfinding rendered as quiet mono-uppercase text links —
// "move within this page". The two should never read as one double row.
//
// Zero client JS: plain server-rendered <a href="#id"> anchors. The jump
// itself is native; smooth scroll + the sticky-Nav landing offset are
// handled in CSS (scroll-behavior gated behind prefers-reduced-motion,
// plus scroll-margin-top on each target section). Crawlable, keyboard-
// native, copy-pasteable hashes, no bundle cost.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";
import type { SubBrand } from "@/lib/sub-brands";

export type SectionIndexItem = {
  /** The target section's DOM id (without the leading "#"). */
  id: string;
  /** Visible label — matches the section's kicker (e.g. "Collections"). */
  label: string;
};

export function SectionIndex({
  items,
  subbrand,
  label,
}: {
  items: SectionIndexItem[];
  /** Re-asserted so the strip resolves the cluster's accent tokens. */
  subbrand: SubBrand;
  /** Accessible name for the landmark, distinct from the ClusterRail and
   *  the global Primary nav (e.g. "Films sections on this page"). */
  label: string;
}) {
  // Nothing to orient with fewer than two destinations — render nothing
  // rather than a one-item "nav" (also keeps it off pages that happen to
  // have only the always-present StatsBand).
  if (items.length < 2) return null;

  // The strip's links left-align internally (default flex-start). When it
  // sits in a justify-between masthead row, that row pins the whole nav to
  // the right edge on one line (desktop); when it wraps below the eyebrow
  // (mobile), the wrapped lines read as a clean left-aligned block rather
  // than a ragged right-aligned one.
  return (
    <nav aria-label={label} data-subbrand={subbrand}>
      <ul style={listStyle}>
        {/* Inert leading label so the row reads as page wayfinding, not a
            set of external links. aria-hidden: the <nav>'s aria-label
            already names the landmark for assistive tech. */}
        <li aria-hidden="true" style={{ margin: 0, padding: 0 }}>
          <span style={eyebrowStyle}>On this page</span>
        </li>
        {items.map((item, i) => (
          <li key={item.id} style={itemStyle}>
            <a
              href={`#${item.id}`}
              // Color is intentionally left to the [data-subbrand] a
              // cascade — these read in the cluster accent like every
              // other sub-brand link (AA-tuned per cluster), with the
              // cascade's accent→darker/lighter hover shift. We only kill
              // the browser's default underline (inline, below) so they
              // read as a wayfinding row, not body links; the cascade sets
              // color !important but never touches text-decoration, so the
              // inline none holds. focus-visible ring matches the chrome.
              className="transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2"
              style={linkStyle}
            >
              {item.label}
            </a>
            {/* Middot separator, glued to the END of each link's <li> (not
                a standalone item) so it can never orphan at the start of a
                wrapped line. aria-hidden + user-select:none so it's neither
                announced nor copied into a pasted hash. */}
            {i < items.length - 1 ? (
              <span aria-hidden="true" style={separatorStyle}>
                &middot;
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

// Inline wrapping row, baseline-aligned so the eyebrow and the links sit
// on one type baseline. The 8px column gap pairs with each separator's 8px
// left margin so the middot sits centered (8px each side) between links.
const listStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: "6px 8px",
  listStyle: "none",
  margin: 0,
  padding: 0,
};

// Each link + its trailing separator share one inline-flex <li> so the
// middot stays glued to the link it follows (no orphaned leading dots).
const itemStyle: CSSProperties = {
  margin: 0,
  padding: 0,
  display: "inline-flex",
  alignItems: "baseline",
};

// Muted middot between links. marginLeft pairs with the list's column gap
// to center it; user-select:none keeps it out of copied text.
const separatorStyle: CSSProperties = {
  marginLeft: 8,
  color: "var(--text-caption)",
  userSelect: "none",
};

// Mono-uppercase label voice (sitewide constant), matching the Kicker.
const eyebrowStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-xs-font-size)",
  lineHeight: "var(--p-xs-line-height)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-caption)",
};

// Links share the eyebrow's mono-uppercase shape; color comes from the
// [data-subbrand] a cascade (the cluster accent). textDecoration:none
// drops the browser default underline so the row reads as wayfinding, not
// body links. ~33px tall via block padding clears the WCAG 2.5.8 target
// floor on touch.
const linkStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--p-xs-font-size)",
  lineHeight: "var(--p-xs-line-height)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "6px 0",
  textDecoration: "none",
  outlineColor: "var(--border-focus)",
};
