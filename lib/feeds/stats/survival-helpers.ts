// Shared survival-derivation helpers (STATS-FILTERS §6).
//
// `filmTileSurvival` (film-stats.ts) and `tvTileSurvival` (tv-stats.ts) both
// translate a computed view-model into the per-tile surviving-n the collapse
// engine consumes. These small pure helpers express the recurring shapes — a
// matrix/heat total, a versus tile's two-column survival, and the single-value
// self-reference test — so the two cluster derivations share one definition
// instead of forking (the drift that caused earlier deep-link bugs).

import { ARCHETYPE_FLOORS } from "./collapse";
import type { HeatCell } from "./chart-data";

/** Total across a dense numeric matrix — for the grid/stacked tiles this is
 *  the count of items (or events) feeding the tile (each contributes 1). */
export function sumMatrix(matrix: number[][]): number {
  return matrix.reduce((t, row) => t + row.reduce((r, n) => r + n, 0), 0);
}

/** Items feeding a heat grid (each non-null cell's `n` counts its items). */
export function sumHeat(cells: HeatCell[][]): number {
  return cells.reduce(
    (t, row) => t + row.reduce((r, c) => r + (c?.n ?? 0), 0),
    0,
  );
}

// The per-column entity floor a versus tile's two columns must each clear.
const VERSUS_FLOOR = ARCHETYPE_FLOORS.versus;

/** Survival for a versus tile: it lives on its "most-logged" column (the
 *  robust side that still has data to read out), and degrades to a readout
 *  when the gated "highest-rated" column drops below the per-column floor. */
export function versus(c: {
  most: ReadonlyArray<unknown>;
  major: ReadonlyArray<unknown>;
}): { survivingN: number; degradeToReadout: boolean } {
  return {
    survivingN: c.most.length,
    degradeToReadout: c.major.length < VERSUS_FLOOR,
  };
}

/** True when an include facet pins its dimension to a SINGLE value. One
 *  selected value collapses the matching tile's distribution to a tautology
 *  (the chart can only show that one value), so the tile is forced to a
 *  readout regardless of how many rows survive (§6 self-reference). Two or
 *  more selected values — or a pure exclude, which leaves the include array
 *  empty — keep a real distribution (the relative proportions the user did
 *  NOT pin), so the chart still renders. Checking cardinality, not mere
 *  presence, is what keeps "every genre except horror" from collapsing the
 *  genre tiles even though it barely narrows the corpus. */
export function one(v: readonly unknown[] | undefined): boolean {
  return Array.isArray(v) && v.length === 1;
}
