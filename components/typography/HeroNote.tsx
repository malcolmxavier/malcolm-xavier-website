import type { CSSProperties, ReactNode } from "react";

// HeroNote — a quiet reading-register note that sits BELOW a hero's
// button row (the ClusterRail, or the connected dashboard's cluster
// pills).
//
// Several heroes used to carry a second big <Lede> line for secondary
// context ("this page is interactive," "explore for an overview," "open
// any card"). That context reads better as a footnote under the
// navigation than as a second headline-weight paragraph, so it drops to
// the sub-brand's reading font (Roboto Slab via --font-secondary) at
// caption size and colour — the same mono→slab move the dashboard tile
// notes make. Single source of truth so the treatment stays identical
// everywhere it appears.
//
// `action` is an optional trailing element — a proper CTA link (e.g.
// "Follow along on Letterboxd ↗") that closes the block on the cluster
// landing pages. It renders on its own line beneath the note at full
// link weight, so the loud body-link styling reads against the quiet
// caption above it.
export function HeroNote({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div style={groupStyle}>
      <p style={textStyle}>{children}</p>
      {action ? <p style={actionStyle}>{action}</p> : null}
    </div>
  );
}

// The wrapper owns the spacing: a small nudge below the button row (the
// hero Stack's gap carries the bulk), the 60ch reading measure, and the
// gap between the note and its optional action line.
const groupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  margin: "4px 0 0",
  maxWidth: "60ch",
};

const textStyle: CSSProperties = {
  fontFamily: "var(--font-secondary)",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--text-caption)",
  margin: 0,
};

// The action line carries no styling of its own — the Link primitive
// inside provides the body-link colour and underline.
const actionStyle: CSSProperties = {
  margin: 0,
};
