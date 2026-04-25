// ─────────────────────────────────────────────────────────────────
// Kicker — the small uppercase mono label that sits above a Display
// or Headline. The "computer is talking" voice (status lines,
// section eyebrows, dateline-style metadata).
//
// Always Roboto Mono regardless of cluster — it's the sitewide
// constant per the type system spec. Tracks wide, uppercases content,
// uses --text-caption for muted weight.
// ─────────────────────────────────────────────────────────────────

import type { HTMLAttributes } from "react";

type KickerProps = HTMLAttributes<HTMLElement> & {
  /** Render with a colored accent — e.g. inside a sub-brand context. */
  accent?: boolean;
};

export function Kicker({
  accent = false,
  className = "",
  style,
  children,
  ...rest
}: KickerProps) {
  return (
    <p
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
        ...style,
      }}
      {...rest}
    >
      {children}
    </p>
  );
}
