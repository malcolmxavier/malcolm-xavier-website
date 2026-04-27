interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
}

// Reading-progress bar for long-form case study pages.
//
// Two visible elements:
//   - A track on the wrapper (`var(--progress-track)`) that's
//     always visible regardless of scroll position. The track is
//     a tinted green strip (defined per-theme in case-study.css)
//     so the bar reads as its own element rather than an
//     accidental duplicate of the Nav's neutral-grey bottom
//     border one pixel above it.
//   - A fill div whose width matches the scroll fraction and is
//     painted with `var(--progress-gradient)` — a brighter
//     gradient that paints on top of the track as the user
//     scrolls down the article.
//
// Bar height is 1px so the bar matches the Nav's `border-b` (also
// 1px). At the case-study route we suppress the Nav's bottom
// border via case-study.css and the bar takes its place at the
// same y-coordinate, so a visitor moving between routes doesn't
// register a thickness change in the chrome's bottom edge.
export function ProgressBar({ fraction }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div
      className="h-[1px] w-full"
      style={{ background: "var(--progress-track)" }}
    >
      <div
        className="h-full transition-[width] duration-300 ease-out"
        style={{
          width: `${pct}%`,
          background: "var(--progress-gradient)",
        }}
      />
    </div>
  );
}
