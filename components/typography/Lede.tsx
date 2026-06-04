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
          textBoxTrim: "trim-start",
          textBoxEdge: "cap alphabetic",
          // Pull the lede up toward its heading. The trim above removed the
          // invisible font leading; this trims the remaining flex-gap
          // rhythm for the heading→lede pairing specifically, which read
          // loose at ~20px. A negative top margin combines with the parent
          // Stack's gap (gap + (-8px)), so a 20px gap becomes ~12px. It's
          // surgical — only the lede's top tightens, not the kicker→heading
          // gap or the CTA spacing below.
          marginTop: "calc(var(--scale-200) * -1)",
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </p>
  );
}
