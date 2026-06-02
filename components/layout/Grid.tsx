// ─────────────────────────────────────────────────────────────────
// Grid — responsive CSS grid wrapper. Used for the sub-brand matrix
// on landing, case-study cards on Resume, and any multi-column layout.
//
// Default behavior: 1 column on mobile, 2 on tablet (≥768px), 3 on
// desktop (≥1024px). Override via `cols` prop. Gap pulls from the
// token --scale-* family for consistency with Stack.
// ─────────────────────────────────────────────────────────────────

import type { HTMLAttributes } from "react";

type GridCols = 1 | 2 | 3 | 4 | 5 | 6;

type GridGap = "200" | "300" | "400" | "500" | "600" | "700" | "800";

type GridProps = HTMLAttributes<HTMLDivElement> & {
  /** Columns on desktop (≥1024px). Tablet auto-halves; mobile is 1. */
  cols?: GridCols;
  /** Gap between cells, mapped to --scale-* tokens. */
  gap?: GridGap;
};

// Tailwind 4 generates these arbitrary classnames at build time.
// Listing the whole map explicitly keeps them in the JIT-discovered
// surface area (avoids dynamic-class purge bugs).
const COL_CLASSES: Record<GridCols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  // 5 + 6 are the dense poster-tile layouts (the editorial landings'
  // Now / Favorites rows). They start at 2-up on mobile — not 1-up —
  // so a phone shows a compact pair per row rather than one giant
  // full-width poster, then step up through tablet to desktop.
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

export function Grid({
  cols = 3,
  gap = "600",
  className = "",
  style,
  children,
  ...rest
}: GridProps) {
  return (
    <div
      className={`grid ${COL_CLASSES[cols]} ${className}`}
      style={{ gap: `var(--scale-${gap})`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
