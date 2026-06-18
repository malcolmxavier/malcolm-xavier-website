// ─────────────────────────────────────────────────────────────────
// Display — the largest, most editorial type role on the site.
//
// Used for hero statements (e.g. landing's "Senior product manager
// with an artist's eye"). Renders as <h1> by default, but accepts
// `as` so it can be a non-heading display element when a page already
// owns its own h1 hierarchy.
//
// Type stack: --font-primary (Instrument Serif on recruiter pages,
// Roboto Mono on sub-brand pages — flipped automatically by the
// data-subbrand CSS aliases in globals.css).
// ─────────────────────────────────────────────────────────────────

import type { CSSProperties, ElementType, HTMLAttributes } from "react";

type DisplayProps = HTMLAttributes<HTMLElement> & {
  /** Override the rendered tag. Defaults to h1. */
  as?: ElementType;
  /** Optional override of the type-scale step. Defaults to h1. */
  size?: "h1" | "h2";
};

export function Display({
  as: Tag = "h1",
  size = "h1",
  className = "",
  style,
  children,
  ...rest
}: DisplayProps) {
  return (
    <Tag
      // display-role is a stable hook for cross-cutting Display tuning that
      // can't live inline — notably the sub-brand (Roboto Mono) word-
      // spacing correction in components.css (mono's fixed-width space
      // glyph reads loose between words at this size).
      className={`display-role text-balance ${className}`}
      style={
        {
          // Display always uses the primary font (display family).
          fontFamily: "var(--font-primary)",
          fontSize: `var(--${size}-font-size)`,
          lineHeight: `var(--${size}-line-height)`,
          // Recruiter-cluster Instrument Serif looks more editorial with
          // a touch of negative tracking at this size; sub-brand Roboto
          // Mono ignores it (mono fonts ignore letter-spacing tuning by
          // convention but it doesn't hurt).
          letterSpacing: "-0.01em",
          color: "var(--text-heading)",
          // Trim the line-box leading to the cap-height (top) and the
          // alphabetic baseline (bottom) so the headline's box hugs its
          // glyphs. This removes the invisible leading — ~18px below the
          // last line on h1, plus the slot above the first — that
          // otherwise inflated the gap to the kicker above and the lede
          // below, sitewide. text-box-* is cast because it's newer than
          // the CSSProperties type; non-supporting browsers ignore it and
          // keep the prior (looser) leading — progressive enhancement.
          textBoxTrim: "trim-both",
          textBoxEdge: "cap alphabetic",
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}
