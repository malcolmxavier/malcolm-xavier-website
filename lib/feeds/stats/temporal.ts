// ─────────────────────────────────────────────────────────────────
// Temporal primitives — day-of-year, weekday/month tallies, matrices.
//
// Ported from the stats sketch (build-stats-sketch.mjs lines 64–68,
// 230–251, 403–413). Shared by the film and TV "temporal trio" tiles
// (logging pace, weekday rhythm, month rhythm) and the connected
// cadence view. All UTC so the buckets don't shift by server timezone.
//
// Pure functions, zero deps.
// ─────────────────────────────────────────────────────────────────

/** Day-of-year (1–366) for an ISO date, UTC. */
export function dayOfYear(iso: string): number {
  const d = new Date(iso);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((day - start) / 86_400_000) + 1;
}

/** UTC year of an ISO date. */
export function yearOf(iso: string): number {
  return new Date(iso).getUTCFullYear();
}

/** Weekday labels, Monday-first. */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** getUTCDay() indices in Monday-first order (Sun=0 maps last). */
export const WEEKDAY_INDEX = [1, 2, 3, 4, 5, 6, 0] as const;

/** Month labels, Jan-first. */
export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** A cumulative-logs-by-day curve for one year. */
export type YearCurve = { year: string; points: [number, number][] };

/**
 * Cumulative count by day-of-year, one curve per year — the "logging
 * pace" line chart's data. Each curve starts at [1, 0] and steps up by
 * one at each logged day.
 */
export function doySeries(dates: string[]): YearCurve[] {
  const byYear: Record<string, number[]> = {};
  for (const d of dates) (byYear[yearOf(d)] ??= []).push(dayOfYear(d));
  return Object.keys(byYear)
    .sort()
    .map((yr) => {
      const days = byYear[yr].sort((a, b) => a - b);
      let cum = 0;
      const points: [number, number][] = [[1, 0]];
      for (const d of days) {
        cum++;
        points.push([d, cum]);
      }
      return { year: yr, points };
    });
}

/** Count of dates by weekday, Monday-first: [label, count][]. */
export function weekdayTally(dates: string[]): [string, number][] {
  return WEEKDAY_INDEX.map((idx, i): [string, number] => [
    WEEKDAYS[i],
    dates.filter((d) => new Date(d).getUTCDay() === idx).length,
  ]);
}

/** Count of dates by month, Jan-first: [label, count][]. */
export function monthTally(dates: string[]): [string, number][] {
  return MONTHS.map((mo, i): [string, number] => [
    mo,
    dates.filter((d) => new Date(d).getUTCMonth() === i).length,
  ]);
}

/** The most recent `n` calendar years present in the dates, ascending. */
export function recentYears(dates: string[], n = 5): number[] {
  return [...new Set(dates.map((d) => new Date(d).getUTCFullYear()))]
    .sort((a, b) => a - b)
    .slice(-n);
}

/**
 * Single-pass builder shared by the weekday and month "× year" matrices.
 * Each date is parsed exactly once into a `year → row-counts` tally, then the
 * matrix is read out of that tally. This replaces the previous nested-filter
 * form, which re-scanned the whole `dates` array and constructed a fresh
 * `Date` for every (row, year) cell — 7×years or 12×years redundant passes.
 *
 * `rowCount` is the number of output rows (7 weekdays / 12 months); `rowOf`
 * maps a parsed Date to its row index. The returned matrix is `[row][year]`.
 */
function byYearMatrix(
  dates: string[],
  years: number[],
  rowCount: number,
  rowOf: (d: Date) => number,
): number[][] {
  const yearSet = new Set(years);
  // counts.get(year)[rowIndex] — only the requested years are tallied.
  const counts = new Map<number, number[]>();
  for (const iso of dates) {
    const dt = new Date(iso);
    const yr = dt.getUTCFullYear();
    if (!yearSet.has(yr)) continue;
    let row = counts.get(yr);
    if (!row) {
      row = new Array<number>(rowCount).fill(0);
      counts.set(yr, row);
    }
    row[rowOf(dt)]++;
  }
  return Array.from({ length: rowCount }, (_row, i) =>
    years.map((yr) => counts.get(yr)?.[i] ?? 0),
  );
}

// getUTCDay() (Sun=0) → Monday-first row index, matching WEEKDAYS/WEEKDAY_INDEX.
const WEEKDAY_ROW = new Map(WEEKDAY_INDEX.map((dayIdx, row) => [dayIdx, row]));

/**
 * Weekday × year matrix (rows = Mon-first weekdays, cols = the given
 * years): how many logs fell on each weekday in each year. Feeds the
 * stacked-by-year weekday tile.
 */
export function weekdayByYearMatrix(
  dates: string[],
  years: number[],
): number[][] {
  return byYearMatrix(dates, years, WEEKDAYS.length, (dt) =>
    WEEKDAY_ROW.get(dt.getUTCDay() as (typeof WEEKDAY_INDEX)[number])!,
  );
}

/**
 * Month × year matrix (rows = Jan-first months, cols = the given
 * years). Feeds the stacked-by-year month tile.
 */
export function monthByYearMatrix(
  dates: string[],
  years: number[],
): number[][] {
  return byYearMatrix(dates, years, MONTHS.length, (dt) => dt.getUTCMonth());
}
