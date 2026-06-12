// ─────────────────────────────────────────────────────────────────
// Shared chart-data shapes.
//
// A couple of the dashboard tiles render the same two visual forms —
// the stacked-by-something column chart and the rating heatmap — across
// all three pages (film, TV, connected). Their data shapes live here so
// the view-models and the React chart components agree on one contract.
//
// Pure types, zero runtime. The numbers themselves are assembled in the
// *-stats.ts view-models from the ported primitives.
// ─────────────────────────────────────────────────────────────────

/**
 * A stacked column chart's data. Each `cats` entry is one column on the
 * x-axis; each `segments` entry is one stack layer (the legend). The
 * matrix is indexed `[categoryIndex][segmentIndex]` = the count for that
 * column's slice of that segment.
 *
 * Used by: release-type-by-year, budget-tier-by-year, the temporal
 * weekday/month stacks (segments = years), the connected
 * conglomerate/weekday/month stacks (segments = Film vs TV).
 */
export type StackedMatrix = {
  cats: string[];
  segments: string[];
  matrix: number[][];
};

/** One heatmap cell: a (shrunk) value + its sample size, or null when empty. */
export type HeatCell = { v: number; n: number } | null;

/**
 * A rating heatmap's data: row × column grid of cells. Used by the
 * budget-tier × era and release-type × era tiles. The renderer scales a
 * single-hue opacity across the present min/max so the pattern reads.
 */
export type HeatGrid = {
  rows: string[];
  cols: string[];
  cells: HeatCell[][];
};
