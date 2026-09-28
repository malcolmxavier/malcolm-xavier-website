// ─────────────────────────────────────────────────────────────────
// Lede — the larger introductory paragraph that sits below a Display
// or Headline and frames the page.
//
// Renders as <p> at the p-lg scale step in --font-secondary (DM Sans
// on recruiter pages, Roboto Slab on sub-brand pages).
//
// It takes --measure-header, NOT the reading measure. A lede is a deck:
// a couple of sentences at large type, read once, taken in as a unit
// with the headline above it. It is not a reading column, so the thing
// a reading measure protects — not losing your place on the carriage
// return of line forty — is not a risk here, and the cost of clamping
// it that tight is real: the headline runs to its own natural width
// while the deck stops a third of the way across, and the header block
// reads as ragged rather than as a block. MEASURE.md §1 has the rule.
//
// It was 60ch until 2026-09-28, which is the reading measure, and that
// is what Malcolm was seeing on /essays and /music when he said the
// text looked like it should run to the edge of the well.
//
// If a deck is too wide to read comfortably, the deck is too long. Fix
// the copy, not the width.
//
// `wide` drops the cap entirely (maxWidth: none) so the lede spans the
// full container. Use it on listing/grid pages — where the hero is a
// one-to-two-sentence framing line above a card grid + filtering, and
// any cap would only hold that grid lower on the page.
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties, HTMLAttributes } from "react";

type LedeProps = HTMLAttributes<HTMLParagraphElement> & {
  /** Drop the header-measure cap so the lede fills the container.
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
          // The header measure, not the reading one — see the note at the
          // top of this file. `wide` lifts the cap for listing/grid heroes.
          // Placed before the ...style spread so an explicit style.maxWidth
          // still wins.
          maxWidth: wide ? "none" : "var(--measure-header)",
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
