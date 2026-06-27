// ─────────────────────────────────────────────────────────────────
// StatsGrid — the dashboard's responsive tile grid.
//
// A thin wrapper around the `.stats-grid` CSS (app/components.css): a
// 12-column grid on desktop, 6 on tablet, single-column on mobile. Each
// child <Tile> declares its own span; the grid just provides the column
// track and the gap. Kept as a component (not a raw <div>) so pages read
// declaratively and the class name lives in one place.
// ─────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";

export function StatsGrid({ children }: { children: ReactNode }) {
  return <div className="stats-grid">{children}</div>;
}
