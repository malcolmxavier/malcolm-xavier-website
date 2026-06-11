// ─────────────────────────────────────────────────────────────────
// Lede — the larger introductory paragraph that sits below a Display
// or Headline and frames the page.
//
// Renders as <p> at the p-lg scale step in --font-secondary (DM Sans
// on recruiter pages, Roboto Slab on sub-brand pages). Constrained
// to a comfortable measure (~60ch) by default; override via style.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties, HTMLAttributes } from "react";

type LedeProps = HTMLAttributes<HTMLParagraphElement>;

export function Lede({ className = "", style, children, ...rest }: LedeProps) {
  return (
    <p
      className={className}
      style={
        {
          fontFamily: "var(--font-secondary)",
          fontSize: "var(--p-lg-font-size)",
          lineHeight: "var(--p-lg-line-height)",
          // Constrain measure for legibility. 60ch ≈ ideal reading line.
          maxWidth: "60ch",
          color: "var(--text-body)",
          // Trim the top leading (the slot above the first line) to the
          // cap-height so the lede sits tight under the headline. Only the
          // top is trimmed — the generous 1.5 inter-line spacing is left
          // intact for body readability. Progressive enhancement; older
          // browsers keep the prior leading.
          //
          // No negative top margin: the trim above already removes the
          // invisible font leading, so the parent Stack's natural gap is
          // the true visual gap. The earlier -8px nudge double-corrected
          // for leading the trim had already handled — it left the lede
          // hugging the heading (12px, tighter than the 20px kicker→heading
          // gap above it, and worse when the heading ends in a descender
          // that drops into the gap). Letting the Stack gap stand keeps the
          // whole hero rhythm uniform.
          textBoxTrim: "trim-start",
          textBoxEdge: "cap alphabetic",
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </p>
  );
}
