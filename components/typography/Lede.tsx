// ─────────────────────────────────────────────────────────────────
// Lede — the larger introductory paragraph that sits below a Display
// or Headline and frames the page.
//
// Renders as <p> at the p-lg scale step in --font-secondary (DM Sans
// on recruiter pages, Roboto Slab on sub-brand pages). Constrained
// to a comfortable measure (~60ch) by default; override via style.
//
// `wide` drops the measure cap (maxWidth: none) so the lede spans the
// full container. Use it on listing/grid pages — where the hero is a
// one-to-two-sentence framing line above a card grid + filtering, and
// the narrow measure would only hold that grid lower on the page. The
// 60ch default stays right for prose pages (about, case studies).
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties, HTMLAttributes } from "react";

type LedeProps = HTMLAttributes<HTMLParagraphElement> & {
  /** Drop the 60ch reading-measure cap so the lede fills the container.
   *  For listing/grid heroes; leave off for prose. */
  wide?: boolean;
};

export function Lede({
  className = "",
  style,
  wide = false,
  children,
  ...rest
}: LedeProps) {
  return (
    <p
      className={className}
      style={
        {
          fontFamily: "var(--font-secondary)",
          fontSize: "var(--p-lg-font-size)",
          lineHeight: "var(--p-lg-line-height)",
          // Constrain measure for legibility. 60ch ≈ ideal reading line.
          // `wide` lifts the cap for listing/grid heroes. Placed before
          // the ...style spread so an explicit style.maxWidth still wins.
          maxWidth: wide ? "none" : "60ch",
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
