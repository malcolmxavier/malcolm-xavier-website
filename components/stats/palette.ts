// ─────────────────────────────────────────────────────────────────
// The shared categorical chart palette (Direction A).
//
// Multi-series charts (donut, stacked-by-year, dumbbell, multi-year
// line) cycle through these six harmonized hues. They're theme-aware
// design tokens (--chart-c1..c6, defined light + dark in
// tokens/Mapped/*.json → app/globals.css), so a chart never hardcodes a
// hex and both themes are handled by the cascade.
//
// Single-series charts do NOT use this — they take the cluster brand hue
// via the `.stats-brand-fill` currentColor mechanism instead.
// ─────────────────────────────────────────────────────────────────

/** The six categorical hues, as CSS custom-property references. */
export const CHART_PALETTE = [
  "var(--chart-c1)",
  "var(--chart-c2)",
  "var(--chart-c3)",
  "var(--chart-c4)",
  "var(--chart-c5)",
  "var(--chart-c6)",
] as const;

/** Cycle the palette by index (wraps past the sixth hue). */
export function paletteColor(i: number): string {
  return CHART_PALETTE[i % CHART_PALETTE.length];
}
