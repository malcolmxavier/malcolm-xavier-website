// ─────────────────────────────────────────────────────────────────
// Container — horizontal max-width wrapper used at the page or
// section level to keep content from spanning ultra-wide displays.
//
// Three sizes:
//   sm  → narrow column for prose (about, contact, single-article)
//   md  → standard reading layout (resume, landing primary stack)
//   lg  → wide canvas for matrices and multi-column grids
//
// Includes responsive horizontal padding so content never butts the
// viewport edge on mobile.
// ─────────────────────────────────────────────────────────────────

import type { HTMLAttributes } from "react";

type ContainerSize = "sm" | "md" | "lg";

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: ContainerSize;
};

const MAX_WIDTHS: Record<ContainerSize, string> = {
  sm: "42rem", // ~672px — prose column
  md: "64rem", // ~1024px — default page width
  lg: "80rem", // ~1280px — full-bleed grids
};

export function Container({
  size = "md",
  className = "",
  style,
  children,
  ...rest
}: ContainerProps) {
  return (
    <div
      // Mobile: 24px padding. Tablet+: 40px. Desktop+: 64px.
      // Centered with mx-auto. max-w set inline against the size map.
      className={`mx-auto w-full px-6 sm:px-10 lg:px-16 ${className}`}
      style={{ maxWidth: MAX_WIDTHS[size], ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
