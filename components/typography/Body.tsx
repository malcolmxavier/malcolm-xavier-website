// ─────────────────────────────────────────────────────────────────
// Body — default paragraph text. The workhorse type role.
//
// Renders as <p> in --font-secondary at the p-md step by default.
// Pass `size` to switch between p-xs, p-sm, p-md, p-lg. Pass `as`
// to render as a different element (e.g. <span>) when paragraph
// semantics aren't right.
// ─────────────────────────────────────────────────────────────────

import type { ElementType, HTMLAttributes } from "react";

type BodySize = "xs" | "sm" | "md" | "lg";

type BodyProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  size?: BodySize;
};

export function Body({
  as: Tag = "p",
  size = "md",
  className = "",
  style,
  children,
  ...rest
}: BodyProps) {
  return (
    <Tag
      className={className}
      style={{
        fontFamily: "var(--font-secondary)",
        fontSize: `var(--p-${size}-font-size)`,
        lineHeight: `var(--p-${size}-line-height)`,
        maxWidth: "60ch",
        color: "var(--text-body)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
