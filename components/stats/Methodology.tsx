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

export function Methodology({ notes }: { notes: ReactNode[] }) {
  return (
    // Open by default so the notes are visible; still collapsible for
    // readers who want to fold the dense block away.
    <details open style={detailsStyle}>
      <summary style={summaryStyle}>
        <Kicker>Methodology</Kicker>
      </summary>
      <ul style={listStyle}>
        {notes.map((note, i) => (
          <li key={i} style={itemStyle}>
            {note}
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
  paddingLeft: 18,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

// Reading prose, so it follows the same mono→slab move as the tile
// notes: the sub-brand's reading font (Roboto Slab via --font-secondary)
// instead of monospace.
const itemStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 12,
  lineHeight: 1.6,
  color: "var(--text-caption)",
};
