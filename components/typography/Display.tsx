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

import type { ElementType, HTMLAttributes } from "react";

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
      className={`text-balance ${className}`}
      style={{
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
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
