// ─────────────────────────────────────────────────────────────────
// Lede — the larger introductory paragraph that sits below a Display
// or Headline and frames the page.
//
// Renders as <p> at the p-lg scale step in --font-secondary (DM Sans
// on recruiter pages, Roboto Slab on sub-brand pages). Constrained
// to a comfortable measure (~60ch) by default; override via style.
// ─────────────────────────────────────────────────────────────────

import type { HTMLAttributes } from "react";

type LedeProps = HTMLAttributes<HTMLParagraphElement>;

export function Lede({ className = "", style, children, ...rest }: LedeProps) {
  return (
    <p
      className={className}
      style={{
        fontFamily: "var(--font-secondary)",
        fontSize: "var(--p-lg-font-size)",
        lineHeight: "var(--p-lg-line-height)",
        // Constrain measure for legibility. 60ch ≈ ideal reading line.
        maxWidth: "60ch",
        color: "var(--text-body)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </p>
  );
}
