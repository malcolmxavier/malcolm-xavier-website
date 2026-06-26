// ─────────────────────────────────────────────────────────────────
// Methodology — the "how these numbers are made" notes under a
// dashboard.
//
// Each stats page closes with the assumptions behind its figures (the
// sketch's filmMethod / tvMethod / connectedMethod lists). Rendered as a
// labelled, collapsible block so it's available but doesn't compete with
// the charts — open by default on desktop reading, foldable on mobile.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from "react";
import { Kicker } from "@/components/typography/Kicker";
import { IconStar } from "@/components/icons";

export function Methodology({ notes }: { notes: ReactNode[] }) {
  return (
    // Open by default so the notes are visible; still collapsible for
    // readers who want to fold the dense block away.
    <details open style={detailsStyle}>
      <summary
        style={summaryStyle}
        className="focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Kicker>Methodology</Kicker>
      </summary>
      {/* Real <ul>/<li> so screen readers still announce a list. We drop
          the default disc marker and stand in the site's star glyph —
          decorative (aria-hidden, focusable=false) so it adds no noise to
          assistive tech; the <li> itself carries the list semantics. */}
      <ul style={listStyle}>
        {notes.map((note, i) => (
          <li key={i} style={itemStyle}>
            <IconStar size={13} style={markerStyle} />
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

const detailsStyle: CSSProperties = {
  borderTop: "1px solid var(--border-default)",
  paddingTop: 20,
};

const summaryStyle: CSSProperties = {
  cursor: "pointer",
  listStyle: "none",
  outlineColor: "var(--border-focus)",
};

const listStyle: CSSProperties = {
  margin: "14px 0 0",
  // No list-padding/disc; the star marker provides the hanging indent.
  paddingLeft: 0,
  listStyleType: "none",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

// Reading prose, so it follows the same mono→slab move as the tile
// notes: the sub-brand's reading font (Roboto Slab via --font-secondary)
// instead of monospace. Flex row hangs the text off the star marker.
const itemStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  fontFamily: "var(--font-secondary)",
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--text-caption)",
};

// Star bullet: inherits --text-caption via currentColor, doesn't shrink
// when text wraps, and nudged down a hair to sit on the first line's
// baseline rather than its cap-top.
const markerStyle: CSSProperties = {
  flex: "none",
  marginTop: 3,
};
