// ─────────────────────────────────────────────────────────────
// ProgressBar — the visual track + fill for ScrollProgress.
//
// Two stacked elements:
//   - Wrapper: 1px tall, full width, painted with
//     `var(--progress-track)`. The track matches the Nav's bottom
//     border at the same y-coordinate so the bar reads as a
//     continuation of the Nav chrome rather than a stacked
//     separate line.
//   - Inner fill: width = scroll fraction, painted with
//     `var(--progress-gradient)`. As the user scrolls, the
//     gradient paints over the track from left to right.
//
// Both vars are defined per-theme in scroll-progress.css (loaded
// by ScrollProgress.tsx). Bar height is 1px to match the Nav's
// `border-b` thickness.
// ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
}

export function ProgressBar({ fraction }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  // role="progressbar" + aria-valuenow/min/max so screen-reader
  // users perceive reading progress alongside the visual bar.
  // Without these the element is announced as a generic group and
  // the progress information is lost. aria-label is set explicitly
  // because the bar has no visible label.
  return (
    <div
      className="h-[1px] w-full"
      style={{ background: "var(--progress-track)" }}
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{
          width: `${pct}%`,
          background: "var(--progress-gradient)",
        }}
      />
    </div>
  );
}
