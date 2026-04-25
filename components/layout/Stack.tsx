// ─────────────────────────────────────────────────────────────────
// Stack — vertical flex column with controlled spacing between
// children. Use when a series of typography or component blocks need
// consistent rhythm without each child managing its own margins.
//
// Spacing values map to the token scale (--scale-*) so vertical
// rhythm stays consistent with everything else on the page.
// ─────────────────────────────────────────────────────────────────

import type { ElementType, HTMLAttributes } from "react";

type StackGap =
  | "0"
  | "100" // 4px
  | "200" // 8px
  | "300" // 12px
  | "400" // 16px
  | "500" // 20px
  | "600" // 24px
  | "700" // 28px
  | "800" // 32px
  | "900" // 40px
  | "1000"; // 48px

type StackProps = HTMLAttributes<HTMLElement> & {
  /** Vertical gap between children, mapped to --scale-* tokens. */
  gap?: StackGap;
  /** Horizontal alignment. Defaults to stretch (full-width children). */
  align?: "start" | "center" | "end" | "stretch";
  /** Override the rendered tag — defaults to <div>. */
  as?: ElementType;
};

const ALIGN_MAP: Record<NonNullable<StackProps["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

export function Stack({
  gap = "400",
  align = "stretch",
  as: Tag = "div",
  className = "",
  style,
  children,
  ...rest
}: StackProps) {
  return (
    <Tag
      className={`flex flex-col ${ALIGN_MAP[align]} ${className}`}
      // Use inline style for gap so the token scale is the single
      // source of truth — no need for a parallel Tailwind config.
      style={{ gap: `var(--scale-${gap})`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
