// ─────────────────────────────────────────────────────────────────
// Dateline — small mono metadata line. Bylines, "last updated"
// timestamps, "via Letterboxd" attributions, footer ©.
//
// A close cousin of Kicker but lower-case, smaller voice. Rendered
// as <p> by default; pass `as="time"` for actual machine-readable
// timestamps so screen readers and crawlers get the right semantics.
// ─────────────────────────────────────────────────────────────────

import type { ElementType, HTMLAttributes } from "react";

type DatelineProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  /** Optional ISO datetime when rendered as <time>. */
  dateTime?: string;
};

export function Dateline({
  as: Tag = "p",
  className = "",
  style,
  children,
  ...rest
}: DatelineProps) {
  return (
    <Tag
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--p-xs-font-size)",
        lineHeight: "var(--p-xs-line-height)",
        color: "var(--text-caption)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
