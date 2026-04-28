// ─────────────────────────────────────────────────────────────────
// Kicker — the small uppercase mono label that sits above a Display
// or Headline. The "computer is talking" voice (status lines,
// section eyebrows, dateline-style metadata).
//
// Always Roboto Mono regardless of cluster — it's the sitewide
// constant per the type system spec. Tracks wide, uppercases content,
// uses --text-caption for muted weight.
//
// Default tag is <p>. Pass `as="h2"` (or h3/h4) when the kicker is
// also acting as the section heading — e.g. on the resume, where
// "01 · Work experience" is the sole label for the Work-experience
// section and the document outline expects an h2 there to bridge
// from the page h1 to the role-level h3s. Visual treatment is
// identical regardless of tag.
// ─────────────────────────────────────────────────────────────────

import type { HTMLAttributes } from "react";

type KickerTag = "p" | "h2" | "h3" | "h4";

type KickerProps = HTMLAttributes<HTMLElement> & {
  /** Render with a colored accent — e.g. inside a sub-brand context. */
  accent?: boolean;
  /** Override the default <p> when the kicker is also a heading. */
  as?: KickerTag;
};

export function Kicker({
  accent = false,
  as: Tag = "p",
  className = "",
  style,
  children,
  ...rest
}: KickerProps) {
  return (
    <Tag
      className={className}
      style={{
        // Mono is sitewide-constant — bypass --font-primary so this
        // role stays consistent on both recruiter and sub-brand pages.
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        textTransform: "uppercase",
        // Wider tracking reads as "label" rather than running text.
        letterSpacing: "0.08em",
        color: accent ? "var(--text-action)" : "var(--text-caption)",
        // Headings carry default browser margins; reset so the
        // typographic rhythm matches the <p> baseline.
        margin: 0,
        fontWeight: "inherit",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
