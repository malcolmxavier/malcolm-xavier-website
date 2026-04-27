interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
}

// Reading-progress bar for long-form case study pages.
//
// Two visible elements:
//   - A track on the wrapper (`var(--progress-track)`) that's
//     always visible regardless of scroll position. Without it,
//     the bar is invisible until scroll fraction grows enough to
//     paint visible fill, which made the bar feel "missing" at
//     the top of the page.
//   - A fill div whose width matches the scroll fraction and is
//     painted with `var(--progress-gradient)`. The gradient is
//     defined per-theme in case-study.css so both modes have
//     ends + middle stops that are visible against their page bg.
export function ProgressBar({ fraction }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div
      className="h-[2px] w-full"
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
