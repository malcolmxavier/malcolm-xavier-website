// ─────────────────────────────────────────────────────────────────
// Headline — section titles, sub-heads, asides.
//
// Sits one or two steps below Display. Defaults to h2 at the h2
// type-scale step; pass `level` to render h3/h4/h5/h6 with the
// matching size step. Always uses --font-primary so it inherits the
// per-cluster display font automatically.
// ─────────────────────────────────────────────────────────────────

import type { HTMLAttributes } from "react";

type HeadlineLevel = 2 | 3 | 4 | 5 | 6;

type HeadlineProps = HTMLAttributes<HTMLHeadingElement> & {
  /** Heading level (h2-h6). Use Display for h1. Defaults to 2. */
  level?: HeadlineLevel;
};

export function Headline({
  level = 2,
  className = "",
  style,
  children,
  ...rest
}: HeadlineProps) {
  // Render <h2>…<h6> based on level.
  const Tag = `h${level}` as `h${HeadlineLevel}`;
  // Pull the matching size step from the responsive scale.
  const sizeKey = `h${level}` as const;

  return (
    <Tag
      className={`text-balance ${className}`}
      style={{
        fontFamily: "var(--font-primary)",
        fontSize: `var(--${sizeKey}-font-size)`,
        lineHeight: `var(--${sizeKey}-line-height)`,
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
